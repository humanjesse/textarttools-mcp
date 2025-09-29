/**
 * Input Validation Security Tests
 * Tests input validator against malicious payloads and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputValidator, validateStyle } from '../security/input-validator.js';
import type { SecurityConfig } from '../security/input-validator.js';

describe('Input Validation Security Tests', () => {
  let validator: InputValidator;

  beforeEach(() => {
    const config: Partial<SecurityConfig> = {
      maxTextLength: 1000,
      maxZalgoComplexity: 50,
      enableStrictValidation: true,
      allowedUnicodeRanges: ['basic-latin', 'latin-1-supplement']
    };
    validator = new InputValidator(config);
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<svg onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')">',
      '<body onload=alert("xss")>',
      '<input type="text" onfocus="alert(\'xss\')" autofocus>',
      '<a href="javascript:void(0)" onclick="alert(\'xss\')">click</a>',
      '<div style="background-image:url(javascript:alert(\'xss\'))">',
      '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>',
      // Encoded XSS attempts
      '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E',
      '&lt;script&gt;alert("xss")&lt;/script&gt;',
      // Unicode encoded
      '\u003cscript\u003ealert("xss")\u003c/script\u003e'
    ];

    it.each(xssPayloads)('should block XSS payload: %s', (payload) => {
      const result = validator.validateText(payload, 'mcp-tool');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('dangerous pattern') ||
        error.includes('XSS') ||
        error.includes('script')
      )).toBe(true);
    });

    it('should handle nested and complex XSS attempts', () => {
      const complexPayloads = [
        '<div><script>alert("nested")</script></div>',
        '<IMG SRC="javascript:alert(\'XSS\');">',
        '<IMG SRC=javascript:alert(String.fromCharCode(88,83,83))>',
        '<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>',
        '<<SCRIPT>alert("XSS");//<</SCRIPT>'
      ];

      complexPayloads.forEach(payload => {
        const result = validator.validateText(payload, 'mcp-tool');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "'; DELETE FROM users WHERE '1'='1'; --",
      "1' OR '1'='1' /*",
      "' OR 1=1#",
      "'; EXEC xp_cmdshell('dir'); --",
      "' OR EXISTS(SELECT * FROM users) --"
    ];

    it.each(sqlPayloads)('should block SQL injection payload: %s', (payload) => {
      const result = validator.validateText(payload, 'mcp-tool');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('dangerous pattern') ||
        error.includes('SQL') ||
        error.includes('--') ||
        error.includes('SELECT') ||
        error.includes('DROP')
      )).toBe(true);
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ];

    it.each(pathTraversalPayloads)('should block path traversal payload: %s', (payload) => {
      const result = validator.validateText(payload, 'mcp-tool');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('dangerous pattern') ||
        error.includes('traversal')
      )).toBe(true);
    });
  });

  describe('Unicode Security', () => {
    it('should detect Unicode direction override attacks', () => {
      const directionOverridePayloads = [
        'Hello\u202AWorld\u202C', // LRO...PDF
        'Test\u202D\u202Ctext',   // LRO...PDF
        'Safe\u2066text\u2069',   // LRI...PDI
        'Normal\u2067text\u2069'  // RLI...PDI
      ];

      directionOverridePayloads.forEach(payload => {
        const result = validator.validateText(payload, 'mcp-tool');
        expect(result.warnings.some(warning =>
          warning.includes('direction') || warning.includes('Unicode')
        )).toBe(true);
      });
    });

    it('should detect homograph attacks', () => {
      const homographPayloads = [
        'раypal.com', // Cyrillic 'а' instead of Latin 'a'
        'gοοgle.com', // Greek omicron instead of Latin 'o'
        'аpple.com',  // Cyrillic 'а' instead of Latin 'a'
        'microsοft.com' // Greek omicron
      ];

      homographPayloads.forEach(payload => {
        const result = validator.validateText(payload, 'mcp-tool');
        expect(result.warnings.some(warning =>
          warning.includes('homograph') || warning.includes('character')
        )).toBe(true);
      });
    });

    it('should limit Zalgo complexity', () => {
      // Generate high-complexity Zalgo text
      let zalgoText = 'H';
      for (let i = 0; i < 100; i++) {
        zalgoText += String.fromCharCode(0x0300 + (i % 70)); // Combining marks
      }
      zalgoText += 'ello';

      const result = validator.validateText(zalgoText, 'mcp-tool');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('complexity') || error.includes('zalgo')
      )).toBe(true);
    });

    it('should block dangerous Unicode ranges in strict mode', () => {
      const dangerousUnicodePayloads = [
        'Hello\u0000World', // Null byte
        'Test\u001FText',   // Control character
        'Safe\uFEFFText',   // BOM
        'Normal\u200BText', // Zero-width space
        'Hidden\u2062Text'  // Invisible times
      ];

      dangerousUnicodePayloads.forEach(payload => {
        const result = validator.validateText(payload, 'mcp-tool');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Length and Performance Attacks', () => {
    it('should reject overly long text', () => {
      const longText = 'A'.repeat(10001);
      const result = validator.validateText(longText, 'mcp-tool');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('too long') || error.includes('length')
      )).toBe(true);
    });

    it('should detect excessive repetition', () => {
      const repetitiveText = 'A'.repeat(500);
      const result = validator.validateText(repetitiveText, 'mcp-tool');

      expect(result.warnings.some(warning =>
        warning.includes('repetitive') || warning.includes('performance')
      )).toBe(true);
    });

    it('should limit preview text length', () => {
      const longPreviewText = 'A'.repeat(100);
      const result = validator.validateText(longPreviewText, 'prompt');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('length')
      )).toBe(true);
    });
  });

  describe('Style Validation', () => {
    it('should accept valid styles', () => {
      const validStyles = [
        'normal', 'bold', 'italic', 'cursive', 'fraktur', 'zalgo'
      ];

      validStyles.forEach(style => {
        const result = validateStyle(style);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid styles', () => {
      const invalidStyles = [
        'invalid', 'script', 'malicious', '<script>', '../../etc'
      ];

      invalidStyles.forEach(style => {
        const result = validateStyle(style);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error =>
          error.includes('Invalid style')
        )).toBe(true);
      });
    });

    it('should validate style arrays', () => {
      const result = validator.validateStyleArray(['bold', 'italic', 'cursive']);
      expect(result.isValid).toBe(true);

      const invalidResult = validator.validateStyleArray(['bold', 'invalid', 'cursive']);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should limit style array size', () => {
      const tooManyStyles = Array(30).fill('bold');
      const result = validator.validateStyleArray(tooManyStyles);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Too many styles')
      )).toBe(true);
    });
  });

  describe('URI Validation', () => {
    it('should accept valid resource URIs', () => {
      const validURIs = [
        'textarttools://style-definitions',
        'textarttools://character-mappings',
        'textarttools://usage-examples',
        'textarttools://platform-compatibility'
      ];

      validURIs.forEach(uri => {
        const result = validator.validateURI(uri);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid URIs', () => {
      const invalidURIs = [
        'http://evil.com/malware',
        'file:///etc/passwd',
        'javascript:alert("xss")',
        'textarttools://../../etc/passwd',
        'ftp://attacker.com/payload',
        'data:text/html,<script>alert("xss")</script>'
      ];

      invalidURIs.forEach(uri => {
        const result = validator.validateURI(uri);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error =>
          error.includes('Invalid URI')
        )).toBe(true);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty input', () => {
      const result = validator.validateText('', 'mcp-tool');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('empty')
      )).toBe(true);
    });

    it('should handle null and undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nullResult = validator.validateText(null as any, 'mcp-tool');
      expect(nullResult.isValid).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const undefinedResult = validator.validateText(undefined as any, 'mcp-tool');
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should handle non-string input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numberResult = validator.validateText(123 as any, 'mcp-tool');
      expect(numberResult.isValid).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objectResult = validator.validateText({} as any, 'mcp-tool');
      expect(objectResult.isValid).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arrayResult = validator.validateText([] as any, 'mcp-tool');
      expect(arrayResult.isValid).toBe(false);
    });

    it('should normalize Unicode input', () => {
      // Test with composed vs decomposed Unicode
      const composed = 'é'; // U+00E9
      const decomposed = 'e\u0301'; // e + combining acute accent

      const composedResult = validator.validateText(composed, 'mcp-tool');
      const decomposedResult = validator.validateText(decomposed, 'mcp-tool');

      expect(composedResult.metadata.unicodeNormalized).toBe(true);
      expect(decomposedResult.metadata.unicodeNormalized).toBe(true);
    });

    it('should handle maximum valid input', () => {
      const maxText = 'A'.repeat(1000); // Within limit
      const result = validator.validateText(maxText, 'mcp-tool');

      expect(result.isValid).toBe(true);
      expect(result.metadata.originalLength).toBe(1000);
    });

    it('should detect mixed scripts', () => {
      const mixedScriptText = 'Hello мир こんにちは עולם';
      const result = validator.validateText(mixedScriptText, 'mcp-tool');

      expect(result.warnings.some(warning =>
        warning.includes('scripts') || warning.includes('multiple')
      )).toBe(true);
    });
  });

  describe('Performance and DoS Prevention', () => {
    it('should complete validation quickly for large valid input', () => {
      const largeText = 'Valid text '.repeat(100); // 1000 chars
      const startTime = Date.now();

      const result = validator.validateText(largeText, 'mcp-tool');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      expect(result.isValid).toBe(true);
    });

    it('should handle regex DoS attempts', () => {
      // Test with patterns that could cause catastrophic backtracking
      const regexDoSPatterns = [
        'a'.repeat(1000) + '!',
        '(' + 'a|a'.repeat(20) + ')*b',
        'x'.repeat(100) + 'y'.repeat(100)
      ];

      regexDoSPatterns.forEach(pattern => {
        const startTime = Date.now();
        validator.validateText(pattern, 'mcp-tool');
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should not hang
      });
    });
  });

  describe('Configuration Updates', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        maxTextLength: 500,
        enableStrictValidation: false
      };

      validator.updateConfig(newConfig);
      const config = validator.getConfig();

      expect(config.maxTextLength).toBe(500);
      expect(config.enableStrictValidation).toBe(false);
    });

    it('should validate with updated configuration', () => {
      validator.updateConfig({ maxTextLength: 100 });

      const longText = 'A'.repeat(150);
      const result = validator.validateText(longText, 'mcp-tool');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('100 characters')
      )).toBe(true);
    });
  });
});