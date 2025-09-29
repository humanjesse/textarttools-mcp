/**
 * TextArtTools MCP Server - MVP Entry Point with Security Headers
 * Enhanced with comprehensive security headers for protection against web threats
 * Cloudflare Workers provide built-in security + application-level security headers
 */

import type { Env, AnalyticsEvent } from './types.js';

import { mcpToolDefinitions, handleToolCall } from './mcp-tools.js';
import { GitHubOAuth, getClientIP, getCorsHeaders } from './auth.js';
import { enhancedRateLimiter, securityLogger } from './basic-security.js';
import { SecurityHeaders } from './security/security-headers.js';
import {
  getCharacterMappings,
  getPlatformCompatibility,
  getTextBannerUsage,
  getTextBannerCharacterMappings,
  getMcpRequestExamples,
  generateUnicodeStyleWorkflowPrompt,
  generateUnicodeBulkStylingPrompt,
  generateUnicodeCompatibilityCheckPrompt,
  generateUnicodeTroubleshootingPrompt,
  generateTextBannerWorkflowPrompt,
  generateTextBannerFontSelectionPrompt,
  generateTextBannerTroubleshootingPrompt
} from './resources.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const clientIp = getClientIP(request);

    // Initialize security headers middleware
    const securityHeaders = new SecurityHeaders(env);

    // Basic CORS headers (will be combined with security headers)
    const corsHeaders = getCorsHeaders(env.CORS_ORIGIN || '*');

    // Production security validation
    if (env.ENVIRONMENT === 'production') {
      if (!env.JWT_SECRET || env.JWT_SECRET.includes('your_') || env.JWT_SECRET.length < 32) {
        console.error('❌ Production deployment with invalid JWT_SECRET');
        return securityHeaders.createSecureResponse('Service Unavailable', {
          status: 503,
          headers: corsHeaders
        }, requestId);
      }
    }

    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return securityHeaders.createSecureResponse(null, {
          status: 200,
          headers: corsHeaders
        }, requestId);
      }

      const url = new URL(request.url);

      // MVP: Simple logging
      console.log(`${request.method} ${url.pathname} - ${clientIp}`);

      // Handle different endpoints
      if (url.pathname === '/' || url.pathname === '') {
        return handleRoot(request, corsHeaders, securityHeaders, requestId);
      }

      if (url.pathname === '/sse') {
        return handleSSE(request, env, corsHeaders, securityHeaders, requestId);
      }

      if (url.pathname === '/mcp') {
        return handleMCP(request, env, corsHeaders, securityHeaders, requestId);
      }

      if (url.pathname.startsWith('/auth/')) {
        return handleAuth(request, env, corsHeaders, securityHeaders, requestId);
      }

      if (url.pathname === '/health') {
        return handleHealth(corsHeaders, securityHeaders, requestId);
      }

      // Default 404
      return securityHeaders.createSecureResponse('Not Found', {
        status: 404,
        headers: corsHeaders
      }, requestId);

    } catch (error) {
      console.error('Request error:', error);

      const errorResponse = {
        error: 'Internal Server Error',
        requestId,
        message: env.ENVIRONMENT === 'production'
          ? 'Internal Server Error'
          : error instanceof Error ? error.message : 'Unknown error'
      };

      return securityHeaders.createSecureResponse(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }, requestId);
    }
  }
};

/**
 * Handle Server-Sent Events for MCP protocol
 */
