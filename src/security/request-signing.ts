/**
 * Request Signing System for TextArtTools MCP Server
 * Implements HMAC-SHA256 request signatures with replay attack prevention
 */

import type { Env } from '../types.js';

/**
 * Request signature configuration
 */
export interface RequestSigningConfig {
  enabled: boolean;
  secretKey: string;
  algorithm: 'HMAC-SHA256';
  timestampToleranceMs: number; // How old can a request be
  nonceWindowMs: number; // How long to keep nonces
  requiredHeaders: string[];
  sensitiveEndpoints: string[];
  enforcementMode: 'strict' | 'warn' | 'disabled';
}

/**
 * Signature validation result
 */
export interface SignatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: number;
  nonce: string;
  computedSignature: string;
  providedSignature: string;
  metadata: {
    timeDrift: number;
    nonceReused: boolean;
    headersMissing: string[];
  };
}

/**
 * Request signing payload
 */
export interface SigningPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  nonce: string;
}

/**
 * Nonce storage entry
 */
interface NonceEntry {
  nonce: string;
  timestamp: number;
  requestId: string;
}

/**
 * Request signature verifier and generator
 */
export class RequestSigner {
  private config: RequestSigningConfig;
  private nonceStore: Map<string, NonceEntry>;
  private cleanupTimer?: number;

  constructor(env: Env) {
    this.config = this.buildConfig(env);
    this.nonceStore = new Map();

    // Schedule nonce cleanup
    this.scheduleNonceCleanup();
  }

  /**
   * Build configuration from environment
   */
  private buildConfig(env: Env): RequestSigningConfig {
    return {
      enabled: env.ENABLE_REQUEST_SIGNING === 'true',
      secretKey: env.JWT_SECRET || crypto.randomUUID(),
      algorithm: 'HMAC-SHA256',
      timestampToleranceMs: 5 * 60 * 1000, // 5 minutes
      nonceWindowMs: 30 * 60 * 1000, // 30 minutes
      requiredHeaders: [
        'x-timestamp',
        'x-nonce',
        'x-signature',
        'content-type'
      ],
      sensitiveEndpoints: [
        '/sse',
        '/mcp',
        '/auth/callback',
        '/auth/logout'
      ],
      enforcementMode: env.SECURITY_LEVEL === 'strict' ? 'strict' : 'warn'
    };
  }

  /**
   * Generate signature for a request
   */
  async generateSignature(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string,
    timestamp?: number,
    nonce?: string
  ): Promise<{
    signature: string;
    timestamp: number;
    nonce: string;
    headers: Record<string, string>;
  }> {
    const signingTime = timestamp || Date.now();
    const signingNonce = nonce || this.generateNonce();

    const payload: SigningPayload = {
      method: method.toUpperCase(),
      url: this.normalizeUrl(url),
      headers: this.normalizeHeaders(headers),
      body: body || '',
      timestamp: signingTime,
      nonce: signingNonce
    };

    const signature = await this.computeSignature(payload);

    return {
      signature,
      timestamp: signingTime,
      nonce: signingNonce,
      headers: {
        'X-Timestamp': signingTime.toString(),
        'X-Nonce': signingNonce,
        'X-Signature': signature,
        'X-Signature-Algorithm': this.config.algorithm
      }
    };
  }

  /**
   * Validate request signature
   */
  async validateSignature(request: Request, body?: string): Promise<SignatureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const url = new URL(request.url);

    // Check if signing is required for this endpoint
    if (!this.isSigningRequired(url.pathname)) {
      return this.createValidationResult(true, [], [], 0, '', '', '');
    }

    // Extract signature headers
    const timestamp = request.headers.get('X-Timestamp');
    const nonce = request.headers.get('X-Nonce');
    const providedSignature = request.headers.get('X-Signature');
    const algorithm = request.headers.get('X-Signature-Algorithm');

    // Validate required headers
    const missingHeaders: string[] = [];
    for (const header of this.config.requiredHeaders) {
      if (!request.headers.get(header)) {
        missingHeaders.push(header);
      }
    }

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    if (!timestamp) {
      errors.push('Missing X-Timestamp header');
    }

    if (!nonce) {
      errors.push('Missing X-Nonce header');
    }

    if (!providedSignature) {
      errors.push('Missing X-Signature header');
    }

    if (algorithm && algorithm !== this.config.algorithm) {
      errors.push(`Unsupported signature algorithm: ${algorithm}`);
    }

    // Early return if basic validation failed
    if (errors.length > 0) {
      return this.createValidationResult(
        false,
        errors,
        warnings,
        0,
        '',
        '',
        providedSignature || '',
        0,
        false,
        missingHeaders
      );
    }

    const requestTimestamp = parseInt(timestamp!);
    const requestNonce = nonce!;

    // Validate timestamp
    const now = Date.now();
    const timeDrift = Math.abs(now - requestTimestamp);

