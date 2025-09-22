/**
 * Figlet ASCII Art Engine - R2 Exclusive Implementation
 * Workers-compatible figlet font parser with R2 storage
 */

import { loadFontFromR2, getAvailableFontsFromR2, generateAsciiArt as generateArt, type ParsedFigletFont } from './figlet-parser.js';
import type { FigletFont, FigletFontDefinition } from './types.js';

// Font cache for request-scoped caching
const fontCache = new Map<string, ParsedFigletFont>();

/**
 * Load and cache font from R2 bucket
 * R2-exclusive implementation with request-scoped caching
 */
export async function loadAndCacheFont(fontName: string, r2Bucket: R2Bucket): Promise<ParsedFigletFont> {
  // Check cache first
  const cacheKey = `${fontName}`;
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }

  // Load from R2
  const font = await loadFontFromR2(fontName, r2Bucket);

  // Cache for this request
  fontCache.set(cacheKey, font);

  console.log(`Successfully loaded and cached font from R2: ${fontName}`);
  return font;
}

/**
 * Generate ASCII art using R2-exclusive parser
 * Workers-compatible implementation
 */
export async function generateAsciiArt(
  text: string,
  fontName: string,
  preserveSpacing: boolean = true,
  r2Bucket: R2Bucket
): Promise<string> {
  if (!text) return text;
  if (!r2Bucket) {
    console.warn('R2 bucket required for ASCII art generation');
    return text;
  }

  try {
    // Load font from R2 with caching
    const font = await loadAndCacheFont(fontName, r2Bucket);

    // Generate ASCII art using our parser
    const result = generateArt(text, font, preserveSpacing);

    return result;
  } catch (error) {
    console.error(`Error generating ASCII art with font ${fontName}:`, error);

    // Try fallback to Standard font
    if (fontName !== 'Standard') {
      try {
        const standardFont = await loadAndCacheFont('Standard', r2Bucket);
        return generateArt(text, standardFont, preserveSpacing);
      } catch (fallbackError) {
        console.error('Fallback to Standard font also failed:', fallbackError);
      }
    }

    // Final fallback to plain text
    return text;
  }
}

/**
 * Generate font definitions dynamically from R2
 * R2-exclusive approach - no hardcoded fonts
 */
export async function getFigletFontDefinitions(r2Bucket: R2Bucket): Promise<FigletFontDefinition[]> {
  try {
    const fontNames = await getAvailableFontsFromR2(r2Bucket);

    // Create definitions for available fonts
    const definitions: FigletFontDefinition[] = fontNames.map(font => {
      // Categorize fonts based on name patterns
      let category: 'popular' | 'decorative' | '3d' | 'outline' = 'popular';

      if (font.includes('3D') || font.includes('3-D')) {
        category = '3d';
      } else if (font.includes('Bubble') || font.includes('Fancy') || font.includes('Graffiti')) {
        category = 'decorative';
      } else if (font.includes('Outline') || font.includes('Shadow')) {
        category = 'outline';
      }

      return {
        font: font as FigletFont,
        displayName: font,
        description: `${font} font loaded from R2`,
        example: `${font.slice(0, 3).toUpperCase()} (${font})`,
        category,
        bundled: false,
        suitableFor: getSuitableFor(font, category)
      };
    });

    return definitions;
  } catch (error) {
    console.error('Error generating font definitions from R2:', error);
    return [];
  }
}

/**
 * Get suitable use cases based on font name and category
 */
function getSuitableFor(fontName: string, category: string): string[] {
  switch (category) {
    case '3d':
      return ['3D effects', 'impressive headers', 'logos'];
    case 'decorative':
      return ['fun headers', 'creative content', 'playful designs'];
    case 'outline':
      return ['outlined text', 'borders', 'emphasis'];
    default:
      if (fontName.toLowerCase().includes('small')) {
        return ['compact text', 'signatures', 'small headers'];
      } else if (fontName.toLowerCase().includes('big')) {
        return ['large headers', 'banners', 'titles'];
      } else {
        return ['general use', 'headers', 'documentation'];
      }
  }
}

/**
 * Get list of available fonts from R2 bucket
 * R2-exclusive - no fallback fonts
 */
export async function getAvailableFonts(r2Bucket: R2Bucket): Promise<string[]> {
  return getAvailableFontsFromR2(r2Bucket);
}

/**
 * Validate if a font is available in R2
 * R2-exclusive validation
 */
export async function isValidFont(font: string, r2Bucket: R2Bucket): Promise<boolean> {
  try {
    const availableFonts = await getAvailableFonts(r2Bucket);
    return availableFonts.includes(font);
  } catch (error) {
    console.error('Error validating font:', error);
    return false;
  }
}

/**
 * Clear font cache (useful for testing)
 */
export function clearFontCache(): void {
  fontCache.clear();
}