async function handleSSE(request: Request, env: Env, corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Promise<Response> {
  const clientIp = getClientIP(request);

  // Enhanced rate limiting with burst protection
  if (env.MCP_SESSIONS) {
    try {
      const rateResult = await enhancedRateLimiter.checkRateLimit(env.MCP_SESSIONS, clientIp);
      if (!rateResult.allowed) {
        securityLogger.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          message: rateResult.error || 'Rate limit exceeded',
          clientIp,
          requestId,
          timestamp: Date.now(),
          details: {
            remaining: rateResult.remaining,
            resetTime: rateResult.resetTime,
            userAgent: request.headers.get('User-Agent')
          }
        });

        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32005,
            message: rateResult.error || 'Rate limit exceeded',
            data: {
              remaining: rateResult.remaining,
              resetTime: rateResult.resetTime
            }
          }
        };

        return securityHeaders.createSecureResponse(JSON.stringify(errorResponse), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateResult.resetTime).toISOString(),
            ...corsHeaders
          }
        }, requestId);
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue processing if rate limiting fails
    }
  }

  if (request.method !== 'POST') {
    return securityHeaders.createSecureResponse('Method not allowed', {
      status: 405,
      headers: corsHeaders
    }, requestId);
  }

  const body = await request.text();
  let jsonrpcRequest;

  try {
    jsonrpcRequest = JSON.parse(body);
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };

    return securityHeaders.createSecureResponse(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }, requestId);
  }

  // Handle different MCP methods
  let response;

  try {
    switch (jsonrpcRequest.method) {
      case 'initialize':
        response = handleInitialize(jsonrpcRequest);
        break;

      case 'tools/list':
        response = handleToolsList(jsonrpcRequest);
        break;

      case 'tools/call':
        response = await handleToolsCall(jsonrpcRequest, env, clientIp, requestId);
        break;

      case 'resources/list':
        response = handleResourcesList(jsonrpcRequest);
        break;

      case 'resources/read':
        response = handleResourcesRead(jsonrpcRequest);
        break;

      case 'prompts/list':
        response = handlePromptsList(jsonrpcRequest);
        break;

      case 'prompts/get':
        response = handlePromptsGet(jsonrpcRequest);
        break;

      default:
        response = {
          jsonrpc: '2.0',
          id: jsonrpcRequest.id,
          error: {
            code: -32601,
            message: `Method not found: ${jsonrpcRequest.method}`
          }
        };
    }

    // Log analytics if available
    if (env.MCP_ANALYTICS) {
      await logAnalytics(env.MCP_ANALYTICS, {
        tool_name: jsonrpcRequest.method,
        text_length: body.length,
        processing_time_ms: 1,
        user_id: clientIp,
        timestamp: Date.now(),
        success: true
      });
    }

  } catch (error) {
    console.error('MCP method error:', error);

    response = {
      jsonrpc: '2.0',
      id: jsonrpcRequest.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: env.ENVIRONMENT === 'production'
          ? 'Internal error occurred'
          : error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  // Add rate limit headers for successful responses
  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(corsHeaders as Record<string, string>)
  };

  // Add rate limit info if available
  if (env.MCP_SESSIONS) {
    try {
      const currentRateInfo = await enhancedRateLimiter.checkRateLimit(env.MCP_SESSIONS, clientIp);
      if (currentRateInfo.allowed) {
        responseHeaders['X-RateLimit-Limit'] = '100';
        responseHeaders['X-RateLimit-Remaining'] = currentRateInfo.remaining.toString();
        responseHeaders['X-RateLimit-Reset'] = new Date(currentRateInfo.resetTime).toISOString();
      }
    } catch (error) {
      // Ignore rate limit header errors for successful responses
    }
  }

  return securityHeaders.createSecureResponse(JSON.stringify(response), {
    status: 200,
    headers: responseHeaders
  }, requestId);
}

/**
 * Handle authentication endpoints
 */
async function handleAuth(request: Request, env: Env, corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const oauth = new GitHubOAuth(env, baseUrl);

  if (url.pathname === '/auth/authorize') {
    const authUrl = oauth.getAuthorizationUrl('state-placeholder');
    const redirectResponse = Response.redirect(authUrl, 302);
    return securityHeaders.applyHeaders(redirectResponse, requestId);
  }

  if (url.pathname === '/auth/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return securityHeaders.createSecureResponse('Missing authorization code', {
        status: 400,
        headers: corsHeaders
      }, requestId);
    }

    try {
      const session = await oauth.exchangeCodeForToken(code);
      return securityHeaders.createSecureResponse(`Authentication successful! Session: ${session}`, {
        status: 200,
        headers: corsHeaders
      }, requestId);
    } catch (error) {
      console.error('OAuth error:', error);
      return securityHeaders.createSecureResponse('Authentication failed', {
        status: 500,
        headers: corsHeaders
      }, requestId);
    }
  }

  return securityHeaders.createSecureResponse('Not Found', {
    status: 404,
    headers: corsHeaders
  }, requestId);
}

/**
 * Handle root URL with better MCP auto-discovery
 */
