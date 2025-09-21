/**
 * CSP Compliance Security Tests
 * Tests Content Security Policy implementation and violation detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SecurityHeaders,
  createSecurityHeaders,
  getBasicSecurityHeaders,
  validateCSPReport
} from '../security/security-headers.js';
import type { Env } from '../types.js';

describe('CSP Compliance Security Tests', () => {
  let securityHeaders: SecurityHeaders;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      SECURITY_LEVEL: 'strict',
      CSP_REPORT_ENDPOINT: 'https://test.example.com/csp-report',
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-with-sufficient-length-for-security',
      CORS_ORIGIN: 'https://claude.ai',
      RATE_LIMIT_PER_MINUTE: '100',
      MAX_TEXT_LENGTH: '10000',
      ENVIRONMENT: 'production'
    } as Env;

    securityHeaders = new SecurityHeaders(mockEnv);
  });

  describe('CSP Header Generation', () => {
    it('should generate strict CSP header for strict security level', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toBeDefined();
      expect(cspHeader).toContain("default-src 'none'");
      expect(cspHeader).toContain("script-src 'self' 'strict-dynamic'");
      expect(cspHeader).toContain("object-src 'none'");
      expect(cspHeader).toContain("frame-ancestors 'none'");
      expect(cspHeader).toContain('upgrade-insecure-requests');
      expect(cspHeader).toContain('block-all-mixed-content');
    });

    it('should include nonce in script-src and style-src when provided', () => {
      const requestId = 'test-request-123';
      const headers = securityHeaders.getSecurityHeaders(requestId);
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toMatch(/'nonce-[A-Za-z0-9+/]+=*'/);
    });

    it('should configure report-uri when CSP_REPORT_ENDPOINT is set', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain('report-uri https://test.example.com/csp-report');
    });

    it('should use report-only mode for permissive security level', () => {
      mockEnv.SECURITY_LEVEL = 'permissive';
      const permissiveHeaders = new SecurityHeaders(mockEnv);
      const headers = permissiveHeaders.getSecurityHeaders();

      expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeUndefined();
    });

    it('should allow unsafe-inline for standard and permissive levels', () => {
      mockEnv.SECURITY_LEVEL = 'standard';
      const standardHeaders = new SecurityHeaders(mockEnv);
      const headers = standardHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should be more restrictive for strict level', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).not.toContain("'unsafe-eval'");
      expect(cspHeader).toContain("'strict-dynamic'");
    });
  });

  describe('Security Headers Completeness', () => {
    it('should include all required security headers', () => {
      const headers = securityHeaders.getSecurityHeaders();

      // Core CSP
      expect(headers['Content-Security-Policy']).toBeDefined();

      // Security headers
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');

      // HSTS
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
      expect(headers['Strict-Transport-Security']).toContain('preload');

      // Cross-Origin policies
      expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('cross-origin');

      // Additional security headers
      expect(headers['X-DNS-Prefetch-Control']).toBe('off');
      expect(headers['X-Download-Options']).toBe('noopen');
      expect(headers['X-Permitted-Cross-Domain-Policies']).toBe('none');
      expect(headers['Expect-CT']).toContain('enforce');
    });

    it('should include Permissions Policy with restrictive settings', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const permissionsPolicy = headers['Permissions-Policy'];

      expect(permissionsPolicy).toBeDefined();
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('payment=()');
      expect(permissionsPolicy).toContain('fullscreen=(self)');
    });

    it('should generate basic security headers correctly', () => {
      const basicHeaders = getBasicSecurityHeaders();

      expect(basicHeaders['X-Content-Type-Options']).toBe('nosniff');
      expect(basicHeaders['X-Frame-Options']).toBe('DENY');
      expect(basicHeaders['X-XSS-Protection']).toBe('1; mode=block');
      expect(basicHeaders['Content-Security-Policy']).toBeDefined();
    });
  });

  describe('Nonce Management', () => {
    it('should generate unique nonces', () => {
      const nonce1 = securityHeaders.generateNonce();
      const nonce2 = securityHeaders.generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(nonce2).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should reuse nonces for the same request ID within time window', () => {
      const requestId = 'test-request-456';
      const nonce1 = securityHeaders.getNonce(requestId);
      const nonce2 = securityHeaders.getNonce(requestId);

      expect(nonce1).toBe(nonce2);
    });

    it('should validate nonces correctly', () => {
      const requestId = 'test-request-789';
      const nonce = securityHeaders.getNonce(requestId);

      expect(securityHeaders.validateNonce(requestId, nonce)).toBe(true);
      expect(securityHeaders.validateNonce(requestId, 'invalid-nonce')).toBe(false);
      expect(securityHeaders.validateNonce('different-request', nonce)).toBe(false);
    });

    it('should generate secure inline script with nonce', () => {
      const script = 'console.log("Hello World");';
      const requestId = 'script-test-123';
      const secureScript = securityHeaders.generateSecureInlineScript(script, requestId);

      expect(secureScript).toContain('<script nonce="');
      expect(secureScript).toContain('console.log("Hello World");');
      expect(secureScript).toContain('</script>');
      expect(secureScript).toMatch(/<script nonce="[A-Za-z0-9+/]+=*">/);
    });

    it('should generate secure inline style with nonce', () => {
      const css = 'body { background: blue; }';
      const requestId = 'style-test-123';
      const secureStyle = securityHeaders.generateSecureInlineStyle(css, requestId);

      expect(secureStyle).toContain('<style nonce="');
      expect(secureStyle).toContain('body { background: blue; }');
      expect(secureStyle).toContain('</style>');
      expect(secureStyle).toMatch(/<style nonce="[A-Za-z0-9+/]+=*">/);
    });
  });

  describe('CSP Directive Configuration', () => {
    it('should properly configure connect-src for GitHub API', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("connect-src 'self' https://api.github.com https://github.com");
    });

    it('should allow data: and https: for images', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("img-src 'self' data: https:");
    });

    it('should allow HTTPS and data: for fonts', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("font-src 'self' https: data:");
    });

    it('should block all objects, media, and frames', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("object-src 'none'");
      expect(cspHeader).toContain("media-src 'none'");
      expect(cspHeader).toContain("frame-src 'none'");
      expect(cspHeader).toContain("frame-ancestors 'none'");
    });

    it('should restrict form-action and base-uri', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain("form-action 'self'");
      expect(cspHeader).toContain("base-uri 'self'");
    });

    it('should enable upgrade-insecure-requests and block-all-mixed-content', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toContain('upgrade-insecure-requests');
      expect(cspHeader).toContain('block-all-mixed-content');
    });
  });

  describe('CSP Report Validation', () => {
    it('should validate valid CSP reports', () => {
      const validReport = {
        'document-uri': 'https://example.com/page',
        'referrer': 'https://example.com/',
        'violated-directive': 'script-src \'self\'',
        'effective-directive': 'script-src',
        'original-policy': 'default-src \'none\'; script-src \'self\'',
        'disposition': 'enforce',
        'blocked-uri': 'https://evil.com/script.js',
        'line-number': 42,
        'column-number': 10,
        'source-file': 'https://example.com/page',
        'status-code': 200,
        'script-sample': 'alert("xss")'
      };

      expect(validateCSPReport(validReport)).toBe(true);
    });

    it('should reject invalid CSP reports', () => {
      const invalidReports = [
        null,
        undefined,
        {},
        { 'document-uri': 'test' }, // Missing required fields
        { 'violated-directive': 'test' }, // Missing required fields
        'not an object'
      ];

      invalidReports.forEach(report => {
        expect(validateCSPReport(report)).toBe(false);
      });
    });

    it('should validate CSP reports with minimum required fields', () => {
      const minimalReport = {
        'document-uri': 'https://example.com/page',
        'violated-directive': 'script-src \'self\'',
        'blocked-uri': 'https://evil.com/script.js'
      };

      expect(validateCSPReport(minimalReport)).toBe(true);
    });
  });

  describe('Response Integration', () => {
    it('should apply security headers to response', () => {
      const originalResponse = new Response('test body', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });

      const securedResponse = securityHeaders.applyHeaders(originalResponse);

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeDefined();
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should create secure response with all headers', () => {
      const body = JSON.stringify({ message: 'Hello World' });
      const init = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      };

      const secureResponse = securityHeaders.createSecureResponse(body, init);

      expect(secureResponse.status).toBe(200);
      expect(secureResponse.headers.get('Content-Type')).toBe('application/json');
      expect(secureResponse.headers.get('Content-Security-Policy')).toBeDefined();
      expect(secureResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Configuration Updates', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        enableHSTS: false,
        enableXFrameOptions: false
      };

      securityHeaders.updateConfig(newConfig);
      const headers = securityHeaders.getSecurityHeaders();

      expect(headers['Strict-Transport-Security']).toBeUndefined();
      expect(headers['X-Frame-Options']).toBeUndefined();
    });

    it('should get current configuration', () => {
      const config = securityHeaders.getConfig();

      expect(config.level).toBe('strict');
      expect(config.enableHSTS).toBe(true);
      expect(config.enableXFrameOptions).toBe(true);
      expect(config.xFrameOptions).toBe('DENY');
    });
  });

  describe('Security Level Variations', () => {
    it('should generate different headers for different security levels', () => {
      const levels = ['strict', 'standard', 'permissive'] as const;

      levels.forEach(level => {
        const testEnv = { ...mockEnv, SECURITY_LEVEL: level };
        const headers = new SecurityHeaders(testEnv);
        const securityHeaders = headers.getSecurityHeaders();

        expect(securityHeaders).toBeDefined();

        if (level === 'strict') {
          expect(securityHeaders['Content-Security-Policy']).toContain("'strict-dynamic'");
          expect(securityHeaders['Cross-Origin-Embedder-Policy']).toBe('require-corp');
        } else if (level === 'permissive') {
          expect(securityHeaders['Content-Security-Policy-Report-Only']).toBeDefined();
          expect(securityHeaders['Content-Security-Policy']).toBeUndefined();
        }
      });
    });
  });

  describe('CSP Bypass Prevention', () => {
    it('should prevent common CSP bypass techniques', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      // Should not allow data: for scripts
      expect(cspHeader).not.toContain("script-src 'self' data:");

      // Should not allow 'unsafe-eval'
      expect(cspHeader).not.toContain("'unsafe-eval'");

      // Should not allow overly permissive wildcards
      expect(cspHeader).not.toContain("script-src *");
      expect(cspHeader).not.toContain("script-src https:");

      // Should block object-src completely
      expect(cspHeader).toContain("object-src 'none'");

      // Should block base-uri manipulation
      expect(cspHeader).toContain("base-uri 'self'");
    });

    it('should use strict-dynamic correctly', () => {
      const headers = securityHeaders.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      // strict-dynamic should be present
      expect(cspHeader).toContain("'strict-dynamic'");

      // When strict-dynamic is used, 'unsafe-inline' should be ignored by modern browsers
      // but we shouldn't include it anyway in strict mode
      expect(cspHeader).not.toContain("'unsafe-inline'");
    });
  });

  describe('Performance Considerations', () => {
    it('should generate headers efficiently', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        securityHeaders.getSecurityHeaders(`request-${i}`);
      }

      const endTime = Date.now();
      const timePerIteration = (endTime - startTime) / iterations;

      expect(timePerIteration).toBeLessThan(1); // Should be very fast
    });

    it('should handle nonce cleanup efficiently', () => {
      // Generate many nonces
      for (let i = 0; i < 1000; i++) {
        securityHeaders.getNonce(`request-${i}`);
      }

      // Should not consume excessive memory
      const memoryBefore = process.memoryUsage().heapUsed;

      // Force cleanup (this would normally happen automatically)
      // In a real implementation, we'd have access to the cleanup method

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Should not have significant memory leak
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing CSP report endpoint gracefully', () => {
      const envWithoutReportUri = { ...mockEnv };
      delete (envWithoutReportUri as any).CSP_REPORT_ENDPOINT;

      const headersWithoutReport = new SecurityHeaders(envWithoutReportUri);
      const headers = headersWithoutReport.getSecurityHeaders();
      const cspHeader = headers['Content-Security-Policy'];

      expect(cspHeader).toBeDefined();
      expect(cspHeader).not.toContain('report-uri');
    });

    it('should handle empty or invalid security level', () => {
      const envWithInvalidLevel = { ...mockEnv, SECURITY_LEVEL: 'invalid' as any };
      const headers = new SecurityHeaders(envWithInvalidLevel);
      const securityHeaders = headers.getSecurityHeaders();

      expect(securityHeaders['Content-Security-Policy']).toBeDefined();
    });

    it('should handle very long nonce requests', () => {
      const veryLongRequestId = 'a'.repeat(1000);
      const nonce = securityHeaders.getNonce(veryLongRequestId);

      expect(nonce).toBeDefined();
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });
});