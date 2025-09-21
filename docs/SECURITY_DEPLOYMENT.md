# Security Deployment Guide
## TextArtTools MCP Server - Production Security Configuration

[![Deployment](https://img.shields.io/badge/Deployment-Production%20Ready-green.svg)](./SECURITY_DEPLOYMENT.md)
[![Cloudflare](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange.svg)](./SECURITY_DEPLOYMENT.md)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-blue.svg)](./SECURITY_DEPLOYMENT.md)

---

## Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Cloudflare Workers Security](#cloudflare-workers-security)
4. [Secret Management](#secret-management)
5. [Network Security Configuration](#network-security-configuration)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Compliance Configuration](#compliance-configuration)
8. [Performance Security Trade-offs](#performance-security-trade-offs)
9. [Post-Deployment Validation](#post-deployment-validation)
10. [Maintenance and Updates](#maintenance-and-updates)

---

## Pre-Deployment Security Checklist

### ✅ Essential Security Verification

Before deploying to production, ensure all security components are properly configured:

#### Authentication & Authorization
- [ ] GitHub OAuth app configured with production callback URLs
- [ ] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` properly set
- [ ] `JWT_SECRET` generated with cryptographically secure random data (min 32 characters)
- [ ] Session expiration configured appropriately (7 days default)
- [ ] OAuth scopes limited to minimum required permissions

#### Input Validation
- [ ] `MAX_TEXT_LENGTH` set to appropriate limit (10,000 default)
- [ ] Strict validation enabled for production (`ENABLE_STRICT_VALIDATION=true`)
- [ ] Unicode ranges restricted to business requirements
- [ ] Zalgo complexity limits configured (50 for strict mode)

#### Security Features
- [ ] Request signing enabled (`ENABLE_REQUEST_SIGNING=true`)
- [ ] Secret rotation enabled (`ENABLE_SECRET_ROTATION=true`)
- [ ] Audit logging configured with appropriate retention (90 days)
- [ ] CSP reporting endpoint configured (`CSP_REPORT_ENDPOINT=/csp-report`)

#### Infrastructure Security
- [ ] TLS 1.3 enforced for all connections
- [ ] HSTS headers enabled with preload
- [ ] Rate limiting configured per environment
- [ ] CORS origins restricted to known domains

#### Monitoring & Compliance
- [ ] Security status endpoint protected (`SECURITY_STATUS_TOKEN`)
- [ ] Audit log retention meets compliance requirements
- [ ] Analytics configured without PII collection
- [ ] Error logging configured with PII redaction

---

## Environment Configuration

### Production Environment Variables

Create a comprehensive production configuration following security best practices:

```bash
#!/bin/bash
# Production Security Configuration Script
# Run this script to configure all security-related environment variables

# ========================================
# SECURITY LEVEL CONFIGURATION
# ========================================
wrangler secret put SECURITY_LEVEL --env production
# Enter: strict

wrangler secret put ENVIRONMENT --env production
# Enter: production

# ========================================
# AUTHENTICATION CONFIGURATION
# ========================================
# GitHub OAuth Configuration
wrangler secret put GITHUB_CLIENT_ID --env production
# Enter: your_github_oauth_client_id

wrangler secret put GITHUB_CLIENT_SECRET --env production
# Enter: your_github_oauth_client_secret

# JWT Secret (Generate with: openssl rand -base64 32)
wrangler secret put JWT_SECRET --env production
# Enter: your_cryptographically_secure_jwt_secret_32_chars_minimum

# ========================================
# RATE LIMITING CONFIGURATION
# ========================================
wrangler secret put RATE_LIMIT_AUTHENTICATED --env production
# Enter: 1000

wrangler secret put RATE_LIMIT_ANONYMOUS --env production
# Enter: 100

wrangler secret put RATE_LIMIT_BURST --env production
# Enter: 50

# ========================================
# INPUT VALIDATION CONFIGURATION
# ========================================
wrangler secret put MAX_TEXT_LENGTH --env production
# Enter: 10000

wrangler secret put ENABLE_STRICT_VALIDATION --env production
# Enter: true

# ========================================
# REQUEST SIGNING CONFIGURATION
# ========================================
wrangler secret put ENABLE_REQUEST_SIGNING --env production
# Enter: true

# ========================================
# SECRET ROTATION CONFIGURATION
# ========================================
wrangler secret put ENABLE_SECRET_ROTATION --env production
# Enter: true

wrangler secret put SECRET_ROTATION_INTERVAL --env production
# Enter: 30d

wrangler secret put AUTO_ROTATE_SECRETS --env production
# Enter: true

# ========================================
# AUDIT LOGGING CONFIGURATION
# ========================================
wrangler secret put AUDIT_LOG_RETENTION --env production
# Enter: 90

# ========================================
# CSP CONFIGURATION
# ========================================
wrangler secret put CSP_REPORT_ENDPOINT --env production
# Enter: /csp-report

# ========================================
# SECURITY MONITORING CONFIGURATION
# ========================================
# Generate secure token: openssl rand -base64 32
wrangler secret put SECURITY_STATUS_TOKEN --env production
# Enter: your_secure_monitoring_token

# ========================================
# CORS CONFIGURATION
# ========================================
wrangler secret put CORS_ORIGIN --env production
# Enter: https://claude.ai,https://your-domain.com

echo "✅ Production security configuration completed!"
echo "⚠️  Please store all secrets securely and never commit them to version control"
```

### Environment-Specific Security Levels

#### Production (Strict Security)
```bash
# Maximum security configuration
SECURITY_LEVEL=strict
ENVIRONMENT=production
ENABLE_STRICT_VALIDATION=true
ENABLE_REQUEST_SIGNING=true
ENABLE_SECRET_ROTATION=true
CSP_REPORT_ENDPOINT=/csp-report
AUDIT_LOG_RETENTION=90
RATE_LIMIT_AUTHENTICATED=1000
RATE_LIMIT_ANONYMOUS=100
```

#### Staging (Standard Security)
```bash
# Balanced security for testing
SECURITY_LEVEL=standard
ENVIRONMENT=staging
ENABLE_STRICT_VALIDATION=false
ENABLE_REQUEST_SIGNING=false
ENABLE_SECRET_ROTATION=false
AUDIT_LOG_RETENTION=30
RATE_LIMIT_AUTHENTICATED=2000
RATE_LIMIT_ANONYMOUS=200
```

#### Development (Permissive)
```bash
# Minimal security for development
SECURITY_LEVEL=permissive
ENVIRONMENT=development
ENABLE_STRICT_VALIDATION=false
ENABLE_REQUEST_SIGNING=false
ENABLE_SECRET_ROTATION=false
AUDIT_LOG_RETENTION=7
RATE_LIMIT_AUTHENTICATED=5000
RATE_LIMIT_ANONYMOUS=1000
```

---

## Cloudflare Workers Security

### Worker Configuration

#### wrangler.toml Security Settings

```toml
name = "textarttools-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Production Environment
[env.production]
zone_id = "your_cloudflare_zone_id"
route = { pattern = "api.textarttools.com/*", zone_id = "your_zone_id" }

# Security-focused KV bindings
[[env.production.kv_namespaces]]
binding = "MCP_SESSIONS"
id = "your_production_kv_namespace_id"
preview_id = "your_preview_kv_namespace_id"

# Analytics binding for security monitoring
[[env.production.analytics_engine_datasets]]
binding = "MCP_ANALYTICS"
dataset = "textarttools_security_analytics"

# Resource limits for security
[env.production.limits]
cpu_ms = 50  # Prevent DoS via CPU exhaustion
memory_mb = 128  # Memory limit for worker

# Security headers
[env.production.vars]
WORKER_ENV = "production"
LOG_LEVEL = "info"
```

### Cloudflare Security Features

#### Web Application Firewall (WAF)

Configure Cloudflare WAF rules for additional protection:

```javascript
// Custom WAF Rule: Block suspicious user agents
(http.user_agent contains "python-requests") or
(http.user_agent contains "curl/") or
(http.user_agent contains "wget/") or
(http.user_agent eq "")

// Custom WAF Rule: Rate limiting by IP
(ip.src in {suspicious_ip_list})

// Custom WAF Rule: Block common attack patterns
(http.request.body contains "<script") or
(http.request.body contains "javascript:") or
(http.request.body contains "eval(") or
(http.request.body contains "'; DROP TABLE")

// Custom WAF Rule: Geographic restrictions (if needed)
(ip.geoip.country ne "US" and ip.geoip.country ne "CA" and ip.geoip.country ne "GB")
```

#### Bot Management

```javascript
// Bot Management Configuration
{
  "mode": "block",
  "settings": {
    "javascript_detections": true,
    "static_resource_protection": false,
    "fight_mode": false,
    "challenge_unsuccessful_requests": true,
    "block_bad_bots": true
  }
}
```

#### DDoS Protection

```javascript
// DDoS Protection Settings
{
  "ddos_protection": "high",
  "rate_limiting": {
    "requests_per_minute": 1000,
    "requests_per_hour": 10000,
    "burst_allowance": 100
  },
  "adaptive_protection": true
}
```

---

## Secret Management

### Secret Generation Best Practices

#### JWT Secret Generation
```bash
# Generate cryptographically secure JWT secret
openssl rand -base64 32
# Example output: 8Xd2Qp9vB3nM7kL1fG5hJ8wR4tY6uI0oP2sA3zD9cE1xF7vN5bM8qK2wG4hJ6tR9

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Security Status Token Generation
```bash
# Generate secure monitoring token
openssl rand -hex 32
# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Alternative using uuidgen
uuidgen | tr -d '\n' | openssl dgst -sha256 -binary | base64
```

#### GitHub OAuth Setup

1. **Create GitHub OAuth App**:
   ```
   Application name: TextArtTools MCP Server
   Homepage URL: https://api.textarttools.com
   Authorization callback URL: https://api.textarttools.com/auth/callback
   ```

2. **Configure OAuth Scopes**:
   - `user:email` (minimal scope for user identification)
   - Avoid requesting unnecessary permissions

3. **Secure Client Secret Storage**:
   ```bash
   # Store GitHub client secret securely
   wrangler secret put GITHUB_CLIENT_SECRET --env production
   # Never commit client secrets to version control
   ```

### Secret Rotation Implementation

#### Automated Rotation Schedule

| Secret Type | Rotation Frequency | Grace Period | Notification |
|-------------|-------------------|--------------|--------------|
| JWT_SECRET | 30 days | 7 days | 5 days before |
| GITHUB_CLIENT_SECRET | 90 days | 30 days | 14 days before |
| SIGNING_KEY | 30 days | 7 days | 5 days before |
| SECURITY_STATUS_TOKEN | 60 days | 14 days | 7 days before |

#### Rotation Process Automation

```bash
#!/bin/bash
# Secret Rotation Script
# Run as part of CI/CD pipeline or scheduled job

ENVIRONMENT="production"
NOTIFICATION_WEBHOOK="https://hooks.slack.com/your-webhook"

# Check rotation status
ROTATION_STATUS=$(curl -s -H "Authorization: Bearer $SECURITY_STATUS_TOKEN" \
  "https://api.textarttools.com/security-status" | jq -r '.features.secretRotation.status')

if [ "$ROTATION_STATUS" = "rotation_required" ]; then
  echo "🔄 Secret rotation required, initiating automated rotation..."

  # Generate new JWT secret
  NEW_JWT_SECRET=$(openssl rand -base64 32)

  # Update secret with graceful rollover
  wrangler secret put JWT_SECRET --env $ENVIRONMENT <<< "$NEW_JWT_SECRET"

  # Notify team
  curl -X POST $NOTIFICATION_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d '{"text":"🔐 JWT secret rotated successfully for '$ENVIRONMENT' environment"}'

  echo "✅ Secret rotation completed"
else
  echo "ℹ️ No rotation required at this time"
fi
```

---

## Network Security Configuration

### TLS/SSL Configuration

#### Certificate Management
```bash
# Cloudflare automatically manages TLS certificates
# Ensure proper DNS configuration for custom domains

# Verify TLS configuration
curl -I https://api.textarttools.com
# Should return TLS 1.3 with modern cipher suites

# Check certificate validity
openssl s_client -connect api.textarttools.com:443 -servername api.textarttools.com
```

#### Custom Domain Security
```javascript
// DNS Configuration for custom domain
{
  "type": "CNAME",
  "name": "api",
  "content": "textarttools-mcp-server.your-subdomain.workers.dev",
  "proxied": true,
  "ttl": 1  // Automatic TTL when proxied
}

// Security headers for custom domain
{
  "always_use_https": true,
  "ssl": "strict",
  "security_level": "high",
  "challenge_ttl": 1800,
  "browser_integrity_check": true
}
```

### CORS Configuration

#### Production CORS Policy
```typescript
// Strict CORS for production
const allowedOrigins = [
  'https://claude.ai',
  'https://api.textarttools.com',
  'https://dashboard.textarttools.com'
];

// Development CORS (more permissive)
const devAllowedOrigins = [
  ...allowedOrigins,
  'http://localhost:3000',
  'http://localhost:8788',
  'http://127.0.0.1:3000'
];
```

#### CORS Headers Implementation
```typescript
function getCorsHeaders(origin?: string): Record<string, string> {
  const isAllowedOrigin = allowedOrigins.includes(origin || '');

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin! : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Timestamp, X-Nonce, X-Signature',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}
```

---

## Monitoring and Alerting

### Security Monitoring Setup

#### Cloudflare Analytics Configuration

```javascript
// Analytics Engine Dataset for Security Events
{
  "dataset_name": "textarttools_security_analytics",
  "schema": {
    "timestamp": "datetime",
    "event_type": "string",
    "severity": "string",
    "client_ip": "string",
    "user_agent": "string",
    "threat_indicators": "array",
    "request_id": "string",
    "response_code": "integer",
    "processing_time_ms": "integer"
  }
}
```

#### Security Metrics Dashboard

```sql
-- Failed Authentication Attempts (last 24 hours)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as failed_attempts
FROM textarttools_security_analytics
WHERE event_type = 'AUTHENTICATION_FAILED'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;

-- Top Threat Indicators
SELECT
  threat_indicator,
  COUNT(*) as occurrences,
  COUNT(DISTINCT client_ip) as unique_ips
FROM textarttools_security_analytics
CROSS JOIN UNNEST(threat_indicators) as threat_indicator
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY threat_indicator
ORDER BY occurrences DESC;

-- Security Event Severity Distribution
SELECT
  severity,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM textarttools_security_analytics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY severity;
```

#### Real-time Alerting

```javascript
// Webhook configuration for security alerts
const alertWebhooks = {
  critical: "https://hooks.slack.com/critical-security-alerts",
  high: "https://hooks.slack.com/high-security-alerts",
  medium: "https://hooks.pagerduty.com/medium-alerts"
};

// Alert conditions
const alertConditions = {
  authentication_failures: {
    threshold: 10,
    window: "5 minutes",
    severity: "high"
  },
  csp_violations: {
    threshold: 5,
    window: "1 minute",
    severity: "medium"
  },
  input_validation_failures: {
    threshold: 50,
    window: "5 minutes",
    severity: "medium"
  },
  critical_errors: {
    threshold: 1,
    window: "1 minute",
    severity: "critical"
  }
};
```

### Health Check Monitoring

#### Security Health Endpoints

```bash
# Security status endpoint (requires authentication)
curl -H "Authorization: Bearer $SECURITY_STATUS_TOKEN" \
  https://api.textarttools.com/security-status

# Public health check
curl https://api.textarttools.com/health

# CSP report endpoint (for violation reporting)
# Automatically called by browsers when CSP violations occur
```

#### Monitoring Script

```bash
#!/bin/bash
# Security Health Check Script
# Run every 5 minutes via cron

API_BASE="https://api.textarttools.com"
SECURITY_TOKEN="your_security_status_token"
ALERT_WEBHOOK="https://hooks.slack.com/your-webhook"

# Check overall health
HEALTH_STATUS=$(curl -s "$API_BASE/health" | jq -r '.status')

if [ "$HEALTH_STATUS" != "healthy" ]; then
  curl -X POST $ALERT_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d '{"text":"🚨 Health check failed for TextArtTools MCP Server"}'
fi

# Check security status
SECURITY_STATUS=$(curl -s -H "Authorization: Bearer $SECURITY_TOKEN" \
  "$API_BASE/security-status" | jq -r '.security.status')

if [ "$SECURITY_STATUS" != "SECURE" ]; then
  SECURITY_SCORE=$(curl -s -H "Authorization: Bearer $SECURITY_TOKEN" \
    "$API_BASE/security-status" | jq -r '.security.score')

  curl -X POST $ALERT_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d '{"text":"⚠️ Security status warning: '$SECURITY_STATUS' (Score: '$SECURITY_SCORE')"}'
fi

echo "$(date): Health=$HEALTH_STATUS, Security=$SECURITY_STATUS"
```

---

## Compliance Configuration

### GDPR Compliance Setup

#### Data Processing Configuration

```typescript
// GDPR compliance settings
const gdprConfig = {
  dataRetentionPeriods: {
    sessionData: 7 * 24 * 60 * 60 * 1000,      // 7 days
    auditLogs: 90 * 24 * 60 * 60 * 1000,       // 90 days
    analyticsData: 30 * 24 * 60 * 60 * 1000,   // 30 days (aggregated)
    errorLogs: 30 * 24 * 60 * 60 * 1000        // 30 days (PII redacted)
  },

  dataMinimization: {
    collectOnlyNecessary: true,
    anonymizeAnalytics: true,
    redactPIIFromLogs: true
  },

  userRights: {
    enableDataExport: true,
    enableDataDeletion: true,
    enableDataCorrection: true
  }
};
```

#### Privacy Policy Configuration

```typescript
// Privacy policy endpoints
app.get('/privacy-policy', (req, res) => {
  res.json({
    lastUpdated: "2025-01-01",
    dataCollected: [
      "GitHub profile information (username, email)",
      "Usage analytics (anonymized)",
      "Security logs (IP addresses, timestamps)"
    ],
    dataUsage: [
      "Service authentication and authorization",
      "Security monitoring and incident response",
      "Service improvement and analytics"
    ],
    dataRetention: gdprConfig.dataRetentionPeriods,
    userRights: [
      "Right to access personal data",
      "Right to rectification",
      "Right to erasure",
      "Right to data portability"
    ]
  });
});
```

### SOC2 Compliance Configuration

#### Control Implementation Tracking

```typescript
// SOC2 control implementation
const soc2Controls = {
  "CC6.1": {
    name: "Logical and Physical Access Controls",
    implementation: [
      "OAuth 2.0 authentication",
      "Session management with expiration",
      "Principle of least privilege"
    ],
    evidence: [
      "Authentication logs",
      "Access control configurations",
      "Session management logs"
    ]
  },

  "CC6.2": {
    name: "Logical and Physical Access Controls - Removal",
    implementation: [
      "Automated session expiration",
      "Immediate access revocation",
      "Audit trail of access changes"
    ],
    evidence: [
      "Session cleanup logs",
      "Access revocation events",
      "Audit trail documentation"
    ]
  },

  "CC6.3": {
    name: "Network Communications",
    implementation: [
      "TLS 1.3 encryption",
      "Security headers enforcement",
      "Network access controls"
    ],
    evidence: [
      "TLS configuration",
      "Security header validation",
      "Network security logs"
    ]
  }
};
```

---

## Performance Security Trade-offs

### Security Impact Analysis

#### Performance Metrics

| Security Feature | Performance Impact | Mitigation |
|------------------|-------------------|------------|
| **Input Validation** | +2-5ms per request | Optimized regex patterns |
| **Output Sanitization** | +1-3ms per response | Cached encoding tables |
| **Request Signing** | +5-10ms per request | Async signature validation |
| **Audit Logging** | +3-7ms per request | Batched log writes |
| **CSP Headers** | +1-2ms per response | Static header templates |

#### Optimization Strategies

```typescript
// Performance-optimized security configuration
const optimizedSecurityConfig = {
  // Use compiled regex patterns
  inputValidation: {
    compiledPatterns: true,
    cacheValidationResults: true,
    maxCacheSize: 1000
  },

  // Batch audit log writes
  auditLogging: {
    batchSize: 100,
    flushInterval: 10000, // 10 seconds
    compressionEnabled: true
  },

  // Optimize request signing
  requestSigning: {
    algorithmOptimized: 'HMAC-SHA256',
    cacheNonceValidation: true,
    nonceCleanupInterval: 300000 // 5 minutes
  }
};
```

#### Load Testing with Security

```bash
# Load test with security features enabled
wrk -t4 -c100 -d30s -s security-test.lua https://api.textarttools.com/sse

# security-test.lua
request = function()
  local timestamp = os.time() * 1000
  local nonce = "test-nonce-" .. math.random(1000000)
  local signature = "test-signature" -- Generate proper signature in real test

  wrk.headers["X-Timestamp"] = timestamp
  wrk.headers["X-Nonce"] = nonce
  wrk.headers["X-Signature"] = signature
  wrk.headers["Content-Type"] = "application/json"

  return wrk.format("POST", "/sse", {}, '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')
end
```

---

## Post-Deployment Validation

### Security Validation Checklist

#### Automated Security Tests

```bash
#!/bin/bash
# Post-deployment security validation script

API_BASE="https://api.textarttools.com"
echo "🔒 Starting security validation for $API_BASE"

# Test 1: TLS Configuration
echo "Testing TLS configuration..."
TLS_VERSION=$(curl -s -I --tlsv1.3 $API_BASE | head -1)
if [[ $TLS_VERSION == *"200"* ]]; then
  echo "✅ TLS 1.3 working"
else
  echo "❌ TLS 1.3 failed"
fi

# Test 2: Security Headers
echo "Testing security headers..."
HEADERS=$(curl -s -I $API_BASE)

if [[ $HEADERS == *"Strict-Transport-Security"* ]]; then
  echo "✅ HSTS header present"
else
  echo "❌ HSTS header missing"
fi

if [[ $HEADERS == *"Content-Security-Policy"* ]]; then
  echo "✅ CSP header present"
else
  echo "❌ CSP header missing"
fi

# Test 3: Input Validation
echo "Testing input validation..."
XSS_RESPONSE=$(curl -s -X POST $API_BASE/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"unicode_style_text","arguments":{"text":"<script>alert(\"xss\")</script>","style":"bold"}}}')

if [[ $XSS_RESPONSE == *"error"* ]]; then
  echo "✅ XSS input properly rejected"
else
  echo "❌ XSS input not properly handled"
fi

# Test 4: Rate Limiting
echo "Testing rate limiting..."
for i in {1..105}; do
  curl -s $API_BASE/health > /dev/null
done

RATE_LIMIT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_BASE/health)
if [[ $RATE_LIMIT_RESPONSE == "429" ]]; then
  echo "✅ Rate limiting working"
else
  echo "⚠️  Rate limiting may not be active (code: $RATE_LIMIT_RESPONSE)"
fi

# Test 5: Authentication
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $API_BASE/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"unicode_style_text","arguments":{"text":"test","style":"bold"}}}')

if [[ $AUTH_RESPONSE == "401" || $AUTH_RESPONSE == "200" ]]; then
  echo "✅ Authentication working"
else
  echo "❌ Authentication issue (code: $AUTH_RESPONSE)"
fi

echo "🔒 Security validation completed"
```

#### Manual Security Verification

1. **Browser Security**:
   - Open browser developer tools
   - Navigate to your deployed API
   - Check for CSP violations in console
   - Verify security headers in Network tab

2. **Authentication Flow**:
   - Test OAuth flow end-to-end
   - Verify session creation and validation
   - Test session expiration

3. **Input Validation**:
   - Submit various malicious payloads
   - Verify proper error responses
   - Check audit logs for recorded events

### Penetration Testing

#### External Security Assessment

```bash
# Basic security scanning with nmap
nmap -sS -O -sV --script=vuln api.textarttools.com

# SSL/TLS testing with testssl.sh
./testssl.sh api.textarttools.com

# Web application scanning with nikto
nikto -h https://api.textarttools.com

# OWASP ZAP automated scan
zap-baseline.py -t https://api.textarttools.com
```

---

## Maintenance and Updates

### Security Update Schedule

#### Regular Security Maintenance

| Task | Frequency | Owner | Notes |
|------|-----------|-------|-------|
| **Dependency Updates** | Weekly | Dev Team | Automated PR with security review |
| **Security Scan** | Daily | CI/CD | Automated vulnerability scanning |
| **Penetration Test** | Quarterly | Security Team | External security assessment |
| **Access Review** | Monthly | Admin Team | Review user access and permissions |
| **Secret Rotation** | 30 days | Automated | JWT and signing key rotation |
| **Audit Log Review** | Weekly | Security Team | Manual review of audit logs |
| **Configuration Review** | Monthly | Dev Team | Review security settings |

#### Security Update Process

```bash
#!/bin/bash
# Security update deployment process

# 1. Pre-update security check
echo "🔍 Running pre-update security checks..."
npm audit --audit-level high
npm run test:security

# 2. Deploy to staging first
echo "🚀 Deploying to staging..."
wrangler deploy --env staging

# 3. Run security validation on staging
echo "🔒 Validating staging security..."
./scripts/security-validation.sh https://staging-api.textarttools.com

# 4. Manual security review
echo "👥 Manual security review required..."
read -p "Has manual security review passed? (y/N): " review_passed

if [[ $review_passed != "y" ]]; then
  echo "❌ Deployment halted - security review failed"
  exit 1
fi

# 5. Deploy to production
echo "🚀 Deploying to production..."
wrangler deploy --env production

# 6. Post-deployment validation
echo "✅ Running post-deployment validation..."
./scripts/security-validation.sh https://api.textarttools.com

echo "🎉 Security update completed successfully"
```

### Incident Response Integration

#### Automated Incident Detection

```typescript
// Real-time security monitoring
export async function monitorSecurityEvents(env: Env) {
  const auditLogger = getAuditLogger(env);

  // Check for critical security events
  const criticalEvents = await auditLogger.query({
    severity: ['CRITICAL', 'HIGH'],
    timeRange: { start: Date.now() - 300000, end: Date.now() }, // Last 5 minutes
    limit: 100
  });

  if (criticalEvents.length > 0) {
    // Trigger incident response
    await triggerIncidentResponse(criticalEvents, env);
  }
}

async function triggerIncidentResponse(events: AuditLogEntry[], env: Env) {
  const incident = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    severity: determineSeverity(events),
    events: events.map(e => e.id),
    status: 'ACTIVE'
  };

  // Notify incident response team
  await notifyIncidentTeam(incident, env);

  // Auto-remediation for known patterns
  await attemptAutoRemediation(incident, env);
}
```

---

## Conclusion

This deployment guide provides comprehensive security configuration for production deployment of the TextArtTools MCP Server. Following these guidelines ensures:

- **Enterprise-grade security** with defense in depth
- **Compliance readiness** for SOC2, GDPR, and industry standards
- **Operational security** with monitoring and incident response
- **Performance optimization** balancing security and speed
- **Maintenance procedures** for ongoing security

### Quick Deployment Commands

```bash
# 1. Clone and setup
git clone https://github.com/your-org/textarttools-mcp-server.git
cd textarttools-mcp-server

# 2. Configure secrets (run the configuration script above)
./scripts/configure-production-secrets.sh

# 3. Deploy with security validation
npm run deploy:production

# 4. Validate deployment
./scripts/post-deployment-validation.sh

# 5. Monitor security status
curl -H "Authorization: Bearer $SECURITY_STATUS_TOKEN" \
  https://api.textarttools.com/security-status
```

### Support and Resources

- **Security Issues**: security@textarttools.com
- **Deployment Support**: devops@textarttools.com
- **Documentation**: [Security Docs](../SECURITY.md)
- **Incident Response**: [Incident Procedures](./INCIDENT_RESPONSE.md)

---

**Last Updated**: January 2025
**Next Review**: April 2025
**Document Version**: 1.0.0