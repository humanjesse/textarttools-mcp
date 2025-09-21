/**
 * Authentication and Rate Limiting for TextArtTools MCP Server
 */

import type {
  Env,
  GitHubUser,
  AuthSession,
  RateLimitInfo
} from './types.js';
import {
  AuthenticationError,
  RateLimitError
} from './types.js';

/**
 * GitHub OAuth configuration
 */
export class GitHubOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(env: Env, baseUrl: string) {
    this.clientId = env.GITHUB_CLIENT_ID;
    this.clientSecret = env.GITHUB_CLIENT_SECRET;
    this.redirectUri = `${baseUrl}/auth/callback`;
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
      ...(state && { state })
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to exchange code for token');
    }

    const data = await response.json() as any;
    if (data.error) {
      throw new AuthenticationError(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  }

  /**
   * Fetch user information from GitHub
   */
  async fetchUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'TextArtTools-MCP-Server'
      }
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to fetch user information from GitHub');
    }

    const userData = await response.json() as any;
    return {
      id: userData.id,
      login: userData.login,
      name: userData.name || userData.login,
      email: userData.email,
      avatar_url: userData.avatar_url
    };
  }
}

/**
 * Session management
 */
export class SessionManager {
  private kv: KVNamespace;

  constructor(env: Env) {
    if (!env.MCP_SESSIONS) {
      throw new Error('MCP_SESSIONS KV namespace is required');
    }
    this.kv = env.MCP_SESSIONS;
    // JWT secret available if needed for future token signing
  }

  /**
   * Create a new session
   */
  async createSession(user: GitHubUser, accessToken: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: AuthSession = {
      user,
      access_token: accessToken,
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      created_at: Date.now()
    };

    // Store session in KV
    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
    );

    return sessionId;
  }

  /**
   * Retrieve session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    if (!sessionId) return null;

    try {
      const sessionData = await this.kv.get(`session:${sessionId}`);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData) as AuthSession;

      // Check if session is expired
      if (session.expires_at < Date.now()) {
        await this.kv.delete(`session:${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.kv.delete(`session:${sessionId}`);
  }

  /**
   * Extract session ID from request headers
   */
  extractSessionId(request: Request): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookie as fallback
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('mcp_session='));
      if (sessionCookie) {
        return sessionCookie.split('=')[1];
      }
    }

    return null;
  }
}

/**
 * Rate limiting
 */
export class RateLimiter {
  private kv: KVNamespace;
  private limitPerMinute: number;

  constructor(env: Env) {
    if (!env.MCP_SESSIONS) {
      throw new Error('MCP_SESSIONS KV namespace is required for rate limiting');
    }
    this.kv = env.MCP_SESSIONS;
    this.limitPerMinute = parseInt(env.RATE_LIMIT_PER_MINUTE || '100');
  }

  /**
   * Check rate limit for a user or IP
   */
  async checkRateLimit(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // Start of current minute

    try {
      const limitData = await this.kv.get(key);
      let rateLimitInfo: RateLimitInfo;

      if (limitData) {
        rateLimitInfo = JSON.parse(limitData);

        // If it's a new window, reset the counter
        if (rateLimitInfo.window_start < windowStart) {
          rateLimitInfo = {
            requests: 1,
            window_start: windowStart,
            limit: this.limitPerMinute
          };
        } else {
          rateLimitInfo.requests++;
        }
      } else {
        rateLimitInfo = {
          requests: 1,
          window_start: windowStart,
          limit: this.limitPerMinute
        };
      }

      // Check if limit exceeded
      if (rateLimitInfo.requests > this.limitPerMinute) {
        throw new RateLimitError(
          `Rate limit exceeded. Maximum ${this.limitPerMinute} requests per minute.`,
          {
            limit: this.limitPerMinute,
            remaining: 0,
            reset_time: windowStart + 60000
          }
        );
      }

      // Update the counter
      await this.kv.put(
        key,
        JSON.stringify(rateLimitInfo),
        { expirationTtl: 120 } // Keep for 2 minutes to handle edge cases
      );

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // If KV fails, allow the request but log the error
      console.error('Rate limiting error:', error);
    }
  }

  /**
   * Get rate limit info for a user or IP
   */
  async getRateLimitInfo(identifier: string): Promise<RateLimitInfo> {
    const key = `ratelimit:${identifier}`;
    const limitData = await this.kv.get(key);

    if (!limitData) {
      return {
        requests: 0,
        window_start: Math.floor(Date.now() / 60000) * 60000,
        limit: this.limitPerMinute
      };
    }

    return JSON.parse(limitData);
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Cloudflare provides the client IP in the CF-Connecting-IP header
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
         'unknown';
}

/**
 * CORS headers for preflight requests
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Check if origin is allowed for CORS
 */
function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    'https://claude.ai',
    'https://localhost:3000',
    'http://localhost:3000',
    'http://localhost:8788',
    'https://localhost:8788'
  ];

  return allowedOrigins.some(allowed =>
    origin === allowed ||
    origin.endsWith('.claude.ai') ||
    origin.includes('localhost')
  );
}