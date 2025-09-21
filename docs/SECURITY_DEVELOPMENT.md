# Developer Security Guidelines
## TextArtTools MCP Server - Secure Development Practices

[![Secure Development](https://img.shields.io/badge/Secure%20Development-Best%20Practices-green.svg)](./SECURITY_DEVELOPMENT.md)
[![Security First](https://img.shields.io/badge/Security-First-blue.svg)](./SECURITY_DEVELOPMENT.md)
[![Standards](https://img.shields.io/badge/Standards-OWASP%20Compliant-orange.svg)](./SECURITY_DEVELOPMENT.md)

---

## Table of Contents

1. [Secure Development Overview](#secure-development-overview)
2. [Security-First Coding Principles](#security-first-coding-principles)
3. [Input Validation Guidelines](#input-validation-guidelines)
4. [Output Encoding Standards](#output-encoding-standards)
5. [Authentication & Authorization](#authentication--authorization)
6. [Cryptography Best Practices](#cryptography-best-practices)
7. [Error Handling Security](#error-handling-security)
8. [Logging and Monitoring](#logging-and-monitoring)
9. [API Security Guidelines](#api-security-guidelines)
10. [Frontend Security](#frontend-security)
11. [Dependency Management](#dependency-management)
12. [Code Review Security](#code-review-security)
13. [Testing Security](#testing-security)
14. [Security Tools Integration](#security-tools-integration)

---

## Secure Development Overview

### Security-First Development Philosophy

Security is not an afterthought—it's integrated into every aspect of our development process. Every developer on the TextArtTools MCP Server project is responsible for writing secure code that protects our users and systems.

### Core Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Fail Securely**: System failures should default to secure state
3. **Principle of Least Privilege**: Grant minimum necessary permissions
4. **Security by Default**: Secure configurations out-of-the-box
5. **Input Validation**: Never trust user input
6. **Output Encoding**: Always encode output appropriately
7. **Transparency**: Security through design, not obscurity

### Development Lifecycle Security

```
┌─────────────────────────────────────────────────────────────┐
│                 Secure Development Lifecycle                │
├─────────────────────────────────────────────────────────────┤
│  Planning → Design → Implementation → Testing → Deployment  │
│     ↓         ↓           ↓            ↓          ↓        │
│  Threat    Security    Secure Code   Security   Security   │
│  Model     Design      Review        Testing    Monitoring │
└─────────────────────────────────────────────────────────────┘
```

---

## Security-First Coding Principles

### 1. Always Validate Input

**Rule**: Never trust any input from users, APIs, or external systems.

```typescript
// ❌ BAD: Direct use of user input
function processText(userInput: string): string {
  return `<div>${userInput}</div>`; // XSS vulnerability
}

// ✅ GOOD: Validated and sanitized input
import { validateText, sanitizeForHTML } from '../security/input-validator.js';

async function processText(userInput: string, context: string): Promise<string> {
  // Step 1: Validate input
  const validation = await validateText(userInput, context);
  if (!validation.isValid) {
    throw new ValidationError(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Step 2: Sanitize for output context
  const sanitized = sanitizeForHTML(userInput);

  // Step 3: Use validated and sanitized input
  return `<div>${sanitized}</div>`;
}
```

### 2. Encode All Output

**Rule**: Always encode output based on the context where it will be used.

```typescript
// ❌ BAD: Raw output without encoding
function generateResponse(data: any): string {
  return JSON.stringify(data); // Potential injection
}

// ✅ GOOD: Context-aware encoding
import { sanitizeJSONRPC } from '../security/text-sanitizer.js';

function generateResponse(data: any): string {
  // Sanitize data based on JSON-RPC context
  const sanitized = sanitizeJSONRPC(data);
  return JSON.stringify(sanitized);
}

// ✅ GOOD: HTML context encoding
import { encodeForHTML } from '../security/text-sanitizer.js';

function generateHTMLResponse(userContent: string): string {
  const encoded = encodeForHTML(userContent);
  return `<div class="user-content">${encoded}</div>`;
}
```

### 3. Implement Proper Error Handling

**Rule**: Errors should not leak sensitive information to attackers.

```typescript
// ❌ BAD: Exposing internal details
function authenticateUser(token: string): User | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`); // Leaks internal info
  }
}

// ✅ GOOD: Secure error handling
import { SecurityAuditLogger } from '../security/audit-logger.js';

async function authenticateUser(
  token: string,
  requestContext: RequestContext
): Promise<User | null> {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Log detailed error for internal use
    await auditLogger.logEvent('AUTHENTICATION', 'TOKEN_VALIDATION_FAILED', 'FAILURE', {
      message: 'JWT token validation failed',
      resource: 'authentication',
      clientIp: requestContext.clientIp,
      requestId: requestContext.requestId,
      additionalDetails: {
        errorType: error.constructor.name,
        errorMessage: error.message // Only in logs
      },
      threatIndicators: ['INVALID_TOKEN']
    });

    // Return generic error to client
    throw new AuthenticationError('Invalid authentication token');
  }
}
```

### 4. Use Security Libraries

**Rule**: Leverage established security libraries rather than implementing your own.

```typescript
// ✅ GOOD: Using established security libraries
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Secure random generation
function generateSecureToken(): string {
  return randomBytes(32).toString('base64');
}

// Secure password hashing
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Secure signature verification
function verifySignature(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  const providedSignature = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  // Use timing-safe comparison
  return timingSafeEqual(providedSignature, expectedBuffer);
}
```

---

## Input Validation Guidelines

### Comprehensive Input Validation Strategy

Every input must be validated using our allowlist-based approach:

```typescript
import { InputValidator } from '../security/input-validator.js';

// Initialize validator with appropriate configuration
const validator = new InputValidator({
  maxTextLength: 10000,
  maxZalgoComplexity: 50,
  enableStrictValidation: true,
  allowedUnicodeRanges: ['basic-latin', 'latin-1-supplement']
});

async function validateUserInput(
  input: string,
  context: 'mcp-tool' | 'prompt' | 'preview'
): Promise<ValidationResult> {

  // Step 1: Basic type and null checks
  if (typeof input !== 'string') {
    return {
      isValid: false,
      errors: ['Input must be a string'],
      warnings: [],
      metadata: {}
    };
  }

  // Step 2: Use comprehensive validation
  const result = await validator.validateText(input, context);

  // Step 3: Log validation events for monitoring
  if (!result.isValid) {
    await auditLogger.logEvent('INPUT_VALIDATION', 'VALIDATION_FAILED', 'FAILURE', {
      message: `Input validation failed: ${result.errors.join(', ')}`,
      resource: 'input-validation',
      additionalDetails: {
        inputLength: input.length,
        context,
        errors: result.errors,
        threatIndicators: result.threatIndicators
      }
    });
  }

  return result;
}
```

### Specific Validation Patterns

#### Text Content Validation

```typescript
// Validate Unicode text styles
function validateTextStyle(style: string): ValidationResult {
  const allowedStyles = [
    'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
    'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
    'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
    'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
    'boldItalicSerif', 'boldFraktur'
  ];

  if (!allowedStyles.includes(style)) {
    return {
      isValid: false,
      errors: [`Invalid style: ${style}. Allowed styles: ${allowedStyles.join(', ')}`],
      warnings: [],
      metadata: {}
    };
  }

  return { isValid: true, errors: [], warnings: [], metadata: {} };
}

// Validate JSON-RPC requests
function validateJSONRPCRequest(request: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!request.jsonrpc || request.jsonrpc !== '2.0') {
    errors.push('Invalid or missing jsonrpc version');
  }

  if (request.id === undefined) {
    errors.push('Missing request id');
  }

  if (!request.method || typeof request.method !== 'string') {
    errors.push('Invalid or missing method');
  }

  // Method allowlist
  const allowedMethods = [
    'initialize', 'tools/list', 'tools/call',
    'resources/list', 'resources/read',
    'prompts/list', 'prompts/get',
    'notifications/initialized', 'notifications/cancelled'
  ];

  if (request.method && !allowedMethods.includes(request.method)) {
    errors.push(`Method not allowed: ${request.method}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    metadata: { method: request.method, id: request.id }
  };
}
```

#### URL and URI Validation

```typescript
function validateResourceURI(uri: string): ValidationResult {
  const allowedScheme = 'textarttools';
  const allowedResources = [
    'style-definitions',
    'character-mappings',
    'usage-examples',
    'platform-compatibility'
  ];

  try {
    const parsedURL = new URL(uri);

    if (parsedURL.protocol !== `${allowedScheme}:`) {
      return {
        isValid: false,
        errors: [`Invalid URI scheme. Expected: ${allowedScheme}`],
        warnings: [],
        metadata: {}
      };
    }

    const resource = parsedURL.hostname;
    if (!allowedResources.includes(resource)) {
      return {
        isValid: false,
        errors: [`Invalid resource: ${resource}`],
        warnings: [],
        metadata: {}
      };
    }

    // Check for path traversal attempts
    if (parsedURL.pathname.includes('..') || parsedURL.pathname.includes('\\')) {
      return {
        isValid: false,
        errors: ['Path traversal detected in URI'],
        warnings: [],
        metadata: {}
      };
    }

    return { isValid: true, errors: [], warnings: [], metadata: { resource } };

  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid URI format'],
      warnings: [],
      metadata: {}
    };
  }
}
```

---

## Output Encoding Standards

### Context-Aware Output Encoding

Always encode output based on where it will be used:

```typescript
import { TextSanitizer } from '../security/text-sanitizer.js';

const sanitizer = new TextSanitizer();

// HTML Context
function renderHTMLContent(userContent: string): string {
  const encoded = sanitizer.encodeForHTML(userContent);
  return `<div class="user-content">${encoded}</div>`;
}

// JavaScript Context
function renderJavaScriptString(userData: string): string {
  const encoded = sanitizer.encodeForJavaScript(userData);
  return `var userData = "${encoded}";`;
}

// CSS Context
function renderCSSValue(userValue: string): string {
  const encoded = sanitizer.encodeForCSS(userValue);
  return `color: ${encoded};`;
}

// URL Context
function buildURL(userParam: string): string {
  const encoded = sanitizer.encodeForURL(userParam);
  return `https://api.example.com/search?q=${encoded}`;
}

// JSON Context (for API responses)
function buildJSONResponse(userData: any): string {
  const sanitized = sanitizer.sanitizeJSONRPC(userData);
  return JSON.stringify(sanitized);
}
```

### Template Security

When using template systems, ensure proper encoding:

```typescript
// ✅ GOOD: Secure template rendering
function renderTemplate(template: string, data: Record<string, any>): string {
  // Sanitize all template data
  const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = sanitizer.encodeForHTML(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  // Use sanitized data in template
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sanitizedData[key] || '';
  });
}

// ✅ GOOD: Safe HTML generation
function generateUserProfile(user: User): string {
  const safeName = sanitizer.encodeForHTML(user.name);
  const safeEmail = sanitizer.encodeForHTML(user.email);
  const safeAvatarURL = sanitizer.encodeForHTMLAttribute(user.avatarURL);

  return `
    <div class="user-profile">
      <img src="${safeAvatarURL}" alt="Avatar" />
      <h2>${safeName}</h2>
      <p>Email: ${safeEmail}</p>
    </div>
  `;
}
```

---

## Authentication & Authorization

### Secure Authentication Implementation

```typescript
import { GitHubOAuth, SessionManager } from '../auth.js';
import { SecurityAuditLogger } from '../security/audit-logger.js';

class SecureAuthenticationHandler {
  constructor(
    private oauth: GitHubOAuth,
    private sessionManager: SessionManager,
    private auditLogger: SecurityAuditLogger
  ) {}

  async handleOAuthCallback(
    request: Request,
    requestContext: RequestContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // Validate OAuth parameters
      if (!code || !state) {
        await this.auditLogger.logEvent('AUTHENTICATION', 'OAUTH_INVALID_PARAMS', 'FAILURE', {
          message: 'OAuth callback missing required parameters',
          resource: '/auth/callback',
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          threatIndicators: ['INVALID_OAUTH_REQUEST']
        });

        return new Response('Invalid OAuth request', { status: 400 });
      }

      // Validate state parameter (CSRF protection)
      if (!this.isValidState(state)) {
        await this.auditLogger.logEvent('AUTHENTICATION', 'OAUTH_CSRF_ATTEMPT', 'BLOCKED', {
          message: 'OAuth state parameter validation failed',
          resource: '/auth/callback',
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          threatIndicators: ['CSRF_ATTEMPT']
        });

        return new Response('CSRF protection triggered', { status: 403 });
      }

      // Exchange code for access token
      const accessToken = await this.oauth.exchangeCodeForToken(code);
      const user = await this.oauth.fetchUser(accessToken);

      // Create secure session
      const sessionId = await this.sessionManager.createSession(user, accessToken);

      // Log successful authentication
      await this.auditLogger.logEvent('AUTHENTICATION', 'LOGIN_SUCCESS', 'SUCCESS', {
        message: 'User successfully authenticated',
        resource: '/auth/callback',
        clientIp: requestContext.clientIp,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        userId: user.id.toString(),
        additionalDetails: {
          authProvider: 'GitHub',
          userEmail: user.email
        }
      });

      // Return response with secure session cookie
      return new Response('Authentication successful', {
        status: 200,
        headers: {
          'Set-Cookie': this.createSecureSessionCookie(sessionId),
          'Content-Type': 'text/html'
        }
      });

    } catch (error) {
      await this.auditLogger.logEvent('AUTHENTICATION', 'LOGIN_FAILURE', 'FAILURE', {
        message: `Authentication failed: ${error.message}`,
        resource: '/auth/callback',
        clientIp: requestContext.clientIp,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        additionalDetails: {
          errorType: error.constructor.name
        },
        threatIndicators: ['AUTH_FAILURE']
      });

      return new Response('Authentication failed', { status: 500 });
    }
  }

  private createSecureSessionCookie(sessionId: string): string {
    return `mcp_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`;
  }

  private isValidState(state: string): boolean {
    // Implement state validation logic
    // This should verify the state was generated by our server
    return state && state.length >= 16 && /^[a-zA-Z0-9\-_]+$/.test(state);
  }
}
```

### Authorization Patterns

```typescript
// Role-based access control
enum Permission {
  READ_TOOLS = 'read:tools',
  CALL_TOOLS = 'call:tools',
  READ_RESOURCES = 'read:resources',
  ADMIN_ACCESS = 'admin:access'
}

interface UserRole {
  name: string;
  permissions: Permission[];
}

class AuthorizationService {
  private roles: Map<string, UserRole> = new Map([
    ['user', { name: 'user', permissions: [Permission.READ_TOOLS, Permission.CALL_TOOLS, Permission.READ_RESOURCES] }],
    ['admin', { name: 'admin', permissions: Object.values(Permission) }]
  ]);

  async checkPermission(
    user: User,
    requiredPermission: Permission,
    resource?: string
  ): Promise<boolean> {
    const userRole = this.roles.get(user.role || 'user');

    if (!userRole) {
      await this.auditLogger.logEvent('AUTHORIZATION', 'UNKNOWN_ROLE', 'FAILURE', {
        message: `Unknown user role: ${user.role}`,
        resource: resource || 'unknown',
        userId: user.id.toString(),
        additionalDetails: { role: user.role, permission: requiredPermission }
      });
      return false;
    }

    const hasPermission = userRole.permissions.includes(requiredPermission);

    if (!hasPermission) {
      await this.auditLogger.logEvent('AUTHORIZATION', 'PERMISSION_DENIED', 'BLOCKED', {
        message: `Permission denied: ${requiredPermission}`,
        resource: resource || 'unknown',
        userId: user.id.toString(),
        additionalDetails: {
          userRole: userRole.name,
          requiredPermission,
          userPermissions: userRole.permissions
        },
        threatIndicators: ['UNAUTHORIZED_ACCESS_ATTEMPT']
      });
    }

    return hasPermission;
  }
}

// Authorization middleware
function requirePermission(permission: Permission) {
  return async (request: Request, user: User, resource: string): Promise<boolean> => {
    const authService = new AuthorizationService();
    return authService.checkPermission(user, permission, resource);
  };
}

// Usage example
async function handleToolCall(
  toolName: string,
  args: any,
  user: User,
  requestContext: RequestContext
): Promise<any> {
  // Check authorization
  const authService = new AuthorizationService();
  const hasPermission = await authService.checkPermission(user, Permission.CALL_TOOLS, toolName);

  if (!hasPermission) {
    throw new AuthorizationError('Insufficient permissions to call this tool');
  }

  // Proceed with tool call
  return callTool(toolName, args, requestContext);
}
```

---

## Cryptography Best Practices

### Secure Random Generation

```typescript
import { randomBytes, randomInt } from 'crypto';

// ✅ GOOD: Cryptographically secure random generation
function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

function generateSecureSessionId(): string {
  return randomBytes(32).toString('hex');
}

function generateSecureNonce(): string {
  return randomBytes(16).toString('base64');
}

// ✅ GOOD: Secure random integers
function generateSecureRandomInt(min: number, max: number): number {
  return randomInt(min, max + 1);
}

// ❌ BAD: Using Math.random() for security purposes
function generateInsecureToken(): string {
  return Math.random().toString(36); // NEVER do this for security
}
```

### Hash Functions and Message Authentication

```typescript
import { createHash, createHmac, timingSafeEqual } from 'crypto';

class CryptographyHelper {
  // Secure hashing
  static hash(data: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data, 'utf8').digest('hex');
  }

  // HMAC for message authentication
  static hmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
  }

  // Timing-safe comparison
  static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');

    return timingSafeEqual(bufferA, bufferB);
  }

  // Verify HMAC signature
  static verifySignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.hmac(data, secret);
    return this.safeCompare(expectedSignature, signature);
  }

  // Generate request signature
  static generateRequestSignature(
    method: string,
    path: string,
    body: string,
    timestamp: number,
    nonce: string,
    secret: string
  ): string {
    const message = `${method}\n${path}\n${body}\n${timestamp}\n${nonce}`;
    return this.hmac(message, secret);
  }
}
```

### JWT Security

```typescript
import jwt from 'jsonwebtoken';

class JWTHelper {
  private readonly algorithm = 'HS256';
  private readonly issuer = 'textarttools-mcp-server';

  constructor(private secret: string) {
    if (secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }
  }

  // Create secure JWT
  createToken(payload: any, expiresIn: string = '7d'): string {
    const tokenPayload = {
      ...payload,
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(16).toString('hex') // Unique token ID
    };

    return jwt.sign(tokenPayload, this.secret, {
      algorithm: this.algorithm,
      expiresIn
    });
  }

  // Verify JWT securely
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        clockTolerance: 30 // 30 seconds clock skew tolerance
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  }

  // Refresh token securely
  refreshToken(oldToken: string): string {
    const payload = this.verifyToken(oldToken);

    // Remove JWT-specific claims
    delete payload.iat;
    delete payload.exp;
    delete payload.jti;

    return this.createToken(payload);
  }
}
```

---

## Error Handling Security

### Secure Error Response Patterns

```typescript
// Custom error classes with appropriate information exposure
class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 500,
    public readonly details?: any // Only for internal logging
  ) {
    super(message);
    this.name = 'SecurityError';
  }

  // Safe error response for clients
  toClientResponse(): { error: { code: string; message: string } } {
    return {
      error: {
        code: this.code,
        message: this.message // Only safe messages should reach clients
      }
    };
  }

  // Detailed error for internal logging
  toLogData(): any {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      details: this.details,
      stack: this.stack
    };
  }
}

class ValidationError extends SecurityError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends SecurityError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends SecurityError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}
```

### Global Error Handler

```typescript
class SecurityErrorHandler {
  constructor(private auditLogger: SecurityAuditLogger) {}

  async handleError(
    error: Error,
    request: Request,
    requestContext: RequestContext
  ): Promise<Response> {

    // Log all errors for security analysis
    await this.logSecurityError(error, request, requestContext);

    // Handle different error types appropriately
    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify(error.toClientResponse()),
        {
          status: error.httpStatus,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle unexpected errors securely
    return this.handleUnexpectedError(error, requestContext);
  }

  private async logSecurityError(
    error: Error,
    request: Request,
    requestContext: RequestContext
  ): Promise<void> {
    const errorCategory = this.categorizeError(error);
    const severity = this.determineSeverity(error);

    await this.auditLogger.logEvent(errorCategory, 'ERROR_OCCURRED', severity, {
      message: `${error.name}: ${error.message}`,
      resource: new URL(request.url).pathname,
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        errorType: error.constructor.name,
        stack: error.stack,
        requestMethod: request.method,
        requestHeaders: Object.fromEntries(request.headers.entries())
      },
      threatIndicators: this.extractThreatIndicators(error)
    });
  }

  private handleUnexpectedError(
    error: Error,
    requestContext: RequestContext
  ): Response {
    // Never expose internal error details to clients
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  private categorizeError(error: Error): string {
    if (error instanceof ValidationError) return 'INPUT_VALIDATION';
    if (error instanceof AuthenticationError) return 'AUTHENTICATION';
    if (error instanceof AuthorizationError) return 'AUTHORIZATION';
    return 'ERROR';
  }

  private determineSeverity(error: Error): 'SUCCESS' | 'WARNING' | 'FAILURE' {
    if (error instanceof AuthenticationError) return 'FAILURE';
    if (error instanceof AuthorizationError) return 'FAILURE';
    if (error instanceof ValidationError) return 'WARNING';
    return 'FAILURE';
  }

  private extractThreatIndicators(error: Error): string[] {
    const indicators: string[] = [];

    if (error instanceof ValidationError) {
      indicators.push('VALIDATION_FAILURE');
    }
    if (error instanceof AuthenticationError) {
      indicators.push('AUTHENTICATION_FAILURE');
    }
    if (error instanceof AuthorizationError) {
      indicators.push('AUTHORIZATION_FAILURE');
    }

    return indicators;
  }
}
```

---

## Logging and Monitoring

### Security Event Logging

```typescript
// Comprehensive security logging implementation
class SecurityLogger {
  constructor(private auditLogger: SecurityAuditLogger) {}

  // Log authentication events
  async logAuthentication(
    event: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT',
    user: User | null,
    requestContext: RequestContext,
    additionalData?: any
  ): Promise<void> {
    const severity = event.includes('FAILURE') ? 'FAILURE' : 'SUCCESS';
    const threatIndicators = event.includes('FAILURE') ? ['AUTH_FAILURE'] : [];

    await this.auditLogger.logEvent('AUTHENTICATION', event, severity, {
      message: `Authentication event: ${event}`,
      resource: 'authentication',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      userId: user?.id?.toString(),
      additionalDetails: {
        userEmail: user?.email,
        ...additionalData
      },
      threatIndicators
    });
  }

  // Log authorization events
  async logAuthorization(
    event: 'PERMISSION_GRANTED' | 'PERMISSION_DENIED',
    user: User,
    resource: string,
    permission: string,
    requestContext: RequestContext
  ): Promise<void> {
    const severity = event === 'PERMISSION_DENIED' ? 'FAILURE' : 'SUCCESS';
    const threatIndicators = event === 'PERMISSION_DENIED' ? ['UNAUTHORIZED_ACCESS'] : [];

    await this.auditLogger.logEvent('AUTHORIZATION', event, severity, {
      message: `Authorization ${event.toLowerCase()}: ${permission} for ${resource}`,
      resource,
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      userId: user.id.toString(),
      additionalDetails: {
        permission,
        userRole: user.role
      },
      threatIndicators
    });
  }

  // Log security violations
  async logSecurityViolation(
    violationType: string,
    description: string,
    requestContext: RequestContext,
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    additionalData?: any
  ): Promise<void> {
    await this.auditLogger.logEvent('SECURITY', 'SECURITY_VIOLATION', 'FAILURE', {
      message: `Security violation: ${violationType} - ${description}`,
      resource: 'security',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        violationType,
        threatLevel,
        ...additionalData
      },
      threatIndicators: [violationType.toUpperCase().replace(/\s+/g, '_')]
    });
  }

  // Log data access events
  async logDataAccess(
    operation: 'READ' | 'WRITE' | 'DELETE',
    dataType: string,
    user: User | null,
    requestContext: RequestContext,
    success: boolean = true
  ): Promise<void> {
    const severity = success ? 'SUCCESS' : 'FAILURE';

    await this.auditLogger.logEvent('DATA_ACCESS', `DATA_${operation}`, severity, {
      message: `Data access: ${operation} ${dataType}`,
      resource: dataType,
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      userId: user?.id?.toString(),
      additionalDetails: {
        operation,
        dataType,
        success
      }
    });
  }
}
```

### Performance Monitoring

```typescript
// Security-aware performance monitoring
class SecurityPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  // Monitor security operation performance
  async measureSecurityOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    requestContext: RequestContext
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let error: Error | null = null;

    try {
      const result = await operation();
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      await this.recordMetric(operationName, duration, success, requestContext);

      // Alert on performance anomalies
      if (duration > this.getThreshold(operationName)) {
        await this.alertPerformanceAnomaly(operationName, duration, requestContext);
      }
    }
  }

  private async recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    requestContext: RequestContext
  ): Promise<void> {
    const metric = this.metrics.get(operation) || {
      totalCalls: 0,
      totalDuration: 0,
      successfulCalls: 0,
      averageDuration: 0
    };

    metric.totalCalls++;
    metric.totalDuration += duration;
    if (success) metric.successfulCalls++;
    metric.averageDuration = metric.totalDuration / metric.totalCalls;

    this.metrics.set(operation, metric);

    // Log performance metrics
    if (metric.totalCalls % 100 === 0) { // Log every 100 calls
      await auditLogger.logEvent('PERFORMANCE', 'SECURITY_OPERATION_METRICS', 'SUCCESS', {
        message: `Performance metrics for ${operation}`,
        resource: 'performance',
        clientIp: requestContext.clientIp,
        requestId: requestContext.requestId,
        additionalDetails: {
          operation,
          ...metric,
          currentDuration: duration
        }
      });
    }
  }

  private getThreshold(operation: string): number {
    const thresholds: Record<string, number> = {
      'input_validation': 100, // 100ms
      'output_sanitization': 50, // 50ms
      'authentication': 200, // 200ms
      'authorization': 100, // 100ms
      'audit_logging': 50 // 50ms
    };

    return thresholds[operation] || 1000; // Default 1 second
  }

  private async alertPerformanceAnomaly(
    operation: string,
    duration: number,
    requestContext: RequestContext
  ): Promise<void> {
    await auditLogger.logEvent('PERFORMANCE', 'SECURITY_PERFORMANCE_ANOMALY', 'WARNING', {
      message: `Security operation performance anomaly detected: ${operation} took ${duration}ms`,
      resource: 'performance',
      clientIp: requestContext.clientIp,
      requestId: requestContext.requestId,
      additionalDetails: {
        operation,
        duration,
        threshold: this.getThreshold(operation),
        deviation: duration - this.getThreshold(operation)
      },
      threatIndicators: ['PERFORMANCE_ANOMALY']
    });
  }
}
```

---

## API Security Guidelines

### Secure API Design Patterns

```typescript
// Secure API endpoint implementation
class SecureAPIEndpoint {
  constructor(
    private validator: InputValidator,
    private sanitizer: TextSanitizer,
    private authService: AuthorizationService,
    private securityLogger: SecurityLogger,
    private performanceMonitor: SecurityPerformanceMonitor
  ) {}

  // Template for secure API endpoint
  async handleSecureEndpoint(
    request: Request,
    requiredPermission: Permission,
    handler: (validatedData: any, user: User) => Promise<any>
  ): Promise<Response> {
    const requestId = crypto.randomUUID();
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || undefined;

    const requestContext: RequestContext = {
      clientIp,
      userAgent,
      requestId
    };

    try {
      // Step 1: Rate limiting (handled by middleware)

      // Step 2: Authentication
      const user = await this.authenticateRequest(request, requestContext);

      // Step 3: Authorization
      await this.authorizeRequest(user, requiredPermission, requestContext);

      // Step 4: Input validation
      const validatedData = await this.validateInput(request, requestContext);

      // Step 5: Execute business logic
      const result = await this.performanceMonitor.measureSecurityOperation(
        'api_endpoint_execution',
        () => handler(validatedData, user),
        requestContext
      );

      // Step 6: Output sanitization
      const sanitizedResult = this.sanitizer.sanitizeJSONRPC(result);

      // Step 7: Log success
      await this.securityLogger.logDataAccess('READ', 'api_endpoint', user, requestContext, true);

      return new Response(JSON.stringify(sanitizedResult), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin'))
        }
      });

    } catch (error) {
      return this.handleSecurityError(error, requestContext);
    }
  }

  private async authenticateRequest(
    request: Request,
    requestContext: RequestContext
  ): Promise<User> {
    const sessionToken = this.extractSessionToken(request);

    if (!sessionToken) {
      await this.securityLogger.logAuthentication(
        'LOGIN_ATTEMPT',
        null,
        requestContext,
        { reason: 'missing_token' }
      );
      throw new AuthenticationError('Authentication token required');
    }

    try {
      const user = await this.sessionManager.validateSession(sessionToken);

      if (!user) {
        await this.securityLogger.logAuthentication(
          'LOGIN_FAILURE',
          null,
          requestContext,
          { reason: 'invalid_token' }
        );
        throw new AuthenticationError('Invalid authentication token');
      }

      return user;
    } catch (error) {
      await this.securityLogger.logAuthentication(
        'LOGIN_FAILURE',
        null,
        requestContext,
        { reason: 'token_validation_error', error: error.message }
      );
      throw new AuthenticationError('Authentication failed');
    }
  }

  private async authorizeRequest(
    user: User,
    permission: Permission,
    requestContext: RequestContext
  ): Promise<void> {
    const hasPermission = await this.authService.checkPermission(user, permission);

    if (!hasPermission) {
      await this.securityLogger.logAuthorization(
        'PERMISSION_DENIED',
        user,
        'api_endpoint',
        permission,
        requestContext
      );
      throw new AuthorizationError('Insufficient permissions');
    }

    await this.securityLogger.logAuthorization(
      'PERMISSION_GRANTED',
      user,
      'api_endpoint',
      permission,
      requestContext
    );
  }

  private async validateInput(
    request: Request,
    requestContext: RequestContext
  ): Promise<any> {
    try {
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate JSON structure
      const structureValidation = validateJSONRPCRequest(data);
      if (!structureValidation.isValid) {
        throw new ValidationError(`Invalid request structure: ${structureValidation.errors.join(', ')}`);
      }

      // Validate content
      if (data.params) {
        for (const [key, value] of Object.entries(data.params)) {
          if (typeof value === 'string') {
            const validation = await this.validator.validateText(value, 'mcp-tool');
            if (!validation.isValid) {
              throw new ValidationError(`Invalid parameter ${key}: ${validation.errors.join(', ')}`);
            }
          }
        }
      }

      return data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid JSON format');
    }
  }

  private extractSessionToken(request: Request): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookie
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/mcp_session=([^;]+)/);
      return match ? match[1] : null;
    }

    return null;
  }

  private async handleSecurityError(
    error: Error,
    requestContext: RequestContext
  ): Promise<Response> {
    const errorHandler = new SecurityErrorHandler(this.securityLogger.auditLogger);
    return errorHandler.handleError(error, new Request(''), requestContext);
  }
}
```

### Rate Limiting Implementation

```typescript
class SecureRateLimiter {
  private limits: Map<string, RateLimitWindow> = new Map();

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    requestContext: RequestContext
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit window
    let window = this.limits.get(identifier);
    if (!window) {
      window = { requests: [], createdAt: now };
      this.limits.set(identifier, window);
    }

