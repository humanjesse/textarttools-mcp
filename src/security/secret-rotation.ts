/**
 * Secret Rotation Framework for TextArtTools MCP Server
 * Implements automated secret management with gradual key rollover
 */

import type { Env } from '../types.js';

/**
 * Secret types managed by the rotation system
 */
export type SecretType = 'JWT_SECRET' | 'GITHUB_CLIENT_SECRET' | 'SIGNING_KEY' | 'ENCRYPTION_KEY';

/**
 * Secret rotation configuration
 */
export interface SecretRotationConfig {
  enabled: boolean;
  rotationInterval: number; // milliseconds
  gracePeriod: number; // milliseconds to keep old secrets
  notificationThreshold: number; // warn before rotation
  autoRotate: boolean;
  healthCheckInterval: number;
  secretTypes: {
    [K in SecretType]: {
      enabled: boolean;
      rotationInterval: number;
      gracePeriod: number;
      validator?: (secret: string) => boolean;
    };
  };
}

/**
 * Secret metadata
 */
export interface SecretMetadata {
  id: string;
  type: SecretType;
  version: number;
  createdAt: number;
  expiresAt: number;
  rotatedAt?: number;
  status: 'ACTIVE' | 'ROTATING' | 'DEPRECATED' | 'REVOKED';
  usage: {
    lastUsed: number;
    useCount: number;
  };
  health: {
    isValid: boolean;
    lastChecked: number;
    errors: string[];
  };
}

/**
 * Secret storage entry
 */
export interface SecretEntry {
  secret: string;
  metadata: SecretMetadata;
  checksum: string;
}

/**
 * Rotation event
 */
export interface RotationEvent {
  id: string;
  timestamp: number;
  secretType: SecretType;
  action: 'ROTATION_STARTED' | 'ROTATION_COMPLETED' | 'ROTATION_FAILED' | 'SECRET_DEPRECATED' | 'SECRET_REVOKED';
  oldVersion?: number;
  newVersion?: number;
  reason: string;
  metadata: Record<string, any>;
}

/**
 * Secret rotation manager
 */
export class SecretRotationManager {
  private config: SecretRotationConfig;
  private secrets: Map<string, SecretEntry>; // key: type-version
  private rotationHistory: RotationEvent[];
  private healthCheckTimer?: number;
  private rotationTimer?: number;

  constructor(env: Env) {
    this.config = this.buildConfig(env);
    this.secrets = new Map();
    this.rotationHistory = [];

    // Initialize with current secrets
    this.initializeSecrets(env);

    // Start health checks and rotation timers
    if (this.config.enabled) {
      this.scheduleHealthChecks();
      this.scheduleRotations();
    }
  }

  /**
   * Build configuration from environment
   */
  private buildConfig(env: Env): SecretRotationConfig {
    const rotationInterval = this.parseInterval(env.SECRET_ROTATION_INTERVAL || '30d');

    return {
      enabled: env.ENABLE_SECRET_ROTATION === 'true',
      rotationInterval,
      gracePeriod: Math.max(rotationInterval * 0.1, 24 * 60 * 60 * 1000), // 10% of rotation or 1 day
      notificationThreshold: Math.max(rotationInterval * 0.05, 60 * 60 * 1000), // 5% of rotation or 1 hour
      autoRotate: env.AUTO_ROTATE_SECRETS !== 'false',
      healthCheckInterval: 60 * 60 * 1000, // 1 hour
      secretTypes: {
        JWT_SECRET: {
          enabled: true,
          rotationInterval,
          gracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
          validator: (secret: string) => secret.length >= 32
        },
        GITHUB_CLIENT_SECRET: {
          enabled: true,
          rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
          gracePeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
          validator: (secret: string) => secret.length >= 40 && /^[a-f0-9]+$/i.test(secret)
        },
        SIGNING_KEY: {
          enabled: true,
          rotationInterval,
          gracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
          validator: (secret: string) => secret.length >= 32
        },
        ENCRYPTION_KEY: {
          enabled: true,
          rotationInterval,
          gracePeriod: 14 * 24 * 60 * 60 * 1000, // 14 days
          validator: (secret: string) => secret.length >= 32
        }
      }
    };
  }