    if (timeDrift > this.config.timestampToleranceMs) {
      errors.push(
        `Request timestamp outside tolerance window. ` +
        `Drift: ${timeDrift}ms, Max: ${this.config.timestampToleranceMs}ms`
      );
    }

    // Check for nonce reuse
    const nonceReused = this.hasNonceBeenUsed(requestNonce);
    if (nonceReused) {
      errors.push(`Nonce has been reused: ${requestNonce}`);
    } else {
      // Store nonce
      this.storeNonce(requestNonce, requestTimestamp, crypto.randomUUID());
    }

    // Compute expected signature
    const headers = this.extractHeaders(request);
    const payload: SigningPayload = {
      method: request.method.toUpperCase(),
      url: this.normalizeUrl(request.url),
      headers: this.normalizeHeaders(headers),
      body: body || '',
      timestamp: requestTimestamp,
      nonce: requestNonce
    };

    const computedSignature = await this.computeSignature(payload);

    // Compare signatures
    const signaturesMatch = this.constantTimeCompare(providedSignature!, computedSignature);
    if (!signaturesMatch) {
      errors.push('Signature verification failed');
    }

    // Additional security checks
    this.performSecurityChecks(payload, warnings);

    const isValid = errors.length === 0;

    return this.createValidationResult(
      isValid,
      errors,
      warnings,
      requestTimestamp,
      requestNonce,
      computedSignature,
      providedSignature!,
      timeDrift,
      nonceReused,
      missingHeaders
    );
  }

  /**
   * Compute HMAC-SHA256 signature
   */
  private async computeSignature(payload: SigningPayload): Promise<string> {
    // Create canonical string representation
    const canonicalString = this.createCanonicalString(payload);

    // Generate signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secretKey);
    const messageData = encoder.encode(canonicalString);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  }

  /**
   * Create canonical string representation of request
   */
  private createCanonicalString(payload: SigningPayload): string {
    const parts: string[] = [];

    // Method
    parts.push(`METHOD:${payload.method}`);

    // URL (normalized)
    parts.push(`URL:${payload.url}`);

    // Headers (sorted by key)
    const sortedHeaders = Object.keys(payload.headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${payload.headers[key]}`)
      .join('\n');
    parts.push(`HEADERS:\n${sortedHeaders}`);

    // Body hash
    if (payload.body) {
      const bodyHash = this.hashString(payload.body);
      parts.push(`BODY_HASH:${bodyHash}`);
    }

    // Timestamp
    parts.push(`TIMESTAMP:${payload.timestamp}`);

    // Nonce
    parts.push(`NONCE:${payload.nonce}`);

    return parts.join('\n');
  }

  /**
   * Hash string using SHA-256
   */
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  /**
   * Synchronous hash for canonical string creation
   */
  private hashString(input: string): string {
    // Simple hash for canonical string - in production use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Normalize URL for consistent signature generation
   */
  private normalizeUrl(url: string): string {
    const urlObj = new URL(url);

    // Sort query parameters
    const params = new URLSearchParams(urlObj.search);
    const sortedParams = new URLSearchParams();

    for (const [key, value] of Array.from(params.entries()).sort()) {
      sortedParams.append(key, value);
    }

    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${sortedParams.toString() ? '?' + sortedParams.toString() : ''}`;
  }

  /**
   * Normalize headers for consistent signature generation
   */
  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // Skip signature-related headers to avoid circular dependency
      if (key.toLowerCase().startsWith('x-signature') ||
          key.toLowerCase() === 'x-timestamp' ||
          key.toLowerCase() === 'x-nonce') {
        continue;
      }

      normalized[key.toLowerCase()] = value.trim();
    }

    return normalized;
  }

  /**
   * Extract relevant headers from request
   */
  private extractHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    // Include important headers for signature
    const importantHeaders = [
      'content-type',
      'content-length',
      'authorization',
      'user-agent',
      'origin'
    ];

    for (const header of importantHeaders) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    return headers;
  }

  /**
   * Generate cryptographically secure nonce
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Check if nonce has been used before
   */
  private hasNonceBeenUsed(nonce: string): boolean {
    return this.nonceStore.has(nonce);
  }

  /**
   * Store nonce to prevent reuse
   */
  private storeNonce(nonce: string, timestamp: number, requestId: string): void {
    this.nonceStore.set(nonce, {
      nonce,
      timestamp,
      requestId
    });
  }

  /**
   * Check if signing is required for endpoint
   */
  private isSigningRequired(pathname: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    return this.config.sensitiveEndpoints.some(endpoint =>
      pathname === endpoint || pathname.startsWith(endpoint + '/')
    );
  }

  /**
   * Perform additional security checks
   */
  private performSecurityChecks(payload: SigningPayload, warnings: string[]): void {
    // Check for suspicious patterns in URL
    if (payload.url.includes('..') || payload.url.includes('%2e%2e')) {
      warnings.push('URL contains path traversal patterns');
    }

    // Check for unusual headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip'];
    for (const header of suspiciousHeaders) {
      if (payload.headers[header]) {
        warnings.push(`Request contains potentially spoofed header: ${header}`);
      }
    }

    // Check timestamp for potential clock skew
    const now = Date.now();
    const timeDrift = Math.abs(now - payload.timestamp);
    if (timeDrift > 60000) { // 1 minute
      warnings.push(`Significant time drift detected: ${timeDrift}ms`);
    }
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Create validation result object
   */
  private createValidationResult(
    isValid: boolean,
    errors: string[],
    warnings: string[],
    timestamp: number,
    nonce: string,
    computedSignature: string,
    providedSignature: string,
    timeDrift: number = 0,
    nonceReused: boolean = false,
    headersMissing: string[] = []
  ): SignatureValidationResult {
    return {
      isValid,
      errors,
      warnings,
      timestamp,
      nonce,
      computedSignature,
      providedSignature,
      metadata: {
        timeDrift,
        nonceReused,
        headersMissing
      }
    };
  }

  /**
   * Schedule periodic nonce cleanup
   */
  private scheduleNonceCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredNonces();
    }, 5 * 60 * 1000) as unknown as number; // Every 5 minutes
  }

  /**
   * Remove expired nonces
   */
  private cleanupExpiredNonces(): void {
    const now = Date.now();
    const expireTime = now - this.config.nonceWindowMs;

    for (const [nonce, entry] of this.nonceStore.entries()) {
      if (entry.timestamp < expireTime) {
        this.nonceStore.delete(nonce);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RequestSigningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RequestSigningConfig {
    return { ...this.config };
  }

  /**
   * Get nonce store statistics
   */
  getStats(): {
    nonceCount: number;
    oldestNonce: number | null;
    newestNonce: number | null;
  } {
    const timestamps = Array.from(this.nonceStore.values()).map(entry => entry.timestamp);

    return {
      nonceCount: this.nonceStore.size,
      oldestNonce: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestNonce: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Destroy signer and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.nonceStore.clear();
  }
}

/**
 * Request signing middleware
 */
export class RequestSigningMiddleware {
  private signer: RequestSigner;

  constructor(env: Env) {
    this.signer = new RequestSigner(env);
  }

  /**
   * Middleware function to validate request signatures
   */
  async validateRequest(
    request: Request,
    body?: string
  ): Promise<{
    isValid: boolean;
    result: SignatureValidationResult;
    shouldBlock: boolean;
  }> {
    const result = await this.signer.validateSignature(request, body);
    const config = this.signer.getConfig();

    const shouldBlock = !result.isValid && config.enforcementMode === 'strict';

    return {
      isValid: result.isValid,
      result,
      shouldBlock
    };
  }

  /**
   * Generate signature for outgoing requests
   */
  async signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<{
    signature: string;
    timestamp: number;
    nonce: string;
    headers: Record<string, string>;
  }> {
    return this.signer.generateSignature(method, url, headers, body);
  }

  /**
   * Check if endpoint requires signing
   */
  requiresSigning(pathname: string): boolean {
    return this.signer.isSigningRequired(pathname);
  }
}

/**
 * Convenience functions
 */

/**
 * Create request signer instance
 */
export function createRequestSigner(env: Env): RequestSigner {
  return new RequestSigner(env);
}

/**
 * Create signing middleware
 */
export function createSigningMiddleware(env: Env): RequestSigningMiddleware {
  return new RequestSigningMiddleware(env);
}

/**
 * Sign a request with HMAC-SHA256
 */
export async function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  secretKey: string
): Promise<{
  signature: string;
  timestamp: number;
  nonce: string;
  headers: Record<string, string>;
}> {
  // Create temporary signer for one-off signing
  const tempEnv = { JWT_SECRET: secretKey, ENABLE_REQUEST_SIGNING: 'true' } as Env;
  const signer = new RequestSigner(tempEnv);
  return signer.generateSignature(method, url, headers, body);
}

/**
 * Verify a request signature
 */
export async function verifyRequestSignature(
  request: Request,
  body: string | undefined,
  secretKey: string
): Promise<SignatureValidationResult> {
  // Create temporary signer for one-off verification
  const tempEnv = {
    JWT_SECRET: secretKey,
    ENABLE_REQUEST_SIGNING: 'true',
    SECURITY_LEVEL: 'strict'
  } as Env;
  const signer = new RequestSigner(tempEnv);
  return signer.validateSignature(request, body);
}

export {
  RequestSigner,
  RequestSigningMiddleware,
  type RequestSigningConfig,
  type SignatureValidationResult,
  type SigningPayload
};