    // Remove old requests
    window.requests = window.requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (window.requests.length >= limit) {
      await this.logRateLimitViolation(identifier, limit, windowMs, requestContext);
      return false;
    }

    // Add current request
    window.requests.push(now);
    return true;
  }

  private async logRateLimitViolation(
    identifier: string,
    limit: number,
    windowMs: number,
    requestContext: RequestContext
  ): Promise<void> {
    await auditLogger.logEvent('RATE_LIMITING', 'RATE_LIMIT_EXCEEDED', 'BLOCKED', {
      message: `Rate limit exceeded for ${identifier}`,
      resource: 'rate_limiting',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        identifier,
        limit,
        windowMs
      },
      threatIndicators: ['RATE_LIMIT_VIOLATION']
    });
  }

  // Clean up old windows periodically
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [identifier, window] of this.limits.entries()) {
      if (window.createdAt < cutoff) {
        this.limits.delete(identifier);
      }
    }
  }
}

interface RateLimitWindow {
  requests: number[];
  createdAt: number;
}
```

---

## Frontend Security

### Content Security Policy Implementation

```typescript
// CSP configuration for secure frontend
class CSPBuilder {
  private policies: Record<string, string[]> = {
    'default-src': ["'none'"],
    'script-src': ["'self'", "'strict-dynamic'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https:', 'data:'],
    'connect-src': ["'self'", 'https://api.github.com', 'https://github.com'],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"]
  };

  addNonce(nonce: string): this {
    this.policies['script-src'].push(`'nonce-${nonce}'`);
    return this;
  }

  addReportUri(uri: string): this {
    this.policies['report-uri'] = [uri];
    return this;
  }

  build(): string {
    return Object.entries(this.policies)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ');
  }

  // Generate secure nonce for scripts
  static generateNonce(): string {
    return randomBytes(16).toString('base64');
  }
}

// Usage in response headers
function applyCSPHeaders(response: Response, requestId: string): Response {
  const nonce = CSPBuilder.generateNonce();

  const csp = new CSPBuilder()
    .addNonce(nonce)
    .addReportUri('/csp-report')
    .build();

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-CSP-Nonce', nonce); // For script injection

  return response;
}
```

### XSS Prevention in Templates

```typescript
// Secure template rendering
class SecureTemplateEngine {
  private sanitizer: TextSanitizer;