  /**
   * Parse rotation interval string
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
   * Initialize secrets from environment
   */
  private initializeSecrets(env: Env): void {
    const secretMappings: Array<{ type: SecretType; envKey: string }> = [
      { type: 'JWT_SECRET', envKey: 'JWT_SECRET' },
      { type: 'GITHUB_CLIENT_SECRET', envKey: 'GITHUB_CLIENT_SECRET' },
      { type: 'SIGNING_KEY', envKey: 'JWT_SECRET' }, // Reuse JWT secret for signing
      { type: 'ENCRYPTION_KEY', envKey: 'JWT_SECRET' } // Reuse JWT secret for encryption
    ];

    for (const { type, envKey } of secretMappings) {
      const secret = env[envKey as keyof Env] as string;
      if (secret && this.config.secretTypes[type].enabled) {
        this.addSecret(type, secret, 1, false);
      }
    }
  }

  /**
   * Add secret to the rotation system
   */
  private addSecret(
    type: SecretType,
    secret: string,
    version: number,
    isNew: boolean = true
  ): string {
    const now = Date.now();
    const typeConfig = this.config.secretTypes[type];
    const secretId = `${type}-${version}`;

    const metadata: SecretMetadata = {
      id: secretId,
      type,
      version,
      createdAt: now,
      expiresAt: now + typeConfig.rotationInterval,
      status: 'ACTIVE',
      usage: {
        lastUsed: now,
        useCount: 0
      },
      health: {
        isValid: this.validateSecret(type, secret),
        lastChecked: now,
        errors: []
      }
    };

    const entry: SecretEntry = {
      secret,
      metadata,
      checksum: this.createChecksum(secret)
    };

    this.secrets.set(secretId, entry);

    if (isNew) {
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: now,
        secretType: type,
        action: 'ROTATION_COMPLETED',
        newVersion: version,
        reason: 'Secret added to rotation system',
        metadata: { automatic: false }
      });
    }

    return secretId;
  }

  /**
   * Get active secret for a type
   */
  getActiveSecret(type: SecretType): { secret: string; metadata: SecretMetadata } | null {
    const activeSecrets = Array.from(this.secrets.values())
      .filter(entry => entry.metadata.type === type && entry.metadata.status === 'ACTIVE')
      .sort((a, b) => b.metadata.version - a.metadata.version);

    if (activeSecrets.length === 0) {
      return null;
    }

    const entry = activeSecrets[0];
    this.recordUsage(entry.metadata.id);

    return {
      secret: entry.secret,
      metadata: { ...entry.metadata }
    };
  }

  /**
   * Get secret by ID (for graceful transition)
   */
  getSecretById(secretId: string): { secret: string; metadata: SecretMetadata } | null {
    const entry = this.secrets.get(secretId);
    if (!entry) {
      return null;
    }

    this.recordUsage(secretId);
    return {
      secret: entry.secret,
      metadata: { ...entry.metadata }
    };
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation(type: SecretType): {
    needsRotation: boolean;
    reason: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timeUntilExpiry: number;
  } {
    const activeSecret = this.getActiveSecret(type);
    if (!activeSecret) {
      return {
        needsRotation: true,
        reason: 'No active secret found',
        urgency: 'CRITICAL',
        timeUntilExpiry: 0
      };
    }

    const now = Date.now();
    const timeUntilExpiry = activeSecret.metadata.expiresAt - now;
    const typeConfig = this.config.secretTypes[type];

    // Critical: Secret has expired
    if (timeUntilExpiry <= 0) {
      return {
        needsRotation: true,
        reason: 'Secret has expired',
        urgency: 'CRITICAL',
        timeUntilExpiry
      };
    }

    // High: Within notification threshold
    if (timeUntilExpiry <= this.config.notificationThreshold) {
      return {
        needsRotation: true,
        reason: 'Secret expiring soon',
        urgency: 'HIGH',
        timeUntilExpiry
      };
    }

    // Medium: Health check failed
    if (!activeSecret.metadata.health.isValid) {
      return {
        needsRotation: true,
        reason: 'Secret health check failed',
        urgency: 'MEDIUM',
        timeUntilExpiry
      };
    }

    // Low: Regular rotation interval
    const timeSinceCreation = now - activeSecret.metadata.createdAt;
    if (timeSinceCreation >= typeConfig.rotationInterval * 0.8) {
      return {
        needsRotation: true,
        reason: 'Regular rotation interval reached',
        urgency: 'LOW',
        timeUntilExpiry
      };
    }

    return {
      needsRotation: false,
      reason: 'Secret is healthy and not due for rotation',
      urgency: 'LOW',
      timeUntilExpiry
    };
  }

  /**
   * Rotate secret for a specific type
   */
  async rotateSecret(type: SecretType, reason: string = 'Manual rotation'): Promise<{
    success: boolean;
    newSecretId?: string;
    error?: string;
    oldVersion?: number;
    newVersion?: number;
  }> {
    const typeConfig = this.config.secretTypes[type];
    if (!typeConfig.enabled) {
      return {
        success: false,
        error: `Secret rotation disabled for type: ${type}`
      };
    }

    const activeSecret = this.getActiveSecret(type);
    const oldVersion = activeSecret?.metadata.version || 0;
    const newVersion = oldVersion + 1;

    try {
      // Record rotation start
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        secretType: type,
        action: 'ROTATION_STARTED',
        oldVersion,
        newVersion,
        reason,
        metadata: { automatic: true }
      });

      // Generate new secret
      const newSecret = await this.generateSecret(type);

      // Validate new secret
      if (!this.validateSecret(type, newSecret)) {
        throw new Error('Generated secret failed validation');
      }

      // Add new secret
      const newSecretId = this.addSecret(type, newSecret, newVersion);

      // Deprecate old secret (keep for grace period)
      if (activeSecret) {
        this.deprecateSecret(activeSecret.metadata.id);
      }

      // Schedule revocation after grace period
      this.scheduleSecretRevocation(activeSecret?.metadata.id, typeConfig.gracePeriod);

      // Record successful rotation
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        secretType: type,
        action: 'ROTATION_COMPLETED',
        oldVersion,
        newVersion,
        reason,
        metadata: { newSecretId, automatic: true }
      });

      return {
        success: true,
        newSecretId,
        oldVersion,
        newVersion
      };

    } catch (error) {
      // Record failed rotation
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        secretType: type,
        action: 'ROTATION_FAILED',
        oldVersion,
        newVersion,
        reason: `${reason} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        oldVersion,
        newVersion
      };
    }
  }

  /**
   * Generate new secret for type
   */
  private async generateSecret(type: SecretType): Promise<string> {
    switch (type) {
      case 'JWT_SECRET':
      case 'SIGNING_KEY':
      case 'ENCRYPTION_KEY':
        return this.generateCryptographicSecret(64);

      case 'GITHUB_CLIENT_SECRET':
        // In production, this would integrate with GitHub API to rotate OAuth app secret
        return this.generateCryptographicSecret(40);

      default:
        throw new Error(`Unknown secret type: ${type}`);
    }
  }

  /**
   * Generate cryptographically secure secret
   */
  private generateCryptographicSecret(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate secret format and strength
   */
  private validateSecret(type: SecretType, secret: string): boolean {
    const typeConfig = this.config.secretTypes[type];
    if (typeConfig.validator) {
      return typeConfig.validator(secret);
    }

    // Basic validation
    return secret.length >= 32;
  }

  /**
   * Deprecate a secret
   */
  private deprecateSecret(secretId: string): void {
    const entry = this.secrets.get(secretId);
    if (entry) {
      entry.metadata.status = 'DEPRECATED';
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        secretType: entry.metadata.type,
        action: 'SECRET_DEPRECATED',
        reason: 'Secret rotated, now in grace period',
        metadata: { secretId }
      });
    }
  }

  /**
   * Revoke a secret
   */
  private revokeSecret(secretId: string): void {
    const entry = this.secrets.get(secretId);
    if (entry) {
      entry.metadata.status = 'REVOKED';
      this.recordRotationEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        secretType: entry.metadata.type,
        action: 'SECRET_REVOKED',
        reason: 'Grace period expired',
        metadata: { secretId }
      });

      // Remove from memory after a delay
      setTimeout(() => {
        this.secrets.delete(secretId);
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Schedule secret revocation
   */
  private scheduleSecretRevocation(secretId: string | undefined, gracePeriod: number): void {
    if (!secretId) return;

    setTimeout(() => {
      this.revokeSecret(secretId);
    }, gracePeriod);
  }

  /**
   * Record secret usage
   */
  private recordUsage(secretId: string): void {
    const entry = this.secrets.get(secretId);
    if (entry) {
      entry.metadata.usage.lastUsed = Date.now();
      entry.metadata.usage.useCount++;
    }
  }

  /**
   * Create checksum for secret integrity
   */
  private createChecksum(secret: string): string {
    // Simple checksum - in production use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      const char = secret.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Perform health check on all secrets
   */
  async performHealthCheck(): Promise<{
    healthy: number;
    unhealthy: number;
    issues: Array<{ secretId: string; type: SecretType; issues: string[] }>;
  }> {
    let healthy = 0;
    let unhealthy = 0;
    const issues: Array<{ secretId: string; type: SecretType; issues: string[] }> = [];

    for (const entry of this.secrets.values()) {
      const secretIssues: string[] = [];

      // Check expiry
      if (entry.metadata.expiresAt < Date.now()) {
        secretIssues.push('Secret has expired');
      }

      // Check validity
      if (!this.validateSecret(entry.metadata.type, entry.secret)) {
        secretIssues.push('Secret format validation failed');
      }

      // Check integrity
      const currentChecksum = this.createChecksum(entry.secret);
      if (currentChecksum !== entry.checksum) {
        secretIssues.push('Secret integrity check failed');
      }

      // Update health status
      entry.metadata.health.isValid = secretIssues.length === 0;
      entry.metadata.health.lastChecked = Date.now();
      entry.metadata.health.errors = secretIssues;

      if (secretIssues.length === 0) {
        healthy++;
      } else {
        unhealthy++;
        issues.push({
          secretId: entry.metadata.id,
          type: entry.metadata.type,
          issues: secretIssues
        });
      }
    }

    return { healthy, unhealthy, issues };
  }

  /**
   * Get rotation status for all secret types
   */
  getRotationStatus(): Array<{
    type: SecretType;
    currentVersion: number;
    status: string;
    nextRotation: number;
    needsRotation: boolean;
    urgency: string;
  }> {
    const status: Array<{
      type: SecretType;
      currentVersion: number;
      status: string;
      nextRotation: number;
      needsRotation: boolean;
      urgency: string;
    }> = [];

    for (const type of Object.keys(this.config.secretTypes) as SecretType[]) {
      const activeSecret = this.getActiveSecret(type);
      const rotationCheck = this.needsRotation(type);

      status.push({
        type,
        currentVersion: activeSecret?.metadata.version || 0,
        status: activeSecret?.metadata.status || 'MISSING',
        nextRotation: activeSecret?.metadata.expiresAt || 0,
        needsRotation: rotationCheck.needsRotation,
        urgency: rotationCheck.urgency
      });
    }

    return status;
  }

  /**
   * Record rotation event
   */
  private recordRotationEvent(event: RotationEvent): void {
    this.rotationHistory.push(event);

    // Keep only recent history (last 100 events)
    if (this.rotationHistory.length > 100) {
      this.rotationHistory = this.rotationHistory.slice(-100);
    }

    // Log to console
    console.log('🔑 SECRET_ROTATION', {
      action: event.action,
      type: event.secretType,
      reason: event.reason,
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Schedule health checks
   */
  private scheduleHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval) as any;
  }

  /**
   * Schedule automatic rotations
   */
  private scheduleRotations(): void {
    if (!this.config.autoRotate) return;

    this.rotationTimer = setInterval(async () => {
      for (const type of Object.keys(this.config.secretTypes) as SecretType[]) {
        const rotationCheck = this.needsRotation(type);
        if (rotationCheck.needsRotation && rotationCheck.urgency !== 'LOW') {
          await this.rotateSecret(type, `Automatic rotation: ${rotationCheck.reason}`);
        }
      }
    }, 60 * 60 * 1000) as any; // Check every hour
  }

  /**
   * Get rotation history
   */
  getRotationHistory(limit: number = 50): RotationEvent[] {
    return this.rotationHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecretRotationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy manager and cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    this.secrets.clear();
    this.rotationHistory = [];
  }
}

/**
 * Create secret rotation manager
 */
export function createSecretRotationManager(env: Env): SecretRotationManager {
  return new SecretRotationManager(env);
}

/**
 * Singleton instance
 */
let globalRotationManager: SecretRotationManager | null = null;

export function getSecretRotationManager(env: Env): SecretRotationManager {
  if (!globalRotationManager) {
    globalRotationManager = new SecretRotationManager(env);
  }
  return globalRotationManager;
}

export {
  SecretRotationManager,
  type SecretType,
  type SecretRotationConfig,
  type SecretMetadata,
  type RotationEvent
};