function handleRoot(request: Request, corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Response {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Detect if this might be an MCP client attempting auto-discovery
  if (request.method === 'POST' || userAgent.includes('mcp') || request.headers.get('Content-Type') === 'application/json') {
    // Redirect MCP requests to the SSE endpoint
    return Response.redirect(`${url.origin}/sse`, 307);
  }

  // For browser/human users, show API documentation
  return handleApiDocs(corsHeaders, securityHeaders, requestId);
}

/**
 * Handle MCP endpoint (Streamable HTTP transport)
 */
async function handleMCP(request: Request, env: Env, corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Promise<Response> {
  // MCP Streamable HTTP transport - same logic as SSE but different endpoint
  return handleSSE(request, env, corsHeaders, securityHeaders, requestId);
}

/**
 * Handle API documentation for AIs
 */
function handleApiDocs(corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Response {
  const apiDocs = {
    name: 'TextArtTools MCP Server',
    description: 'Unicode text styling and ASCII art generation API using Model Context Protocol (MCP)',
    version: '1.1.0',
    protocolVersion: '2024-11-05',
    endpoints: {
      mcp_sse: {
        url: '/sse',
        method: 'POST',
        transport: 'Server-Sent Events',
        description: 'MCP JSON-RPC 2.0 endpoint for text styling and ASCII art generation',
        content_type: 'application/json',
      },
      mcp_streamable: {
        url: '/mcp',
        method: 'POST',
        transport: 'Streamable HTTP',
        description: 'MCP JSON-RPC 2.0 endpoint (alternative transport)',
        content_type: 'application/json',
      },
      example_requests: {
        unicode_styling: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'unicode_style_text',
            arguments: {
              text: 'Hello World',
              style: 'bold'
            }
          }
        },
        text_banners: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'ascii_art_text',
            arguments: {
              text: 'Hello',
              font: 'Standard'
            }
          }
        }
      },
      available_tools: {
        unicode_tools: ['unicode_style_text', 'list_available_styles', 'preview_styles', 'get_style_info'],
        text_banner_tools: ['ascii_art_text', 'list_figlet_fonts', 'preview_figlet_fonts']
      },
      discovery_commands: {
        get_all_styles: {
          method: 'tools/call',
          params: { name: 'list_available_styles', arguments: {} },
          description: 'Get complete list of available Unicode text styles'
        },
        get_all_fonts: {
          method: 'tools/call',
          params: { name: 'list_figlet_fonts', arguments: {} },
          description: 'Get complete list of available figlet fonts for text banners'
        }
      },
      health: {
        url: '/health',
        method: 'GET',
        description: 'Server health check'
      }
    },
    instructions_for_ai: [
      'Use POST method to /sse or /mcp endpoint (both support same JSON-RPC 2.0 protocol)',
      'Set Content-Type: application/json header',
      'Send JSON-RPC 2.0 formatted requests with method "tools/call"',
      'FIRST: Use list_available_styles to discover all Unicode text styles',
      'FIRST: Use list_figlet_fonts to discover all available text banner fonts',
      'For Unicode styling: use unicode_style_text with text and style parameters',
      'For text banners: use ascii_art_text with text and font parameters',
      'Use preview_styles and preview_figlet_fonts to compare options',
      'Use get_style_info for detailed Unicode style information',
      'Protocol version: 2024-11-05'
    ]
  };

  return securityHeaders.createSecureResponse(JSON.stringify(apiDocs, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  }, requestId);
}

/**
 * Handle health check
 */
function handleHealth(corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Response {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    protocolVersion: '2024-11-05',
    services: {
      textStyling: 'operational',
      textBanners: 'operational',
      mcp: 'operational'
    }
  };

  return securityHeaders.createSecureResponse(JSON.stringify(healthStatus), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  }, requestId);
}

/**
 * MCP Protocol Handlers
 */
function handleInitialize(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: 'textarttools-mcp-server',
        version: '1.1.0',
        description: 'Unicode text styling and ASCII art generation server'
      }
    }
  };
}

function handleToolsList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: mcpToolDefinitions
    }
  };
}