  constructor() {
    this.sanitizer = new TextSanitizer();
  }

  render(template: string, data: Record<string, any>, nonce?: string): string {
    // Sanitize all template variables
    const sanitizedData = this.sanitizeTemplateData(data);

    // Inject CSP nonce if provided
    if (nonce) {
      sanitizedData._csp_nonce = nonce;
    }

    // Render template with sanitized data
    return this.renderTemplate(template, sanitizedData);
  }

  private sanitizeTemplateData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Apply context-appropriate sanitization
        if (key.endsWith('_html')) {
          sanitized[key] = this.sanitizer.encodeForHTML(value);
        } else if (key.endsWith('_js')) {
          sanitized[key] = this.sanitizer.encodeForJavaScript(value);
        } else if (key.endsWith('_css')) {
          sanitized[key] = this.sanitizer.encodeForCSS(value);
        } else if (key.endsWith('_url')) {
          sanitized[key] = this.sanitizer.encodeForURL(value);
        } else {
          // Default to HTML encoding
          sanitized[key] = this.sanitizer.encodeForHTML(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeTemplateData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template engine with safe variable substitution
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : '';
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
```

---

## Dependency Management

### Secure Dependency Practices

```json
{
  "scripts": {
    "audit": "npm audit --audit-level moderate",
    "audit:fix": "npm audit fix",
    "audit:prod": "npm audit --production --audit-level high",
    "deps:check": "npm outdated",
    "deps:update": "npm update",
    "security:scan": "npm run audit && snyk test",
    "security:monitor": "snyk monitor",
    "deps:license": "license-checker --summary"
  },
  "dependencies": {
    "comment": "Keep dependencies minimal and up-to-date"
  },
  "devDependencies": {
    "snyk": "^1.1000.0",
    "license-checker": "^25.0.1",
    "audit-ci": "^6.6.1"
  }
}
```

### Dependency Security Automation

```javascript
// .github/workflows/dependency-security.yml
name: Dependency Security

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  pull_request:
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level moderate

      - name: Run Snyk security scan
        run: npx snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Check for known vulnerabilities
        run: npx audit-ci --moderate
```

### Safe Dependency Updates

```typescript
// scripts/safe-dependency-update.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface SecurityUpdate {
  package: string;
  currentVersion: string;
  newVersion: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  advisory: string;
}

class SafeDependencyUpdater {
  async updateSecurityDependencies(): Promise<void> {
    console.log('🔍 Checking for security vulnerabilities...');

    // Run audit to get vulnerabilities
    const auditOutput = this.runAudit();
    const vulnerabilities = this.parseVulnerabilities(auditOutput);

    if (vulnerabilities.length === 0) {
      console.log('✅ No security vulnerabilities found');
      return;
    }

    console.log(`⚠️  Found ${vulnerabilities.length} security vulnerabilities`);

    // Process each vulnerability
    for (const vuln of vulnerabilities) {
      await this.processVulnerability(vuln);
    }

    // Run tests after updates
    console.log('🧪 Running security tests...');
    this.runSecurityTests();

    console.log('✅ Security dependency updates completed');
  }

  private runAudit(): string {
    try {
      return execSync('npm audit --json', { encoding: 'utf8' });
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      return error.stdout;
    }
  }

  private parseVulnerabilities(auditOutput: string): SecurityUpdate[] {
    try {
      const audit = JSON.parse(auditOutput);
      const vulnerabilities: SecurityUpdate[] = [];

      for (const [packageName, advisories] of Object.entries(audit.vulnerabilities || {})) {
        for (const advisory of (advisories as any).via) {
          if (typeof advisory === 'object') {
            vulnerabilities.push({
              package: packageName,
              currentVersion: (advisories as any).range,
              newVersion: '', // Will be determined during fix
              severity: advisory.severity,
              advisory: advisory.title
            });
          }
        }
      }

      return vulnerabilities;
    } catch (error) {
      console.error('Failed to parse audit output:', error);
      return [];
    }
  }

  private async processVulnerability(vuln: SecurityUpdate): Promise<void> {
    console.log(`🔧 Processing ${vuln.package} (${vuln.severity}): ${vuln.advisory}`);

    // For high/critical vulnerabilities, apply fix immediately
    if (vuln.severity === 'high' || vuln.severity === 'critical') {
      this.applySecurityFix(vuln);
    } else {
      console.log(`⏳ Deferring ${vuln.severity} severity update for manual review`);
    }
  }

  private applySecurityFix(vuln: SecurityUpdate): void {
    try {
      execSync(`npm update ${vuln.package}`, { stdio: 'inherit' });
      console.log(`✅ Updated ${vuln.package}`);
    } catch (error) {
      console.error(`❌ Failed to update ${vuln.package}:`, error.message);
    }
  }

  private runSecurityTests(): void {
    try {
      execSync('npm run test:security', { stdio: 'inherit' });
      console.log('✅ Security tests passed');
    } catch (error) {
      console.error('❌ Security tests failed');
      throw new Error('Security tests failed after dependency updates');
    }
  }
}
```

---

## Code Review Security

### Security Code Review Checklist

```markdown
# Security Code Review Checklist

## Input Validation & Sanitization
- [ ] All user inputs are validated using allowlist approach
- [ ] Input validation includes length, format, and content checks
- [ ] Unicode inputs are properly normalized and validated
- [ ] File uploads (if any) are properly validated
- [ ] SQL injection prevention is implemented
- [ ] XSS prevention is implemented
- [ ] Path traversal protection is in place

## Authentication & Authorization
- [ ] Authentication is required for protected resources
- [ ] Session management follows security best practices
- [ ] JWT tokens are properly validated and secured
- [ ] Authorization checks are performed at the appropriate level
- [ ] Principle of least privilege is followed
- [ ] OAuth flows are implemented securely

## Data Protection
- [ ] Sensitive data is encrypted at rest and in transit
- [ ] PII is handled according to privacy regulations
- [ ] Data retention policies are implemented
- [ ] Secure deletion of sensitive data
- [ ] Database connections use encrypted channels

## Error Handling & Logging
- [ ] Errors don't expose sensitive information
- [ ] Security events are properly logged
- [ ] Log injection attacks are prevented
- [ ] Appropriate log levels are used
- [ ] Logs contain sufficient detail for security analysis

## Cryptography
- [ ] Strong cryptographic algorithms are used
- [ ] Cryptographic keys are properly managed
- [ ] Random number generation is cryptographically secure
- [ ] Hash functions use appropriate salt
- [ ] Timing attacks are prevented

## Dependencies & Infrastructure
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Security headers are properly configured
- [ ] HTTPS is enforced
- [ ] Rate limiting is implemented
- [ ] CORS is properly configured

## Code Quality
- [ ] No hardcoded secrets or credentials
- [ ] Security controls can't be bypassed
- [ ] Race conditions are addressed
- [ ] Memory leaks are prevented
- [ ] Code follows security coding standards
```

### Automated Security Code Review

```yaml
# .github/workflows/security-code-review.yml
name: Security Code Review

on:
  pull_request:
    branches: [main, develop]

jobs:
  security-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run Semgrep Security Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/typescript
            p/owasp-top-ten

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript
          queries: security-and-quality

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

      - name: Security review summary
        run: |
          echo "Security code review completed"
          echo "Review the security scan results above"
```

---

## Testing Security

### Security Test Development

```typescript
// Security test helpers and patterns
export class SecurityTestHelpers {
  // Test authentication flows
  static async testAuthenticationFlow(
    endpoint: string,
    validCredentials: any,
    invalidCredentials: any[]
  ): Promise<void> {
    // Test valid authentication
    const validResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validCredentials)
    });
    expect(validResponse.status).toBe(200);

