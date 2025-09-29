/**
 * Text Sanitizer for TextArtTools MCP Server
 * Implements output encoding for HTML, JSON, and plain text contexts with XSS prevention
 */

import type { UnicodeStyle } from '../types.js';

/**
 * Output encoding contexts
 */
export type EncodingContext = 'html' | 'json' | 'plain' | 'javascript' | 'css' | 'url' | 'attribute';

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  context: EncodingContext;
  preserveUnicode: boolean;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: string[];
  enableStrictMode: boolean;
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  sanitized: string;
  originalLength: number;
  sanitizedLength: number;
  encoding: EncodingContext;
  modifications: string[];
  warnings: string[];
  isSafe: boolean;
}

/**
 * Text sanitizer with comprehensive XSS prevention and output encoding
 */
export class TextSanitizer {
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  private static readonly JAVASCRIPT_ESCAPES: Record<string, string> = {
    '\\': '\\\\',
    '"': '\\"',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
    '\v': '\\v',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  };

  private static readonly CSS_ESCAPES: Record<string, string> = {
    '"': '\\"',
    "'": "\\'",
    '\\': '\\\\',
    '/': '\\/',
    '\n': '\\A ',
    '\r': '\\D ',
    '\t': '\\9 ',
    '\f': '\\C ',
    '\v': '\\B '
  };

  private static readonly URL_UNSAFE_CHARS = /[^A-Za-z0-9\-_.~]/g;

  private static readonly DANGEROUS_PROTOCOLS = [
    'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'mailto:',
    'tel:', 'sms:', 'callto:', 'sftp:', 'ssh:', 'telnet:'
  ];

