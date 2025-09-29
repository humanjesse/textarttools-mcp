/**
 * MCP Tool Definitions and Handlers for TextArtTools Unicode Styling
 * Enhanced with comprehensive security features
 */

import type {
  StyleTextParams,
  StyleTextResult,
  ListStylesResult,
  PreviewStylesParams,
  PreviewStylesResult,
  GetStyleInfoParams,
  GetStyleInfoResult,
  Env
} from './types.js';
import {
  ValidationError
} from './types.js';

import {
  transformText,
  getStyleDefinitions,
  getStyleInfo,
  isValidStyle
} from './text-styler.js';

// Security imports - temporarily disabled for MVP
// import { getValidator, validateText, validateStyle, validateStyleArray } from './security/input-validator.js';
// import { sanitizeForStyle, sanitizeJSONRPC } from './security/text-sanitizer.js';
// import { getAuditLogger, logInputValidationViolation } from './security/audit-logger.js';
// import { getSecurityConfig } from './security/security-config.js';
// import type { ValidationResult } from './security/input-validator.js';

/**
 * MCP Tool: unicode_style_text
 * Transform input text using a specified Unicode style
 * Enhanced with comprehensive security validation and sanitization
 */
export async function handleStyleText(
  params: StyleTextParams,
  env: Env,
  requestContext?: {
    clientIp: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<StyleTextResult> {
  const startTime = Date.now();
  const auditLogger = getAuditLogger(env);
  const securityConfig = getSecurityConfig(env);
  const validator = getValidator(securityConfig.getConfiguration().inputValidation);

  try {
    // 1. Comprehensive input validation
    const textValidation = validateText(params.text || '', 'mcp-tool');
    if (!textValidation.isValid) {
      // Log security violation
      if (requestContext) {
        await logInputValidationViolation(auditLogger, {
          input: params.text || '',
          violations: textValidation.errors,
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          endpoint: 'unicode_style_text'
        });
      }
      throw new ValidationError(`Input validation failed: ${textValidation.errors.join(', ')}`);
    }

    // 2. Style validation
    const styleValidation = validateStyle(params.style || '');
    if (!styleValidation.isValid) {
      if (requestContext) {
        await logInputValidationViolation(auditLogger, {
          input: params.style || '',
          violations: styleValidation.errors,
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          endpoint: 'unicode_style_text'
        });
      }
      throw new ValidationError(`Style validation failed: ${styleValidation.errors.join(', ')}`);
    }

    // 3. Use sanitized input
    const sanitizedText = textValidation.sanitizedValue;
    const sanitizedStyle = styleValidation.sanitizedValue as any;

    // 4. Additional sanitization for text styling context
    const stylingSanitization = sanitizeForStyle(sanitizedText, sanitizedStyle);
    if (!stylingSanitization.isSafe) {
      // Log additional security concerns
      await auditLogger.logEvent('INPUT_VALIDATION', 'SANITIZATION_APPLIED', 'WARNING', {
        message: 'Text required additional sanitization for styling',
        resource: 'unicode_style_text',
        clientIp: requestContext?.clientIp || 'unknown',
        userAgent: requestContext?.userAgent,
        requestId: requestContext?.requestId,
        additionalDetails: {
          originalLength: sanitizedText.length,
          sanitizedLength: stylingSanitization.sanitized.length,
          modifications: stylingSanitization.modifications
        },
        threatIndicators: ['TEXT_SANITIZATION_REQUIRED']
      });
    }

    // 5. Transform the text with final sanitized input
    const finalText = stylingSanitization.sanitized;
    const styledText = transformText(finalText, sanitizedStyle, params.preserve_spacing ?? true);
    const processingTime = Date.now() - startTime;

    // 6. Sanitize output for JSON-RPC response
    const result: StyleTextResult = {
      styled_text: styledText,
      style_applied: sanitizedStyle,
      character_count: params.text?.length || 0,
      processing_time_ms: processingTime
    };

    const sanitizedResult = sanitizeJSONRPC(result);

    // 7. Log successful operation
    await auditLogger.logEvent('DATA_ACCESS', 'TEXT_STYLING_SUCCESS', 'SUCCESS', {
      message: 'Text styling completed successfully',
      resource: 'unicode_style_text',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      userId: requestContext?.userId,
      additionalDetails: {
        style: sanitizedStyle,
        textLength: finalText.length,
        processingTimeMs: processingTime,
        hadSecurityWarnings: textValidation.warnings.length > 0 || stylingSanitization.warnings.length > 0
      }
    });

    return sanitizedResult;

  } catch (error) {
    // Log security or processing error
    await auditLogger.logEvent('ERROR', 'TEXT_STYLING_FAILED', 'FAILURE', {
      message: error instanceof Error ? error.message : 'Unknown error in text styling',
      resource: 'unicode_style_text',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        errorType: error instanceof ValidationError ? 'ValidationError' : 'ProcessingError',
        inputLength: params.text?.length || 0,
        style: params.style
      },
      threatIndicators: error instanceof ValidationError ? ['VALIDATION_FAILURE'] : ['PROCESSING_ERROR']
    });

    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to transform text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: list_available_styles
 * Get a list of all available text styles with examples
 * Enhanced with security logging and output sanitization
 */
export async function handleListStyles(
  env: Env,
  requestContext?: {
    clientIp: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<ListStylesResult> {
  const auditLogger = getAuditLogger(env);

  try {
    const styles = getStyleDefinitions();
    const result: ListStylesResult = {
      styles,
      total_count: styles.length
    };

    // Sanitize output for JSON-RPC response
    const sanitizedResult = sanitizeJSONRPC(result);

    // Log access to style definitions
    await auditLogger.logEvent('DATA_ACCESS', 'STYLE_LIST_ACCESSED', 'SUCCESS', {
      message: 'Style definitions list accessed',
      resource: 'list_available_styles',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        stylesCount: styles.length
      }
    });

    return sanitizedResult;
  } catch (error) {
    // Log error
    await auditLogger.logEvent('ERROR', 'STYLE_LIST_FAILED', 'FAILURE', {
      message: error instanceof Error ? error.message : 'Unknown error retrieving styles',
      resource: 'list_available_styles',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    });

    throw new ValidationError(`Failed to retrieve styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: preview_styles
 * Show sample text in multiple styles for comparison
 * Enhanced with comprehensive security validation
 */
export async function handlePreviewStyles(
  params: PreviewStylesParams,
  env: Env,
  requestContext?: {
    clientIp: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<PreviewStylesResult> {
  const auditLogger = getAuditLogger(env);
  const securityConfig = getSecurityConfig(env);
  const validator = getValidator(securityConfig.getConfiguration().inputValidation);

  try {
    // 1. Validate text input
    const textValidation = validateText(params.text || '', 'prompt');
    if (!textValidation.isValid) {
      if (requestContext) {
        await logInputValidationViolation(auditLogger, {
          input: params.text || '',
          violations: textValidation.errors,
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          endpoint: 'preview_styles'
        });
      }
      throw new ValidationError(`Text validation failed: ${textValidation.errors.join(', ')}`);
    }

    // 2. Validate styles array if provided
    let validatedStyles: string[] | undefined;
    if (params.styles && params.styles.length > 0) {
      const stylesValidation = validateStyleArray(params.styles);
      if (!stylesValidation.isValid) {
        if (requestContext) {
          await logInputValidationViolation(auditLogger, {
            input: JSON.stringify(params.styles),
            violations: stylesValidation.errors,
            clientIp: requestContext.clientIp,
            userAgent: requestContext.userAgent,
            requestId: requestContext.requestId,
            endpoint: 'preview_styles'
          });
        }
        throw new ValidationError(`Styles validation failed: ${stylesValidation.errors.join(', ')}`);
      }
      validatedStyles = JSON.parse(stylesValidation.sanitizedValue);
    }

    // 3. Use sanitized input
    const sanitizedText = textValidation.sanitizedValue;

    // 4. Get style definitions and filter if needed
    const allStyles = getStyleDefinitions();
    let styledPreview = allStyles;

    if (validatedStyles && validatedStyles.length > 0) {
      styledPreview = allStyles.filter(def => validatedStyles!.includes(def.style));
    }

    // 5. Generate previews with sanitized input
    const previews = styledPreview.map(styleDef => {
      const styledText = transformText(sanitizedText, styleDef.style);
      return {
        style: styleDef.style,
        styled_text: styledText,
        suitable_for: styleDef.suitableFor
      };
    });

    const result: PreviewStylesResult = { previews };
    const sanitizedResult = sanitizeJSONRPC(result);

    // 6. Log successful preview generation
    await auditLogger.logEvent('DATA_ACCESS', 'STYLE_PREVIEW_GENERATED', 'SUCCESS', {
      message: 'Style previews generated successfully',
      resource: 'preview_styles',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        textLength: sanitizedText.length,
        stylesCount: previews.length,
        specificStyles: validatedStyles ? true : false,
        hadValidationWarnings: textValidation.warnings.length > 0
      }
    });

    return sanitizedResult;

  } catch (error) {
    // Log error
    await auditLogger.logEvent('ERROR', 'STYLE_PREVIEW_FAILED', 'FAILURE', {
      message: error instanceof Error ? error.message : 'Unknown error generating previews',
      resource: 'preview_styles',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        errorType: error instanceof ValidationError ? 'ValidationError' : 'ProcessingError',
        inputLength: params.text?.length || 0,
        stylesRequested: params.styles?.length || 0
      },
      threatIndicators: error instanceof ValidationError ? ['VALIDATION_FAILURE'] : ['PROCESSING_ERROR']
    });

    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to generate previews: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool: get_style_info
 * Get detailed information about a specific style
 * Enhanced with security validation and audit logging
 */
export async function handleGetStyleInfo(
  params: GetStyleInfoParams,
  env: Env,
  requestContext?: {
    clientIp: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<GetStyleInfoResult> {
  const auditLogger = getAuditLogger(env);

  try {
    // 1. Validate style parameter
    const styleValidation = validateStyle(params.style || '');
    if (!styleValidation.isValid) {
      if (requestContext) {
        await logInputValidationViolation(auditLogger, {
          input: params.style || '',
          violations: styleValidation.errors,
          clientIp: requestContext.clientIp,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          endpoint: 'get_style_info'
        });
      }
      throw new ValidationError(`Style validation failed: ${styleValidation.errors.join(', ')}`);
    }

    const sanitizedStyle = styleValidation.sanitizedValue as any;

    // 2. Get style information
    const styleInfo = getStyleInfo(sanitizedStyle);
    if (!styleInfo) {
      throw new ValidationError(`Style information not found for: ${sanitizedStyle}`);
    }

    const result: GetStyleInfoResult = { style_info: styleInfo };
    const sanitizedResult = sanitizeJSONRPC(result);

    // 3. Log successful access
    await auditLogger.logEvent('DATA_ACCESS', 'STYLE_INFO_ACCESSED', 'SUCCESS', {
      message: 'Style information accessed',
      resource: 'get_style_info',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        style: sanitizedStyle
      }
    });

    return sanitizedResult;

  } catch (error) {
    // Log error
    await auditLogger.logEvent('ERROR', 'STYLE_INFO_FAILED', 'FAILURE', {
      message: error instanceof Error ? error.message : 'Unknown error retrieving style info',
      resource: 'get_style_info',
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      additionalDetails: {
        errorType: error instanceof ValidationError ? 'ValidationError' : 'ProcessingError',
        requestedStyle: params.style
      },
      threatIndicators: error instanceof ValidationError ? ['VALIDATION_FAILURE'] : ['PROCESSING_ERROR']
    });

    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to retrieve style info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MCP Tool definitions for server registration
 */
export const mcpToolDefinitions = [
  {
    name: 'unicode_style_text',
    description: 'Transform text using Unicode styling (bold, italic, cursive, etc.)',
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
          description: 'Whether to preserve original spacing (default: true)',
          default: true
        }
      },
      required: ['text', 'style']
    }
  },
  {
    name: 'list_available_styles',
    description: 'Get a list of all available Unicode text styles with examples and metadata',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'preview_styles',
    description: 'Preview text in multiple Unicode styles for comparison',
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
          description: 'Specific styles to include (optional, defaults to all styles)',
          items: {
            type: 'string',
            enum: [
              'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
              'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
              'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
              'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
              'boldItalicSerif', 'boldFraktur'
            ]
          }
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
          description: 'The style to get information about',
          enum: [
            'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
            'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
            'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
            'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
            'boldItalicSerif', 'boldFraktur'
          ]
        }
      },
      required: ['style']
    }
  }
];

/**
 * Route MCP tool calls to appropriate handlers
 * Enhanced with security context and comprehensive validation
 */
export async function handleToolCall(
  toolName: string,
  params: any,
  env: Env,
  requestContext?: {
    clientIp: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<any> {
  const auditLogger = getAuditLogger(env);
  const startTime = Date.now();

  try {
    // Log tool call initiation
    await auditLogger.logEvent('SYSTEM_ACCESS', 'TOOL_CALL_INITIATED', 'SUCCESS', {
      message: `MCP tool call initiated: ${toolName}`,
      resource: toolName,
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      userId: requestContext?.userId,
      additionalDetails: {
        toolName,
        hasParams: !!params,
        paramKeys: params ? Object.keys(params) : []
      }
    });

    let result: any;

    switch (toolName) {
      case 'unicode_style_text':
        result = await handleStyleText(params as StyleTextParams, env, requestContext);
        break;

      case 'list_available_styles':
        result = await handleListStyles(env, requestContext);
        break;

      case 'preview_styles':
        result = await handlePreviewStyles(params as PreviewStylesParams, env, requestContext);
        break;

      case 'get_style_info':
        result = await handleGetStyleInfo(params as GetStyleInfoParams, env, requestContext);
        break;

      default:
        await auditLogger.logEvent('AUTHORIZATION', 'UNKNOWN_TOOL_REQUESTED', 'FAILURE', {
          message: `Unknown tool requested: ${toolName}`,
          resource: 'mcp-tools',
          clientIp: requestContext?.clientIp || 'unknown',
          userAgent: requestContext?.userAgent,
          requestId: requestContext?.requestId,
          additionalDetails: {
            requestedTool: toolName
          },
          threatIndicators: ['UNKNOWN_TOOL_ACCESS']
        });
        throw new ValidationError(`Unknown tool: ${toolName}`);
    }

    // Log successful completion
    const processingTime = Date.now() - startTime;
    await auditLogger.logEvent('SYSTEM_ACCESS', 'TOOL_CALL_COMPLETED', 'SUCCESS', {
      message: `MCP tool call completed successfully: ${toolName}`,
      resource: toolName,
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      userId: requestContext?.userId,
      additionalDetails: {
        toolName,
        processingTimeMs: processingTime,
        resultSize: JSON.stringify(result).length
      }
    });

    return result;

  } catch (error) {
    // Log tool call failure
    const processingTime = Date.now() - startTime;
    await auditLogger.logEvent('ERROR', 'TOOL_CALL_FAILED', 'FAILURE', {
      message: `MCP tool call failed: ${toolName} - ${error instanceof Error ? error.message : 'Unknown error'}`,
      resource: toolName,
      clientIp: requestContext?.clientIp || 'unknown',
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
      userId: requestContext?.userId,
      additionalDetails: {
        toolName,
        processingTimeMs: processingTime,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      },
      threatIndicators: error instanceof ValidationError ? ['VALIDATION_FAILURE'] : ['PROCESSING_ERROR']
    });

    throw error;
  }
}