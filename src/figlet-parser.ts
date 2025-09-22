/**
 * R2-Exclusive Figlet Font Parser
 * Cloudflare Workers compatible .flf font parser
 * No Node.js dependencies - pure Web APIs
 */

export interface FigletHeader {
  signature: string;
  hardblank: string;
  height: number;
  baseline: number;
  maxLength: number;
  oldLayout: number;
  commentLines: number;
  printDirection: number;
  fullLayout?: number;
  codetagCount?: number;
}

export interface FigletCharacter {
  code: number;
  lines: string[];
}

export interface ParsedFigletFont {
  header: FigletHeader;
  characters: Map<number, FigletCharacter>;
  comments: string[];
}

/**
 * Parse figlet font header from first line
 */
function parseHeader(headerLine: string): FigletHeader {
  // Format: flf2a$ 6 5 16 15 13 0 24463 229
  const parts = headerLine.trim().split(/\s+/);

  if (parts.length < 6 || !parts[0].startsWith('flf2')) {
    throw new Error('Invalid figlet font header');
  }

  const signature = parts[0];
  const hardblank = signature.charAt(signature.length - 1);

  const header: FigletHeader = {
    signature,
    hardblank,
    height: parseInt(parts[1], 10),
    baseline: parseInt(parts[2], 10),
    maxLength: parseInt(parts[3], 10),
    oldLayout: parseInt(parts[4], 10),
    commentLines: parseInt(parts[5], 10),
    printDirection: parts[6] ? parseInt(parts[6], 10) : 0
  };

  if (parts[7]) {
    header.fullLayout = parseInt(parts[7], 10);
  }
  if (parts[8]) {
    header.codetagCount = parseInt(parts[8], 10);
  }

  return header;
}

/**
 * Parse character definition from font data
 */
function parseCharacter(lines: string[], header: FigletHeader, charCode: number): FigletCharacter {
  const charLines: string[] = [];

  for (let i = 0; i < header.height; i++) {
    if (i >= lines.length) {
      charLines.push('');
      continue;
    }

    let line = lines[i].trimEnd(); // Remove trailing whitespace

    // Remove end marks (@ or @@)
    if (line.endsWith('@@')) {
      line = line.slice(0, -2);
    } else if (line.endsWith('@')) {
      line = line.slice(0, -1);
    }

    // Replace hardblank with space
    line = line.replace(new RegExp(escapeRegex(header.hardblank), 'g'), ' ');

    charLines.push(line);
  }

  return {
    code: charCode,
    lines: charLines
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse complete figlet font from R2 content
 */
export async function parseFigletFont(fontContent: string): Promise<ParsedFigletFont> {
  const lines = fontContent.split('\n');

  if (lines.length === 0) {
    throw new Error('Empty font file');
  }

  // Parse header
  const header = parseHeader(lines[0]);

  // Extract comments
  const comments: string[] = [];
  for (let i = 1; i <= header.commentLines; i++) {
    if (i < lines.length) {
      comments.push(lines[i]);
    }
  }

  // Parse characters
  const characters = new Map<number, FigletCharacter>();
  let lineIndex = 1 + header.commentLines;

  // Standard ASCII characters (32-126)
  for (let charCode = 32; charCode <= 126; charCode++) {
    if (lineIndex >= lines.length) break;

    const charLines = lines.slice(lineIndex, lineIndex + header.height);
    const character = parseCharacter(charLines, header, charCode);
    characters.set(charCode, character);

    lineIndex += header.height;
  }

  // Parse extended characters if present
  // This handles Unicode and special character mappings
  while (lineIndex < lines.length) {
    const codeLine = lines[lineIndex];
    if (!codeLine || codeLine.trim() === '') {
      lineIndex++;
      continue;
    }

    // Look for character code definitions
    const codeMatch = codeLine.match(/^(\d+)/);
    if (codeMatch) {
      const charCode = parseInt(codeMatch[1], 10);
      lineIndex++; // Skip the code line

      if (lineIndex + header.height <= lines.length) {
        const charLines = lines.slice(lineIndex, lineIndex + header.height);
        const character = parseCharacter(charLines, header, charCode);
        characters.set(charCode, character);
        lineIndex += header.height;
      } else {
        break;
      }
    } else {
      lineIndex++;
    }
  }

  return {
    header,
    characters,
    comments
  };
}

/**
 * Generate ASCII art from parsed font
 */
export function generateAsciiArt(
  text: string,
  font: ParsedFigletFont,
  preserveSpacing: boolean = true
): string {
  if (!text) return '';

  const lines: string[] = Array(font.header.height).fill('');

  for (const char of text) {
    const charCode = char.charCodeAt(0);
    const figletChar = font.characters.get(charCode);

    if (figletChar) {
      // Add character to each line
      for (let i = 0; i < font.header.height; i++) {
        if (figletChar.lines[i] !== undefined) {
          lines[i] += figletChar.lines[i];
        }
      }
    } else {
      // Fallback for unsupported characters - use space
      const spaceChar = font.characters.get(32); // space character
      if (spaceChar) {
        for (let i = 0; i < font.header.height; i++) {
          lines[i] += spaceChar.lines[i] || '';
        }
      }
    }
  }

  if (!preserveSpacing) {
    // Remove trailing spaces from each line
    return lines.map(line => line.trimEnd()).join('\n');
  }

  return lines.join('\n');
}

/**
 * Load and parse font from R2 bucket
 */
export async function loadFontFromR2(fontName: string, r2Bucket: R2Bucket): Promise<ParsedFigletFont> {
  const fontFile = await r2Bucket.get(`${fontName}.flf`);

  if (!fontFile) {
    throw new Error(`Font not found in R2: ${fontName}.flf`);
  }

  const fontContent = await fontFile.text();
  return parseFigletFont(fontContent);
}

/**
 * Get list of available fonts from R2 bucket
 */
export async function getAvailableFontsFromR2(r2Bucket: R2Bucket): Promise<string[]> {
  try {
    const objects = await r2Bucket.list();

    return objects.objects
      .filter(obj => obj.key.endsWith('.flf'))
      .map(obj => obj.key.replace('.flf', ''))
      .sort();
  } catch (error) {
    console.error('Failed to list fonts from R2:', error);
    return [];
  }
}