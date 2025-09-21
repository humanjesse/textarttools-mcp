/**
 * Comprehensive Input Validator for TextArtTools MCP Server
 * Implements allowlist-based validation with Unicode safety and injection prevention
 */

import type { UnicodeStyle } from '../types.js';
import { ValidationError } from '../types.js';

/**
 * Security configuration for input validation
 */
export interface SecurityConfig {
  maxTextLength: number;
  maxZalgoComplexity: number;
  allowedUnicodeRanges: string[];
  enableStrictValidation: boolean;
  allowedOrigins: string[];
  rateLimitConfig: {
    authenticated: number;
    anonymous: number;
    burst: number;
  };
}

/**
 * Input validation result
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
  metadata: {
    originalLength: number;
    sanitizedLength: number;
    unicodeNormalized: boolean;
    complexityScore?: number;
  };
}

/**
 * Comprehensive input validator with security-first approach
 */
export class InputValidator {
  private config: SecurityConfig;
  private allowedStyles: Set<string>;
  private dangerousPatterns: RegExp[];
  private allowedUnicodeRanges: Map<string, [number, number]>;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      maxTextLength: 10000,
      maxZalgoComplexity: 100,
      allowedUnicodeRanges: ['basic-latin', 'latin-1-supplement', 'latin-extended-a', 'latin-extended-b'],
      enableStrictValidation: true,
      allowedOrigins: ['https://claude.ai', 'http://localhost:3000', 'http://localhost:8788'],
      rateLimitConfig: {
        authenticated: 1000,
        anonymous: 100,
        burst: 50
      },
      ...config
    };

    this.allowedStyles = new Set([
      'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
      'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
      'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
      'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
      'boldItalicSerif', 'boldFraktur'
    ]);

    this.dangerousPatterns = [
      // Script injection attempts
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,

      // SQL injection patterns (defense in depth)
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|#|\*\/)/gi,

      // Path traversal attempts
      /\.\.\//gi,
      /\.\.\\\\/gi,

      // Null bytes and control characters
      /\x00/g,
      /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g,

      // Unicode direction override (for text direction attacks)
      /[\u202A-\u202E]/g,
      /[\u2066-\u2069]/g,

      // Excessive repeated characters (potential DoS)
      /(.)\1{100,}/g,

      // Hidden/invisible characters that could be malicious
      /[\uFEFF\u200B-\u200D\u2060\u2062-\u2063]/g
    ];

    // Unicode range definitions
    this.allowedUnicodeRanges = new Map([
      ['basic-latin', [0x0000, 0x007F]],
      ['latin-1-supplement', [0x0080, 0x00FF]],
      ['latin-extended-a', [0x0100, 0x017F]],
      ['latin-extended-b', [0x0180, 0x024F]],
      ['ipa-extensions', [0x0250, 0x02AF]],
      ['spacing-modifier-letters', [0x02B0, 0x02FF]],
      ['combining-diacritical-marks', [0x0300, 0x036F]],
      ['greek-coptic', [0x0370, 0x03FF]],
      ['cyrillic', [0x0400, 0x04FF]],
      ['mathematical-alphanumeric', [0x1D400, 0x1D7FF]],
      ['mathematical-operators', [0x2200, 0x22FF]],
      ['miscellaneous-symbols', [0x2600, 0x26FF]],
      ['dingbats', [0x2700, 0x27BF]],
      ['enclosed-alphanumerics', [0x2460, 0x24FF]],
      ['enclosed-alphanumeric-supplement', [0x1F100, 0x1F1FF]],
      ['regional-indicator-symbols', [0x1F1E6, 0x1F1FF]]
    ]);
  }

  /**
   * Validate text input with comprehensive security checks
   */
  validateText(text: string, context: 'mcp-tool' | 'prompt' | 'resource' = 'mcp-tool'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const originalLength = text.length;
    let sanitizedValue = text;
    let unicodeNormalized = false;

    // 1. Basic validation
    if (typeof text !== 'string') {
      errors.push('Input must be a string');
      return this.createValidationResult(false, '', errors, warnings, originalLength, 0, unicodeNormalized);
    }

    if (text.length === 0) {
      errors.push('Text cannot be empty');
      return this.createValidationResult(false, '', errors, warnings, originalLength, 0, unicodeNormalized);
    }

    // 2. Length validation (context-specific)
    const maxLength = this.getMaxLengthForContext(context);
    if (text.length > maxLength) {
      errors.push(`Text too long. Maximum length: ${maxLength} characters, got: ${text.length}`);
      return this.createValidationResult(false, '', errors, warnings, originalLength, 0, unicodeNormalized);
    }

    // 3. Unicode normalization (prevents encoding attacks)
    try {
      sanitizedValue = sanitizedValue.normalize('NFC');
      unicodeNormalized = true;
    } catch (error) {
      errors.push('Failed to normalize Unicode characters');
      return this.createValidationResult(false, '', errors, warnings, originalLength, 0, unicodeNormalized);
    }

    // 4. Dangerous pattern detection
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(sanitizedValue)) {
        errors.push(`Text contains potentially dangerous pattern: ${pattern.source}`);
      }
    }

    // 5. Unicode range validation
    if (this.config.enableStrictValidation) {
      const { isValid: rangeValid, sanitized: rangeSanitized, violations } = this.validateUnicodeRanges(sanitizedValue);
      if (!rangeValid) {
        if (violations.length > 10) {
          errors.push(`Text contains ${violations.length} characters outside allowed Unicode ranges`);
        } else {
          warnings.push(`Some characters were filtered: ${violations.join(', ')}`);
        }
      }
      sanitizedValue = rangeSanitized;
    }

    // 6. Zalgo complexity check (for zalgo style or any excessive combining marks)
    const complexityScore = this.calculateZalgoComplexity(sanitizedValue);
    if (complexityScore > this.config.maxZalgoComplexity) {
      errors.push(`Text complexity too high (${complexityScore}). Maximum allowed: ${this.config.maxZalgoComplexity}`);
    }

    // 7. Additional context-specific validation
    if (context === 'mcp-tool') {
      const toolValidation = this.validateMCPToolInput(sanitizedValue);
      errors.push(...toolValidation.errors);
      warnings.push(...toolValidation.warnings);
    }

    const isValid = errors.length === 0;
    const finalLength = sanitizedValue.length;

    return this.createValidationResult(
      isValid,
      sanitizedValue,
      errors,
      warnings,
      originalLength,
      finalLength,
      unicodeNormalized,
      complexityScore
    );
  }

  /**
   * Validate style parameter
   */
  validateStyle(style: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof style !== 'string') {
      errors.push('Style must be a string');
      return this.createValidationResult(false, '', errors, warnings, 0, 0, false);
    }

    if (!this.allowedStyles.has(style)) {
      errors.push(`Invalid style: ${style}. Allowed styles: ${Array.from(this.allowedStyles).join(', ')}`);
      return this.createValidationResult(false, '', errors, warnings, style.length, 0, false);
    }

    return this.createValidationResult(true, style, errors, warnings, style.length, style.length, false);
  }

  /**
   * Validate array of styles
   */
  validateStyleArray(styles: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validStyles: string[] = [];

    if (!Array.isArray(styles)) {
      errors.push('Styles must be an array');
      return this.createValidationResult(false, '', errors, warnings, 0, 0, false);
    }

    if (styles.length === 0) {
      errors.push('Styles array cannot be empty');
      return this.createValidationResult(false, '', errors, warnings, 0, 0, false);
    }

    if (styles.length > 25) {
      errors.push(`Too many styles requested. Maximum: 25, got: ${styles.length}`);
      return this.createValidationResult(false, '', errors, warnings, 0, 0, false);
    }

    for (const style of styles) {
      const styleValidation = this.validateStyle(style);
      if (styleValidation.isValid) {
        validStyles.push(style);
      } else {
        errors.push(...styleValidation.errors);
      }
    }

    const isValid = errors.length === 0 && validStyles.length > 0;
    return this.createValidationResult(
      isValid,
      JSON.stringify(validStyles),
      errors,
      warnings,
      styles.length,
      validStyles.length,
      false
    );
  }

  /**
   * Validate URI parameter for resources
   */
  validateURI(uri: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof uri !== 'string') {
      errors.push('URI must be a string');
      return this.createValidationResult(false, '', errors, warnings, 0, 0, false);
    }

    const allowedURIs = [
      'textarttools://style-definitions',
      'textarttools://character-mappings',
      'textarttools://usage-examples',
      'textarttools://platform-compatibility'
    ];

    if (!allowedURIs.includes(uri)) {
      errors.push(`Invalid URI: ${uri}. Allowed URIs: ${allowedURIs.join(', ')}`);
      return this.createValidationResult(false, '', errors, warnings, uri.length, 0, false);
    }

    return this.createValidationResult(true, uri, errors, warnings, uri.length, uri.length, false);
  }

  /**
   * Calculate Zalgo complexity (combining marks density)
   */
  private calculateZalgoComplexity(text: string): number {
    let combiningMarks = 0;
    let baseCharacters = 0;

    for (const char of text) {
      const codePoint = char.codePointAt(0);
      if (codePoint !== undefined) {
        // Combining diacritical marks (0x0300-0x036F and other ranges)
        if ((codePoint >= 0x0300 && codePoint <= 0x036F) ||
            (codePoint >= 0x1AB0 && codePoint <= 0x1AFF) ||
            (codePoint >= 0x1DC0 && codePoint <= 0x1DFF) ||
            (codePoint >= 0x20D0 && codePoint <= 0x20FF) ||
            (codePoint >= 0xFE20 && codePoint <= 0xFE2F)) {
          combiningMarks++;
        } else {
          baseCharacters++;
        }
      }
    }

    // Calculate complexity as ratio of combining marks to base characters
    return baseCharacters > 0 ? Math.round((combiningMarks / baseCharacters) * 100) : 0;
  }

  /**
   * Validate Unicode character ranges
   */
  private validateUnicodeRanges(text: string): { isValid: boolean; sanitized: string; violations: string[] } {
    const violations: string[] = [];
    const allowedChars: string[] = [];

    for (const char of text) {
      const codePoint = char.codePointAt(0);
      if (codePoint !== undefined) {
        let isAllowed = false;

        for (const rangeName of this.config.allowedUnicodeRanges) {
          const range = this.allowedUnicodeRanges.get(rangeName);
          if (range && codePoint >= range[0] && codePoint <= range[1]) {
            isAllowed = true;
            break;
          }
        }

        if (isAllowed) {
          allowedChars.push(char);
        } else {
          violations.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
        }
      }
    }

    return {
      isValid: violations.length === 0,
      sanitized: allowedChars.join(''),
      violations
    };
  }

  /**
   * MCP tool specific validation
   */
  private validateMCPToolInput(text: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for excessive whitespace
    const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
    if (whitespaceRatio > 0.8) {
      warnings.push('Text contains excessive whitespace');
    }

    // Check for potential performance issues
    const uniqueChars = new Set(text).size;
    if (text.length > 1000 && uniqueChars < 10) {
      warnings.push('Text appears to be highly repetitive, may cause performance issues');
    }

    // Check for mixed scripts that could indicate spoofing attempts
    const scripts = this.detectScripts(text);
    if (scripts.size > 3) {
      warnings.push(`Text contains multiple scripts: ${Array.from(scripts).join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * Detect Unicode scripts in text
   */
  private detectScripts(text: string): Set<string> {
    const scripts = new Set<string>();

    for (const char of text) {
      const codePoint = char.codePointAt(0);
      if (codePoint !== undefined) {
        if (codePoint >= 0x0000 && codePoint <= 0x007F) scripts.add('Latin');
        else if (codePoint >= 0x0370 && codePoint <= 0x03FF) scripts.add('Greek');
        else if (codePoint >= 0x0400 && codePoint <= 0x04FF) scripts.add('Cyrillic');
        else if (codePoint >= 0x0590 && codePoint <= 0x05FF) scripts.add('Hebrew');
        else if (codePoint >= 0x0600 && codePoint <= 0x06FF) scripts.add('Arabic');
        else if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) scripts.add('Han');
        else if (codePoint >= 0x3040 && codePoint <= 0x309F) scripts.add('Hiragana');
        else if (codePoint >= 0x30A0 && codePoint <= 0x30FF) scripts.add('Katakana');
        else scripts.add('Other');
      }
    }

    return scripts;
  }

  /**
   * Get maximum length for different contexts
   */
  private getMaxLengthForContext(context: 'mcp-tool' | 'prompt' | 'resource'): number {
    switch (context) {
      case 'mcp-tool': return this.config.maxTextLength;
      case 'prompt': return 50; // Preview text should be short
      case 'resource': return 1000; // Resource identifiers should be reasonable
      default: return this.config.maxTextLength;
    }
  }

  /**
   * Create standardized validation result
   */
  private createValidationResult(
    isValid: boolean,
    sanitizedValue: string,
    errors: string[],
    warnings: string[],
    originalLength: number,
    sanitizedLength: number,
    unicodeNormalized: boolean,
    complexityScore?: number
  ): ValidationResult {
    return {
      isValid,
      sanitizedValue,
      errors,
      warnings,
      metadata: {
        originalLength,
        sanitizedLength,
        unicodeNormalized,
        complexityScore
      }
    };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance for global use
 */
let globalValidator: InputValidator | null = null;

/**
 * Get or create global validator instance
 */
export function getValidator(config?: Partial<SecurityConfig>): InputValidator {
  if (!globalValidator) {
    globalValidator = new InputValidator(config);
  }
  return globalValidator;
}

/**
 * Convenience function for text validation
 */
export function validateText(text: string, context?: 'mcp-tool' | 'prompt' | 'resource'): ValidationResult {
  return getValidator().validateText(text, context);
}

/**
 * Convenience function for style validation
 */
export function validateStyle(style: string): ValidationResult {
  return getValidator().validateStyle(style);
}

/**
 * Convenience function for style array validation
 */
export function validateStyleArray(styles: string[]): ValidationResult {
  return getValidator().validateStyleArray(styles);
}

/**
 * Convenience function for URI validation
 */
export function validateURI(uri: string): ValidationResult {
  return getValidator().validateURI(uri);
}