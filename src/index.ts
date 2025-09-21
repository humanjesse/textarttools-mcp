/**
 * TextArtTools MCP Server - MVP Entry Point
 * Simplified version without complex security features
 * Cloudflare Workers provide built-in security
 */

import type { Env, AnalyticsEvent } from './types.js';
import { RateLimitError } from './types.js';

import { mcpToolDefinitions, handleToolCall } from './mcp-tools.js';
import { GitHubOAuth, RateLimiter, getClientIP, getCorsHeaders } from './auth.js';
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const clientIp = getClientIP(request);

    // MVP: Basic CORS headers
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

      // MVP: Simple logging
      console.log(`${request.method} ${url.pathname} - ${clientIp}`);

      // Handle different endpoints
      if (url.pathname === '/' || url.pathname === '') {
        return handleApiDocs(corsHeaders);
      }

      if (url.pathname === '/sse') {
        return handleSSE(request, env, corsHeaders);
      }

      if (url.pathname.startsWith('/auth/')) {
        return handleAuth(request, env, corsHeaders);
      }

      if (url.pathname === '/health') {
        return handleHealth(corsHeaders);
      }

      // Default 404
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Request error:', error);

      const errorResponse = {
        error: 'Internal Server Error',
        requestId,
        message: error instanceof Error ? error.message : 'Unknown error'
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

/**
 * Handle Server-Sent Events for MCP protocol
 */
async function handleSSE(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
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
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
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

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
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
        response = await handleToolsCall(jsonrpcRequest);
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

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle authentication endpoints
 */
async function handleAuth(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const oauth = new GitHubOAuth(env, baseUrl);

  if (url.pathname === '/auth/authorize') {
    const authUrl = oauth.getAuthorizationUrl('state-placeholder');
    return Response.redirect(authUrl, 302);
  }

  if (url.pathname === '/auth/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response('Missing authorization code', {
        status: 400,
        headers: corsHeaders
      });
    }

    try {
      const session = await oauth.exchangeCodeForToken(code);
      return new Response(`Authentication successful! Session: ${session}`, {
        status: 200,
        headers: corsHeaders
      });
    } catch (error) {
      console.error('OAuth error:', error);
      return new Response('Authentication failed', {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  return new Response('Not Found', {
    status: 404,
    headers: corsHeaders
  });
}

/**
 * Handle API documentation for AIs
 */
function handleApiDocs(corsHeaders: HeadersInit): Response {
  const apiDocs = {
    name: 'TextArtTools MCP Server',
    description: 'Unicode text styling API using Model Context Protocol (MCP)',
    version: '1.0.0',
    endpoints: {
      mcp: {
        url: '/sse',
        method: 'POST',
        description: 'MCP JSON-RPC 2.0 endpoint for text styling',
        content_type: 'application/json',
        example_request: {
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
        available_styles: [
          'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
          'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
          'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
          'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
          'boldItalicSerif', 'boldFraktur'
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
      'Use tools/call method with unicode_style_text tool',
      'Specify text and style in arguments object'
    ]
  };

  return new Response(JSON.stringify(apiDocs, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle health check
 */
function handleHealth(corsHeaders: HeadersInit): Response {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      textStyling: 'operational',
      mcp: 'operational'
    }
  };

  return new Response(JSON.stringify(healthStatus), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
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

async function handleToolsCall(request: any): Promise<any> {
  try {
    const result = await handleToolCall(request.params.name, request.params.arguments);

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
          uri: 'textarttools://style-definitions',
          name: 'Style Definitions',
          description: 'Complete metadata for all 23 Unicode text styles',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://character-mappings',
          name: 'Character Mappings',
          description: 'Unicode character mapping tables for text transformations',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://usage-examples',
          name: 'Usage Examples',
          description: 'Example text transformations for each style',
          mimeType: 'application/json'
        },
        {
          uri: 'textarttools://platform-compatibility',
          name: 'Platform Compatibility',
          description: 'Platform compatibility matrix for Unicode styles',
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
    case 'textarttools://style-definitions':
      content = getStyleDefinitions();
      break;
    case 'textarttools://character-mappings':
      content = getCharacterMappings();
      break;
    case 'textarttools://usage-examples':
      content = getUsageExamples();
      break;
    case 'textarttools://platform-compatibility':
      content = getPlatformCompatibility();
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
          name: 'style-selector',
          description: 'Help users choose the right Unicode style for their text'
        },
        {
          name: 'bulk-processor',
          description: 'Guide users through bulk text processing operations'
        },
        {
          name: 'compatibility-checker',
          description: 'Check platform compatibility for Unicode styles'
        },
        {
          name: 'style-combiner',
          description: 'Combine multiple text styling techniques'
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
    case 'style-selector':
      promptText = generateStyleSelectorPrompt(args);
      break;
    case 'bulk-processor':
      promptText = generateBulkProcessorPrompt(args);
      break;
    case 'compatibility-checker':
      promptText = generateCompatibilityCheckerPrompt(args);
      break;
    case 'style-combiner':
      promptText = generateStyleCombinerPrompt(args);
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