async function handleToolsCall(request: any, env: Env, clientIp: string, requestId: string): Promise<any> {
  try {
    // Debug logging for Claude Desktop tool calls
    console.log(`🔧 Tool Call from Client: ${request.params.name}`);
    console.log(`📝 Arguments received:`, JSON.stringify(request.params.arguments, null, 2));

    // Pass R2 bucket and security context to tool handler
    const result = await handleToolCall(
      request.params.name,
      request.params.arguments,
      env.FIGLET_FONTS,
      clientIp,
      requestId
    );

    // Debug logging for response
    console.log(`✅ Tool Response size: ${JSON.stringify(result).length} characters`);
    console.log(`📤 Returning result for: ${request.params.name}`);

    // Format response according to MCP protocol specification
    // Include both text content (for backwards compatibility) and structured content
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result,
        isError: false
      }
    };
  } catch (error) {
    const errorMessage = env.ENVIRONMENT === 'production'
      ? 'Tool execution failed'
      : error instanceof Error ? error.message : 'Tool execution failed';

    // Return tool errors in MCP format with isError flag instead of JSON-RPC errors
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ],
        isError: true
      }
    };
  }
}

function handleResourcesList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      resources: [
        {
          uri: 'textarttools://character-mappings',
          name: 'Character Mappings',
          description: 'Unicode character mapping tables for text transformations',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://platform-compatibility',
          name: 'Platform Compatibility',
          description: 'Platform compatibility matrix for Unicode styles',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://text-banner-font-definitions',
          name: 'Figlet Font Definitions',
          description: 'R2-based metadata for 322+ ASCII art fonts',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://text-banner-usage',
          name: 'ASCII Art Usage',
          description: 'Practical guidance for ASCII art tool workflows',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://request-examples',
          name: 'Request Examples',
          description: 'Correct JSON-RPC 2.0 request format examples for all tools',
          mimeType: 'application/json'
        }
      ]
    }
  };
}

function handleResourcesRead(request: any): any {
  const uri = request.params.uri;

  let content;
  switch (uri) {
    case 'textarttools://character-mappings':
      content = getCharacterMappings();
      break;
    case 'textarttools://platform-compatibility':
      content = getPlatformCompatibility();
      break;
    case 'textarttools://text-banner-font-definitions':
      content = getTextBannerCharacterMappings();
      break;
    case 'textarttools://text-banner-usage':
      content = getTextBannerUsage();
      break;
    case 'textarttools://request-examples':
      content = getMcpRequestExamples();
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
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(content, null, 2)
      }]
    }
  };
}

function handlePromptsList(request: any): any {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      prompts: [
        {
          name: 'unicode-style-workflow',
          description: 'Tool workflow: list_available_styles → preview_styles → unicode_style_text'
        },
        {
          name: 'unicode-bulk-styling',
          description: 'Apply same style to multiple texts using unicode_style_text'
        },
        {
          name: 'unicode-compatibility-check',
          description: 'Check style compatibility using get_style_info'
        },
        {
          name: 'unicode-troubleshooting',
          description: 'Fix unicode_style_text failures using get_style_info and preview_styles'
        },
        {
          name: 'text-banner-workflow',
          description: 'Tool workflow: list_figlet_fonts → preview_figlet_fonts → ascii_art_text'
        },
        {
          name: 'ascii-font-selection',
          description: 'Compare fonts using preview_figlet_fonts'
        },
        {
          name: 'text-banner-troubleshooting',
          description: 'Fix ascii_art_text failures using list_figlet_fonts and preview_figlet_fonts'
        }
      ]
    }
  };
}

function handlePromptsGet(request: any): any {
  const name = request.params.name;
  const args = request.params.arguments || {};

  let promptText;
  switch (name) {
    case 'unicode-style-workflow':
      promptText = generateUnicodeStyleWorkflowPrompt(args);
      break;
    case 'unicode-bulk-styling':
      promptText = generateUnicodeBulkStylingPrompt(args);
      break;
    case 'unicode-compatibility-check':
      promptText = generateUnicodeCompatibilityCheckPrompt(args);
      break;
    case 'unicode-troubleshooting':
      promptText = generateUnicodeTroubleshootingPrompt(args);
      break;
    case 'text-banner-workflow':
      promptText = generateTextBannerWorkflowPrompt(args);
      break;
    case 'ascii-font-selection':
      promptText = generateTextBannerFontSelectionPrompt(args);
      break;
    case 'text-banner-troubleshooting':
      promptText = generateTextBannerTroubleshootingPrompt(args);
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
      description: `Prompt for ${name}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText
          }
        }
      ]
    }
  };
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