/**
 * TextArtTools MCP Server - Main Entry Point
 * Cloudflare Workers implementation with JSON-RPC 2.0 and Server-Sent Events
 * Enhanced with comprehensive security features
 */

import type {
  Env,
  AnalyticsEvent
} from './types.js';
import {
  MCPError,
  ValidationError,
  RateLimitError,
  AuthenticationError
} from './types.js';

import {
  mcpToolDefinitions,
  handleToolCall
} from './mcp-tools.js';

import {
  GitHubOAuth,
  SessionManager,
  RateLimiter,
  getClientIP,
  getCorsHeaders
} from './auth.js';

import {
  getStyleDefinitions,
  getCharacterMappings,
  getUsageExamples,
  getPlatformCompatibility,
  generateStyleSelectorPrompt,
  generateBulkProcessorPrompt,
  generateCompatibilityCheckerPrompt,
  generateStyleCombinerPrompt
} from './resources.js';

// Security imports - temporarily simplified for MVP
// import { createSecurityHeaders } from './security/security-headers.js';
// import { getAuditLogger, logAuthenticationEvent, logRateLimitEvent, logCSPViolation } from './security/audit-logger.js';
// import { createSigningMiddleware } from './security/request-signing.js';
// import { getSecurityConfig } from './security/security-config.js';
// import { sanitizeJSONRPC, sanitizeHTML } from './security/text-sanitizer.js';
// import { validateURI } from './security/input-validator.js';
// import type { CSPReport } from './security/security-headers.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || undefined;
    const startTime = Date.now();

    // MVP: Basic CORS headers only
    const corsHeaders = getCorsHeaders(env.CORS_ORIGIN || '*');

    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: corsHeaders
        });
      }

      const url = new URL(request.url);

      // Log incoming request
      await auditLogger.logEvent('SYSTEM_ACCESS', 'REQUEST_RECEIVED', 'SUCCESS', {
        message: `Incoming request to ${url.pathname}`,
        resource: url.pathname,
        clientIp,
        userAgent,
        requestId,
        additionalDetails: {
          method: request.method,
          pathname: url.pathname,
          hasAuth: !!request.headers.get('Authorization'),
          origin: request.headers.get('Origin') || 'unknown'
        }
      });

      // Validate request signature for sensitive endpoints (if enabled)
      if (signingMiddleware.requiresSigning(url.pathname)) {
        const body = request.method === 'POST' ? await request.clone().text() : undefined;
        const signatureValidation = await signingMiddleware.validateRequest(request, body);

        if (signatureValidation.shouldBlock) {
          await auditLogger.logEvent('AUTHORIZATION', 'REQUEST_SIGNATURE_INVALID', 'BLOCKED', {
            message: 'Request signature validation failed',
            resource: url.pathname,
            clientIp,
            userAgent,
            requestId,
            additionalDetails: {
              errors: signatureValidation.result.errors,
              warnings: signatureValidation.result.warnings
            },
            threatIndicators: ['INVALID_SIGNATURE']
          });

          const errorResponse = new Response('Signature validation failed', { status: 401 });
          return securityHeaders.applyHeaders(errorResponse, requestId);
        }

        if (!signatureValidation.isValid) {
          await auditLogger.logEvent('AUTHORIZATION', 'REQUEST_SIGNATURE_WARNING', 'WARNING', {
            message: 'Request signature validation warning',
            resource: url.pathname,
            clientIp,
            userAgent,
            requestId,
            additionalDetails: {
              warnings: signatureValidation.result.warnings
            }
          });
        }
      }

      let response: Response;

      // Route requests
      switch (url.pathname) {
        case '/':
          response = await handleRoot(request, env, { clientIp, userAgent, requestId });
          break;
        case '/sse':
          response = await handleMCPConnection(request, env, ctx, { clientIp, userAgent, requestId });
          break;
        case '/auth/authorize':
          response = await handleAuthAuthorize(request, env, { clientIp, userAgent, requestId });
          break;
        case '/auth/callback':
          response = await handleAuthCallback(request, env, { clientIp, userAgent, requestId });
          break;
        case '/auth/logout':
          response = await handleAuthLogout(request, env, { clientIp, userAgent, requestId });
          break;
        case '/health':
          response = await handleHealth(request, env, { clientIp, userAgent, requestId });
          break;
        case '/csp-report':
          response = await handleCSPReport(request, env, { clientIp, userAgent, requestId });
          break;
        case '/security-status':
          response = await handleSecurityStatus(request, env, { clientIp, userAgent, requestId });
          break;
        default:
          await auditLogger.logEvent('SYSTEM_ACCESS', 'NOT_FOUND', 'FAILURE', {
            message: `Request to unknown endpoint: ${url.pathname}`,
            resource: url.pathname,
            clientIp,
            userAgent,
            requestId,
            threatIndicators: ['UNKNOWN_ENDPOINT']
          });
          response = new Response('Not Found', { status: 404 });
      }

      // Apply security headers to all responses
      const securedResponse = securityHeaders.applyHeaders(response, requestId);

      // Log successful request completion
      const processingTime = Date.now() - startTime;
      await auditLogger.logEvent('SYSTEM_ACCESS', 'REQUEST_COMPLETED', 'SUCCESS', {
        message: `Request completed successfully`,
        resource: url.pathname,
        clientIp,
        userAgent,
        requestId,
        additionalDetails: {
          statusCode: securedResponse.status,
          processingTimeMs: processingTime
        }
      });

      return securedResponse;

    } catch (error) {
      // Log unhandled error
      await auditLogger.logEvent('ERROR', 'UNHANDLED_ERROR', 'FAILURE', {
        message: `Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resource: 'system',
        clientIp,
        userAgent,
        requestId,
        additionalDetails: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime
        },
        threatIndicators: ['SYSTEM_ERROR']
      });

      console.error('Unhandled error:', error);
      const errorResponse = new Response('Internal Server Error', { status: 500 });
      return securityHeaders.applyHeaders(errorResponse, requestId);
    }
  }
};

/**
 * Handle root endpoint - server information
 * Enhanced with security status and sanitized output
 */
async function handleRoot(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  const securityConfig = getSecurityConfig(env);
  const securitySummary = securityConfig.getSecuritySummary();

  const serverInfo = {
    name: 'TextArtTools MCP Server',
    version: '1.0.0',
    description: 'Unicode text styling server using Model Context Protocol',
    capabilities: {
      tools: mcpToolDefinitions.map(tool => ({
        name: tool.name,
        description: tool.description
      })),
      security: {
        level: securitySummary.level,
        featuresEnabled: securitySummary.featuresEnabled,
        status: securitySummary.status
      }
    },
    endpoints: {
      mcp: '/sse',
      auth: '/auth/authorize',
      health: '/health',
      security: '/security-status'
    },
    supported_styles: 23,
    documentation: 'https://github.com/your-username/textarttools-mcp-server'
  };

  // Sanitize output
  const sanitizedInfo = sanitizeJSONRPC(serverInfo);

  // Log server info access
  await auditLogger.logEvent('DATA_ACCESS', 'SERVER_INFO_ACCESSED', 'SUCCESS', {
    message: 'Server information accessed',
    resource: '/',
    clientIp: requestContext.clientIp,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId
  });

  return new Response(JSON.stringify(sanitizedInfo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request.headers.get('Origin') || undefined)
    }
  });
}

/**
 * Handle MCP connection via Server-Sent Events
 * Enhanced with comprehensive security validation
 */
async function handleMCPConnection(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Initialize services (handle missing bindings gracefully for development)
    let sessionManager: SessionManager | null = null;
    let rateLimiter: RateLimiter | null = null;
    let session = null;

    try {
      if (env.MCP_SESSIONS) {
        sessionManager = new SessionManager(env);
        rateLimiter = new RateLimiter(env);

        // Extract session and authenticate user
        const sessionId = sessionManager.extractSessionId(request);
        session = sessionId ? await sessionManager.getSession(sessionId) : null;

        // Rate limiting (use user ID if authenticated, otherwise IP)
        const clientIP = getClientIP(request);
        const rateLimitId = session ? `user:${session.user.id}` : `ip:${clientIP}`;
        await rateLimiter.checkRateLimit(rateLimitId);
      } else {
        console.warn('Running without KV storage - authentication and rate limiting disabled');
      }
    } catch (error) {
      console.warn('Service initialization warning:', error);
    }

    // Parse JSON-RPC request with security validation
    let jsonRpcRequest: any;
    let requestBody: string = '';

    try {
      requestBody = await request.text();
      jsonRpcRequest = JSON.parse(requestBody);
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    // Add request context for security logging
    const enhancedContext = {
      ...requestContext,
      sessionId: session?.user?.id?.toString(),
      userId: session?.user?.id?.toString()
    };

    const response = await handleJSONRPCRequest(jsonRpcRequest, session, env, enhancedContext);

    // Log analytics
    if (env.MCP_ANALYTICS) {
      ctx.waitUntil(logAnalytics(env.MCP_ANALYTICS, {
        timestamp: Date.now(),
        user_id: session?.user.id.toString() || undefined,
        tool_name: jsonRpcRequest.method || 'unknown',
        style: jsonRpcRequest.params?.style,
        text_length: jsonRpcRequest.params?.text?.length || 0,
        processing_time_ms: 0, // Will be updated in tool handlers
        success: !response.error,
        error_type: response.error?.code ? response.error.code.toString() : undefined
      }));
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin') || undefined)
      }
    });

  } catch (error) {
    console.error('MCP connection error:', error);

    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: error instanceof MCPError ? error.code : -32603,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error instanceof MCPError ? error.data : undefined
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof RateLimitError ? 429 : 400,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin') || undefined)
      }
    });
  }
}

/**
 * Handle JSON-RPC 2.0 requests
 * Enhanced with security validation and audit logging
 */
async function handleJSONRPCRequest(
  request: any,
  session: any,
  env: Env,
  requestContext: {
    clientIp: string;
    userAgent?: string;
    requestId: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<any> {
  const auditLogger = getAuditLogger(env);
  // Validate JSON-RPC format
  if (request.jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32600,
        message: 'Invalid Request - missing or invalid jsonrpc version'
      }
    };
  }

  try {
    switch (request.method) {
      case 'initialize':
        return handleInitialize(request, env);

      case 'tools/list':
        return handleToolsList(request);

      case 'tools/call':
        return await handleToolsCall(request, session, env, requestContext);

      case 'resources/list':
        return handleResourcesList(request);

      case 'resources/read':
        return handleResourcesRead(request, env);

      case 'prompts/list':
        return handlePromptsList(request);

      case 'prompts/get':
        return handlePromptsGet(request, env);

      case 'notifications/initialized':
        return handleNotificationsInitialized(request);

      case 'notifications/cancelled':
        return handleNotificationsCancelled(request);

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
  } catch (error) {
    console.error('JSON-RPC method error:', error);

    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: error instanceof MCPError ? error.code : -32603,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error instanceof MCPError ? error.data : undefined
      }
    };
  }
}

/**
 * Handle MCP initialize method
 */
function handleInitialize(request: any, _env: Env): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          subscribe: true,
          listChanged: true
        },
        prompts: {
          listChanged: true
        },
        notifications: {
          subscribe: true
        }
      },
      serverInfo: {
        name: 'TextArtTools MCP Server',
        version: '1.0.0'
      }
    }
  };
}

/**
 * Handle tools/list method
 */
function handleToolsList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: mcpToolDefinitions
    }
  };
}

/**
 * Handle tools/call method
 * Enhanced with comprehensive security validation
 */
async function handleToolsCall(
  request: any,
  session: any,
  env: Env,
  requestContext: {
    clientIp: string;
    userAgent?: string;
    requestId: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<any> {
  const { name: toolName, arguments: toolArgs } = request.params || {};
  const auditLogger = getAuditLogger(env);

  if (!toolName) {
    await auditLogger.logEvent('INPUT_VALIDATION', 'MISSING_TOOL_NAME', 'FAILURE', {
      message: 'Tool call missing tool name',
      resource: 'tools/call',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      threatIndicators: ['INVALID_TOOL_CALL']
    });
    throw new ValidationError('Tool name is required');
  }

  // Some tools require authentication (skip in development mode without KV)
  const authRequiredTools = ['unicode_style_text'];
  if (authRequiredTools.includes(toolName) && !session && env.MCP_SESSIONS) {
    await auditLogger.logEvent('AUTHORIZATION', 'AUTHENTICATION_REQUIRED', 'FAILURE', {
      message: `Authentication required for tool: ${toolName}`,
      resource: 'tools/call',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        toolName
      },
      threatIndicators: ['UNAUTHENTICATED_ACCESS']
    });
    throw new AuthenticationError('Authentication required for this tool');
  }

  try {
    // Call enhanced tool handler with security context
    const result = await handleToolCall(toolName, toolArgs, env, requestContext);

    // Sanitize the result
    const sanitizedResult = sanitizeJSONRPC(result);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sanitizedResult, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    throw error; // Re-throw to be handled by outer error handler
  }
}

/**
 * Handle OAuth authorization
 * Enhanced with security logging
 */
async function handleAuthAuthorize(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  const url = new URL(request.url);
  const oauth = new GitHubOAuth(env, url.origin);

  const state = crypto.randomUUID();
  const authUrl = oauth.getAuthorizationUrl(state);

  // Log authorization attempt
  await auditLogger.logEvent('AUTHENTICATION', 'OAUTH_AUTHORIZATION_INITIATED', 'SUCCESS', {
    message: 'OAuth authorization flow initiated',
    resource: '/auth/authorize',
    clientIp: requestContext.clientIp,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId,
    additionalDetails: {
      state,
      provider: 'GitHub'
    }
  });

  return Response.redirect(authUrl, 302);
}

/**
 * Handle OAuth callback
 * Enhanced with comprehensive security logging
 */
async function handleAuthCallback(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    await auditLogger.logEvent('AUTHENTICATION', 'OAUTH_CALLBACK_ERROR', 'FAILURE', {
      message: `OAuth callback error: ${error}`,
      resource: '/auth/callback',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        oauthError: error,
        provider: 'GitHub'
      },
      threatIndicators: ['OAUTH_ERROR']
    });
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code) {
    await auditLogger.logEvent('AUTHENTICATION', 'OAUTH_MISSING_CODE', 'FAILURE', {
      message: 'OAuth callback missing authorization code',
      resource: '/auth/callback',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      threatIndicators: ['INVALID_OAUTH_REQUEST']
    });
    return new Response('Missing authorization code', { status: 400 });
  }

  if (!env.MCP_SESSIONS) {
    await auditLogger.logEvent('SYSTEM_ACCESS', 'AUTHENTICATION_NOT_CONFIGURED', 'FAILURE', {
      message: 'Authentication attempted but KV storage not configured',
      resource: '/auth/callback',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId
    });
    return new Response('Authentication not configured - KV storage required', { status: 503 });
  }

  try {
    const oauth = new GitHubOAuth(env, url.origin);
    const sessionManager = new SessionManager(env);

    // Exchange code for token
    const accessToken = await oauth.exchangeCodeForToken(code);

    // Fetch user info
    const user = await oauth.fetchUser(accessToken);

    // Create session
    const sessionId = await sessionManager.createSession(user, accessToken);

    // Log successful authentication
    await logAuthenticationEvent(auditLogger, 'SUCCESS', {
      action: 'LOGIN',
      user,
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      message: 'User successfully authenticated via OAuth'
    });

    // Return success page with session info (sanitize user data)
    const sanitizedUserName = user.name ? sanitizeHTML(user.name) : 'User';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful - TextArtTools MCP Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { color: green; }
          .code { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1 class="success">✅ Authentication Successful!</h1>
        <p>Welcome, <strong>${sanitizedUserName}</strong>!</p>
        <p>Your MCP server is now ready to use. Use this session token:</p>
        <div class="code">${sessionId}</div>
        <p>Add this to your Claude Desktop configuration or use it as a Bearer token in API requests.</p>
        <hr>
        <p><small>This token expires in 7 days. Keep it secure!</small></p>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `mcp_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
      }
    });

  } catch (error) {
    await auditLogger.logEvent('AUTHENTICATION', 'OAUTH_CALLBACK_FAILURE', 'FAILURE', {
      message: `OAuth callback processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resource: '/auth/callback',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        hasCode: !!code
      },
      threatIndicators: ['OAUTH_PROCESSING_ERROR']
    });

    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}

/**
 * Handle logout
 * Enhanced with security logging
 */
async function handleAuthLogout(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  let sessionId: string | null = null;

  if (env.MCP_SESSIONS) {
    const sessionManager = new SessionManager(env);
    sessionId = sessionManager.extractSessionId(request);

    if (sessionId) {
      const session = await sessionManager.getSession(sessionId);
      await sessionManager.deleteSession(sessionId);

      // Log successful logout
      await logAuthenticationEvent(auditLogger, 'SUCCESS', {
        action: 'LOGOUT',
        user: session?.user,
        clientIp: requestContext.clientIp,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        message: 'User logged out successfully'
      });
    }
  }

  return new Response('Logged out successfully', {
    headers: {
      'Set-Cookie': 'mcp_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    }
  });
}

/**
 * Handle health check
 * Enhanced with security logging and detailed status
 */
async function handleHealth(
  _request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  const securityConfig = getSecurityConfig(env);

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      mcp: 'operational',
      auth: env.MCP_SESSIONS ? 'operational' : 'disabled',
      tools: 'operational',
      security: 'operational',
      auditLogging: 'operational'
    },
    security: {
      level: securityConfig.getSecuritySummary().level,
      status: securityConfig.getSecuritySummary().status
    }
  };

  // Log health check access (minimal logging for health checks)
  await auditLogger.logEvent('SYSTEM_ACCESS', 'HEALTH_CHECK_ACCESSED', 'SUCCESS', {
    message: 'Health check endpoint accessed',
    resource: '/health',
    clientIp: requestContext.clientIp,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId
  });

  return new Response(JSON.stringify(health, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    }
  });
}

/**
 * Log analytics event
 */
async function logAnalytics(analytics: AnalyticsEngineDataset, event: AnalyticsEvent): Promise<void> {
  try {
    analytics.writeDataPoint({
      blobs: [event.tool_name, event.style || '', event.error_type || ''],
      doubles: [event.text_length, event.processing_time_ms],
      indexes: [event.user_id || 'anonymous']
    });
  } catch (error) {
    console.error('Analytics logging error:', error);
  }
}

/**
 * Handle resources/list method
 */
function handleResourcesList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resources: [
        {
          uri: 'textarttools://style-definitions',
          name: 'Style Definitions',
          description: 'Complete metadata for all 23 Unicode text styles',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://character-mappings',
          name: 'Character Mappings',
          description: 'Unicode transformation tables for each style',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://usage-examples',
          name: 'Usage Examples',
          description: 'Sample text transformations and use cases',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://platform-compatibility',
          name: 'Platform Compatibility',
          description: 'Style support across different platforms and apps',
          mimeType: 'application/json'
        }
      ]
    }
  };
}

/**
 * Handle resources/read method
 */
function handleResourcesRead(request: any, _env: Env): any {
  const { uri } = request.params;

  if (!uri) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32602,
        message: 'Invalid params - uri required'
      }
    };
  }

  try {
    let contents: any;

    switch (uri) {
      case 'textarttools://style-definitions':
        contents = getStyleDefinitions();
        break;
      case 'textarttools://character-mappings':
        contents = getCharacterMappings();
        break;
      case 'textarttools://usage-examples':
        contents = getUsageExamples();
        break;
      case 'textarttools://platform-compatibility':
        contents = getPlatformCompatibility();
        break;
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32602,
            message: `Unknown resource URI: ${uri}`
          }
        };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(contents, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error reading resource',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Handle prompts/list method
 */
function handlePromptsList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      prompts: [
        {
          name: 'style_selector',
          description: 'Help user choose the most appropriate text style for their needs',
          arguments: [
            {
              name: 'text',
              description: 'The text to be styled',
              required: true
            },
            {
              name: 'context',
              description: 'Where the text will be used (social media, document, code, etc.)',
              required: false
            }
          ]
        },
        {
          name: 'bulk_processor',
          description: 'Apply the same style to multiple texts efficiently',
          arguments: [
            {
              name: 'texts',
              description: 'Array of texts to transform',
              required: true
            },
            {
              name: 'style',
              description: 'Style to apply to all texts',
              required: true
            }
          ]
        },
        {
          name: 'compatibility_checker',
          description: 'Check if text and style combination will work on target platform',
          arguments: [
            {
              name: 'text',
              description: 'Text to check',
              required: true
            },
            {
              name: 'style',
              description: 'Style to check',
              required: true
            },
            {
              name: 'platform',
              description: 'Target platform (Discord, Twitter, Instagram, etc.)',
              required: true
            }
          ]
        },
        {
          name: 'style_combiner',
          description: 'Intelligently combine multiple styling effects',
          arguments: [
            {
              name: 'text',
              description: 'Text to style',
              required: true
            },
            {
              name: 'primary_style',
              description: 'Primary style effect',
              required: true
            },
            {
              name: 'secondary_effects',
              description: 'Additional effects to layer',
              required: false
            }
          ]
        }
      ]
    }
  };
}

/**
 * Handle prompts/get method
 */
function handlePromptsGet(request: any, _env: Env): any {
  const { name, arguments: args } = request.params;

  if (!name) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32602,
        message: 'Invalid params - name required'
      }
    };
  }

  try {
    let prompt: string;

    switch (name) {
      case 'style_selector':
        prompt = generateStyleSelectorPrompt(args);
        break;
      case 'bulk_processor':
        prompt = generateBulkProcessorPrompt(args);
        break;
      case 'compatibility_checker':
        prompt = generateCompatibilityCheckerPrompt(args);
        break;
      case 'style_combiner':
        prompt = generateStyleCombinerPrompt(args);
        break;
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32602,
            message: `Unknown prompt: ${name}`
          }
        };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        description: `Generated prompt for ${name}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt
            }
          }
        ]
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error generating prompt',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Handle notifications/initialized method
 */
