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
  GetStyleInfoResult,
  AsciiArtParams,
  AsciiArtResult,
  ListFigletFontsResult,
  PreviewFigletFontsParams,
  PreviewFigletFontsResult
} from './types.js';

import {
  transformText,
  getStyleDefinitions,
  getStyleInfo,
  isValidStyle
} from './text-styler.js';

import {
  generateAsciiArt,
  getFigletFontDefinitions,
  isValidFont
} from './figlet-engine.js';

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
 * MCP Tool: ascii_art_text
 * Generate ASCII art using figlet fonts with R2 storage
 */
export async function handleAsciiArt(params: AsciiArtParams, r2Bucket: R2Bucket): Promise<AsciiArtResult> {
  const { text, font, preserve_spacing = true } = params;
  const startTime = Date.now();

  // Basic validation
  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required and must be a string');
  }

  if (!font || typeof font !== 'string') {
    throw new Error('Font parameter is required and must be a string');
  }

  if (!r2Bucket) {
    throw new Error('R2 bucket is required for ASCII art generation');
  }

  // Validate font exists in R2
  const fontExists = await isValidFont(font, r2Bucket);
  if (!fontExists) {
    throw new Error(`Font not found in R2: ${font}`);
  }

  if (text.length > 100) {
    throw new Error('Text too long for ASCII art. Maximum length is 100 characters');
  }

  try {
    const ascii_art = await generateAsciiArt(text, font, preserve_spacing, r2Bucket);
    const lines = ascii_art.split('\n');
    const processingTime = Date.now() - startTime;

    return {
      ascii_art,
      font_applied: font as any,
      character_count: text.length,
      line_count: lines.length,
      processing_time_ms: processingTime
    };
  } catch (error) {
    throw new Error(`ASCII art generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: list_figlet_fonts
 * Get all available figlet fonts with examples and metadata
 */
export async function handleListFigletFonts(r2Bucket: R2Bucket): Promise<ListFigletFontsResult> {
  if (!r2Bucket) {
    throw new Error('R2 bucket is required for listing figlet fonts');
  }

  try {
    const fontDefinitions = await getFigletFontDefinitions(r2Bucket);
    const totalCount = fontDefinitions.length;
    const bundledCount = 0; // All fonts are from R2, none are bundled

    return {
      fonts: fontDefinitions,
      total_count: totalCount,
      bundled_count: bundledCount
    };
  } catch (error) {
    throw new Error(`Failed to list figlet fonts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: preview_figlet_fonts
 * Show sample text in multiple figlet fonts for comparison
 */
export async function handlePreviewFigletFonts(params: PreviewFigletFontsParams, r2Bucket: R2Bucket): Promise<PreviewFigletFontsResult> {
  const { text, fonts } = params;

  if (!r2Bucket) {
    throw new Error('R2 bucket is required for font previews');
  }

  // Basic validation
  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required and must be a string');
  }

  if (text.length > 20) {
    throw new Error('Preview text too long. Maximum length is 20 characters for font previews');
  }

  try {
    // Get fonts to preview - either specified or from R2
    let fontsToPreview: string[];
    if (fonts && fonts.length > 0) {
      fontsToPreview = fonts;
    } else {
      const fontDefinitions = await getFigletFontDefinitions(r2Bucket);
      fontsToPreview = fontDefinitions.slice(0, 10).map(f => f.font); // Limit to first 10 for performance
    }

    const previews = [];
    const fontDefinitions = await getFigletFontDefinitions(r2Bucket);

    for (const fontName of fontsToPreview) {
      // Validate font exists in R2
      const fontExists = await isValidFont(fontName, r2Bucket);
      if (!fontExists) {
        continue; // Skip fonts not in R2
      }

      try {
        const ascii_art = await generateAsciiArt(text, fontName, true, r2Bucket);
        const fontInfo = fontDefinitions.find(f => f.font === fontName);

        previews.push({
          font: fontName as any,
          ascii_art,
          suitable_for: fontInfo?.suitableFor || []
        });
      } catch (error) {
        // Skip fonts that fail to generate
        console.warn(`Failed to preview font ${fontName}:`, error);
        continue;
      }
    }

    return {
      previews
    };
  } catch (error) {
    throw new Error(`Failed to preview figlet fonts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle MCP tool calls with R2 bucket support
 */
export async function handleToolCall(toolName: string, args: any, r2Bucket?: R2Bucket): Promise<any> {
  switch (toolName) {
    // Unicode styling tools
    case 'unicode_style_text':
      return await handleStyleText(args);

    case 'list_available_styles':
      return await handleListStyles();

    case 'preview_styles':
      return await handlePreviewStyles(args);

    case 'get_style_info':
      return await handleGetStyleInfo(args);

    // ASCII art tools (require R2 bucket)
    case 'ascii_art_text':
      if (!r2Bucket) {
        throw new Error('R2 bucket is required for ASCII art generation');
      }
      return await handleAsciiArt(args, r2Bucket);

    case 'list_figlet_fonts':
      if (!r2Bucket) {
        throw new Error('R2 bucket is required for listing figlet fonts');
      }
      return await handleListFigletFonts(r2Bucket);

    case 'preview_figlet_fonts':
      if (!r2Bucket) {
        throw new Error('R2 bucket is required for font previews');
      }
      return await handlePreviewFigletFonts(args, r2Bucket);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * MCP Tool Definitions
 */
export const mcpToolDefinitions = [
  // Unicode styling tools
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
  },

  // ASCII art tools
  {
    name: 'ascii_art_text',
    description: 'Generate ASCII art using figlet fonts',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to convert to ASCII art',
          maxLength: 100
        },
        font: {
          type: 'string',
          description: 'The figlet font to use (use list_figlet_fonts to see all available options)'
        },
        preserve_spacing: {
          type: 'boolean',
          description: 'Whether to preserve original spacing',
          default: true
        }
      },
      required: ['text', 'font']
    }
  },
  {
    name: 'list_figlet_fonts',
    description: 'Get a list of all available figlet fonts with examples',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'preview_figlet_fonts',
    description: 'Preview text in multiple figlet fonts for comparison',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to preview (max 20 characters)',
          maxLength: 20
        },
        fonts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific fonts to include (optional, defaults to all)',
          default: []
        }
      },
      required: ['text']
    }
  }
];