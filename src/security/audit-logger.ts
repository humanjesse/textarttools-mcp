/**
 * Security Audit Logger for TextArtTools MCP Server
 * Implements tamper-proof logging with cryptographic signatures and structured event tracking
 */

import type { Env, GitHubUser } from '../types.js';

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Security event categories
 */
export type SecurityEventCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'INPUT_VALIDATION'
  | 'RATE_LIMITING'
  | 'CSP_VIOLATION'
  | 'XSS_ATTEMPT'
  | 'INJECTION_ATTEMPT'
  | 'SESSION_ANOMALY'
  | 'CONFIGURATION_CHANGE'
  | 'SYSTEM_ACCESS'
  | 'DATA_ACCESS'
  | 'ERROR'
  | 'PERFORMANCE'
  | 'COMPLIANCE';

/**
 * Security event outcome
 */
export type SecurityEventOutcome = 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'WARNING';

/**
 * Base security event interface
 */
export interface SecurityEvent {
  // Core identification
  id: string;
  timestamp: number;
  requestId?: string;
  sessionId?: string;

  // Event classification
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  outcome: SecurityEventOutcome;
  action: string;
  resource: string;

  // Actor information
  userId?: string;
  userLogin?: string;
  clientIp: string;
  userAgent?: string;

  // Context and details
  message: string;
  details: Record<string, any>;
  metadata: {
    version: string;
    environment: string;
    component: string;
  };

  // Security tracking
  riskScore: number; // 0-100
  threatIndicators: string[];

  // Compliance and correlation
  complianceRules?: string[];
  correlationId?: string;
  parentEventId?: string;
}

/**
 * Audit log entry with cryptographic protection
 */
export interface AuditLogEntry {
  event: SecurityEvent;
  signature: string;
  hash: string;
  previousHash?: string;
  sequenceNumber: number;
  integrity: {
    algorithm: 'HMAC-SHA256';
    version: '1.0';
    chainVerified: boolean;
  };
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  secretKey: string;
  retentionDays: number;
  maxBatchSize: number;
  flushIntervalMs: number;
  enableChainVerification: boolean;
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    highSeverityLimit: number;
    criticalSeverityLimit: number;
    suspiciousPatternLimit: number;
  };
  complianceMode: 'GDPR' | 'SOC2' | 'HIPAA' | 'STANDARD';
}

/**
 * Security audit logger with tamper protection
 */
export class SecurityAuditLogger {
  private config: AuditLoggerConfig;
  private eventBuffer: SecurityEvent[];
  private sequenceNumber: number;
  private lastHash: string;
  private alertCounts: Map<SecurityEventCategory, number>;
  private flushTimer?: number;

  constructor(env: Env) {
    this.config = this.buildConfig(env);
    this.eventBuffer = [];
    this.sequenceNumber = 0;
    this.lastHash = '';
    this.alertCounts = new Map();

    // Initialize flush timer
    this.scheduleFlush();

    // Initialize alert counters
    this.resetAlertCounters();
  }

  /**
   * Build configuration from environment
   */
  private buildConfig(env: Env): AuditLoggerConfig {
    return {
      secretKey: env.JWT_SECRET || crypto.randomUUID(),
      retentionDays: parseInt(env.AUDIT_LOG_RETENTION || '90'),
      maxBatchSize: 100,
      flushIntervalMs: 30000, // 30 seconds
      enableChainVerification: true,
      enableRealTimeAlerts: true,
      alertThresholds: {
        highSeverityLimit: 10, // per hour
        criticalSeverityLimit: 5, // per hour
        suspiciousPatternLimit: 20 // per hour
      },
      complianceMode: 'STANDARD'
    };
  }

