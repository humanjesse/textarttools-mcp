/**
 * Security Configuration Manager for TextArtTools MCP Server
 * Centralizes all security-related configuration and provides validation
 */

import type { Env } from '../types.js';
import type { SecurityConfig as InputValidatorConfig } from './input-validator.js';
import type { SecurityHeadersConfig } from './security-headers.js';
import type { AuditLoggerConfig } from './audit-logger.js';
import type { RequestSigningConfig } from './request-signing.js';
import type { SecretRotationConfig } from './secret-rotation.js';

/**
 * Overall security configuration
 */
export interface SecurityConfiguration {
  // Global settings
  securityLevel: 'strict' | 'standard' | 'permissive';
  environment: 'development' | 'staging' | 'production';
  enabledFeatures: SecurityFeature[];

  // Component configurations
  inputValidation: InputValidatorConfig;
  securityHeaders: SecurityHeadersConfig;
  auditLogging: AuditLoggerConfig;
  requestSigning: RequestSigningConfig;
  secretRotation: SecretRotationConfig;

  // Compliance settings
  compliance: {
    mode: 'GDPR' | 'SOC2' | 'HIPAA' | 'STANDARD';
    dataRetentionDays: number;
    auditLevel: 'BASIC' | 'STANDARD' | 'COMPREHENSIVE';
    encryptionRequired: boolean;
  };

  // Threat detection
  threatDetection: {
    enabled: boolean;
    sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
    blockSuspiciousActivity: boolean;
    alertThresholds: {
      failedAttempts: number;
      timeWindow: number;
      suspiciousPatterns: number;
    };
  };

  // Performance impact settings
  performance: {
    maxLatencyMs: number;
    enableCaching: boolean;
    batchSize: number;
    timeoutMs: number;
  };
}

/**
 * Security features that can be enabled/disabled
 */
export type SecurityFeature =
  | 'INPUT_VALIDATION'
  | 'OUTPUT_SANITIZATION'
  | 'SECURITY_HEADERS'
  | 'CSP_ENFORCEMENT'
  | 'AUDIT_LOGGING'
  | 'REQUEST_SIGNING'
  | 'SECRET_ROTATION'
  | 'RATE_LIMITING'
  | 'THREAT_DETECTION'
  | 'SESSION_SECURITY';

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  securityScore: number; // 0-100
}

/**
 * Security configuration manager
 */