    // Test invalid authentication attempts
    for (const invalidCreds of invalidCredentials) {
      const invalidResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCreds)
      });
      expect(invalidResponse.status).toBeOneOf([400, 401, 403]);
    }
  }

  // Test authorization controls
  static async testAuthorizationControls(
    protectedEndpoints: string[],
    unauthorizedUser: User,
    authorizedUser: User
  ): Promise<void> {
    for (const endpoint of protectedEndpoints) {
      // Test unauthorized access
      const unauthorizedResponse = await this.makeAuthenticatedRequest(
        endpoint,
        unauthorizedUser
      );
      expect(unauthorizedResponse.status).toBe(403);

      // Test authorized access
      const authorizedResponse = await this.makeAuthenticatedRequest(
        endpoint,
        authorizedUser
      );
      expect(authorizedResponse.status).not.toBe(403);
    }
  }

  // Test input validation comprehensively
  static async testInputValidation(
    endpoint: string,
    validInputs: any[],
    invalidInputs: any[]
  ): Promise<void> {
    // Test valid inputs
    for (const validInput of validInputs) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validInput)
      });
      expect(response.status).not.toBe(400);
    }

    // Test invalid inputs
    for (const invalidInput of invalidInputs) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput)
      });
      expect(response.status).toBe(400);
    }
  }

  // Test for security headers
  static async testSecurityHeaders(url: string): Promise<void> {
    const response = await fetch(url);

    expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Frame-Options')).toBeTruthy();
    expect(response.headers.get('X-Content-Type-Options')).toBeTruthy();
    expect(response.headers.get('Referrer-Policy')).toBeTruthy();
  }

  // Test rate limiting
  static async testRateLimit(
    endpoint: string,
    limit: number,
    windowMs: number
  ): Promise<void> {
    const requests = [];

    // Make requests up to the limit
    for (let i = 0; i < limit; i++) {
      requests.push(fetch(endpoint));
    }

    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).not.toBe(429);
    });

    // Next request should be rate limited
    const rateLimitedResponse = await fetch(endpoint);
    expect(rateLimitedResponse.status).toBe(429);
  }

  private static async makeAuthenticatedRequest(
    endpoint: string,
    user: User
  ): Promise<Response> {
    const token = await this.generateTestToken(user);
    return fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private static async generateTestToken(user: User): Promise<string> {
    // Generate test JWT token
    return jwt.sign({ userId: user.id, role: user.role }, 'test-secret', {
      expiresIn: '1h'
    });
  }
}
```

---

## Security Tools Integration

### IDE Security Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "timonwong.shellcheck",
    "github.vscode-pull-request-github",
    "github.copilot",
    "snyk-security.snyk-vulnerability-scanner",
    "ms-vscode.hexdump",
    "formulahendry.code-runner"
  ]
}
```

