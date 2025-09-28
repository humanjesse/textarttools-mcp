/**
 * Basic Security Utilities for TextArtTools MCP Server
 * Essential security features for public free tool
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
}

/**
 * Basic input sanitizer for text art tools
 * Focuses on essential security without complexity
 */
export class BasicInputSanitizer {
  private readonly maxTextLength: number;
  private readonly maxPreviewLength: number;
  private readonly dangerousPatterns: RegExp[];

  constructor() {
    this.maxTextLength = 10000;
    this.maxPreviewLength = 50;

    // Essential security patterns
    this.dangerousPatterns = [
      // Script injection attempts
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,

      // Basic SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|#|\*\/)/gi,

      // Path traversal attempts
      /\.\.\//gi,
      /\.\.\\\\/gi,

      // Null bytes and dangerous control characters
      /\x00/g,
      /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g,

      // Unicode direction override attacks
      /[\u202A-\u202E]/g,
      /[\u2066-\u2069]/g,

      // Excessive repeated characters (prevent rendering DoS)
      /(.)\1{100,}/g,
    ];
  }

  /**
   * Validate and sanitize text input
   */
  validateText(text: string, context: 'main' | 'preview' = 'main'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const maxLength = context === 'preview' ? this.maxPreviewLength : this.maxTextLength;

    // Basic type and length checks
    if (typeof text !== 'string') {
      errors.push('Input must be a string');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    if (text.length === 0) {
      errors.push('Input cannot be empty');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    if (text.length > maxLength) {
      errors.push(`Text too long. Maximum length is ${maxLength} characters`);
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    let sanitized = text;

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(sanitized)) {
        errors.push(`Input contains potentially dangerous content`);
        return { isValid: false, sanitizedValue: '', errors, warnings };
      }
    }

    // Check for excessive Zalgo text complexity (performance protection)
    const zalgoComplexity = this.calculateZalgoComplexity(sanitized);
    if (zalgoComplexity > 50) {
      warnings.push(`High text complexity detected (${zalgoComplexity}), may affect performance`);
      if (zalgoComplexity > 100) {
        errors.push('Text complexity too high, please use simpler text');
        return { isValid: false, sanitizedValue: '', errors, warnings };
      }
    }

    // Check for homograph attacks (basic)
    if (this.detectHomographAttack(sanitized)) {
      warnings.push('Potential homograph characters detected');
    }

    // Normalize Unicode (basic normalization)
    try {
      sanitized = sanitized.normalize('NFC');
    } catch (error) {
      warnings.push('Unicode normalization failed, using original text');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors,
      warnings
    };
  }

  /**
   * Validate style parameter
   */
  validateStyle(style: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof style !== 'string') {
      errors.push('Style must be a string');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    const allowedStyles = new Set([
      'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
      'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
      'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
      'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
      'boldItalicSerif', 'boldFraktur'
    ]);

    const sanitized = style.toLowerCase().trim();

    if (!allowedStyles.has(sanitized)) {
      errors.push(`Invalid style: ${style}. Use list_available_styles to see valid options`);
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    return {
      isValid: true,
      sanitizedValue: sanitized,
      errors,
      warnings
    };
  }

  /**
   * Validate font parameter for ASCII art
   */
  validateFont(font: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof font !== 'string') {
      errors.push('Font must be a string');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    // Basic font name validation (alphanumeric, hyphens, underscores)
    const fontNamePattern = /^[a-zA-Z0-9_\-\s]+$/;
    const sanitized = font.trim();

    if (!fontNamePattern.test(sanitized)) {
      errors.push('Font name contains invalid characters');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    if (sanitized.length > 50) {
      errors.push('Font name too long');
      return { isValid: false, sanitizedValue: '', errors, warnings };
    }

    return {
      isValid: true,
      sanitizedValue: sanitized,
      errors,
      warnings
    };
  }

  /**
   * Calculate Zalgo text complexity score
   */
  private calculateZalgoComplexity(text: string): number {
    let complexity = 0;

    for (const char of text) {
      const codePoint = char.codePointAt(0) || 0;

      // Count combining marks (diacritics)
      if ((codePoint >= 0x0300 && codePoint <= 0x036F) || // Combining Diacritical Marks
          (codePoint >= 0x1AB0 && codePoint <= 0x1AFF) || // Combining Diacritical Marks Extended
          (codePoint >= 0x1DC0 && codePoint <= 0x1DFF) || // Combining Diacritical Marks Supplement
          (codePoint >= 0x20D0 && codePoint <= 0x20FF) || // Combining Diacritical Marks for Symbols
          (codePoint >= 0xFE20 && codePoint <= 0xFE2F)) { // Combining Half Marks
        complexity += 2;
      }

      // Count unusual Unicode ranges
      if (codePoint > 0x1000) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * Detect potential homograph attacks (basic detection)
   */
  private detectHomographAttack(text: string): boolean {
    // Look for mixing of different scripts that could be confusing
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasGreek = /[\u0370-\u03FF]/.test(text);

    // If mixing multiple scripts, it could be a homograph attack
    const scriptCount = [hasLatin, hasCyrillic, hasGreek].filter(Boolean).length;
    return scriptCount > 1;
  }
}

/**
 * Enhanced rate limiter with burst protection
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
}

export class EnhancedRateLimiter {
  private readonly perMinuteLimit: number;
  private readonly burstLimit: number;
  private readonly burstWindow: number; // in seconds

  constructor(perMinuteLimit: number = 100, burstLimit: number = 10) {
    this.perMinuteLimit = perMinuteLimit;
    this.burstLimit = burstLimit;
    this.burstWindow = 10; // 10 seconds
  }

  /**
   * Check both per-minute and burst rate limits
   */
  async checkRateLimit(kv: KVNamespace, identifier: string): Promise<RateLimitResult> {
    const now = Date.now();

    // Check burst limit (10 seconds window)
    const burstResult = await this.checkBurstLimit(kv, identifier, now);
    if (!burstResult.allowed) {
      return burstResult;
    }

    // Check per-minute limit
    return await this.checkPerMinuteLimit(kv, identifier, now);
  }

  private async checkBurstLimit(kv: KVNamespace, identifier: string, now: number): Promise<RateLimitResult> {
    const burstKey = `burst:${identifier}`;
    const windowStart = Math.floor(now / (this.burstWindow * 1000)) * (this.burstWindow * 1000);

    try {
      const burstData = await kv.get(burstKey);
      let requests = 1;

      if (burstData) {
        const parsed = JSON.parse(burstData);
        if (parsed.window === windowStart) {
          requests = parsed.requests + 1;
        }
      }

      if (requests > this.burstLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + (this.burstWindow * 1000),
          error: `Burst limit exceeded. Maximum ${this.burstLimit} requests per ${this.burstWindow} seconds`
        };
      }

      // Update burst counter
      // Note: Cloudflare KV requires minimum TTL of 60 seconds
      await kv.put(
        burstKey,
        JSON.stringify({ requests, window: windowStart }),
        { expirationTtl: Math.max(60, this.burstWindow * 2) }
      );

      return {
        allowed: true,
        remaining: this.burstLimit - requests,
        resetTime: windowStart + (this.burstWindow * 1000)
      };

    } catch (error) {
      console.error('Burst rate limit check failed:', error);
      // Allow request if rate limiting fails
      return {
        allowed: true,
        remaining: this.burstLimit,
        resetTime: windowStart + (this.burstWindow * 1000)
      };
    }
  }

  private async checkPerMinuteLimit(kv: KVNamespace, identifier: string, now: number): Promise<RateLimitResult> {
    const minuteKey = `rate:${identifier}`;
    const windowStart = Math.floor(now / 60000) * 60000;

    try {
      const minuteData = await kv.get(minuteKey);
      let requests = 1;

      if (minuteData) {
        const parsed = JSON.parse(minuteData);
        if (parsed.window === windowStart) {
          requests = parsed.requests + 1;
        }
      }

      if (requests > this.perMinuteLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + 60000,
          error: `Rate limit exceeded. Maximum ${this.perMinuteLimit} requests per minute`
        };
      }

      // Update minute counter
      await kv.put(
        minuteKey,
        JSON.stringify({ requests, window: windowStart }),
        { expirationTtl: 120 } // Keep for 2 minutes
      );

      return {
        allowed: true,
        remaining: this.perMinuteLimit - requests,
        resetTime: windowStart + 60000
      };

    } catch (error) {
      console.error('Per-minute rate limit check failed:', error);
      // Allow request if rate limiting fails
      return {
        allowed: true,
        remaining: this.perMinuteLimit,
        resetTime: windowStart + 60000
      };
    }
  }
}

/**
 * Basic security logger for monitoring
 */
export interface SecurityEvent {
  type: 'VALIDATION_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_PATTERN' | 'ERROR';
  message: string;
  clientIp: string;
  userAgent?: string;
  requestId: string;
  timestamp: number;
  details?: any;
}

export class BasicSecurityLogger {
  /**
   * Log security events to console (can be enhanced to send to external service)
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      severity: this.getSeverity(event.type),
      formatted: `[SECURITY] ${event.type}: ${event.message} | IP: ${event.clientIp} | ID: ${event.requestId}`
    };

    // Log to console (in production, this would go to logging service)
    if (logEntry.severity === 'HIGH') {
      console.error(logEntry.formatted, logEntry);
    } else if (logEntry.severity === 'MEDIUM') {
      console.warn(logEntry.formatted, logEntry);
    } else {
      console.log(logEntry.formatted, logEntry);
    }
  }

  private getSeverity(type: SecurityEvent['type']): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (type) {
      case 'SUSPICIOUS_PATTERN':
      case 'RATE_LIMIT_EXCEEDED':
        return 'HIGH';
      case 'VALIDATION_FAILURE':
        return 'MEDIUM';
      case 'ERROR':
        return 'LOW';
      default:
        return 'LOW';
    }
  }
}

// Export instances for use in the application
export const inputSanitizer = new BasicInputSanitizer();
export const enhancedRateLimiter = new EnhancedRateLimiter();
export const securityLogger = new BasicSecurityLogger();