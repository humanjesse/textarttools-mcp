/**
 * MCP Tool Definitions and Handlers for TextArtTools Unicode Styling
 * MVP Version - Simplified without complex security features
 */

import type {
  StyleTextParams,
  StyleTextResult,
  ListStylesResult,
  PreviewStylesParams,
  PreviewStylesResult,
  GetStyleInfoParams,
  GetStyleInfoResult
} from './types.js';

import {
  transformText,
  getStyleDefinitions,
  getStyleInfo,
  isValidStyle
} from './text-styler.js';

/**
 * MCP Tool: unicode_style_text
 * Transform input text using a specified Unicode style
 */
export async function handleStyleText(params: StyleTextParams): Promise<StyleTextResult> {
  const { text, style, preserve_spacing = true } = params;

  // Basic validation
  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required and must be a string');
  }

  if (!style || typeof style !== 'string') {
    throw new Error('Style parameter is required and must be a string');
  }

  if (!isValidStyle(style)) {
    throw new Error(`Invalid style: ${style}`);
  }

  if (text.length > 10000) {
    throw new Error('Text too long. Maximum length is 10,000 characters');
  }

  try {
    const styled_text = transformText(text, style as any, preserve_spacing);

    return {
      styled_text,
      style_applied: style,
      character_count: text.length,
      processing_time_ms: 1
    };
  } catch (error) {
    throw new Error(`Text transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: list_available_styles
 * Get all available text styles with examples and metadata
 */
export async function handleListStyles(): Promise<ListStylesResult> {
  const styleDefinitions = getStyleDefinitions();

  return {
    styles: styleDefinitions,
    total_count: styleDefinitions.length
  };
}

/**
 * MCP Tool: preview_styles
 * Show sample text in multiple styles for comparison
 */
export async function handlePreviewStyles(params: PreviewStylesParams): Promise<PreviewStylesResult> {
  const { text, styles } = params;

  // Basic validation
  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required and must be a string');
  }

  if (text.length > 50) {
    throw new Error('Preview text too long. Maximum length is 50 characters');
  }

  const stylesToPreview = styles || getStyleDefinitions().map(s => s.style);
  const previews = [];

  for (const styleName of stylesToPreview) {
    if (!isValidStyle(styleName)) {
      continue; // Skip invalid styles
    }

    try {
      const styled_text = transformText(text, styleName as any, true);
      const styleInfo = getStyleInfo(styleName as any);

      previews.push({
        style: styleName,
        styled_text,
        suitable_for: styleInfo?.suitableFor || []
      });
    } catch (error) {
      // Skip styles that fail to transform
      continue;
    }
  }

  return {
    previews
  };
}

/**
 * MCP Tool: get_style_info
 * Get detailed information about a specific style
 */
export async function handleGetStyleInfo(params: GetStyleInfoParams): Promise<GetStyleInfoResult> {
  const { style } = params;

  if (!style || typeof style !== 'string') {
    throw new Error('Style parameter is required and must be a string');
  }

  if (!isValidStyle(style)) {
    throw new Error(`Invalid style: ${style}`);
  }

  const styleInfo = getStyleInfo(style as any);

  if (!styleInfo) {
    throw new Error(`Style information not found: ${style}`);
  }

  return {
    style_info: styleInfo
  };
}

/**
 * Handle MCP tool calls
 */
export async function handleToolCall(toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case 'unicode_style_text':
      return await handleStyleText(args);

    case 'list_available_styles':
      return await handleListStyles();

    case 'preview_styles':
      return await handlePreviewStyles(args);

    case 'get_style_info':
      return await handleGetStyleInfo(args);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * MCP Tool Definitions
 */
export const mcpToolDefinitions = [
  {
    name: 'unicode_style_text',
    description: 'Transform text using Unicode styling (bold, italic, fraktur, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to transform',
          maxLength: 10000
        },
        style: {
          type: 'string',
          description: 'The Unicode style to apply',
          enum: [
            'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
            'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
            'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
            'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
            'boldItalicSerif', 'boldFraktur'
          ]
        },
        preserve_spacing: {
          type: 'boolean',
          description: 'Whether to preserve original spacing',
          default: true
        }
      },
      required: ['text', 'style']
    }
  },
  {
    name: 'list_available_styles',
    description: 'Get a list of all available Unicode text styles with examples',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'preview_styles',
    description: 'Preview text in multiple styles for comparison',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to preview (max 50 characters)',
          maxLength: 50
        },
        styles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific styles to include (optional, defaults to all)',
          default: []
        }
      },
      required: ['text']
    }
  },
  {
    name: 'get_style_info',
    description: 'Get detailed information about a specific Unicode style',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          description: 'The style to get information about'
        }
      },
      required: ['style']
    }
  }
];