export class SecurityConfigManager {
  private config: SecurityConfiguration;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.config = this.buildConfiguration(env);
  }

  /**
   * Build complete security configuration from environment
   */
  private buildConfiguration(env: Env): SecurityConfiguration {
    const securityLevel = this.determineSecurityLevel(env);
    const environment = this.determineEnvironment(env);

    return {
      securityLevel,
      environment,
      enabledFeatures: this.determineEnabledFeatures(env, securityLevel),
      inputValidation: this.buildInputValidationConfig(env, securityLevel),
      securityHeaders: this.buildSecurityHeadersConfig(env, securityLevel),
      auditLogging: this.buildAuditLoggingConfig(env, securityLevel),
      requestSigning: this.buildRequestSigningConfig(env, securityLevel),
      secretRotation: this.buildSecretRotationConfig(env, securityLevel),
      compliance: this.buildComplianceConfig(env, securityLevel),
      threatDetection: this.buildThreatDetectionConfig(env, securityLevel),
      performance: this.buildPerformanceConfig(env, securityLevel)
    };
  }

  /**
   * Determine security level from environment
   */
  private determineSecurityLevel(env: Env): 'strict' | 'standard' | 'permissive' {
    const level = env.SECURITY_LEVEL?.toLowerCase();
    if (level === 'strict' || level === 'standard' || level === 'permissive') {
      return level;
    }

    // Auto-determine based on environment
    const nodeEnv = env.ENVIRONMENT || process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'strict';
    if (nodeEnv === 'staging') return 'standard';
    return 'permissive';
  }

  /**
   * Determine environment type
   */
  private determineEnvironment(env: Env): 'development' | 'staging' | 'production' {
    const nodeEnv = env.ENVIRONMENT || process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Determine which security features should be enabled
   */
  private determineEnabledFeatures(env: Env, securityLevel: string): SecurityFeature[] {
    const baseFeatures: SecurityFeature[] = [
      'INPUT_VALIDATION',
      'OUTPUT_SANITIZATION',
      'SECURITY_HEADERS',
      'RATE_LIMITING'
    ];

    const standardFeatures: SecurityFeature[] = [
      ...baseFeatures,
      'CSP_ENFORCEMENT',
      'AUDIT_LOGGING',
      'SESSION_SECURITY'
    ];

    const strictFeatures: SecurityFeature[] = [
      ...standardFeatures,
      'REQUEST_SIGNING',
      'SECRET_ROTATION',
      'THREAT_DETECTION'
    ];

    switch (securityLevel) {
      case 'strict': return strictFeatures;
      case 'standard': return standardFeatures;
      case 'permissive': return baseFeatures;
      default: return baseFeatures;
    }
  }

  /**
   * Build input validation configuration
   */
  private buildInputValidationConfig(env: Env, securityLevel: string): InputValidatorConfig {
    return {
      maxTextLength: parseInt(env.MAX_TEXT_LENGTH || '10000'),
      maxZalgoComplexity: securityLevel === 'strict' ? 50 : 100,
      allowedUnicodeRanges: securityLevel === 'strict'
        ? ['basic-latin', 'latin-1-supplement']
        : ['basic-latin', 'latin-1-supplement', 'latin-extended-a', 'latin-extended-b'],
      enableStrictValidation: securityLevel === 'strict',
      allowedOrigins: this.getAllowedOrigins(env, securityLevel),
      rateLimitConfig: {
        authenticated: parseInt(env.RATE_LIMIT_AUTHENTICATED || '1000'),
        anonymous: parseInt(env.RATE_LIMIT_ANONYMOUS || '100'),
        burst: parseInt(env.RATE_LIMIT_BURST || '50')
      }
    };
  }

  /**
   * Build security headers configuration
   */
  private buildSecurityHeadersConfig(env: Env, securityLevel: string): SecurityHeadersConfig {
    return {
      level: securityLevel as any,
      csp: {
        defaultSrc: ["'none'"],
        scriptSrc: securityLevel === 'strict' ? ["'self'", "'strict-dynamic'"] : ["'self'"],
        styleSrc: securityLevel === 'strict' ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "https://api.github.com", "https://github.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        reportUri: env.CSP_REPORT_ENDPOINT,
        reportOnly: securityLevel === 'permissive'
      },
      enableHSTS: securityLevel !== 'permissive',
      hstsMaxAge: 31536000,
      hstsIncludeSubdomains: true,
      hstsPreload: securityLevel === 'strict',
      enableReferrerPolicy: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      enablePermissionsPolicy: true,
      permissionsPolicy: {
        'camera': [],
        'microphone': [],
        'geolocation': [],
        'payment': []
      },
      enableXFrameOptions: true,
      xFrameOptions: 'DENY',
      enableXContentTypeOptions: true,
      enableXXSSProtection: true,
      enableCrossOriginPolicies: securityLevel === 'strict',
      customHeaders: {}
    };
  }

  /**
   * Build audit logging configuration
   */
  private buildAuditLoggingConfig(env: Env, securityLevel: string): AuditLoggerConfig {
    return {
      secretKey: env.JWT_SECRET || crypto.randomUUID(),
      retentionDays: parseInt(env.AUDIT_LOG_RETENTION || '90'),
      maxBatchSize: 100,
      flushIntervalMs: securityLevel === 'strict' ? 10000 : 30000,
      enableChainVerification: securityLevel === 'strict',
      enableRealTimeAlerts: securityLevel !== 'permissive',
      alertThresholds: {
        highSeverityLimit: securityLevel === 'strict' ? 5 : 10,
        criticalSeverityLimit: securityLevel === 'strict' ? 2 : 5,
        suspiciousPatternLimit: securityLevel === 'strict' ? 10 : 20
      },
      complianceMode: 'STANDARD'
    };
  }

  /**
   * Build request signing configuration
   */
  private buildRequestSigningConfig(env: Env, securityLevel: string): RequestSigningConfig {
    return {
      enabled: env.ENABLE_REQUEST_SIGNING === 'true' || securityLevel === 'strict',
      secretKey: env.JWT_SECRET || crypto.randomUUID(),
      algorithm: 'HMAC-SHA256',
      timestampToleranceMs: securityLevel === 'strict' ? 2 * 60 * 1000 : 5 * 60 * 1000,
      nonceWindowMs: 30 * 60 * 1000,
      requiredHeaders: ['x-timestamp', 'x-nonce', 'x-signature', 'content-type'],
      sensitiveEndpoints: ['/sse', '/mcp', '/auth/callback', '/auth/logout'],
      enforcementMode: securityLevel === 'strict' ? 'strict' : 'warn'
    };
  }

  /**
   * Build secret rotation configuration
   */
  private buildSecretRotationConfig(env: Env, securityLevel: string): SecretRotationConfig {
    const rotationInterval = this.parseInterval(env.SECRET_ROTATION_INTERVAL || '30d');

    return {
      enabled: env.ENABLE_SECRET_ROTATION === 'true' || securityLevel === 'strict',
      rotationInterval,
      gracePeriod: Math.max(rotationInterval * 0.1, 24 * 60 * 60 * 1000),
      notificationThreshold: Math.max(rotationInterval * 0.05, 60 * 60 * 1000),
      autoRotate: env.AUTO_ROTATE_SECRETS !== 'false',
      healthCheckInterval: securityLevel === 'strict' ? 30 * 60 * 1000 : 60 * 60 * 1000,
      secretTypes: {
        JWT_SECRET: {
          enabled: true,
          rotationInterval,
          gracePeriod: 7 * 24 * 60 * 60 * 1000,
          validator: (secret: string) => secret.length >= 32
        },
        GITHUB_CLIENT_SECRET: {
          enabled: securityLevel === 'strict',
          rotationInterval: 90 * 24 * 60 * 60 * 1000,
          gracePeriod: 30 * 24 * 60 * 60 * 1000,
          validator: (secret: string) => secret.length >= 40
        },
        SIGNING_KEY: {
          enabled: securityLevel !== 'permissive',
          rotationInterval,
          gracePeriod: 7 * 24 * 60 * 60 * 1000,
          validator: (secret: string) => secret.length >= 32
        },
        ENCRYPTION_KEY: {
          enabled: securityLevel === 'strict',
          rotationInterval,
          gracePeriod: 14 * 24 * 60 * 60 * 1000,
          validator: (secret: string) => secret.length >= 32
        }
      }
    };
  }

  /**
   * Build compliance configuration
   */
  private buildComplianceConfig(env: Env, securityLevel: string): SecurityConfiguration['compliance'] {
    return {
      mode: 'STANDARD',
      dataRetentionDays: parseInt(env.AUDIT_LOG_RETENTION || '90'),
      auditLevel: securityLevel === 'strict' ? 'COMPREHENSIVE' : 'STANDARD',
      encryptionRequired: securityLevel === 'strict'
    };
  }

  /**
   * Build threat detection configuration
   */
  private buildThreatDetectionConfig(env: Env, securityLevel: string): SecurityConfiguration['threatDetection'] {
    return {
      enabled: securityLevel !== 'permissive',
      sensitivity: securityLevel === 'strict' ? 'HIGH' : 'MEDIUM',
      blockSuspiciousActivity: securityLevel === 'strict',
      alertThresholds: {
        failedAttempts: securityLevel === 'strict' ? 3 : 5,
        timeWindow: 5 * 60 * 1000, // 5 minutes
        suspiciousPatterns: securityLevel === 'strict' ? 2 : 3
      }
    };
  }

  /**
   * Build performance configuration
   */
  private buildPerformanceConfig(env: Env, securityLevel: string): SecurityConfiguration['performance'] {
    return {
      maxLatencyMs: securityLevel === 'strict' ? 100 : 200,
      enableCaching: true,
      batchSize: 100,
      timeoutMs: 30000
    };
  }

  /**
   * Get allowed origins based on security level
   */
  private getAllowedOrigins(env: Env, securityLevel: string): string[] {
    const origins = env.CORS_ORIGIN?.split(',') || [];

    if (securityLevel === 'permissive') {
      return [...origins, '*'];
    }

    return [
      ...origins,
      'https://claude.ai',
      'http://localhost:3000',
      'http://localhost:8788'
    ];
  }

  /**
   * Parse time interval string
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([hdwm])$/);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // Default: 30 days
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    // Validate environment variables
    if (!this.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required');
      securityScore -= 20;
    } else if (this.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters');
      securityScore -= 5;
    }

    if (!this.env.GITHUB_CLIENT_ID || !this.env.GITHUB_CLIENT_SECRET) {
      warnings.push('GitHub OAuth credentials missing - authentication will be limited');
      securityScore -= 10;
    }

    // Validate security level alignment
    if (this.config.environment === 'production' && this.config.securityLevel !== 'strict') {
      warnings.push('Production environment should use strict security level');
      securityScore -= 15;
      recommendations.push('Set SECURITY_LEVEL=strict for production');
    }

    // Validate CSP configuration
    if (this.config.securityHeaders.csp.styleSrc?.includes("'unsafe-inline'") &&
        this.config.securityLevel === 'strict') {
      warnings.push('Strict security level should not allow unsafe-inline styles');
      securityScore -= 10;
    }

    // Validate feature combinations
    if (this.config.enabledFeatures.includes('REQUEST_SIGNING') &&
        !this.config.requestSigning.enabled) {
      errors.push('Request signing feature enabled but configuration disabled');
      securityScore -= 15;
    }

    // Performance vs security trade-offs
    if (this.config.performance.maxLatencyMs > 500) {
      warnings.push('High latency threshold may impact user experience');
    }

    if (this.config.auditLogging.flushIntervalMs > 60000 &&
        this.config.securityLevel === 'strict') {
      warnings.push('Audit log flush interval too high for strict security');
      securityScore -= 5;
    }

    // Compliance checks
    if (this.config.compliance.mode !== 'STANDARD' &&
        this.config.compliance.dataRetentionDays < 90) {
      warnings.push('Data retention period may not meet compliance requirements');
      securityScore -= 5;
    }

    // Security feature coverage
    const criticalFeatures: SecurityFeature[] = [
      'INPUT_VALIDATION',
      'OUTPUT_SANITIZATION',
      'SECURITY_HEADERS',
      'AUDIT_LOGGING'
    ];

    const missingCritical = criticalFeatures.filter(
      feature => !this.config.enabledFeatures.includes(feature)
    );

    if (missingCritical.length > 0) {
      errors.push(`Missing critical security features: ${missingCritical.join(', ')}`);
      securityScore -= missingCritical.length * 10;
    }

    // Generate recommendations
    if (this.config.securityLevel === 'permissive') {
      recommendations.push('Consider upgrading to standard security level');
    }

    if (!this.config.enabledFeatures.includes('THREAT_DETECTION')) {
      recommendations.push('Enable threat detection for better security monitoring');
    }

    if (!this.config.secretRotation.enabled) {
      recommendations.push('Enable secret rotation for better credential security');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      securityScore: Math.max(0, securityScore)
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): SecurityConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<SecurityConfiguration>): ConfigValidationResult {
    this.config = { ...this.config, ...updates };
    return this.validateConfiguration();
  }

  /**
   * Get security summary
   */
  getSecuritySummary(): {
    level: string;
    environment: string;
    featuresEnabled: number;
    featuresTotal: number;
    score: number;
    status: 'SECURE' | 'WARNINGS' | 'INSECURE';
  } {
    const validation = this.validateConfiguration();
    const totalFeatures = 10; // Total possible security features

    let status: 'SECURE' | 'WARNINGS' | 'INSECURE';
    if (validation.errors.length > 0) {
      status = 'INSECURE';
    } else if (validation.warnings.length > 0) {
      status = 'WARNINGS';
    } else {
      status = 'SECURE';
    }

    return {
      level: this.config.securityLevel,
      environment: this.config.environment,
      featuresEnabled: this.config.enabledFeatures.length,
      featuresTotal: totalFeatures,
      score: validation.securityScore,
      status
    };
  }

  /**
   * Export configuration for backup/deployment
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): ConfigValidationResult {
    try {
      const importedConfig = JSON.parse(configJson) as SecurityConfiguration;
      return this.updateConfiguration(importedConfig);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Invalid configuration JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: [],
        securityScore: 0
      };
    }
  }
}

/**
 * Create security configuration manager
 */
export function createSecurityConfig(env: Env): SecurityConfigManager {
  return new SecurityConfigManager(env);
}

/**
 * Singleton instance
 */
let globalConfigManager: SecurityConfigManager | null = null;

export function getSecurityConfig(env: Env): SecurityConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new SecurityConfigManager(env);
  }
  return globalConfigManager;
}

export {
  SecurityConfigManager,
  type SecurityConfiguration,
  type SecurityFeature,
  type ConfigValidationResult
};