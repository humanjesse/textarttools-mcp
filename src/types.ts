/**
 * Type definitions for TextArtTools MCP Server
 */

// Supported Unicode text styles
export type UnicodeStyle =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'underline'
  | 'strikethrough'
  | 'subscript'
  | 'superscript'
  | 'circled'
  | 'fraktur'
  | 'doubleStruck'
  | 'monospace'
  | 'cursive'
  | 'squared'
  | 'flipped'
  | 'zalgo'
  | 'blue'
  | 'parenthesized'
  | 'negativeCircled'
  | 'boldSerif'
  | 'italicSerif'
  | 'boldItalicSerif'
  | 'boldFraktur';

// Character mapping type
export type CharMap = { [key: string]: string };

// Style definition with metadata
export interface StyleDefinition {
  style: UnicodeStyle;
  displayName: string;
  description: string;
  example: string;
  unicodeRange?: string;
  suitableFor: string[];
  characterSupport: {
    letters: boolean;
    numbers: boolean;
    punctuation: boolean;
    symbols: boolean;
  };
}

// MCP Tool parameter types
export interface StyleTextParams {
  text: string;
  style: UnicodeStyle;
  preserve_spacing?: boolean;
}

export interface StyleTextResult {
  styled_text: string;
  style_applied: UnicodeStyle;
  character_count: number;
  processing_time_ms: number;
}

export interface ListStylesResult {
  styles: StyleDefinition[];
  total_count: number;
}

export interface PreviewStylesParams {
  text: string;
  styles?: UnicodeStyle[];
}

export interface PreviewStylesResult {
  previews: Array<{
    style: UnicodeStyle;
    styled_text: string;
    suitable_for: string[];
  }>;
}

export interface GetStyleInfoParams {
  style: UnicodeStyle;
}

export interface GetStyleInfoResult {
  style_info: StyleDefinition;
}

// Figlet font types
export type FigletFont =
  | 'Big'
  | 'Standard'
  | 'Slant'
  | 'Banner'
  | 'Block'
  | 'Small'
  | 'Bubble'
  | '3D-ASCII';

// Parsed figlet font structure
export interface ParsedFigletFont {
  height: number;
  baseline: number;
  hardblank: string;
  characters: Record<string, string[]>;
}

// Figlet font definition with metadata
export interface FigletFontDefinition {
  font: FigletFont;
  displayName: string;
  description: string;
  example: string;
  category: 'popular' | 'decorative' | '3d' | 'outline';
  bundled: boolean;
  suitableFor: string[];
}

// Figlet MCP Tool parameter types
export interface AsciiArtParams {
  text: string;
  font: FigletFont;
  preserve_spacing?: boolean;
}

export interface AsciiArtResult {
  ascii_art: string;
  font_applied: FigletFont;
  character_count: number;
  line_count: number;
  processing_time_ms: number;
}

export interface ListFigletFontsResult {
  fonts: FigletFontDefinition[];
  total_count: number;
  bundled_count: number;
}

export interface PreviewFigletFontsParams {
  text: string;
  fonts?: FigletFont[];
}

export interface PreviewFigletFontsResult {
  previews: Array<{
    font: FigletFont;
    ascii_art: string;
    suitable_for: string[];
  }>;
}

// Environment and configuration types
export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_PER_MINUTE: string;
  MAX_TEXT_LENGTH: string;

  // Security configuration
  SECURITY_LEVEL?: string; // 'strict' | 'standard' | 'permissive'
  CSP_REPORT_ENDPOINT?: string;

  // Cloudflare bindings (optional for development)
  MCP_SESSIONS?: KVNamespace;
  MCP_ANALYTICS?: AnalyticsEngineDataset;
  FIGLET_FONTS?: R2Bucket;
}

// Authentication types
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface AuthSession {
  user: GitHubUser;
  access_token: string;
  expires_at: number;
  created_at: number;
}

// Rate limiting types
export interface RateLimitInfo {
  requests: number;
  window_start: number;
  limit: number;
}

// Analytics event types
export interface AnalyticsEvent {
  timestamp: number;
  user_id?: string | undefined;
  tool_name: string;
  style?: UnicodeStyle;
  text_length: number;
  processing_time_ms: number;
  success: boolean;
  error_type?: string;
}

// Error types
export class MCPError extends Error {
  constructor(
    message: string,
    public code: number = -32603,
    public data?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, data?: any) {
    super(message, -32602, data);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends MCPError {
  constructor(message: string, data?: any) {
    super(message, -32429, data);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends MCPError {
  constructor(message: string, data?: any) {
    super(message, -32401, data);
    this.name = 'AuthenticationError';
  }
}