  private static readonly XSS_PATTERNS: RegExp[] = [
    // Script tags
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<script[\s\S]*?>/gi,

    // Event handlers
    /on\w+\s*=\s*["']?[^"']*["']?/gi,

    // JavaScript URLs
    /href\s*=\s*["']?\s*javascript:/gi,
    /src\s*=\s*["']?\s*javascript:/gi,

    // Style expressions
    /expression\s*\(/gi,
    /behavior\s*:/gi,

    // Import statements
    /@import/gi,

    // Data URLs that might contain scripts
    /data:text\/html/gi,
    /data:image\/svg\+xml/gi,

    // Meta refresh redirects
    /<meta[\s\S]*?http-equiv[\s\S]*?refresh[\s\S]*?>/gi,

    // Object and embed tags
    /<(object|embed|applet|iframe)[\s\S]*?>/gi,

    // Form elements that could be dangerous
    /<form[\s\S]*?>/gi,
    /<input[\s\S]*?>/gi,
    /<textarea[\s\S]*?>/gi,

    // Link tags with dangerous rel attributes
    /<link[\s\S]*?rel\s*=\s*["']?\s*stylesheet[\s\S]*?>/gi
  ];

  /**
   * Sanitize text for safe output in specified context
   */
  static sanitize(
    text: string,
    options: Partial<SanitizationOptions> = {}
  ): SanitizationResult {
    const opts: SanitizationOptions = {
      context: 'plain',
      preserveUnicode: true,
      enableStrictMode: true,
      ...options
    };

    const originalLength = text.length;
    const modifications: string[] = [];
    const warnings: string[] = [];
    let sanitized = text;
    let isSafe = true;

    // 1. Basic safety checks
    if (typeof text !== 'string') {
      return {
        sanitized: '',
        originalLength: 0,
        sanitizedLength: 0,
        encoding: opts.context,
        modifications: ['Input was not a string'],
        warnings: ['Invalid input type'],
        isSafe: false
      };
    }

    // 2. Length validation
    if (opts.maxLength && text.length > opts.maxLength) {
      sanitized = text.substring(0, opts.maxLength);
      modifications.push(`Truncated to ${opts.maxLength} characters`);
    }

    // 3. XSS pattern detection and removal
    if (opts.enableStrictMode) {
      const xssResult = this.detectAndRemoveXSS(sanitized);
      sanitized = xssResult.cleaned;
      modifications.push(...xssResult.modifications);
      warnings.push(...xssResult.warnings);
      if (xssResult.hadViolations) {
        isSafe = false;
      }
    }

    // 4. Context-specific encoding
    switch (opts.context) {
      case 'html':
        sanitized = this.encodeHTML(sanitized);
        break;
      case 'json':
        sanitized = this.encodeJSON(sanitized);
        break;
      case 'javascript':
        sanitized = this.encodeJavaScript(sanitized);
        break;
      case 'css':
        sanitized = this.encodeCSS(sanitized);
        break;
      case 'url':
        sanitized = this.encodeURL(sanitized);
        break;
      case 'attribute':
        sanitized = this.encodeHTMLAttribute(sanitized);
        break;
      case 'plain':
      default:
        sanitized = this.encodePlainText(sanitized);
        break;
    }

    // 5. Unicode safety checks
    if (opts.preserveUnicode) {
      const unicodeResult = this.validateUnicodeSafety(sanitized);
      if (!unicodeResult.isSafe) {
        warnings.push(...unicodeResult.warnings);
        if (opts.enableStrictMode) {
          sanitized = unicodeResult.safeCopy;
          modifications.push('Removed unsafe Unicode characters');
        }
      }
    }

    return {
      sanitized,
      originalLength,
      sanitizedLength: sanitized.length,
      encoding: opts.context,
      modifications,
      warnings,
      isSafe
    };
  }

  /**
   * Detect and remove XSS patterns
   */
  private static detectAndRemoveXSS(text: string): {
    cleaned: string;
    modifications: string[];
    warnings: string[];
    hadViolations: boolean;
  } {
    let cleaned = text;
    const modifications: string[] = [];
    const warnings: string[] = [];
    let hadViolations = false;

    // Check for dangerous patterns
    for (const pattern of this.XSS_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        hadViolations = true;
        cleaned = cleaned.replace(pattern, '');
        modifications.push(`Removed XSS pattern: ${pattern.source}`);
        warnings.push(`Potential XSS attempt detected: ${matches[0].substring(0, 50)}...`);
      }
    }

    // Check for dangerous protocols
    for (const protocol of this.DANGEROUS_PROTOCOLS) {
      if (text.toLowerCase().includes(protocol)) {
        hadViolations = true;
        cleaned = cleaned.replace(new RegExp(protocol, 'gi'), '');
        modifications.push(`Removed dangerous protocol: ${protocol}`);
        warnings.push(`Dangerous protocol detected: ${protocol}`);
      }
    }

    // Check for encoded attacks
    const decodedChecks = [
      text.replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      decodeURIComponent(text.replace(/\+/g, ' ')),
      text.replace(/\\x/g, '').replace(/\\u/g, ''),
      text.replace(/%3C/gi, '<').replace(/%3E/gi, '>')
    ];

    for (const decoded of decodedChecks) {
      try {
        for (const pattern of this.XSS_PATTERNS) {
          if (pattern.test(decoded) && !pattern.test(text)) {
            hadViolations = true;
            warnings.push('Potential encoded XSS attack detected');
            break;
          }
        }
      } catch {
        // Ignore encoding errors
      }
    }

    return { cleaned, modifications, warnings, hadViolations };
  }

  /**
   * Encode for HTML context
   */
  private static encodeHTML(text: string): string {
    return text.replace(/[&<>"'`=\/]/g, (char) => this.HTML_ENTITIES[char] || char);
  }

  /**
   * Encode for HTML attribute context
   */
  private static encodeHTMLAttribute(text: string): string {
    // More aggressive encoding for attributes
    return text.replace(/[&<>"'`=\/\s]/g, (char) => {
      const code = char.charCodeAt(0);
      return `&#x${code.toString(16).toUpperCase()};`;
    });
  }

  /**
   * Encode for JSON context
   */
  private static encodeJSON(text: string): string {
    return JSON.stringify(text).slice(1, -1); // Remove surrounding quotes
  }

  /**
   * Encode for JavaScript context
   */
  private static encodeJavaScript(text: string): string {
    return text.replace(/[\\"'\n\r\t\b\f\v\0\u2028\u2029]/g, (char) => {
      return this.JAVASCRIPT_ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
  }

  /**
   * Encode for CSS context
   */
  private static encodeCSS(text: string): string {
    return text.replace(/["'\\\/\n\r\t\f\v]/g, (char) => {
      return this.CSS_ESCAPES[char] || `\\${char.charCodeAt(0).toString(16)} `;
    });
  }

  /**
   * Encode for URL context
   */
  private static encodeURL(text: string): string {
    return text.replace(this.URL_UNSAFE_CHARS, (char) => {
      return encodeURIComponent(char);
    });
  }

  /**
   * Encode for plain text context (minimal encoding)
   */
  private static encodePlainText(text: string): string {
    // Remove or replace dangerous control characters
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/[\uFEFF\u200B-\u200D\u2060\u2062-\u2063]/g, ''); // Remove zero-width chars
  }

  /**
   * Validate Unicode safety
   */
  private static validateUnicodeSafety(text: string): {
    isSafe: boolean;
    warnings: string[];
    safeCopy: string;
  } {
    const warnings: string[] = [];
    let safeCopy = text;
    let isSafe = true;

    // Check for Unicode direction override attacks
    const directionOverride = /[\u202A-\u202E\u2066-\u2069]/g;
    if (directionOverride.test(text)) {
      isSafe = false;
      warnings.push('Unicode direction override characters detected');
      safeCopy = safeCopy.replace(directionOverride, '');
    }

    // Check for homograph attacks (similar looking characters)
    const homographs = this.detectHomographs(text);
    if (homographs.length > 0) {
      warnings.push(`Potential homograph characters detected: ${homographs.join(', ')}`);
    }

    // Check for excessive combining marks (Zalgo)
    const combiningMarks = text.match(/[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g);
    if (combiningMarks && combiningMarks.length > text.replace(/\s/g, '').length * 0.3) {
      warnings.push('Excessive combining marks detected (potential Zalgo attack)');
    }

    // Check for null bytes and other dangerous characters
    if (text.includes('\0')) {
      isSafe = false;
      warnings.push('Null bytes detected');
      safeCopy = safeCopy.replace(/\0/g, '');
    }

    return { isSafe, warnings, safeCopy };
  }

  /**
   * Detect potential homograph characters
   */
  private static detectHomographs(text: string): string[] {
    const homographs: string[] = [];
    const suspiciousChars = new Map([
      ['а', 'Cyrillic a (looks like Latin a)'],
      ['е', 'Cyrillic e (looks like Latin e)'],
      ['о', 'Cyrillic o (looks like Latin o)'],
      ['р', 'Cyrillic p (looks like Latin p)'],
      ['с', 'Cyrillic c (looks like Latin c)'],
      ['х', 'Cyrillic x (looks like Latin x)'],
      ['ο', 'Greek omicron (looks like Latin o)'],
      ['α', 'Greek alpha (looks like Latin a)'],
      ['ν', 'Greek nu (looks like Latin v)'],
      ['ρ', 'Greek rho (looks like Latin p)']
    ]);

    for (const char of text) {
      if (suspiciousChars.has(char)) {
        homographs.push(suspiciousChars.get(char)!);
      }
    }

    return homographs;
  }

  /**
   * Sanitize text specifically for Unicode text styling
   */
  static sanitizeForTextStyling(text: string, style: UnicodeStyle): SanitizationResult {
    const options: SanitizationOptions = {
      context: 'plain',
      preserveUnicode: true,
      enableStrictMode: true,
      maxLength: style === 'zalgo' ? 500 : 10000 // Limit zalgo text length
    };

    const result = this.sanitize(text, options);

    // Additional checks for specific styles
    if (style === 'zalgo') {
      // Extra validation for zalgo to prevent DoS
      const combiningMarks = text.match(/[\u0300-\u036F]/g);
      if (combiningMarks && combiningMarks.length > 200) {
        result.warnings.push('Zalgo complexity reduced for performance');
        result.sanitized = text.substring(0, Math.max(100, text.length - combiningMarks.length + 200));
      }
    }

    return result;
  }

  /**
   * Sanitize for JSON-RPC response
   */
  static sanitizeForJSONRPC(data: unknown): unknown {
    if (typeof data === 'string') {
      const result = this.sanitize(data, { context: 'json', enableStrictMode: true });
      return result.sanitized;
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForJSONRPC(item));
    } else if (data !== null && typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitize(key, { context: 'json', enableStrictMode: true }).sanitized;
        sanitized[sanitizedKey] = this.sanitizeForJSONRPC(value);
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Validate and sanitize file paths
   */
  static sanitizeFilePath(path: string): { sanitized: string; isSafe: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let sanitized = path;
    let isSafe = true;

    // Remove path traversal attempts
    if (path.includes('..')) {
      isSafe = false;
      warnings.push('Path traversal attempt detected');
      sanitized = sanitized.replace(/\.\./g, '');
    }

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Ensure path doesn't start with dangerous prefixes
    const dangerousPrefixes = ['/', '\\', 'C:', 'D:', '/etc/', '/var/', '/tmp/', '/usr/'];
    for (const prefix of dangerousPrefixes) {
      if (sanitized.toLowerCase().startsWith(prefix.toLowerCase())) {
        isSafe = false;
        warnings.push(`Dangerous path prefix detected: ${prefix}`);
        sanitized = sanitized.substring(prefix.length);
      }
    }

    return { sanitized, isSafe, warnings };
  }
}

/**
 * Convenience functions for common sanitization tasks
 */

export function sanitizeHTML(text: string): string {
  return TextSanitizer.sanitize(text, { context: 'html' }).sanitized;
}

export function sanitizeJSON(text: string): string {
  return TextSanitizer.sanitize(text, { context: 'json' }).sanitized;
}

export function sanitizePlainText(text: string): string {
  return TextSanitizer.sanitize(text, { context: 'plain' }).sanitized;
}

export function sanitizeForStyle(text: string, style: UnicodeStyle): SanitizationResult {
  return TextSanitizer.sanitizeForTextStyling(text, style);
}

export function sanitizeJSONRPC(data: unknown): unknown {
  return TextSanitizer.sanitizeForJSONRPC(data);
}