  /**
   * Log a security event
   */
  async logEvent(
    category: SecurityEventCategory,
    action: string,
    outcome: SecurityEventOutcome,
    details: {
      severity?: SecurityEventSeverity;
      message: string;
      resource?: string;
      userId?: string;
      userLogin?: string;
      clientIp: string;
      userAgent?: string;
      requestId?: string;
      sessionId?: string;
      additionalDetails?: Record<string, any>;
      threatIndicators?: string[];
      complianceRules?: string[];
      correlationId?: string;
      parentEventId?: string;
    }
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      requestId: details.requestId,
      sessionId: details.sessionId,
      category,
      severity: details.severity || this.determineSeverity(category, outcome),
      outcome,
      action,
      resource: details.resource || 'unknown',
      userId: details.userId,
      userLogin: details.userLogin,
      clientIp: details.clientIp,
      userAgent: details.userAgent,
      message: details.message,
      details: details.additionalDetails || {},
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        component: 'textarttools-mcp-server'
      },
      riskScore: this.calculateRiskScore(category, outcome, details.severity),
      threatIndicators: details.threatIndicators || [],
      complianceRules: details.complianceRules,
      correlationId: details.correlationId,
      parentEventId: details.parentEventId
    };

    // Add to buffer
    this.eventBuffer.push(event);

    // Check for immediate flush conditions
    if (this.shouldFlushImmediately(event)) {
      await this.flush();
    }

    // Check alert thresholds
    this.checkAlertThresholds(event);
  }

  /**
   * Determine event severity based on category and outcome
   */
  private determineSeverity(category: SecurityEventCategory, outcome: SecurityEventOutcome): SecurityEventSeverity {
    // Critical events
    if (outcome === 'BLOCKED' && ['XSS_ATTEMPT', 'INJECTION_ATTEMPT'].includes(category)) {
      return 'CRITICAL';
    }

    // High severity events
    if (category === 'AUTHENTICATION' && outcome === 'FAILURE') return 'HIGH';
    if (category === 'AUTHORIZATION' && outcome === 'FAILURE') return 'HIGH';
    if (category === 'CSP_VIOLATION') return 'HIGH';
    if (category === 'SESSION_ANOMALY') return 'HIGH';

    // Medium severity events
    if (category === 'RATE_LIMITING' && outcome === 'BLOCKED') return 'MEDIUM';
    if (category === 'INPUT_VALIDATION' && outcome === 'FAILURE') return 'MEDIUM';
    if (category === 'CONFIGURATION_CHANGE') return 'MEDIUM';

    // Default to low
    return 'LOW';
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(
    category: SecurityEventCategory,
    outcome: SecurityEventOutcome,
    severity?: SecurityEventSeverity
  ): number {
    let score = 0;

    // Base score by category
    const categoryScores: Record<SecurityEventCategory, number> = {
      'XSS_ATTEMPT': 40,
      'INJECTION_ATTEMPT': 45,
      'CSP_VIOLATION': 30,
      'AUTHENTICATION': 25,
      'AUTHORIZATION': 30,
      'SESSION_ANOMALY': 35,
      'RATE_LIMITING': 15,
      'INPUT_VALIDATION': 20,
      'CONFIGURATION_CHANGE': 25,
      'SYSTEM_ACCESS': 20,
      'DATA_ACCESS': 25,
      'ERROR': 10,
      'PERFORMANCE': 5,
      'COMPLIANCE': 15
    };

    score += categoryScores[category] || 10;

    // Outcome modifier
    const outcomeModifiers: Record<SecurityEventOutcome, number> = {
      'FAILURE': 20,
      'BLOCKED': 15,
      'WARNING': 10,
      'SUCCESS': 0
    };

    score += outcomeModifiers[outcome];

    // Severity modifier
    const severityModifiers: Record<SecurityEventSeverity, number> = {
      'CRITICAL': 30,
      'HIGH': 20,
      'MEDIUM': 10,
      'LOW': 0
    };

    if (severity) {
      score += severityModifiers[severity];
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check if event should trigger immediate flush
   */
  private shouldFlushImmediately(event: SecurityEvent): boolean {
    return (
      event.severity === 'CRITICAL' ||
      event.category === 'XSS_ATTEMPT' ||
      event.category === 'INJECTION_ATTEMPT' ||
      this.eventBuffer.length >= this.config.maxBatchSize
    );
  }

  /**
   * Check alert thresholds and trigger alerts if necessary
   */
  private checkAlertThresholds(event: SecurityEvent): void {
    if (!this.config.enableRealTimeAlerts) return;

    const currentCount = this.alertCounts.get(event.category) || 0;
    this.alertCounts.set(event.category, currentCount + 1);

    const { highSeverityLimit, criticalSeverityLimit, suspiciousPatternLimit } = this.config.alertThresholds;

    // Check for critical events
    if (event.severity === 'CRITICAL' && currentCount >= criticalSeverityLimit) {
      this.triggerAlert('CRITICAL_EVENTS_THRESHOLD', event);
    }

    // Check for high severity events
    if (event.severity === 'HIGH' && currentCount >= highSeverityLimit) {
      this.triggerAlert('HIGH_SEVERITY_THRESHOLD', event);
    }

    // Check for suspicious patterns
    if (currentCount >= suspiciousPatternLimit) {
      this.triggerAlert('SUSPICIOUS_PATTERN', event);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(alertType: string, event: SecurityEvent): Promise<void> {
    const alertEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category: 'SYSTEM_ACCESS',
      severity: 'HIGH',
      outcome: 'WARNING',
      action: 'SECURITY_ALERT_TRIGGERED',
      resource: 'audit-system',
      clientIp: 'system',
      message: `Security alert triggered: ${alertType}`,
      details: {
        alertType,
        triggeringEvent: event.id,
        category: event.category,
        count: this.alertCounts.get(event.category)
      },
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        component: 'audit-logger'
      },
      riskScore: 80,
      threatIndicators: ['ALERT_THRESHOLD_EXCEEDED']
    };

    // Add to buffer for logging
    this.eventBuffer.push(alertEvent);

    // Log to console for immediate visibility
    console.warn(`🚨 SECURITY ALERT: ${alertType}`, {
      eventId: event.id,
      category: event.category,
      severity: event.severity,
      message: event.message
    });
  }

  /**
   * Create cryptographic signature for event
   */
  private async createSignature(event: SecurityEvent, previousHash: string): Promise<string> {
    const data = JSON.stringify({
      ...event,
      previousHash,
      sequenceNumber: this.sequenceNumber + 1
    });

    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secretKey);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Create hash for event
   */
  private async createHash(event: SecurityEvent): Promise<string> {
    const data = JSON.stringify(event);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  /**
   * Flush events to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      for (const event of events) {
        const hash = await this.createHash(event);
        const signature = await this.createSignature(event, this.lastHash);

        const logEntry: AuditLogEntry = {
          event,
          signature,
          hash,
          previousHash: this.lastHash || undefined,
          sequenceNumber: ++this.sequenceNumber,
          integrity: {
            algorithm: 'HMAC-SHA256',
            version: '1.0',
            chainVerified: this.config.enableChainVerification
          }
        };

        await this.persistLogEntry(logEntry);
        this.lastHash = hash;
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Persist log entry to storage
   */
  private async persistLogEntry(entry: AuditLogEntry): Promise<void> {
    // Log to console (in production, this would go to proper log aggregation)
    console.log('🔐 SECURITY_AUDIT', {
      id: entry.event.id,
      timestamp: new Date(entry.event.timestamp).toISOString(),
      category: entry.event.category,
      severity: entry.event.severity,
      action: entry.event.action,
      outcome: entry.event.outcome,
      message: entry.event.message,
      riskScore: entry.event.riskScore,
      signature: entry.signature.substring(0, 16) + '...',
      sequenceNumber: entry.sequenceNumber
    });

    // In production, persist to:
    // - Cloudflare Analytics Engine
    // - External SIEM system
    // - Compliance log storage
    // - Real-time alerting system
  }

  /**
   * Schedule periodic flush
   */
  private scheduleFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.config.flushIntervalMs) as any;
  }

  /**
   * Reset alert counters (called hourly)
   */
  private resetAlertCounters(): void {
    setInterval(() => {
      this.alertCounts.clear();
    }, 3600000); // 1 hour
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(entries: AuditLogEntry[]): Promise<{
    isValid: boolean;
    invalidEntries: string[];
    chainBroken: boolean;
  }> {
    const invalidEntries: string[] = [];
    let chainBroken = false;
    let previousHash = '';

    for (const entry of entries) {
      // Verify signature
      const expectedSignature = await this.createSignature(entry.event, entry.previousHash || '');
      if (entry.signature !== expectedSignature) {
        invalidEntries.push(entry.event.id);
      }

      // Verify hash chain
      if (entry.previousHash !== previousHash) {
        chainBroken = true;
      }

      previousHash = entry.hash;
    }

    return {
      isValid: invalidEntries.length === 0 && !chainBroken,
      invalidEntries,
      chainBroken
    };
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    // In production, this would clean up old entries from storage
    console.log(`🧹 Audit log cleanup: removing entries older than ${new Date(cutoffTime).toISOString()}`);
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(startTime: number, endTime: number): {
    totalEvents: number;
    eventsByCategory: Record<SecurityEventCategory, number>;
    highRiskEvents: number;
    blockedThreats: number;
    averageRiskScore: number;
  } {
    // In production, this would query stored audit logs
    return {
      totalEvents: 0,
      eventsByCategory: {} as Record<SecurityEventCategory, number>,
      highRiskEvents: 0,
      blockedThreats: 0,
      averageRiskScore: 0
    };
  }

  /**
   * Destroy logger and cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

/**
 * Convenience functions for common security events
 */

/**
 * Log authentication event
 */
export async function logAuthenticationEvent(
  logger: SecurityAuditLogger,
  outcome: SecurityEventOutcome,
  details: {
    action: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH' | 'PASSWORD_RESET';
    user?: GitHubUser;
    clientIp: string;
    userAgent?: string;
    requestId?: string;
    message: string;
    failureReason?: string;
  }
): Promise<void> {
  await logger.logEvent('AUTHENTICATION', details.action, outcome, {
    message: details.message,
    userId: details.user?.id.toString(),
    userLogin: details.user?.login,
    clientIp: details.clientIp,
    userAgent: details.userAgent,
    requestId: details.requestId,
    additionalDetails: {
      failureReason: details.failureReason
    }
  });
}

/**
 * Log input validation violation
 */
export async function logInputValidationViolation(
  logger: SecurityAuditLogger,
  details: {
    input: string;
    violations: string[];
    clientIp: string;
    userAgent?: string;
    requestId?: string;
    endpoint: string;
  }
): Promise<void> {
  await logger.logEvent('INPUT_VALIDATION', 'VALIDATION_FAILED', 'BLOCKED', {
    severity: 'MEDIUM',
    message: `Input validation failed: ${details.violations.join(', ')}`,
    resource: details.endpoint,
    clientIp: details.clientIp,
    userAgent: details.userAgent,
    requestId: details.requestId,
    additionalDetails: {
      inputLength: details.input.length,
      violations: details.violations,
      inputSample: details.input.substring(0, 100)
    },
    threatIndicators: details.violations
  });
}

/**
 * Log CSP violation
 */
export async function logCSPViolation(
  logger: SecurityAuditLogger,
  report: any,
  clientIp: string,
  requestId?: string
): Promise<void> {
  await logger.logEvent('CSP_VIOLATION', 'POLICY_VIOLATION', 'BLOCKED', {
    severity: 'HIGH',
    message: `CSP violation: ${report['violated-directive']}`,
    resource: report['document-uri'],
    clientIp,
    requestId,
    additionalDetails: {
      violatedDirective: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      originalPolicy: report['original-policy'],
      lineNumber: report['line-number'],
      sourceFile: report['source-file']
    },
    threatIndicators: ['CSP_VIOLATION', report['violated-directive']]
  });
}

/**
 * Log rate limiting event
 */
export async function logRateLimitEvent(
  logger: SecurityAuditLogger,
  details: {
    identifier: string;
    limit: number;
    current: number;
    clientIp: string;
    userAgent?: string;
    requestId?: string;
    endpoint: string;
  }
): Promise<void> {
  await logger.logEvent('RATE_LIMITING', 'LIMIT_EXCEEDED', 'BLOCKED', {
    severity: 'MEDIUM',
    message: `Rate limit exceeded: ${details.current}/${details.limit}`,
    resource: details.endpoint,
    clientIp: details.clientIp,
    userAgent: details.userAgent,
    requestId: details.requestId,
    additionalDetails: {
      identifier: details.identifier,
      limit: details.limit,
      current: details.current
    },
    threatIndicators: ['RATE_LIMIT_EXCEEDED']
  });
}

/**
 * Create singleton audit logger
 */
let globalLogger: SecurityAuditLogger | null = null;

export function getAuditLogger(env: Env): SecurityAuditLogger {
  if (!globalLogger) {
    globalLogger = new SecurityAuditLogger(env);
  }
  return globalLogger;
}

export { SecurityAuditLogger, type SecurityEvent, type AuditLogEntry, type AuditLoggerConfig };