### Pre-commit Hooks Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-merge-conflict
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

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
        pass_filenames: false
        stages: [commit]

      - id: typescript-check
        name: TypeScript type check
        entry: npm run typecheck
        language: system
        pass_filenames: false
        stages: [commit]

      - id: eslint-security
        name: ESLint security rules
        entry: npx eslint --config .eslintrc.security.js
        language: node
        files: \.(ts|js)$
        args: [--fix]
```

### Security Linting Configuration

```json
// .eslintrc.security.js
module.exports = {
  extends: [
    '@eslint/recommended',
    '@typescript-eslint/recommended',
    'plugin:security/recommended'
  ],
  plugins: ['security', '@typescript-eslint'],
  rules: {
    // Security-specific rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'error',

    // Custom security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts'],
      rules: {
        'security/detect-non-literal-fs-filename': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};
```

---

## Conclusion

These developer security guidelines provide comprehensive practices for building secure applications. Key takeaways:

### Security Mindset
- **Security First**: Consider security implications in every line of code
- **Defense in Depth**: Implement multiple layers of security controls
- **Fail Securely**: Ensure failures don't compromise security
- **Continuous Learning**: Stay updated on latest security threats and practices

### Essential Practices
1. **Validate All Input**: Never trust any external input
2. **Encode All Output**: Context-appropriate output encoding
3. **Authenticate & Authorize**: Proper access controls
4. **Handle Errors Securely**: Don't leak sensitive information
5. **Log Security Events**: Comprehensive security monitoring
6. **Keep Dependencies Updated**: Regular security updates
7. **Test Security**: Comprehensive security testing

### Tools & Integration
- Use automated security scanning tools
- Implement security linting and pre-commit hooks
- Regular dependency vulnerability scanning
- Continuous security testing in CI/CD
- Security code review processes

### Continuous Improvement
- Regular security training
- Threat modeling exercises
- Penetration testing
- Security incident response drills
- Security metrics and monitoring

---

**Remember**: Security is everyone's responsibility. Every developer contributes to the overall security posture of our application.

**Resources**:
- [OWASP Developer Guide](https://owasp.org/www-project-developer-guide/)
- [Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Security Testing Guide](./SECURITY_TESTING.md)

---

**Document Version**: 1.0.0
**Last Updated**: January 2025
**Next Review**: April 2025

**Security Team Contact**: security-dev@textarttools.com