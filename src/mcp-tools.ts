/**
 * MCP Tool Definitions and Handlers for TextArtTools Unicode Styling
 * Enhanced with basic security validation for public tool safety
 */

import type {
  UnicodeStyle,
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

import {
  inputSanitizer,
  securityLogger
} from './basic-security.js';

/**
 * MCP Tool: unicode_style_text
 * Transform input text using a specified Unicode style
 */
export async function handleStyleText(params: StyleTextParams, clientIp?: string, requestId?: string): Promise<StyleTextResult> {
  const { text, style, preserve_spacing = true } = params;
  const startTime = Date.now();

  // Enhanced security validation
  const textValidation = inputSanitizer.validateText(text, 'main');
  if (!textValidation.isValid) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Text validation failed: ${textValidation.errors.join(', ')}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { errors: textValidation.errors, originalText: text.substring(0, 100) }
      });
    }
    throw new Error(`Invalid text input: ${textValidation.errors[0]}`);
  }

  const styleValidation = inputSanitizer.validateStyle(style);
  if (!styleValidation.isValid) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Style validation failed: ${styleValidation.errors.join(', ')}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { errors: styleValidation.errors, originalStyle: style }
      });
    }
    throw new Error(`Invalid style: ${styleValidation.errors[0]}`);
  }

  // Log warnings if any
  if (textValidation.warnings.length > 0 && clientIp && requestId) {
    securityLogger.logSecurityEvent({
      type: 'SUSPICIOUS_PATTERN',
      message: `Text validation warnings: ${textValidation.warnings.join(', ')}`,
      clientIp,
      requestId,
      timestamp: Date.now(),
      details: { warnings: textValidation.warnings }
    });
  }

  try {
    const styled_text = transformText(textValidation.sanitizedValue, styleValidation.sanitizedValue as UnicodeStyle, preserve_spacing);
    const processingTime = Date.now() - startTime;

    return {
      styled_text,
      style_applied: styleValidation.sanitizedValue as UnicodeStyle,
      character_count: textValidation.sanitizedValue.length,
      processing_time_ms: processingTime
    };
  } catch (error) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'ERROR',
        message: `Text transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
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
export async function handlePreviewStyles(params: PreviewStylesParams, clientIp?: string, requestId?: string): Promise<PreviewStylesResult> {
  const { text, styles } = params;

  // Enhanced security validation for preview text
  const textValidation = inputSanitizer.validateText(text, 'preview');
  if (!textValidation.isValid) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Preview text validation failed: ${textValidation.errors.join(', ')}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { errors: textValidation.errors, originalText: text.substring(0, 50) }
      });
    }
    throw new Error(`Invalid preview text: ${textValidation.errors[0]}`);
  }

  const stylesToPreview = styles || getStyleDefinitions().map(s => s.style);
  const previews = [];

  for (const styleName of stylesToPreview) {
    if (!isValidStyle(styleName)) {
      continue; // Skip invalid styles
    }

    try {
      const styled_text = transformText(textValidation.sanitizedValue, styleName as UnicodeStyle, true);
      const styleInfo = getStyleInfo(styleName as UnicodeStyle);

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

  const styleInfo = getStyleInfo(style as UnicodeStyle);

  if (!styleInfo) {
    throw new Error(`Style information not found: ${style}`);
  }

  return {
    style_info: styleInfo
  };
}

/**
 * MCP Tool: ascii_art_text
 * Generate large stylized text banners using figlet fonts with R2 storage
 */
export async function handleAsciiArt(params: AsciiArtParams, r2Bucket: R2Bucket, clientIp?: string, requestId?: string): Promise<AsciiArtResult> {
  const { text, font, preserve_spacing = true } = params;
  const startTime = Date.now();

  if (!r2Bucket) {
    throw new Error('R2 bucket is required for ASCII art generation');
  }

  // Enhanced security validation for text banner input
  const textValidation = inputSanitizer.validateText(text, 'main');
  if (!textValidation.isValid) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Text banner validation failed: ${textValidation.errors.join(', ')}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { errors: textValidation.errors, originalText: text.substring(0, 100) }
      });
    }
    throw new Error(`Invalid text input: ${textValidation.errors[0]}`);
  }

  // Additional length check for text banners (stricter limit)
  if (textValidation.sanitizedValue.length > 100) {
    throw new Error('Text too long for text banners. Maximum length is 100 characters');
  }

  const fontValidation = inputSanitizer.validateFont(font);
  if (!fontValidation.isValid) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Font validation failed: ${fontValidation.errors.join(', ')}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { errors: fontValidation.errors, originalFont: font }
      });
    }
    throw new Error(`Invalid font: ${fontValidation.errors[0]}`);
  }

  // Validate font exists in R2
  const fontExists = await isValidFont(fontValidation.sanitizedValue, r2Bucket);
  if (!fontExists) {
    throw new Error(`Font not found: ${fontValidation.sanitizedValue}`);
  }

  try {
    const text_banner = await generateAsciiArt(textValidation.sanitizedValue, fontValidation.sanitizedValue, preserve_spacing, r2Bucket);
    const lines = text_banner.split('\n');
    const processingTime = Date.now() - startTime;

    return {
      ascii_art: text_banner,
      font_applied: fontValidation.sanitizedValue as any,
      character_count: textValidation.sanitizedValue.length,
      line_count: lines.length,
      processing_time_ms: processingTime
    };
  } catch (error) {
    if (clientIp && requestId) {
      securityLogger.logSecurityEvent({
        type: 'ERROR',
        message: `Text banner generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        clientIp,
        requestId,
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    throw new Error(`Text banner generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const text_banner = await generateAsciiArt(text, fontName, true, r2Bucket);
        const fontInfo = fontDefinitions.find(f => f.font === fontName);

        previews.push({
          font: fontName as any,
          ascii_art: text_banner,
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
 * Handle MCP tool calls with R2 bucket support and security context
 */
export async function handleToolCall(toolName: string, args: any, r2Bucket?: R2Bucket, clientIp?: string, requestId?: string): Promise<any> {
  switch (toolName) {
    // Unicode styling tools
    case 'unicode_style_text':
      return await handleStyleText(args, clientIp, requestId);

    case 'list_available_styles':
      return await handleListStyles();

    case 'preview_styles':
      return await handlePreviewStyles(args, clientIp, requestId);

    case 'get_style_info':
      return await handleGetStyleInfo(args);

    // Text banner tools (require R2 bucket)
    case 'ascii_art_text':
      if (!r2Bucket) {
        throw new Error('R2 bucket is required for text banner generation');
      }
      return await handleAsciiArt(args, r2Bucket, clientIp, requestId);

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

  // Text banner tools
  {
    name: 'ascii_art_text',
    description: 'Generate large stylized text banners using figlet fonts (decorative text, not pictures)',

    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to convert to a stylized text banner',
          maxLength: 100
        },
        font: {
          type: 'string',
          description: 'The figlet font style to use for text banner (use list_figlet_fonts to see all available options)'
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
    description: 'Preview text as stylized banners in multiple figlet fonts for comparison',
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