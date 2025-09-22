/**
 * TextArtTools MCP Server - MVP Entry Point with Security Headers
 * Enhanced with comprehensive security headers for protection against web threats
 * Cloudflare Workers provide built-in security + application-level security headers
 */

import type { Env, AnalyticsEvent } from './types.js';
import { RateLimitError } from './types.js';

import { mcpToolDefinitions, handleToolCall } from './mcp-tools.js';
import { GitHubOAuth, RateLimiter, getClientIP, getCorsHeaders } from './auth.js';
import { SecurityHeaders } from './security/security-headers.js';
import {
  getCharacterMappings,
  getPlatformCompatibility,
  getAsciiArtUsage,
  getFigletCharacterMappings,
  getMcpRequestExamples,
  generateUnicodeStyleWorkflowPrompt,
  generateUnicodeBulkStylingPrompt,
  generateUnicodeCompatibilityCheckPrompt,
  generateUnicodeTroubleshootingPrompt,
  generateAsciiArtWorkflowPrompt,
  generateAsciiFontSelectionPrompt,
  generateAsciiArtTroubleshootingPrompt
} from './resources.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const clientIp = getClientIP(request);

    // Initialize security headers middleware
    const securityHeaders = new SecurityHeaders(env);

    // Basic CORS headers (will be combined with security headers)
    const corsHeaders = getCorsHeaders(env.CORS_ORIGIN || '*');

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
        return handleApiDocs(corsHeaders, securityHeaders, requestId);
      }

      if (url.pathname === '/sse') {
        return handleSSE(request, env, corsHeaders, securityHeaders, requestId);
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
        message: error instanceof Error ? error.message : 'Unknown error'
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

  // MVP: Basic rate limiting (simplified)
  if (env.MCP_SESSIONS) {
    try {
      const rateLimiter = new RateLimiter(env);
      await rateLimiter.checkRateLimit(clientIp);
    } catch (error) {
      throw new RateLimitError('Rate limit exceeded');
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
        response = await handleToolsCall(jsonrpcRequest, env);
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
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  return securityHeaders.createSecureResponse(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
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
 * Handle API documentation for AIs
 */
function handleApiDocs(corsHeaders: HeadersInit, securityHeaders: SecurityHeaders, requestId: string): Response {
  const apiDocs = {
    name: 'TextArtTools MCP Server',
    description: 'Unicode text styling and ASCII art generation API using Model Context Protocol (MCP)',
    version: '1.1.0',
    endpoints: {
      mcp: {
        url: '/sse',
        method: 'POST',
        description: 'MCP JSON-RPC 2.0 endpoint for text styling and ASCII art generation',
        content_type: 'application/json',
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
          ascii_art: {
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
          ascii_tools: ['ascii_art_text', 'list_figlet_fonts', 'preview_figlet_fonts']
        },
        available_styles: [
          'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
          'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
          'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
          'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
          'boldItalicSerif', 'boldFraktur'
        ],
        available_fonts: [
          'Big', 'Standard', 'Slant', 'Banner', 'Block', 'Small', 'Bubble', '3D-ASCII'
        ]
      },
      health: {
        url: '/health',
        method: 'GET',
        description: 'Server health check'
      }
    },
    instructions_for_ai: [
      'Use POST method to /sse endpoint',
      'Set Content-Type: application/json header',
      'Send JSON-RPC 2.0 formatted requests',
      'Use tools/call method with appropriate tool name',
      'For Unicode styling: use unicode_style_text with text and style parameters',
      'For ASCII art: use ascii_art_text with text and font parameters',
      'Use list_available_styles to see Unicode options',
      'Use list_figlet_fonts to see ASCII art font options',
      'Use preview tools to compare multiple styles/fonts'
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
    version: '1.0.0',
    services: {
      textStyling: 'operational',
      asciiArt: 'operational',
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
      protocolVersion: '1.0.0',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: {
        name: 'textarttools-mcp-server',
        version: '1.0.0',
        description: 'Unicode text styling server'
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

async function handleToolsCall(request: any, env: Env): Promise<any> {
  try {
    // Pass R2 bucket to tool handler for figlet font loading
    const result = await handleToolCall(request.params.name, request.params.arguments, env.FIGLET_FONTS);

    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Tool execution failed'
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
          uri: 'textarttools://figlet-font-definitions',
          name: 'Figlet Font Definitions',
          description: 'R2-based metadata for 322+ ASCII art fonts',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://ascii-art-usage',
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
    case 'textarttools://figlet-font-definitions':
      content = getFigletCharacterMappings();
      break;
    case 'textarttools://ascii-art-usage':
      content = getAsciiArtUsage();
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
          name: 'ascii-art-workflow',
          description: 'Tool workflow: list_figlet_fonts → preview_figlet_fonts → ascii_art_text'
        },
        {
          name: 'ascii-font-selection',
          description: 'Compare fonts using preview_figlet_fonts'
        },
        {
          name: 'ascii-art-troubleshooting',
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
    case 'ascii-art-workflow':
      promptText = generateAsciiArtWorkflowPrompt(args);
      break;
    case 'ascii-font-selection':
      promptText = generateAsciiFontSelectionPrompt(args);
      break;
    case 'ascii-art-troubleshooting':
      promptText = generateAsciiArtTroubleshootingPrompt(args);
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