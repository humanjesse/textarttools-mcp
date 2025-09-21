/**
 * XSS Prevention Security Tests
 * Tests text sanitizer against XSS attacks and output encoding
 */

import { describe, it, expect } from 'vitest';
import {
  TextSanitizer,
  sanitizeHTML,
  sanitizeJSON,
  sanitizePlainText,
  sanitizeForStyle
} from '../security/text-sanitizer.js';
import type { EncodingContext } from '../security/text-sanitizer.js';

describe('XSS Prevention Security Tests', () => {
  describe('HTML Context XSS Prevention', () => {
    const htmlXSSPayloads = [
      // Basic script injection
      {
        input: '<script>alert("xss")</script>',
        description: 'Basic script tag'
      },
      {
        input: '<img src=x onerror=alert("xss")>',
        description: 'Image with onerror event'
      },
      {
        input: '<svg onload=alert("xss")>',
        description: 'SVG with onload event'
      },
      {
        input: '<iframe src="javascript:alert(\'xss\')">',
        description: 'Iframe with javascript URL'
      },
      {
        input: '<body onload=alert("xss")>',
        description: 'Body with onload event'
      },
      // Event handler variations
      {
        input: '<div onclick="alert(\'xss\')">Click me</div>',
        description: 'Div with onclick event'
      },
      {
        input: '<input type="text" onfocus="alert(\'xss\')" autofocus>',
        description: 'Input with onfocus event'
      },
      {
        input: '<a href="javascript:void(0)" onclick="alert(\'xss\')">link</a>',
        description: 'Link with javascript href and onclick'
      },
      // Style-based XSS
      {
        input: '<div style="background-image:url(javascript:alert(\'xss\'))">',
        description: 'Style with javascript URL'
      },
      {
        input: '<div style="expression(alert(\'xss\'))">',
        description: 'Style with expression'
      },
      // Meta and object tags
      {
        input: '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">',
        description: 'Meta refresh with javascript'
      },
      {
        input: '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>',
        description: 'Object with data URL'
      },
      {
        input: '<embed src="data:text/html,<script>alert(\'xss\')</script>">',
        description: 'Embed with data URL'
      },
      // Form elements
      {
        input: '<form action="javascript:alert(\'xss\')"><input type="submit"></form>',
        description: 'Form with javascript action'
      },
      {
        input: '<textarea onfocus="alert(\'xss\')" autofocus></textarea>',
        description: 'Textarea with onfocus event'
      }
    ];

    it.each(htmlXSSPayloads)('should sanitize HTML XSS: $description', ({ input }) => {
      const result = TextSanitizer.sanitize(input, {
        context: 'html',
        enableStrictMode: true
      });

      expect(result.isSafe).toBe(false);
      expect(result.sanitized).not.toContain('<script');
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('onload=');
      expect(result.sanitized).not.toContain('onerror=');
      expect(result.modifications.length).toBeGreaterThan(0);
    });

    it('should properly encode HTML entities', () => {
      const dangerousChars = '&<>"\'`=/';
      const result = sanitizeHTML(dangerousChars);

      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x60;');
      expect(result).toContain('&#x3D;');
      expect(result).toContain('&#x2F;');
    });

    it('should handle nested and complex XSS attempts', () => {
      const complexPayloads = [
        '<<SCRIPT>alert("XSS");//<</SCRIPT>',
        '<IMG SRC="javascript:alert(\'XSS\');">',
        '<IMG SRC=javascript:alert(String.fromCharCode(88,83,83))>',
        '<IMG SRC=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>',
        '<SCRIPT/XSS SRC="http://xss.rocks/xss.js"></SCRIPT>',
        '<BODY onload!#$%&()*~+-_.,:;?@[/|\\]^`=alert("XSS")>',
        '<SCRIPT/SRC="http://xss.rocks/xss.js"></SCRIPT>'
      ];

      complexPayloads.forEach(payload => {
        const result = TextSanitizer.sanitize(payload, {
          context: 'html',
          enableStrictMode: true
        });

        expect(result.isSafe).toBe(false);
        expect(result.modifications.some(mod =>
          mod.includes('XSS') || mod.includes('script') || mod.includes('dangerous')
        )).toBe(true);
      });
    });
  });

  describe('JavaScript Context XSS Prevention', () => {
    const jsXSSPayloads = [
      {
        input: '"; alert("xss"); //',
        description: 'String escape with alert'
      },
      {
        input: '\'; alert(\'xss\'); //',
        description: 'Single quote escape'
      },
      {
        input: '\\"; alert("xss"); //',
        description: 'Backslash escape attempt'
      },
      {
        input: '\n alert("xss"); //',
        description: 'Newline injection'
      },
      {
        input: '\r alert("xss"); //',
        description: 'Carriage return injection'
      },
      {
        input: '\u2028 alert("xss"); //',
        description: 'Line separator injection'
      },
      {
        input: '\u2029 alert("xss"); //',
        description: 'Paragraph separator injection'
      }
    ];

    it.each(jsXSSPayloads)('should sanitize JavaScript XSS: $description', ({ input }) => {
      const result = TextSanitizer.sanitize(input, {
        context: 'javascript',
        enableStrictMode: true
      });

      expect(result.sanitized).not.toContain('alert');
      expect(result.sanitized).toContain('\\');
    });

    it('should properly escape JavaScript special characters', () => {
      const jsSpecialChars = '\\"\'\n\r\t\b\f\v\0\u2028\u2029';
      const result = TextSanitizer.sanitize(jsSpecialChars, {
        context: 'javascript'
      });

      expect(result.sanitized).toContain('\\\\');
      expect(result.sanitized).toContain('\\"');
      expect(result.sanitized).toContain("\\'");
      expect(result.sanitized).toContain('\\n');
      expect(result.sanitized).toContain('\\r');
      expect(result.sanitized).toContain('\\t');
    });
  });

  describe('CSS Context XSS Prevention', () => {
    const cssXSSPayloads = [
      {
        input: '"; background-image: url(javascript:alert("xss")); "',
        description: 'CSS with javascript URL'
      },
      {
        input: 'expression(alert("xss"))',
        description: 'CSS expression'
      },
      {
        input: '@import url("javascript:alert(\'xss\')")',
        description: 'CSS import with javascript'
      },
      {
        input: 'behavior: url("javascript:alert(\'xss\')")',
        description: 'CSS behavior with javascript'
      }
    ];

    it.each(cssXSSPayloads)('should sanitize CSS XSS: $description', ({ input }) => {
      const result = TextSanitizer.sanitize(input, {
        context: 'css',
        enableStrictMode: true
      });

      expect(result.isSafe).toBe(false);
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('expression');
      expect(result.sanitized).not.toContain('@import');
    });

    it('should properly escape CSS special characters', () => {
      const cssSpecialChars = '"\'\\\/\n\r\t\f\v';
      const result = TextSanitizer.sanitize(cssSpecialChars, {
        context: 'css'
      });

      expect(result.sanitized).toContain('\\"');
      expect(result.sanitized).toContain("\\'");
      expect(result.sanitized).toContain('\\\\');
      expect(result.sanitized).toContain('\\/');
    });
  });

  describe('URL Context XSS Prevention', () => {
    const urlXSSPayloads = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'vbscript:alert("xss")',
      'file:///etc/passwd',
      'mailto:user@domain.com?subject=<script>alert("xss")</script>'
    ];

    it.each(urlXSSPayloads)('should sanitize URL XSS: %s', (input) => {
      const result = TextSanitizer.sanitize(input, {
        context: 'url',
        enableStrictMode: true
      });

      expect(result.isSafe).toBe(false);
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toContain('vbscript:');
      expect(result.sanitized).not.toContain('<script');
    });

    it('should properly encode unsafe URL characters', () => {
      const unsafeChars = ' <>"{}|\\^`[]';
      const result = TextSanitizer.sanitize(unsafeChars, {
        context: 'url'
      });

      expect(result.sanitized).toContain('%20'); // space
      expect(result.sanitized).toContain('%3C'); // <
      expect(result.sanitized).toContain('%3E'); // >
      expect(result.sanitized).toContain('%22'); // "
    });
  });

  describe('JSON Context XSS Prevention', () => {
    it('should prevent JSON injection', () => {
      const jsonXSSPayloads = [
        '"; alert("xss"); var x = "',
        '\"; alert(\"xss\"); var x = \"',
        '\\"; alert("xss"); //',
        '\n"; alert("xss"); //'
      ];

      jsonXSSPayloads.forEach(payload => {
        const result = sanitizeJSON(payload);
        expect(result).not.toContain('alert');
        expect(result).toContain('\\"');
      });
    });

    it('should handle JSON special characters', () => {
      const jsonSpecialChars = '"\\\n\r\t\b\f';
      const result = sanitizeJSON(jsonSpecialChars);

      expect(result).toContain('\\"');
      expect(result).toContain('\\\\');
      expect(result).toContain('\\n');
      expect(result).toContain('\\r');
      expect(result).toContain('\\t');
    });
  });

  describe('Attribute Context XSS Prevention', () => {
    it('should aggressively encode attribute values', () => {
      const attributeXSS = 'value" onmouseover="alert(\'xss\')" x="';
      const result = TextSanitizer.sanitize(attributeXSS, {
        context: 'attribute',
        enableStrictMode: true
      });

      expect(result.sanitized).not.toContain('onmouseover');
      expect(result.sanitized).toContain('&#x');
    });

    it('should encode all potentially dangerous attribute characters', () => {
      const dangerousAttrChars = '&<>"\'`=/ \t\n\r';
      const result = TextSanitizer.sanitize(dangerousAttrChars, {
        context: 'attribute'
      });

      // Should be hex-encoded
      expect(result.sanitized).toMatch(/&#x[0-9A-F]+;/);
    });
  });

  describe('Plain Text Context Security', () => {
    it('should remove control characters', () => {
      const controlChars = '\x00\x01\x02\x08\x0B\x0C\x0E\x1F\x7F';
      const result = sanitizePlainText(controlChars);

      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
      expect(result).not.toContain('\x1F');
    });

    it('should remove zero-width characters', () => {
      const zeroWidthChars = '\uFEFF\u200B\u200C\u200D\u2060\u2062\u2063';
      const result = sanitizePlainText(zeroWidthChars);

      expect(result).toBe('');
    });

    it('should preserve normal text', () => {
      const normalText = 'Hello, World! 123 @#$%';
      const result = sanitizePlainText(normalText);

      expect(result).toBe(normalText);
    });
  });

  describe('Unicode-specific XSS Prevention', () => {
    it('should detect and handle Unicode direction override attacks', () => {
      const directionAttacks = [
        'Hello\u202AEvil\u202CWorld',
        'Safe\u202D<script>\u202CText',
        'Normal\u2066javascript:\u2069URL'
      ];

      directionAttacks.forEach(attack => {
        const result = TextSanitizer.sanitize(attack, {
          context: 'html',
          enableStrictMode: true,
          preserveUnicode: true
        });

        expect(result.warnings.some(warning =>
          warning.includes('direction override')
        )).toBe(true);
      });
    });

    it('should detect homograph attacks', () => {
      const homographAttacks = [
        'раypal.com', // Cyrillic 'а'
        'gοοgle.com', // Greek omicron
        'аpple.com'   // Cyrillic 'а'
      ];

      homographAttacks.forEach(attack => {
        const result = TextSanitizer.sanitize(attack, {
          context: 'plain',
          preserveUnicode: true
        });

        expect(result.warnings.some(warning =>
          warning.includes('homograph')
        )).toBe(true);
      });
    });

    it('should handle excessive combining marks (Zalgo)', () => {
      let zalgoText = 'H';
      for (let i = 0; i < 50; i++) {
        zalgoText += String.fromCharCode(0x0300 + (i % 70));
      }
      zalgoText += 'ello';

      const result = TextSanitizer.sanitize(zalgoText, {
        context: 'plain',
        preserveUnicode: true
      });

      expect(result.warnings.some(warning =>
        warning.includes('combining marks') || warning.includes('Zalgo')
      )).toBe(true);
    });
  });

  describe('Text Styling Context Security', () => {
    it('should sanitize text for different styling contexts', () => {
      const maliciousText = '<script>alert("xss")</script>Hello';

      const styles = ['bold', 'italic', 'zalgo', 'cursive'] as const;

      styles.forEach(style => {
        const result = sanitizeForStyle(maliciousText, style);

        expect(result.isSafe).toBe(false);
        expect(result.sanitized).not.toContain('<script');
        expect(result.modifications.some(mod =>
          mod.includes('XSS') || mod.includes('script')
        )).toBe(true);
      });
    });

    it('should apply special limits for zalgo style', () => {
      const longText = 'A'.repeat(1000);
      const result = sanitizeForStyle(longText, 'zalgo');

      expect(result.sanitized.length).toBeLessThanOrEqual(500);
    });
  });

  describe('JSON-RPC Response Sanitization', () => {
    it('should sanitize nested JSON-RPC data', () => {
      const maliciousData = {
        text: '<script>alert("xss")</script>',
        style: 'bold',
        metadata: {
          description: '<img src=x onerror=alert("xss")>',
          tags: ['<script>', 'javascript:alert("xss")']
        }
      };

      const sanitized = TextSanitizer.sanitizeForJSONRPC(maliciousData);

      expect(JSON.stringify(sanitized)).not.toContain('<script');
      expect(JSON.stringify(sanitized)).not.toContain('onerror');
      expect(JSON.stringify(sanitized)).not.toContain('javascript:');
    });

    it('should handle arrays and nested objects', () => {
      const complexData = {
        items: [
          { name: '<script>alert("xss1")</script>' },
          { name: '<img onerror=alert("xss2")>' }
        ],
        config: {
          title: 'javascript:alert("xss3")',
          nested: {
            value: '<svg onload=alert("xss4")>'
          }
        }
      };

      const sanitized = TextSanitizer.sanitizeForJSONRPC(complexData);
      const jsonString = JSON.stringify(sanitized);

      expect(jsonString).not.toContain('<script');
      expect(jsonString).not.toContain('onerror');
      expect(jsonString).not.toContain('javascript:');
      expect(jsonString).not.toContain('onload');
    });
  });

  describe('Encoding Context Switching', () => {
    it('should handle context-specific encoding correctly', () => {
      const testString = '&<>"\'`=/\n\r\t';

      const contexts: EncodingContext[] = [
        'html', 'json', 'javascript', 'css', 'url', 'attribute', 'plain'
      ];

      contexts.forEach(context => {
        const result = TextSanitizer.sanitize(testString, { context });

        expect(result.encoding).toBe(context);
        expect(result.sanitized).toBeDefined();
        expect(result.sanitized.length).toBeGreaterThan(0);

        // Verify context-specific encoding
        switch (context) {
          case 'html':
            expect(result.sanitized).toContain('&amp;');
            expect(result.sanitized).toContain('&lt;');
            break;
          case 'json':
            expect(result.sanitized).toContain('\\"');
            break;
          case 'javascript':
            expect(result.sanitized).toContain('\\n');
            break;
          case 'css':
            expect(result.sanitized).toContain('\\');
            break;
          case 'url':
            expect(result.sanitized).toContain('%');
            break;
        }
      });
    });
  });

  describe('Performance and DoS Prevention', () => {
    it('should handle large inputs efficiently', () => {
      const largeText = '<script>alert("xss")</script>'.repeat(1000);
      const startTime = Date.now();

      const result = TextSanitizer.sanitize(largeText, {
        context: 'html',
        enableStrictMode: true
      });

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(result.isSafe).toBe(false);
    });

    it('should handle nested malicious patterns', () => {
      const nestedPatterns = '<script><script>alert("xss")</script></script>';
      const result = TextSanitizer.sanitize(nestedPatterns, {
        context: 'html',
        enableStrictMode: true
      });

      expect(result.sanitized).not.toContain('<script');
      expect(result.isSafe).toBe(false);
    });
  });

  describe('File Path Sanitization', () => {
    it('should sanitize dangerous file paths', () => {
      const dangerousPaths = [
        '../../etc/passwd',
        '../../../windows/system32/config/sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        'file<>name.txt',
        'file|name.txt',
        'filename?.txt'
      ];

      dangerousPaths.forEach(path => {
        const result = TextSanitizer.sanitizeFilePath(path);

        expect(result.isSafe).toBe(false);
        expect(result.sanitized).not.toContain('..');
        expect(result.sanitized).not.toContain('<');
        expect(result.sanitized).not.toContain('>');
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    it('should allow safe file paths', () => {
      const safePaths = [
        'filename.txt',
        'folder/file.txt',
        'my-file_2023.txt'
      ];

      safePaths.forEach(path => {
        const result = TextSanitizer.sanitizeFilePath(path);
        expect(result.isSafe).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });
});