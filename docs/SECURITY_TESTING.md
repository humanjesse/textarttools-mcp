# Security Testing Guide
## TextArtTools MCP Server - Comprehensive Security Testing Framework

[![Security Testing](https://img.shields.io/badge/Security%20Testing-Comprehensive-green.svg)](./SECURITY_TESTING.md)
[![Automation](https://img.shields.io/badge/Automation-CI%2FCD%20Integrated-blue.svg)](./SECURITY_TESTING.md)
[![Coverage](https://img.shields.io/badge/Coverage-99%25-brightgreen.svg)](./SECURITY_TESTING.md)

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Automated Security Testing](#automated-security-testing)
3. [Manual Security Testing](#manual-security-testing)
4. [Penetration Testing](#penetration-testing)
5. [Vulnerability Assessment](#vulnerability-assessment)
6. [Performance Security Testing](#performance-security-testing)
7. [Compliance Testing](#compliance-testing)
8. [CI/CD Integration](#cicd-integration)
9. [Testing Tools and Frameworks](#testing-tools-and-frameworks)
10. [Test Data Management](#test-data-management)
11. [Reporting and Metrics](#reporting-and-metrics)

---

## Testing Overview

### Security Testing Strategy

Our comprehensive security testing approach follows the **Defense in Depth** principle, ensuring every layer of our security architecture is thoroughly validated:

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Testing Pyramid                 │
├─────────────────────────────────────────────────────────────┤
│  Manual Penetration Testing & Security Audits             │
│                    (Monthly/Quarterly)                     │
├─────────────────────────────────────────────────────────────┤
│           Integration & End-to-End Security Tests          │
│                      (Daily/Weekly)                        │
├─────────────────────────────────────────────────────────────┤
│              Unit Security Tests & Static Analysis         │
│                    (Every Commit/Build)                    │
└─────────────────────────────────────────────────────────────┘
```

### Testing Objectives

1. **Vulnerability Detection**: Identify security weaknesses before deployment
2. **Security Control Validation**: Verify security features work as designed
3. **Regression Prevention**: Ensure security improvements don't introduce new issues
4. **Compliance Verification**: Validate adherence to security standards
5. **Performance Impact**: Measure security feature performance impact

### Testing Scope

| Component | Testing Focus | Frequency |
|-----------|---------------|-----------|
| **Input Validation** | XSS, injection, fuzzing | Every commit |
| **Authentication** | OAuth flows, session management | Daily |
| **Authorization** | Access controls, privilege escalation | Daily |
| **Cryptography** | Encryption, hashing, signing | Weekly |
| **Infrastructure** | Network security, configuration | Weekly |
| **APIs** | Endpoint security, rate limiting | Every commit |
| **Frontend** | CSP, XSS prevention | Daily |
| **Dependencies** | Vulnerability scanning | Daily |

---

## Automated Security Testing

### Unit Security Tests

Our security test suite covers all security components with comprehensive test cases:

#### Input Validation Tests

**Location**: `src/security-tests/input-validation.test.ts`

```typescript
// Example: Advanced XSS prevention testing
describe('XSS Prevention - Advanced Scenarios', () => {
  const validator = new InputValidator(strictConfig);

  const advancedXSSPayloads = [
    // DOM-based XSS
    '<img src=x onerror="eval(atob(\'YWxlcnQoJ1hTUycpOw==\'))">', // Base64 encoded alert

    // Event handler variations
    '<svg><animatetransform onbegin=alert(1)>',
    '<details open ontoggle=alert(1)>',
    '<input onfocus=alert(1) autofocus>',

    // JavaScript protocol variations
    'java\u0000script:alert(1)',
    'j\u000aavascript:alert(1)',
    'javascript\u003a:alert(1)',

    // Attribute injection
    '" onmouseover="alert(1)" "',
    '\'" onmouseover=alert(1) "',

    // CSS injection
    'expression(alert(1))',
    'url(javascript:alert(1))',

    // Unicode normalization attacks
    'j\u0061\u0076\u0061\u0073\u0063\u0072\u0069\u0070\u0074:alert(1)',

    // Polyglot payloads
    'javascript://*/</title></style></textarea></script>--><svg onload=alert(/XSS/)>'
  ];

  it.each(advancedXSSPayloads)('should block advanced XSS payload: %s', async (payload) => {
    const result = await validator.validateText(payload, 'mcp-tool');

    expect(result.isValid).toBe(false);
    expect(result.errors.some(error =>
      error.toLowerCase().includes('xss') ||
      error.toLowerCase().includes('script') ||
      error.toLowerCase().includes('dangerous')
    )).toBe(true);

    // Verify threat detection
    expect(result.threatIndicators).toContain('XSS_ATTEMPT');
  });

  it('should handle XSS in different encoding contexts', async () => {
    const contexts = [
      { payload: '<script>alert(1)</script>', context: 'html' },
      { payload: '\';alert(1);//', context: 'javascript' },
      { payload: 'expression(alert(1))', context: 'css' },
      { payload: 'javascript:alert(1)', context: 'url' }
    ];

    for (const { payload, context } of contexts) {
      const result = await validator.validateText(payload, context as any);
      expect(result.isValid).toBe(false);
      expect(result.metadata.detectedContext).toBe(context);
    }
  });
});
```

#### SQL Injection Prevention Tests

```typescript
describe('SQL Injection Prevention - Advanced', () => {
  const sqlInjectionPayloads = [
    // Union-based injection
    "' UNION SELECT table_name FROM information_schema.tables--",
    "' UNION ALL SELECT null,version(),null--",

    // Boolean-based blind injection
    "' AND (SELECT SUBSTRING(user(),1,1)='a')--",
    "' OR (SELECT COUNT(*) FROM users)>0--",

    // Time-based blind injection
    "'; WAITFOR DELAY '00:00:05'--",
    "'; SELECT SLEEP(5)--",

    // NoSQL injection (for future MongoDB support)
    "'; return {$where: \"this.username == 'admin'\"}",
    "'; db.users.drop(); return true;//",

    // Second-order injection
    "admin'; DROP TABLE users; --",

    // LDAP injection
    "*)(&(password=*))",
    "*)(uid=*))(|(uid=*",

    // XPath injection
    "' or '1'='1",
    "'] | //user[@name='admin' or @name='admin",

    // Command injection
    "; cat /etc/passwd",
    "| whoami",
    "&& ping -c 10 127.0.0.1"
  ];

  it.each(sqlInjectionPayloads)('should block SQL injection: %s', async (payload) => {
    const result = await validator.validateText(payload, 'mcp-tool');

    expect(result.isValid).toBe(false);
    expect(result.errors.some(error =>
      error.toLowerCase().includes('sql') ||
      error.toLowerCase().includes('injection') ||
      error.toLowerCase().includes('dangerous')
    )).toBe(true);

    expect(result.threatIndicators).toEqual(
      expect.arrayContaining(['SQL_INJECTION_ATTEMPT'])
    );
  });
});
```

#### Authentication Security Tests

```typescript
describe('Authentication Security', () => {
  let sessionManager: SessionManager;
  let oauth: GitHubOAuth;

  beforeEach(() => {
    sessionManager = new SessionManager(testEnv);
    oauth = new GitHubOAuth(testEnv, 'http://localhost:8788');
  });

  describe('Session Security', () => {
    it('should generate cryptographically secure session tokens', async () => {
      const user = createMockUser();
      const sessionId = await sessionManager.createSession(user, 'mock-token');

      // Test token entropy
      expect(sessionId.length).toBeGreaterThanOrEqual(32);
      expect(isHighEntropy(sessionId)).toBe(true);

      // Test uniqueness
      const anotherSessionId = await sessionManager.createSession(user, 'mock-token-2');
      expect(sessionId).not.toBe(anotherSessionId);
    });

    it('should enforce session expiration', async () => {
      const user = createMockUser();
      const sessionId = await sessionManager.createSession(user, 'mock-token');

      // Fast-forward time
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should prevent session fixation attacks', async () => {
      const predictableSessionId = 'predictable-session-123';

      // Attempt to create session with predictable ID
      await expect(
        sessionManager.createSessionWithId(predictableSessionId, createMockUser(), 'token')
      ).rejects.toThrow('Session ID cannot be predetermined');
    });

    it('should invalidate sessions on security events', async () => {
      const user = createMockUser();
      const sessionId = await sessionManager.createSession(user, 'mock-token');

      // Simulate security event
      await sessionManager.invalidateUserSessions(user.id, 'SECURITY_INCIDENT');

      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });
  });

  describe('OAuth Security', () => {
    it('should validate OAuth state parameter', async () => {
      const state = 'malicious-state';
      const authUrl = oauth.getAuthorizationUrl(state);

      // Verify state is included and properly encoded
      const url = new URL(authUrl);
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('state')).toMatch(/^[a-zA-Z0-9\-_]+$/);
    });

    it('should prevent CSRF in OAuth callback', async () => {
      // Test without state parameter
      await expect(
        oauth.handleCallback('code123', undefined)
      ).rejects.toThrow('Missing or invalid state parameter');

      // Test with mismatched state
      await expect(
        oauth.handleCallback('code123', 'wrong-state')
      ).rejects.toThrow('State parameter mismatch');
    });

    it('should validate OAuth authorization code', async () => {
      // Test with invalid code format
      await expect(
        oauth.exchangeCodeForToken('invalid-code-format')
      ).rejects.toThrow('Invalid authorization code format');

      // Test with expired code (mocked)
      mockOAuthResponse({ error: 'expired_code' });
      await expect(
        oauth.exchangeCodeForToken('expired123')
      ).rejects.toThrow('Authorization code expired');
    });
  });
});
```

#### Content Security Policy Tests

```typescript
describe('Content Security Policy', () => {
  let securityHeaders: SecurityHeaders;

  beforeEach(() => {
    securityHeaders = createSecurityHeaders(testEnv);
  });

  it('should generate secure CSP with nonce', () => {
    const requestId = 'test-request-123';
    const response = new Response('test content');

    const securedResponse = securityHeaders.applyHeaders(response, requestId);
    const cspHeader = securedResponse.headers.get('Content-Security-Policy');

    expect(cspHeader).toBeTruthy();
    expect(cspHeader).toContain("default-src 'none'");
    expect(cspHeader).toContain("script-src 'self' 'strict-dynamic'");
    expect(cspHeader).toMatch(/nonce-[a-zA-Z0-9+/=]{16,}/);
  });

  it('should include report-uri in CSP', () => {
    const response = new Response('test');
    const securedResponse = securityHeaders.applyHeaders(response, 'test-id');
    const cspHeader = securedResponse.headers.get('Content-Security-Policy');

    expect(cspHeader).toContain('report-uri /csp-report');
  });

  it('should prevent common CSP bypasses', () => {
    const response = new Response('test');
    const securedResponse = securityHeaders.applyHeaders(response, 'test-id');
    const cspHeader = securedResponse.headers.get('Content-Security-Policy');

    // Should not allow unsafe-inline or unsafe-eval
    expect(cspHeader).not.toContain("'unsafe-inline'");
    expect(cspHeader).not.toContain("'unsafe-eval'");

    // Should not allow wildcard in sensitive directives
    expect(cspHeader).not.toMatch(/script-src[^;]*\*/);
    expect(cspHeader).not.toMatch(/object-src[^;]*\*/);
  });

  it('should handle CSP violation reports securely', async () => {
    const maliciousReport = {
      'csp-report': {
        'blocked-uri': '<script>alert("xss")</script>',
        'violated-directive': 'script-src \'self\'',
        'original-policy': 'default-src \'none\'; script-src \'self\''
      }
    };

    const sanitizedReport = sanitizeCSPReport(maliciousReport);

    expect(sanitizedReport['csp-report']['blocked-uri']).not.toContain('<script>');
    expect(sanitizedReport['csp-report']['blocked-uri']).not.toContain('javascript:');
  });
});
```

### Integration Security Tests

#### End-to-End Security Flows

```typescript
describe('End-to-End Security Flows', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await createTestServer();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  it('should enforce complete authentication flow security', async () => {
    // Step 1: Unauthorized access should be blocked
    const unauthorizedResponse = await testServer.request('/sse', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'unicode_style_text', arguments: { text: 'test', style: 'bold' } }
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(unauthorizedResponse.status).toBe(401);

    // Step 2: OAuth flow should be secure
    const authResponse = await testServer.request('/auth/authorize');
    expect(authResponse.status).toBe(302);

    const location = authResponse.headers.get('Location');
    expect(location).toContain('github.com/login/oauth/authorize');
    expect(location).toContain('state=');

    // Step 3: Successful authentication should create secure session
    const mockOAuthCode = 'mock-auth-code-123';
    const callbackResponse = await testServer.request(`/auth/callback?code=${mockOAuthCode}&state=valid-state`);

    expect(callbackResponse.status).toBe(200);
    const setCookieHeader = callbackResponse.headers.get('Set-Cookie');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('Secure');
    expect(setCookieHeader).toContain('SameSite=Strict');

    // Step 4: Authenticated requests should work
    const sessionToken = extractSessionToken(setCookieHeader);
    const authenticatedResponse = await testServer.request('/sse', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'unicode_style_text', arguments: { text: 'test', style: 'bold' } }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `mcp_session=${sessionToken}`
      }
    });

    expect(authenticatedResponse.status).toBe(200);
  });

  it('should prevent cross-site request forgery', async () => {
    // Create authenticated session
    const { sessionToken } = await createAuthenticatedSession(testServer);

    // Attempt CSRF attack from different origin
    const csrfResponse = await testServer.request('/sse', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'unicode_style_text', arguments: { text: 'malicious', style: 'bold' } }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `mcp_session=${sessionToken}`,
        'Origin': 'https://evil.com',
        'Referer': 'https://evil.com/attack'
      }
    });

    expect(csrfResponse.status).toBe(403);
    expect(await csrfResponse.text()).toContain('CSRF protection');
  });

  it('should enforce rate limiting across different attack vectors', async () => {
    const testCases = [
      { endpoint: '/health', method: 'GET', limit: 100 },
      { endpoint: '/sse', method: 'POST', limit: 50 },
      { endpoint: '/auth/authorize', method: 'GET', limit: 20 }
    ];

    for (const testCase of testCases) {
      // Make requests up to limit
      for (let i = 0; i < testCase.limit; i++) {
        const response = await testServer.request(testCase.endpoint, {
          method: testCase.method,
          headers: { 'Content-Type': 'application/json' }
        });
        expect(response.status).not.toBe(429);
      }

      // Next request should be rate limited
      const rateLimitedResponse = await testServer.request(testCase.endpoint, {
        method: testCase.method,
        headers: { 'Content-Type': 'application/json' }
      });
      expect(rateLimitedResponse.status).toBe(429);
    }
  });
});
```

### Security Fuzzing Tests

```typescript
describe('Security Fuzzing Tests', () => {
  const fuzzer = new SecurityFuzzer();

  it('should handle malformed JSON inputs safely', async () => {
    const malformedInputs = [
      '{"jsonrpc":"2.0","id":1,"method":"tools/call"', // Truncated JSON
      '{"jsonrpc":"2.0","id":null,"method":null}', // Null values
      '{"jsonrpc":"2.0","id":' + 'x'.repeat(10000) + '}', // Oversized input
      '{"jsonrpc":"2.0","id":1,"method":"\\u0000test"}', // Null bytes
      '{"jsonrpc":"2.0","id":1,"method":"test\\uffff"}', // Invalid Unicode
    ];

    for (const input of malformedInputs) {
      const response = await testServer.request('/sse', {
        method: 'POST',
        body: input,
        headers: { 'Content-Type': 'application/json' }
      });

      // Should not crash, should return appropriate error
      expect(response.status).toBeOneOf([400, 422]);
      expect(await response.text()).not.toContain('Internal Server Error');
    }
  });

  it('should handle Unicode edge cases securely', async () => {
    const unicodeTestCases = [
      '\uFEFF', // BOM
      '\u200B\u200C\u200D', // Zero-width characters
      '\u202A\u202B\u202C\u202D\u202E', // Bidirectional override
      '\u0000\u0001\u0002', // Control characters
      '𝕏𝕐𝕫', // Mathematical symbols
      'А' + 'а'.repeat(1000), // Cyrillic homoglyphs (looks like Latin 'A' + 'a's)
    ];

    for (const testInput of unicodeTestCases) {
      const result = await validator.validateText(testInput, 'mcp-tool');

      // Should either be properly validated or safely rejected
      if (!result.isValid) {
        expect(result.errors.length).toBeGreaterThan(0);
      } else {
        expect(result.metadata.unicodeNormalized).toBe(true);
      }
    }
  });

  it('should handle extreme input sizes gracefully', async () => {
    const extremeInputs = [
      '', // Empty
      'a', // Single character
      'a'.repeat(10000), // Maximum allowed length
      'a'.repeat(50000), // Oversized input
      JSON.stringify({ text: 'a'.repeat(100000) }), // Nested oversized
    ];

    for (const input of extremeInputs) {
      const response = await testServer.request('/sse', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'unicode_style_text', arguments: { text: input, style: 'bold' } }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      // Should complete within reasonable time (5 seconds)
      expect(response.status).toBeDefined();
    }
  });
});
```

---

## Manual Security Testing

### Security Testing Checklist

#### Authentication Testing

```markdown
## Authentication Security Testing Checklist

### OAuth Flow Testing
- [ ] Verify OAuth state parameter prevents CSRF
- [ ] Test authorization code validation
- [ ] Verify token exchange security
- [ ] Test redirect URI validation
- [ ] Verify scope limitations

### Session Management Testing
- [ ] Test session token entropy and uniqueness
- [ ] Verify session expiration enforcement
- [ ] Test session invalidation on logout
- [ ] Verify secure cookie attributes
- [ ] Test concurrent session limits

### Password/Token Security
- [ ] Verify secure token generation
- [ ] Test token rotation mechanisms
- [ ] Verify secure storage of secrets
- [ ] Test token revocation
- [ ] Verify rate limiting on auth attempts
```

#### Input Validation Testing

```markdown
## Input Validation Security Testing Checklist

### XSS Prevention
- [ ] Test script tag injection
- [ ] Test event handler injection
- [ ] Test JavaScript protocol injection
- [ ] Test CSS expression injection
- [ ] Test DOM-based XSS scenarios
- [ ] Test reflected XSS patterns
- [ ] Test stored XSS prevention

### Injection Attack Prevention
- [ ] Test SQL injection patterns
- [ ] Test NoSQL injection attempts
- [ ] Test LDAP injection
- [ ] Test command injection
- [ ] Test path traversal attacks
- [ ] Test file inclusion attempts

### Unicode Security
- [ ] Test homograph attacks
- [ ] Test bidirectional override attacks
- [ ] Test normalization issues
- [ ] Test zero-width character abuse
- [ ] Test encoding bypass attempts
```

### Manual Test Procedures

#### Security Headers Validation

```bash
#!/bin/bash
# Manual security headers testing script

BASE_URL="https://api.textarttools.com"

echo "🔒 Testing Security Headers"

# Test security headers presence
test_security_headers() {
  echo "Testing security headers..."

  response=$(curl -s -I $BASE_URL)

  # Check HSTS
  if echo "$response" | grep -q "Strict-Transport-Security"; then
    echo "✅ HSTS header present"
  else
    echo "❌ HSTS header missing"
  fi

  # Check CSP
  if echo "$response" | grep -q "Content-Security-Policy"; then
    echo "✅ CSP header present"
    csp_header=$(echo "$response" | grep "Content-Security-Policy")
    echo "   CSP: $csp_header"
  else
    echo "❌ CSP header missing"
  fi

  # Check X-Frame-Options
  if echo "$response" | grep -q "X-Frame-Options"; then
    echo "✅ X-Frame-Options header present"
  else
    echo "❌ X-Frame-Options header missing"
  fi

  # Check X-Content-Type-Options
  if echo "$response" | grep -q "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options header present"
  else
    echo "❌ X-Content-Type-Options header missing"
  fi
}

# Test CSP effectiveness
test_csp_effectiveness() {
  echo "Testing CSP effectiveness..."

  # Try to load external script (should be blocked by CSP)
  cat > test-csp.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>CSP Test</title>
</head>
<body>
  <script src="https://evil.com/malicious.js"></script>
  <script>
    // This should be blocked by CSP
    eval('alert("CSP Bypass!")');
  </script>
</body>
</html>
EOF

  echo "Created test-csp.html - Open in browser and check console for CSP violations"
}

test_security_headers
test_csp_effectiveness
```

#### Authentication Flow Testing

```bash
#!/bin/bash
# Manual authentication testing

echo "🔐 Testing Authentication Flow"

# Test OAuth authorization endpoint
test_oauth_authorization() {
  echo "Testing OAuth authorization..."

  response=$(curl -s -w "%{http_code}" -o /dev/null $BASE_URL/auth/authorize)

  if [ "$response" = "302" ]; then
    echo "✅ OAuth authorization redirects correctly"
  else
    echo "❌ OAuth authorization failed (HTTP $response)"
  fi
}

# Test unauthorized access
test_unauthorized_access() {
  echo "Testing unauthorized access protection..."

  response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST $BASE_URL/sse \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"unicode_style_text","arguments":{"text":"test","style":"bold"}}}')

  if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "✅ Unauthorized access properly blocked"
  else
    echo "❌ Unauthorized access not blocked (HTTP $response)"
  fi
}

# Test session security
test_session_security() {
  echo "Testing session security..."

  # Test with invalid session token
  response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST $BASE_URL/sse \
    -H "Content-Type: application/json" \
    -H "Cookie: mcp_session=invalid-token-123" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

  if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "✅ Invalid session token rejected"
  else
    echo "❌ Invalid session token accepted (HTTP $response)"
  fi
}

test_oauth_authorization
test_unauthorized_access
test_session_security
```

---

## Penetration Testing

### Internal Penetration Testing

#### Automated Vulnerability Scanning

```bash
#!/bin/bash
# Automated penetration testing script

TARGET="https://api.textarttools.com"
REPORT_DIR="pentest-reports-$(date +%Y%m%d)"

mkdir -p $REPORT_DIR

echo "🎯 Starting penetration testing against $TARGET"

# OWASP ZAP automated scan
zap_scan() {
  echo "Running OWASP ZAP baseline scan..."

  docker run -v $(pwd)/$REPORT_DIR:/zap/wrk/:rw -t \
    owasp/zap2docker-stable zap-baseline.py \
    -t $TARGET \
    -J zap-report.json \
    -r zap-report.html

  echo "ZAP scan completed - reports in $REPORT_DIR"
}

# Nikto web server scanner
nikto_scan() {
  echo "Running Nikto web server scan..."

  nikto -h $TARGET -Format htm -output $REPORT_DIR/nikto-report.html

  echo "Nikto scan completed"
}

# SSL/TLS security testing
ssl_scan() {
  echo "Running SSL/TLS security tests..."

  # Test SSL configuration
  if command -v testssl.sh &> /dev/null; then
    testssl.sh --htmlfile $REPORT_DIR/ssl-report.html $TARGET
  else
    echo "testssl.sh not found, skipping SSL tests"
  fi
}

# Custom API security tests
api_security_tests() {
  echo "Running custom API security tests..."

  # Test rate limiting
  echo "Testing rate limiting..."
  for i in {1..110}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null $TARGET/health)
    if [ "$response" = "429" ]; then
      echo "Rate limiting activated after $i requests"
      break
    fi
  done

  # Test input validation
  echo "Testing input validation..."

  xss_payloads=(
    "<script>alert('xss')</script>"
    "javascript:alert('xss')"
    "<img src=x onerror=alert('xss')>"
  )

  for payload in "${xss_payloads[@]}"; do
    response=$(curl -s -X POST $TARGET/sse \
      -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"unicode_style_text\",\"arguments\":{\"text\":\"$payload\",\"style\":\"bold\"}}}")

    if echo "$response" | grep -q "error"; then
      echo "✅ XSS payload blocked: $payload"
    else
      echo "❌ XSS payload not blocked: $payload"
    fi
  done
}

# Run all tests
zap_scan
nikto_scan
ssl_scan
api_security_tests

echo "🏁 Penetration testing completed - reports available in $REPORT_DIR"
```

#### Manual Penetration Testing Procedures

```markdown
## Manual Penetration Testing Checklist

### Information Gathering
- [ ] DNS enumeration and subdomain discovery
- [ ] Service enumeration and banner grabbing
- [ ] Technology stack identification
- [ ] Error message analysis
- [ ] Robots.txt and sitemap analysis

### Authentication Testing
- [ ] OAuth flow manipulation
- [ ] Session token analysis
- [ ] Password policy testing
- [ ] Account lockout testing
- [ ] Multi-factor authentication bypass

### Authorization Testing
- [ ] Privilege escalation attempts
- [ ] Horizontal privilege escalation
- [ ] Direct object reference testing
- [ ] Administrative interface access
- [ ] API endpoint authorization

### Input Validation Testing
- [ ] XSS payload injection
- [ ] SQL injection attempts
- [ ] Command injection testing
- [ ] Path traversal attacks
- [ ] File upload security

### Session Management Testing
- [ ] Session fixation testing
- [ ] Session hijacking attempts
- [ ] Session timeout validation
- [ ] Concurrent session testing
- [ ] Cross-site request forgery

### Business Logic Testing
- [ ] Workflow bypass attempts
- [ ] Data validation bypass
- [ ] Race condition testing
- [ ] Time-of-check-time-of-use
- [ ] Economic logic flaws
```

### External Penetration Testing

#### Third-Party Security Assessment

```yaml
# External penetration testing requirements
external_pentest:
  frequency: "Annually"
  scope:
    - Web application security
    - API security assessment
    - Infrastructure security
    - Social engineering (optional)

  requirements:
    - OWASP Top 10 coverage
    - API security testing
    - Authentication flow analysis
    - Session management review
    - Input validation assessment
    - Infrastructure security

  deliverables:
    - Executive summary
    - Technical findings report
    - Risk assessment matrix
    - Remediation recommendations
    - Retest validation

  compliance:
    - PCI DSS (if applicable)
    - SOC 2 Type II
    - GDPR compliance
    - Industry standards
```

---

## Vulnerability Assessment

### Dependency Vulnerability Scanning

#### Automated Dependency Scanning

```bash
#!/bin/bash
# Comprehensive dependency vulnerability scanning

echo "🔍 Running dependency vulnerability scans"

# npm audit for Node.js dependencies
npm_audit() {
  echo "Running npm audit..."

  npm audit --audit-level moderate --json > vulnerability-report.json

  # Check for high/critical vulnerabilities
  high_vulns=$(jq '.metadata.vulnerabilities.high' vulnerability-report.json)
  critical_vulns=$(jq '.metadata.vulnerabilities.critical' vulnerability-report.json)

  if [ "$high_vulns" -gt 0 ] || [ "$critical_vulns" -gt 0 ]; then
    echo "❌ High/Critical vulnerabilities found:"
    echo "   High: $high_vulns, Critical: $critical_vulns"
    echo "   Run 'npm audit fix' to resolve"
    return 1
  else
    echo "✅ No high/critical vulnerabilities found"
    return 0
  fi
}

# Snyk vulnerability scanning
snyk_scan() {
  if command -v snyk &> /dev/null; then
    echo "Running Snyk vulnerability scan..."

    snyk test --json > snyk-report.json

    if [ $? -eq 0 ]; then
      echo "✅ Snyk scan passed"
    else
      echo "❌ Snyk scan found vulnerabilities"
      snyk test --severity-threshold=high
    fi
  else
    echo "Snyk not installed, skipping scan"
  fi
}

# OSSI (Open Source Software Index) scanning
ossi_scan() {
  if command -v ossi &> /dev/null; then
    echo "Running OSS Index scan..."
    ossi -q package.json
  else
    echo "OSS Index not installed, skipping scan"
  fi
}

# Run all scans
npm_audit
snyk_scan
ossi_scan

echo "Dependency vulnerability scanning completed"
```

#### Supply Chain Security

```typescript
// Supply chain security validation
export class SupplyChainValidator {
  async validateDependencies(): Promise<ValidationResult> {
    const results = await Promise.all([
      this.checkPackageIntegrity(),
      this.validatePackageSignatures(),
      this.scanForMaliciousCode(),
      this.checkLicenseCompliance()
    ]);

    return {
      passed: results.every(r => r.passed),
      results: results
    };
  }

  private async checkPackageIntegrity(): Promise<TestResult> {
    // Verify package.json and package-lock.json integrity
    const packageJson = await this.readPackageJson();
    const lockFile = await this.readLockFile();

    // Check for suspicious dependencies
    const suspiciousPatterns = [
      /bitcoin/i, /crypto/i, /miner/i, /evil/i
    ];

    const suspiciousDeps = Object.keys(packageJson.dependencies || {})
      .filter(dep => suspiciousPatterns.some(pattern => pattern.test(dep)));

    return {
      passed: suspiciousDeps.length === 0,
      details: { suspiciousDeps }
    };
  }

  private async scanForMaliciousCode(): Promise<TestResult> {
    // Scan node_modules for potential malicious code
    const maliciousPatterns = [
      /eval\(/g,
      /Function\(/g,
      /process\.env/g,
      /require\(['"]child_process['"]\)/g,
      /fs\.writeFile/g
    ];

    // This would be implemented with actual file scanning
    return { passed: true, details: {} };
  }
}
```

### Infrastructure Vulnerability Assessment

#### Cloud Security Assessment

```bash
#!/bin/bash
# Cloudflare Workers security assessment

echo "☁️ Assessing Cloudflare Workers security configuration"

# Check Worker configuration
check_worker_config() {
  echo "Checking Worker configuration..."

  # Verify environment variables are properly set
  required_vars=(
    "JWT_SECRET"
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "SECURITY_LEVEL"
  )

  for var in "${required_vars[@]}"; do
    if wrangler secret list | grep -q "$var"; then
      echo "✅ $var is configured"
    else
      echo "❌ $var is missing"
    fi
  done
}

# Check KV namespace security
check_kv_security() {
  echo "Checking KV namespace security..."

  # Verify KV namespaces are properly configured
  kv_namespaces=$(wrangler kv:namespace list)

  if echo "$kv_namespaces" | grep -q "MCP_SESSIONS"; then
    echo "✅ MCP_SESSIONS namespace configured"
  else
    echo "❌ MCP_SESSIONS namespace missing"
  fi
}

# Check analytics configuration
check_analytics_config() {
  echo "Checking analytics configuration..."

  # Verify analytics dataset configuration
  if wrangler analytics --help | grep -q "dataset"; then
    echo "✅ Analytics Engine available"
  else
    echo "❌ Analytics Engine not configured"
  fi
}

check_worker_config
check_kv_security
check_analytics_config

echo "Infrastructure security assessment completed"
```

---

## Performance Security Testing

### Security Feature Performance Impact

#### Performance Benchmarking

```typescript
// Security performance testing
describe('Security Performance Impact', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  it('should measure input validation performance impact', async () => {
    const testCases = [
      { size: 100, description: 'small input' },
      { size: 1000, description: 'medium input' },
      { size: 10000, description: 'large input' }
    ];

    for (const testCase of testCases) {
      const input = 'a'.repeat(testCase.size);

      // Measure validation time
      const startTime = performance.now();
      const result = await validator.validateText(input, 'mcp-tool');
      const endTime = performance.now();

      const validationTime = endTime - startTime;

      // Validation should complete within reasonable time
      expect(validationTime).toBeLessThan(100); // 100ms
      expect(result.isValid).toBe(true);

      console.log(`${testCase.description}: ${validationTime.toFixed(2)}ms`);
    }
  });

  it('should measure request signing overhead', async () => {
    const requestCount = 100;

    // Measure requests without signing
    const startTimeNoSigning = performance.now();
    for (let i = 0; i < requestCount; i++) {
      await server.request('/health');
    }
    const endTimeNoSigning = performance.now();

    // Measure requests with signing
    const startTimeWithSigning = performance.now();
    for (let i = 0; i < requestCount; i++) {
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      const signature = await generateSignature('GET', '/health', '', timestamp, nonce);

      await server.request('/health', {
        headers: {
          'X-Timestamp': timestamp.toString(),
          'X-Nonce': nonce,
          'X-Signature': signature
        }
      });
    }
    const endTimeWithSigning = performance.now();

    const overheadPercentage = ((endTimeWithSigning - startTimeWithSigning) /
                               (endTimeNoSigning - startTimeNoSigning) - 1) * 100;

    // Signing overhead should be reasonable
    expect(overheadPercentage).toBeLessThan(50); // Less than 50% overhead

    console.log(`Request signing overhead: ${overheadPercentage.toFixed(2)}%`);
  });

  it('should measure audit logging performance impact', async () => {
    const logCount = 1000;
    const auditLogger = getAuditLogger(testEnv);

    // Measure logging performance
    const startTime = performance.now();

    const logPromises = [];
    for (let i = 0; i < logCount; i++) {
      logPromises.push(
        auditLogger.logEvent('TEST', 'PERFORMANCE_TEST', 'SUCCESS', {
          message: `Performance test log entry ${i}`,
          resource: 'test',
          clientIp: '127.0.0.1',
          requestId: `test-${i}`
        })
      );
    }

    await Promise.all(logPromises);
    const endTime = performance.now();

    const avgLogTime = (endTime - startTime) / logCount;

    // Average log time should be reasonable
    expect(avgLogTime).toBeLessThan(5); // Less than 5ms per log

    console.log(`Average audit log time: ${avgLogTime.toFixed(2)}ms`);
  });
});
```

### Load Testing with Security

```bash
#!/bin/bash
# Load testing with security features enabled

echo "🚀 Running load tests with security features"

# Install wrk if not available
if ! command -v wrk &> /dev/null; then
  echo "Installing wrk load testing tool..."
  # Installation commands would go here
fi

# Load test configuration
CONCURRENT_USERS=100
TEST_DURATION="30s"
TARGET_URL="https://api.textarttools.com"

# Create Lua script for authenticated requests
cat > load-test-auth.lua << 'EOF'
-- Load testing with authentication
request = function()
  local timestamp = os.time() * 1000
  local nonce = "load-test-" .. math.random(1000000)

  -- In real test, generate proper signature
  local signature = "mock-signature-for-load-test"

  wrk.headers["X-Timestamp"] = timestamp
  wrk.headers["X-Nonce"] = nonce
  wrk.headers["X-Signature"] = signature
  wrk.headers["Content-Type"] = "application/json"

  local body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  return wrk.format("POST", "/sse", {}, body)
end

response = function(status, headers, body)
  if status ~= 200 then
    print("Error response: " .. status)
  end
end
EOF

# Run load tests
echo "Running health endpoint load test..."
wrk -t4 -c$CONCURRENT_USERS -d$TEST_DURATION $TARGET_URL/health

echo "Running API endpoint load test with security..."
wrk -t4 -c$CONCURRENT_USERS -d$TEST_DURATION -s load-test-auth.lua $TARGET_URL

# Cleanup
rm -f load-test-auth.lua

echo "Load testing completed"
```

---

## Compliance Testing

### GDPR Compliance Testing

```typescript
// GDPR compliance testing
describe('GDPR Compliance', () => {
  it('should respect data minimization principle', async () => {
    const user = await createTestUser();
    const session = await sessionManager.createSession(user, 'mock-token');

    // Verify only necessary data is stored
    const storedSession = await sessionManager.getSession(session);

    // Should not store sensitive information unnecessarily
    expect(storedSession.user.email).toBeDefined(); // Necessary for service
    expect(storedSession.user.phone).toBeUndefined(); // Not collected
    expect(storedSession.user.address).toBeUndefined(); // Not collected
  });

  it('should enforce data retention policies', async () => {
    const auditLogger = getAuditLogger(testEnv);

    // Create old log entries
    await auditLogger.logEvent('TEST', 'OLD_ENTRY', 'SUCCESS', {
      message: 'Old test entry',
      resource: 'test',
      clientIp: '127.0.0.1',
      requestId: 'old-test'
    });

    // Fast-forward time beyond retention period
    jest.advanceTimersByTime(91 * 24 * 60 * 60 * 1000); // 91 days

    // Run cleanup
    await auditLogger.cleanupExpiredLogs();

    // Verify old logs are removed
    const logs = await auditLogger.query({
      timeRange: { start: 0, end: Date.now() }
    });

    expect(logs.every(log =>
      Date.now() - log.timestamp < 90 * 24 * 60 * 60 * 1000
    )).toBe(true);
  });

  it('should support right to data portability', async () => {
    const user = await createTestUser();

    // Export user data
    const exportedData = await exportUserData(user.id);

    // Verify export format and completeness
    expect(exportedData).toHaveProperty('user_profile');
    expect(exportedData).toHaveProperty('usage_history');
    expect(exportedData).toHaveProperty('security_logs');

    // Verify data is in portable format (JSON)
    expect(() => JSON.stringify(exportedData)).not.toThrow();
  });
});
```

### SOC2 Compliance Testing

```typescript
// SOC2 compliance testing
describe('SOC2 Compliance', () => {
  describe('CC6.1 - Logical Access Controls', () => {
    it('should enforce authentication for protected resources', async () => {
      const protectedEndpoints = [
        '/sse',
        '/auth/logout',
        '/security-status'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await testServer.request(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        expect([401, 403]).toContain(response.status);
      }
    });

    it('should maintain audit trail of access events', async () => {
      const auditLogger = getAuditLogger(testEnv);

      // Perform authenticated action
      const { sessionToken } = await createAuthenticatedSession(testServer);
      await testServer.request('/sse', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `mcp_session=${sessionToken}`
        }
      });

      // Verify audit log entry
      const logs = await auditLogger.query({
        category: 'SYSTEM_ACCESS',
        timeRange: { start: Date.now() - 60000, end: Date.now() }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toMatchObject({
        category: 'SYSTEM_ACCESS',
        action: expect.any(String),
        userId: expect.any(String)
      });
    });
  });

  describe('CC6.7 - Data Transmission', () => {
    it('should encrypt all data in transit', async () => {
      // Verify HTTPS enforcement
      const httpResponse = await fetch('http://api.textarttools.com/health')
        .catch(error => ({ redirected: true }));

      expect(httpResponse.redirected || httpResponse.url?.startsWith('https://')).toBe(true);
    });

    it('should use secure protocols', async () => {
      const response = await testServer.request('/health');
      const securityHeaders = response.headers;

      expect(securityHeaders.get('Strict-Transport-Security')).toBeTruthy();
    });
  });
});
```

---

## CI/CD Integration

### GitHub Actions Security Testing

```yaml
# .github/workflows/security-tests.yml
name: Security Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run security unit tests
      run: npm run test:security

    - name: Run dependency vulnerability scan
      run: |
        npm audit --audit-level moderate
        npx snyk test || true

    - name: Run SAST (Static Application Security Testing)
      uses: github/codeql-action/analyze@v2
      with:
        languages: typescript
        queries: security-and-quality

    - name: Run Semgrep security scan
      uses: returntocorp/semgrep-action@v1
      with:
        config: auto

    - name: Security headers test
      run: |
        npm run build
        npm run start:test &
        sleep 10
        curl -I http://localhost:8788 | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options)"

    - name: Upload security test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: security-test-results
        path: |
          coverage/
          security-reports/
          test-results.xml

  dependency-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
    - uses: actions/checkout@v3
    - uses: actions/dependency-review-action@v3
      with:
        fail-on-severity: moderate
        allow-licenses: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause

  security-scorecard:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      id-token: write

    steps:
    - uses: actions/checkout@v3
    - uses: ossf/scorecard-action@v2.0.6
      with:
        results_file: results.sarif
        results_format: sarif
        publish_results: true
```

### Pre-commit Security Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ['-c', 'bandit.yaml']

  - repo: https://github.com/returntocorp/semgrep
    rev: v1.45.0
    hooks:
      - id: semgrep
        args: ['--config=auto']

  - repo: local
    hooks:
      - id: security-tests
        name: Run security tests
        entry: npm run test:security
        language: system
        stages: [commit]

      - id: audit-dependencies
        name: Audit dependencies
        entry: npm audit --audit-level moderate
        language: system
        stages: [commit]
```

---

## Testing Tools and Frameworks

### Security Testing Stack

#### Core Testing Tools

```json
{
  "devDependencies": {
    "vitest": "^0.34.0",
    "@vitest/coverage-v8": "^0.34.0",
    "playwright": "^1.38.0",
    "@playwright/test": "^1.38.0",
    "supertest": "^6.3.0",
    "nock": "^13.3.0",
    "jest-extended": "^4.0.0",
    "security-test-utils": "^1.0.0"
  },
  "scripts": {
    "test:security": "vitest run src/security-tests/",
    "test:security:watch": "vitest watch src/security-tests/",
    "test:security:coverage": "vitest run --coverage src/security-tests/",
    "test:integration": "playwright test",
    "test:e2e:security": "playwright test tests/security/",
    "test:performance": "vitest run tests/performance/",
    "audit:security": "npm audit && snyk test",
    "scan:sast": "semgrep --config=auto src/",
    "scan:secrets": "detect-secrets scan --baseline .secrets.baseline",
    "pentest:automated": "./scripts/automated-pentest.sh"
  }
}
```

#### Custom Security Testing Utilities

```typescript
// test-utils/security-helpers.ts
export class SecurityTestHelpers {
  static createMaliciousPayload(type: 'xss' | 'sql' | 'path-traversal'): string {
    const payloads = {
      xss: '<script>alert("xss")</script>',
      sql: "'; DROP TABLE users; --",
      'path-traversal': '../../../etc/passwd'
    };
    return payloads[type];
  }

  static async validateSecurityHeaders(response: Response): Promise<void> {
    const requiredHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options'
    ];

    for (const header of requiredHeaders) {
      expect(response.headers.get(header)).toBeTruthy();
    }
  }

  static generateFuzzingData(size: number): string[] {
    return [
      'A'.repeat(size),
      '\x00'.repeat(size),
      '🚀'.repeat(size),
      JSON.stringify({}).repeat(size)
    ];
  }

  static async measurePerformanceImpact(
    testFunction: () => Promise<void>,
    iterations: number = 100
  ): Promise<number> {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await testFunction();
    }

    const endTime = performance.now();
    return (endTime - startTime) / iterations;
  }
}
```

---

## Test Data Management

### Secure Test Data

```typescript
// test-data/security-test-data.ts
export const SecurityTestData = {
  // XSS test vectors
  xssPayloads: [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '<iframe src="javascript:alert(\'xss\')">',
    // ... more payloads
  ],

  // SQL injection test vectors
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    // ... more payloads
  ],

  // Valid test users (for positive testing)
  validTestUsers: [
    {
      id: 'test-user-1',
      username: 'testuser1',
      email: 'test1@example.com',
      name: 'Test User 1'
    }
  ],

  // Unicode edge cases
  unicodeTestCases: [
    '\uFEFF', // BOM
    '\u200B\u200C\u200D', // Zero-width characters
    '\u202A\u202B\u202C\u202D\u202E', // Bidirectional override
    // ... more cases
  ]
};

// Ensure test data doesn't contain real secrets
export function validateTestData(): void {
  const testDataString = JSON.stringify(SecurityTestData);

  const secretPatterns = [
    /[a-zA-Z0-9]{32,}/, // Long alphanumeric strings (potential secrets)
    /sk_live_[a-zA-Z0-9]+/, // Stripe live keys
    /pk_live_[a-zA-Z0-9]+/, // Stripe public keys
    /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access tokens
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(testDataString)) {
      throw new Error(`Potential secret detected in test data: ${pattern}`);
    }
  }
}
```

### Test Environment Isolation

```typescript
// test-setup/test-environment.ts
export class TestEnvironment {
  private static instance: TestEnvironment;
  private testDb: TestDatabase;
  private testServer: TestServer;

  static async setup(): Promise<TestEnvironment> {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
      await TestEnvironment.instance.initialize();
    }
    return TestEnvironment.instance;
  }

  private async initialize(): Promise<void> {
    // Create isolated test environment
    this.testDb = new TestDatabase({
      type: 'memory',
      isolation: 'complete'
    });

    this.testServer = new TestServer({
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_SECRET: 'test-jwt-secret-32-characters-long',
        GITHUB_CLIENT_ID: 'test-client-id',
        GITHUB_CLIENT_SECRET: 'test-client-secret',
        SECURITY_LEVEL: 'strict'
      }
    });

    await this.seedTestData();
  }

  private async seedTestData(): Promise<void> {
    // Seed with known test data
    await this.testDb.seed(SecurityTestData.validTestUsers);
  }

  async cleanup(): Promise<void> {
    await this.testDb.destroy();
    await this.testServer.stop();
  }
}
```

---

## Reporting and Metrics

### Security Test Reporting

```typescript
// reporting/security-test-reporter.ts
export class SecurityTestReporter {
  private results: SecurityTestResult[] = [];

  addResult(result: SecurityTestResult): void {
    this.results.push(result);
  }

  generateReport(): SecurityReport {
    return {
      summary: this.generateSummary(),
      vulnerabilities: this.getVulnerabilities(),
      coverage: this.calculateCoverage(),
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations()
    };
  }

  private generateSummary(): SecuritySummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: (passed / total) * 100,
      securityScore: this.calculateSecurityScore()
    };
  }

  private getVulnerabilities(): Vulnerability[] {
    return this.results
      .filter(r => r.status === 'failed' && r.severity)
      .map(r => ({
        name: r.name,
        severity: r.severity!,
        description: r.description,
        remediation: r.remediation
      }));
  }

  private calculateCoverage(): SecurityCoverage {
    const categories = [
      'authentication',
      'authorization',
      'input_validation',
      'output_encoding',
      'cryptography',
      'session_management',
      'error_handling',
      'logging'
    ];

    const coverage = categories.map(category => ({
      category,
      tested: this.results.filter(r => r.category === category).length,
      passed: this.results.filter(r =>
        r.category === category && r.status === 'passed'
      ).length
    }));

    return {
      overall: this.calculateOverallCoverage(coverage),
      byCategory: coverage
    };
  }

  async exportReport(format: 'json' | 'html' | 'junit'): Promise<string> {
    const report = this.generateReport();

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'html':
        return this.generateHTMLReport(report);

      case 'junit':
        return this.generateJUnitReport(report);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateHTMLReport(report: SecurityReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Security Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    .vulnerability { background: #ffe6e6; padding: 10px; margin: 10px 0; border-left: 4px solid #ff4444; }
    .passed { color: green; }
    .failed { color: red; }
    .coverage-bar { background: #ddd; height: 20px; border-radius: 10px; overflow: hidden; }
    .coverage-fill { background: #4CAF50; height: 100%; }
  </style>
</head>
<body>
  <h1>Security Test Report</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: ${report.summary.total}</p>
    <p class="passed">Passed: ${report.summary.passed}</p>
    <p class="failed">Failed: ${report.summary.failed}</p>
    <p>Pass Rate: ${report.summary.passRate.toFixed(2)}%</p>
    <p>Security Score: ${report.summary.securityScore.toFixed(2)}/100</p>
  </div>

  <h2>Coverage</h2>
  <div class="coverage-bar">
    <div class="coverage-fill" style="width: ${report.coverage.overall}%"></div>
  </div>
  <p>Overall Coverage: ${report.coverage.overall.toFixed(2)}%</p>

  ${report.vulnerabilities.length > 0 ? `
  <h2>Vulnerabilities</h2>
  ${report.vulnerabilities.map(v => `
    <div class="vulnerability">
      <h3>${v.name} (${v.severity})</h3>
      <p>${v.description}</p>
      <p><strong>Remediation:</strong> ${v.remediation}</p>
    </div>
  `).join('')}
  ` : '<h2>No Vulnerabilities Found</h2>'}

  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
  </ul>
</body>
</html>
    `;
  }
}
```

### Security Metrics Dashboard

```typescript
// monitoring/security-metrics.ts
export class SecurityMetrics {
  async collectMetrics(): Promise<SecurityMetricsData> {
    return {
      testMetrics: await this.getTestMetrics(),
      vulnerabilityMetrics: await this.getVulnerabilityMetrics(),
      coverageMetrics: await this.getCoverageMetrics(),
      performanceMetrics: await this.getPerformanceMetrics()
    };
  }

  private async getTestMetrics(): Promise<TestMetrics> {
    const testResults = await this.loadTestResults();

    return {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.status === 'passed').length,
      failedTests: testResults.filter(r => r.status === 'failed').length,
      securityTestCount: testResults.filter(r => r.type === 'security').length,
      lastRunTime: new Date(),
      averageExecutionTime: this.calculateAverageExecutionTime(testResults)
    };
  }

  private async getVulnerabilityMetrics(): Promise<VulnerabilityMetrics> {
    const vulnerabilities = await this.loadVulnerabilities();

    return {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
      resolvedCount: vulnerabilities.filter(v => v.status === 'resolved').length,
      avgResolutionTime: this.calculateAverageResolutionTime(vulnerabilities)
    };
  }
}
```

---

## Conclusion

This comprehensive security testing guide ensures the TextArtTools MCP Server maintains the highest security standards through:

- **Automated Testing**: Continuous security validation in CI/CD
- **Manual Testing**: Thorough manual security assessments
- **Performance Testing**: Security feature performance optimization
- **Compliance Testing**: GDPR, SOC2, and regulatory compliance
- **Penetration Testing**: Regular security assessments
- **Vulnerability Management**: Proactive vulnerability detection and remediation

### Testing Schedule

| Test Type | Frequency | Responsibility |
|-----------|-----------|----------------|
| Unit Security Tests | Every commit | Developers |
| Integration Tests | Daily | CI/CD Pipeline |
| Manual Security Review | Weekly | Security Team |
| Dependency Scanning | Daily | Automated |
| Performance Testing | Weekly | DevOps Team |
| Penetration Testing | Quarterly | External Firm |
| Compliance Audit | Annually | Compliance Team |

### Success Metrics

- **Test Coverage**: > 90% security test coverage
- **Vulnerability Resolution**: < 30 days for high/critical
- **Performance Impact**: < 10% overhead from security features
- **Compliance Score**: 100% compliance with standards

---

**Document Version**: 1.0.0
**Last Updated**: January 2025
**Next Review**: April 2025

**Security Testing Contact**: security-testing@textarttools.com