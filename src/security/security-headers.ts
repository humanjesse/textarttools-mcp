/**
 * Security Headers Middleware for TextArtTools MCP Server
 * Implements comprehensive security headers including CSP following 2025 Cloudflare Workers best practices
 */

import type { Env } from '../types.js';

/**
 * Security level configuration
 */
export type SecurityLevel = 'strict' | 'standard' | 'permissive';

/**
 * CSP directive configuration
 */
export interface CSPConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  connectSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  childSrc: string[];
  workerSrc: string[];
  manifestSrc: string[];
  formAction: string[];
  frameAncestors: string[];
  baseUri: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  reportUri?: string;
  reportOnly: boolean;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  level: SecurityLevel;
  csp: Partial<CSPConfig>;
  enableHSTS: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  enableReferrerPolicy: boolean;
  referrerPolicy: string;
  enablePermissionsPolicy: boolean;
  permissionsPolicy: Record<string, string[]>;
  enableXFrameOptions: boolean;
  xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  enableXContentTypeOptions: boolean;
  enableXXSSProtection: boolean;
  enableCrossOriginPolicies: boolean;
  customHeaders: Record<string, string>;
}

/**
 * Security headers middleware
 */
export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private nonceCache: Map<string, { nonce: string; timestamp: number }>;

  constructor(env: Env) {
    this.nonceCache = new Map();
    this.config = this.buildConfig(env);

    // Clean up old nonces every hour
    setInterval(() => this.cleanupNonces(), 3600000);
  }

  /**
   * Build security configuration based on environment
   */
  private buildConfig(env: Env): SecurityHeadersConfig {
    const level = (env.SECURITY_LEVEL as SecurityLevel) || 'standard';
    const reportUri = env.CSP_REPORT_ENDPOINT;

    const baseConfig: SecurityHeadersConfig = {
      level,
      enableHSTS: true,
      hstsMaxAge: 31536000, // 1 year
      hstsIncludeSubdomains: true,
      hstsPreload: true,
      enableReferrerPolicy: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      enablePermissionsPolicy: true,
      permissionsPolicy: {
        'camera': [],
        'microphone': [],
        'geolocation': [],
        'payment': [],
        'usb': [],
        'bluetooth': [],
        'serial': [],
        'magnetometer': [],
        'gyroscope': [],
        'accelerometer': [],
        'ambient-light-sensor': [],
        'autoplay': [],
        'display-capture': [],
        'fullscreen': ['self'],
        'picture-in-picture': [],
        'screen-wake-lock': [],
        'web-share': []
      },
      enableXFrameOptions: true,
      xFrameOptions: 'DENY',
      enableXContentTypeOptions: true,
      enableXXSSProtection: true,
      enableCrossOriginPolicies: true,
      customHeaders: {},
      csp: this.buildCSPConfig(level, reportUri)
    };

    return baseConfig;
  }

  /**
   * Build CSP configuration based on security level
   */
  private buildCSPConfig(level: SecurityLevel, reportUri?: string): Partial<CSPConfig> {
    const baseCSP: Partial<CSPConfig> = {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for basic functionality
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: true,
      blockAllMixedContent: true,
      reportOnly: false
    };

    if (reportUri) {
      baseCSP.reportUri = reportUri;
    }

    switch (level) {
      case 'strict':
        return {
          ...baseCSP,
          styleSrc: ["'self'"], // Remove unsafe-inline for strict mode
          scriptSrc: ["'self'", "'strict-dynamic'"], // Use strict-dynamic
          connectSrc: ["'self'", "https://api.github.com", "https://github.com"],
          reportOnly: false
        };

      case 'standard':
        return {
          ...baseCSP,
          connectSrc: ["'self'", "https://api.github.com", "https://github.com", "https://claude.ai"],
          scriptSrc: ["'self'", "https://claude.ai"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://claude.ai"],
          reportOnly: false
        };

      case 'permissive':
        return {
          ...baseCSP,
          connectSrc: ["'self'", "https:", "wss:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          reportOnly: true // Use report-only mode for permissive
        };

      default:
        return baseCSP;
    }
  }

  /**
   * Generate a cryptographically secure nonce
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Get or create nonce for request
   */
  getNonce(requestId: string = crypto.randomUUID()): string {
    const cached = this.nonceCache.get(requestId);
    const now = Date.now();

    // Use cached nonce if it's less than 5 minutes old
    if (cached && (now - cached.timestamp) < 300000) {
      return cached.nonce;
    }

    const nonce = this.generateNonce();
    this.nonceCache.set(requestId, { nonce, timestamp: now });
    return nonce;
  }

  /**
   * Clean up old nonces
   */
  private cleanupNonces(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, value] of this.nonceCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.nonceCache.delete(key);
      }
    }
  }

  /**
   * Build Content Security Policy header value
   */
  private buildCSPHeader(csp: Partial<CSPConfig>, nonce?: string): string {
    const directives: string[] = [];

    // Helper function to build directive
    const addDirective = (name: string, values: string[] = []) => {
      if (values.length > 0) {
        let directiveValues = values;

        // Add nonce to script-src and style-src if provided
        if (nonce && (name === 'script-src' || name === 'style-src')) {
          directiveValues = [...values, `'nonce-${nonce}'`];
        }

        directives.push(`${name} ${directiveValues.join(' ')}`);
      }
    };

    // Build all directives
    if (csp.defaultSrc) addDirective('default-src', csp.defaultSrc);
    if (csp.scriptSrc) addDirective('script-src', csp.scriptSrc);
    if (csp.styleSrc) addDirective('style-src', csp.styleSrc);
    if (csp.connectSrc) addDirective('connect-src', csp.connectSrc);
    if (csp.imgSrc) addDirective('img-src', csp.imgSrc);
    if (csp.fontSrc) addDirective('font-src', csp.fontSrc);
    if (csp.objectSrc) addDirective('object-src', csp.objectSrc);
    if (csp.mediaSrc) addDirective('media-src', csp.mediaSrc);
    if (csp.frameSrc) addDirective('frame-src', csp.frameSrc);
    if (csp.childSrc) addDirective('child-src', csp.childSrc);
    if (csp.workerSrc) addDirective('worker-src', csp.workerSrc);
    if (csp.manifestSrc) addDirective('manifest-src', csp.manifestSrc);
    if (csp.formAction) addDirective('form-action', csp.formAction);
    if (csp.frameAncestors) addDirective('frame-ancestors', csp.frameAncestors);
    if (csp.baseUri) addDirective('base-uri', csp.baseUri);

    // Boolean directives
    if (csp.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }
    if (csp.blockAllMixedContent) {
      directives.push('block-all-mixed-content');
    }

    // Report URI
    if (csp.reportUri) {
      directives.push(`report-uri ${csp.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Build Permissions Policy header value
   */
  private buildPermissionsPolicyHeader(policy: Record<string, string[]>): string {
    const directives: string[] = [];

    for (const [feature, allowlist] of Object.entries(policy)) {
      if (allowlist.length === 0) {
        directives.push(`${feature}=()`);
      } else {
        const values = allowlist.map(value => {
          if (value === 'self') return 'self';
          if (value === '*') return '*';
          return `"${value}"`;
        }).join(' ');
        directives.push(`${feature}=(${values})`);
      }
    }

    return directives.join(', ');
  }

  /**
   * Get all security headers for a response
   */
  getSecurityHeaders(requestId?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const nonce = requestId ? this.getNonce(requestId) : undefined;

    // Content Security Policy
    const cspHeader = this.buildCSPHeader(this.config.csp, nonce);
    if (this.config.csp.reportOnly) {
      headers['Content-Security-Policy-Report-Only'] = cspHeader;
    } else {
      headers['Content-Security-Policy'] = cspHeader;
    }

    // Strict Transport Security
    if (this.config.enableHSTS) {
      let hstsValue = `max-age=${this.config.hstsMaxAge}`;
      if (this.config.hstsIncludeSubdomains) {
        hstsValue += '; includeSubDomains';
      }
      if (this.config.hstsPreload) {
        hstsValue += '; preload';
      }
      headers['Strict-Transport-Security'] = hstsValue;
    }

    // X-Frame-Options
    if (this.config.enableXFrameOptions) {
      headers['X-Frame-Options'] = this.config.xFrameOptions;
    }

    // X-Content-Type-Options
    if (this.config.enableXContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // X-XSS-Protection
    if (this.config.enableXXSSProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = this.buildPermissionsPolicyHeader(this.config.permissionsPolicy);
    }

    // Cross-Origin Policies
    if (this.config.enableCrossOriginPolicies) {
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
    }

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['X-Download-Options'] = 'noopen';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Expect-CT'] = 'enforce, max-age=86400';

    // Server identification (security through obscurity)
    headers['Server'] = 'TextArtTools-MCP/1.0';

    // Custom headers
    Object.assign(headers, this.config.customHeaders);

    return headers;
  }

  /**
   * Apply security headers to a response
   */
  applyHeaders(response: Response, requestId?: string): Response {
    const securityHeaders = this.getSecurityHeaders(requestId);

    // Create new response with security headers
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders)) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  /**
   * Create response with security headers
   */
  createSecureResponse(
    body: BodyInit | null,
    init: ResponseInit = {},
    requestId?: string
  ): Response {
    const securityHeaders = this.getSecurityHeaders(requestId);
    const headers = new Headers(init.headers);

    for (const [key, value] of Object.entries(securityHeaders)) {
      headers.set(key, value);
    }

    return new Response(body, {
      ...init,
      headers
    });
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }

  /**
   * Check if request has valid CSP nonce
   */
  validateNonce(requestId: string, providedNonce: string): boolean {
    const cached = this.nonceCache.get(requestId);
    if (!cached) return false;

    // Check if nonce matches and is not expired
    const now = Date.now();
    return cached.nonce === providedNonce && (now - cached.timestamp) < 300000;
  }

  /**
   * Generate inline script with nonce
   */
  generateSecureInlineScript(script: string, requestId?: string): string {
    const nonce = requestId ? this.getNonce(requestId) : this.generateNonce();
    return `<script nonce="${nonce}">${script}</script>`;
  }

  /**
   * Generate inline style with nonce
   */
  generateSecureInlineStyle(css: string, requestId?: string): string {
    const nonce = requestId ? this.getNonce(requestId) : this.generateNonce();
    return `<style nonce="${nonce}">${css}</style>`;
  }
}

/**
 * Create security headers middleware instance
 */
export function createSecurityHeaders(env: Env): SecurityHeaders {
  return new SecurityHeaders(env);
}

/**
 * Quick function to get basic security headers
 */
export function getBasicSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; font-src 'self' https: data:; object-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; upgrade-insecure-requests; block-all-mixed-content"
  };
}

/**
 * Validate CSP report
 */
export interface CSPReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

export function validateCSPReport(report: unknown): report is CSPReport {
  return (
    typeof report === 'object' &&
    report !== null &&
    typeof report['document-uri'] === 'string' &&
    typeof report['violated-directive'] === 'string' &&
    typeof report['blocked-uri'] === 'string'
  );
}