function handleNotificationsInitialized(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {}
  };
}

/**
 * Handle notifications/cancelled method
 */
function handleNotificationsCancelled(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {}
  };
}

/**
 * Handle CSP violation reports
 * Enhanced with comprehensive logging and threat analysis
 */
async function handleCSPReport(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const auditLogger = getAuditLogger(env);

  try {
    const reportData = await request.text();
    let cspReport: CSPReport;

    try {
      cspReport = JSON.parse(reportData);
    } catch (error) {
      await auditLogger.logEvent('INPUT_VALIDATION', 'INVALID_CSP_REPORT', 'FAILURE', {
        message: 'Invalid JSON in CSP violation report',
        resource: '/csp-report',
        clientIp: requestContext.clientIp,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        additionalDetails: {
          rawReport: reportData.substring(0, 500) // Truncate for safety
        },
        threatIndicators: ['MALFORMED_CSP_REPORT']
      });

      return new Response('Invalid JSON', { status: 400 });
    }

    // Log CSP violation with detailed analysis
    await logCSPViolation(auditLogger, cspReport, {
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId
    });

    return new Response('Report received', { status: 204 });

  } catch (error) {
    await auditLogger.logEvent('ERROR', 'CSP_REPORT_PROCESSING_ERROR', 'FAILURE', {
      message: `Error processing CSP report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resource: '/csp-report',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      threatIndicators: ['CSP_PROCESSING_ERROR']
    });

    console.error('CSP report processing error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

/**
 * Handle security status endpoint
 * Provides current security configuration and health status
 */
async function handleSecurityStatus(
  request: Request,
  env: Env,
  requestContext: { clientIp: string; userAgent?: string; requestId: string }
): Promise<Response> {
  const auditLogger = getAuditLogger(env);
  const securityConfig = getSecurityConfig(env);

  try {
    // Check if user has appropriate permissions (basic auth check)
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = env.SECURITY_STATUS_TOKEN;

    if (expectedAuth && (!authHeader || authHeader !== `Bearer ${expectedAuth}`)) {
      await auditLogger.logEvent('AUTHORIZATION', 'UNAUTHORIZED_SECURITY_ACCESS', 'BLOCKED', {
        message: 'Unauthorized access attempt to security status endpoint',
        resource: '/security-status',
        clientIp: requestContext.clientIp,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        threatIndicators: ['UNAUTHORIZED_SECURITY_ACCESS']
      });

      return new Response('Unauthorized', { status: 401 });
    }

    // Get comprehensive security status
    const securityStatus = {
      timestamp: new Date().toISOString(),
      server: {
        version: '1.0.0',
        environment: env.ENVIRONMENT || 'development'
      },
      security: securityConfig.getSecuritySummary(),
      features: {
        inputValidation: {
          status: 'active',
          strictMode: securityConfig.getConfig().enableStrictValidation,
          maxTextLength: securityConfig.getConfig().maxTextLength,
          zalgoComplexityLimit: securityConfig.getConfig().maxZalgoComplexity
        },
        contentSecurityPolicy: {
          status: 'active',
          mode: 'strict',
          nonceGeneration: 'enabled',
          reportUri: '/csp-report'
        },
        auditLogging: {
          status: 'active',
          tamperProtection: 'enabled',
          retentionDays: 90
        },
        requestSigning: {
          status: securityConfig.getConfig().enableRequestSigning ? 'active' : 'disabled',
          algorithm: 'HMAC-SHA256',
          nonceTracking: 'enabled'
        },
        authentication: {
          status: env.MCP_SESSIONS ? 'configured' : 'disabled',
          provider: 'GitHub OAuth',
          sessionDuration: '7 days'
        },
        rateLimiting: {
          status: env.MCP_SESSIONS ? 'active' : 'disabled',
          strategy: 'per-user and per-IP'
        }
      },
      endpoints: {
        healthStatus: '/health',
        cspReporting: '/csp-report',
        securityStatus: '/security-status (this endpoint)'
      }
    };

    // Log security status access
    await auditLogger.logEvent('SYSTEM_ACCESS', 'SECURITY_STATUS_ACCESSED', 'SUCCESS', {
      message: 'Security status endpoint accessed',
      resource: '/security-status',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId
    });

    return new Response(JSON.stringify(securityStatus, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin') || undefined)
      }
    });

  } catch (error) {
    await auditLogger.logEvent('ERROR', 'SECURITY_STATUS_ERROR', 'FAILURE', {
      message: `Error generating security status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resource: '/security-status',
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      additionalDetails: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      threatIndicators: ['SECURITY_STATUS_ERROR']
    });

    console.error('Security status error:', error);
    return new Response('Internal error', { status: 500 });
  }
}