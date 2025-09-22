/**
 * MCP Resources - Data structures for Resources and Prompts APIs
 * Provides comprehensive metadata about Unicode text styling capabilities
 */

// Import not needed for current implementation

/**
 * Style Definitions Resource
 * Complete metadata for all 23 Unicode text styles
 */
export function getStyleDefinitions() {
  return {
    version: '1.0.0',
    totalStyles: 23,
    styles: [
      {
        name: 'normal',
        displayName: 'Normal',
        description: 'Plain text without any styling',
        example: 'Hello World',
        unicodeRange: 'Basic Latin (U+0020-U+007F)',
        category: 'basic',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: true,
          emojis: true,
          accents: true
        }
      },
      {
        name: 'bold',
        displayName: 'Mathematical Bold',
        description: 'Bold text using Mathematical Alphanumeric Symbols',
        example: '𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱',
        unicodeRange: 'Mathematical Bold (U+1D400-U+1D433)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'italic',
        displayName: 'Mathematical Italic',
        description: 'Italic text using Mathematical Alphanumeric Symbols',
        example: '𝘏𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥',
        unicodeRange: 'Mathematical Italic (U+1D434-U+1D467)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'boldItalic',
        displayName: 'Mathematical Bold Italic',
        description: 'Bold italic text using Mathematical Alphanumeric Symbols',
        example: '𝙃𝙚𝙡𝙡𝙤 𝙒𝙤𝙧𝙡𝙙',
        unicodeRange: 'Mathematical Bold Italic (U+1D468-U+1D49B)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'underline',
        displayName: 'Underlined',
        description: 'Text with combining underline characters',
        example: 'H̲e̲l̲l̲o̲ ̲W̲o̲r̲l̲d̲',
        unicodeRange: 'Combining Low Line (U+0332)',
        category: 'combining',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: true,
          emojis: true,
          accents: true
        }
      },
      {
        name: 'strikethrough',
        displayName: 'Strikethrough',
        description: 'Text with combining strikethrough characters',
        example: 'H̶e̶l̶l̶o̶ ̶W̶o̶r̶l̶d̶',
        unicodeRange: 'Combining Long Stroke Overlay (U+0336)',
        category: 'combining',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: true,
          emojis: true,
          accents: true
        }
      },
      {
        name: 'subscript',
        displayName: 'Subscript',
        description: 'Subscript characters for mathematical notation',
        example: 'ₕₑₗₗₒ wₒᵣₗd',
        unicodeRange: 'Latin Subscripts (U+2080-U+209C)',
        category: 'mathematical',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'superscript',
        displayName: 'Superscript',
        description: 'Superscript characters for mathematical notation',
        example: 'ᴴᵉˡˡᵒ ᵂᵒʳˡᵈ',
        unicodeRange: 'Latin Superscripts (U+2070-U+207F, U+1D2C-U+1D6A)',
        category: 'mathematical',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'circled',
        displayName: 'Circled',
        description: 'Text in circled characters',
        example: 'Ⓗⓔⓛⓛⓞ Ⓦⓞⓡⓛⓓ',
        unicodeRange: 'Enclosed Alphanumerics (U+24B6-U+24E9)',
        category: 'enclosed',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'fraktur',
        displayName: 'Mathematical Fraktur',
        description: 'Gothic/Fraktur style text',
        example: 'ℌ𝔢𝔩𝔩𝔬 𝔚𝔬𝔯𝔩𝔡',
        unicodeRange: 'Mathematical Fraktur (U+1D504-U+1D537)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'doubleStruck',
        displayName: 'Mathematical Double-Struck',
        description: 'Double-struck/blackboard bold style',
        example: 'ℍ𝕖𝕝𝕝𝕠 𝔸𝕠𝕣𝕝𝕕',
        unicodeRange: 'Mathematical Double-Struck (U+1D538-U+1D56B)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'monospace',
        displayName: 'Mathematical Monospace',
        description: 'Monospace/typewriter style text',
        example: '𝙷𝚎𝚕𝚕𝚘 𝚆𝚘𝚛𝚕𝚍',
        unicodeRange: 'Mathematical Monospace (U+1D670-U+1D6A3)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'cursive',
        displayName: 'Mathematical Script',
        description: 'Cursive/script style text',
        example: 'ℋℯ𝓁𝓁ℴ 𝒲ℴ𝓇𝓁𝒹',
        unicodeRange: 'Mathematical Script (U+1D49C-U+1D4CF)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'squared',
        displayName: 'Squared',
        description: 'Text in squared characters',
        example: '🅷🅴🅻🅻🅾 🆆🅾🆁🅻🅳',
        unicodeRange: 'Enclosed Alphanumeric Supplement (U+1F130-U+1F189)',
        category: 'enclosed',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'flipped',
        displayName: 'Upside Down',
        description: 'Upside-down/flipped text',
        example: 'ɥǝllO ploɹM',
        unicodeRange: 'Various Unicode blocks',
        category: 'special',
        complexity: 'complex',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: true,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'zalgo',
        displayName: 'Zalgo',
        description: 'Text with combining diacritical marks',
        example: 'H̸̡̪̯ͨ͊̽̅̾̎Ẹ̢̣̺̰͓̳̙̓̍̿̍͐̉́ͫL̝̝̮̝̮̀̚Ĺ̅ͧ̉̿̆̌O̵̯̖̲͙̺̠̳̥ͣ',
        unicodeRange: 'Combining Diacritical Marks (U+0300-U+036F)',
        category: 'combining',
        complexity: 'complex',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: true,
          emojis: true,
          accents: true
        }
      },
      {
        name: 'blue',
        displayName: 'Regional Indicator',
        description: 'Text using regional indicator symbols',
        example: '🇭🇪🇱🇱🇴 🇼🇴🇷🇱🇩',
        unicodeRange: 'Regional Indicator Symbols (U+1F1E6-U+1F1FF)',
        category: 'regional',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'parenthesized',
        displayName: 'Parenthesized',
        description: 'Text in parenthesized characters',
        example: '⒣⒠⒧⒧⒪ ⒲⒪⒭⒧⒟',
        unicodeRange: 'Enclosed Alphanumerics (U+2474-U+249B)',
        category: 'enclosed',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'negativeCircled',
        displayName: 'Negative Circled',
        description: 'Text in negative circled characters',
        example: '🅗🅔🅛🅛🅞 🅦🅞🅡🅛🅓',
        unicodeRange: 'Enclosed Alphanumeric Supplement (U+1F170-U+1F189)',
        category: 'enclosed',
        complexity: 'medium',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'boldSerif',
        displayName: 'Mathematical Bold Serif',
        description: 'Bold serif text using Mathematical Alphanumeric Symbols',
        example: '𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝',
        unicodeRange: 'Mathematical Bold (U+1D400-U+1D433)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'italicSerif',
        displayName: 'Mathematical Italic Serif',
        description: 'Italic serif text using Mathematical Alphanumeric Symbols',
        example: '𝐻𝑒𝓁𝓁𝑜 𝑊𝑜𝓇𝓁𝒹',
        unicodeRange: 'Mathematical Italic (U+1D434-U+1D467)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'boldItalicSerif',
        displayName: 'Mathematical Bold Italic Serif',
        description: 'Bold italic serif text using Mathematical Alphanumeric Symbols',
        example: '𝑯𝒆𝒍𝒍𝒐 𝑾𝒐𝒓𝒍𝒅',
        unicodeRange: 'Mathematical Bold Italic (U+1D468-U+1D49B)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: true,
          symbols: false,
          emojis: false,
          accents: false
        }
      },
      {
        name: 'boldFraktur',
        displayName: 'Mathematical Bold Fraktur',
        description: 'Bold Fraktur/Gothic style text',
        example: '𝕳𝖊𝖑𝖑𝖔 𝖂𝖔𝖗𝖑𝖉',
        unicodeRange: 'Mathematical Bold Fraktur (U+1D56C-U+1D59F)',
        category: 'mathematical',
        complexity: 'simple',
        characterSupport: {
          letters: true,
          numbers: false,
          symbols: false,
          emojis: false,
          accents: false
        }
      }
    ]
  };
}

/**
 * Character Mappings Resource
 * Unicode transformation tables for each style
 */
export function getCharacterMappings() {
  return {
    version: '1.0.0',
    description: 'Character mapping tables for Unicode text transformations',
    mappings: {
      bold: {
        uppercase: {
          A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚',
          H: '𝗛', I: '𝗜', J: '𝗝', K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡',
          O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧', U: '𝗨',
          V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭'
        },
        lowercase: {
          a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴',
          h: '𝗵', i: '𝗶', j: '𝗷', k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻',
          o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁', u: '𝘂',
          v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇'
        },
        digits: {
          '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰',
          '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
        }
      },
      italic: {
        uppercase: {
          A: '𝘈', B: '𝘉', C: '𝘊', D: '𝘋', E: '𝘌', F: '𝘍', G: '𝘎',
          H: '𝘏', I: '𝘐', J: '𝘑', K: '𝘒', L: '𝘓', M: '𝘔', N: '𝘕',
          O: '𝘖', P: '𝘗', Q: '𝘘', R: '𝘙', S: '𝘚', T: '𝘛', U: '𝘜',
          V: '𝘝', W: '𝘞', X: '𝘟', Y: '𝘠', Z: '𝘡'
        },
        lowercase: {
          a: '𝘢', b: '𝘣', c: '𝘤', d: '𝘥', e: '𝘦', f: '𝘧', g: '𝘨',
          h: '𝘩', i: '𝘪', j: '𝘫', k: '𝘬', l: '𝘭', m: '𝘮', n: '𝘯',
          o: '𝘰', p: '𝘱', q: '𝘲', r: '𝘳', s: '𝘴', t: '𝘵', u: '𝘶',
          v: '𝘷', w: '𝘸', x: '𝘹', y: '𝘺', z: '𝘻'
        }
      },
      flipped: {
        uppercase: {
          A: '∀', B: 'ᗺ', C: 'Ɔ', D: 'ᗡ', E: 'Ǝ', F: 'Ⅎ', G: 'פ',
          H: 'H', I: 'I', J: 'ſ', K: 'ʞ', L: '˥', M: 'W', N: 'N',
          O: 'O', P: 'Ԁ', Q: 'Q', R: 'ᴿ', S: 'S', T: '┴', U: '∩',
          V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z'
        },
        lowercase: {
          a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ',
          h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u',
          o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n',
          v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z'
        }
      }
    },
    usage: {
      combining: {
        underline: 'Append U+0332 (Combining Low Line) to each character',
        strikethrough: 'Append U+0336 (Combining Long Stroke Overlay) to each character',
        zalgo: 'Add random combining diacritical marks (U+0300-U+036F) to characters'
      },
      mathematical: {
        note: 'Mathematical Alphanumeric Symbols provide complete alphabets in various styles',
        ranges: {
          bold: 'U+1D400-U+1D433',
          italic: 'U+1D434-U+1D467',
          boldItalic: 'U+1D468-U+1D49B',
          script: 'U+1D49C-U+1D4CF',
          boldScript: 'U+1D4D0-U+1D503',
          fraktur: 'U+1D504-U+1D537',
          doubleStruck: 'U+1D538-U+1D56B',
          boldFraktur: 'U+1D56C-U+1D59F',
          sansSerif: 'U+1D5A0-U+1D5D3',
          sansSerifBold: 'U+1D5D4-U+1D607',
          sansSerifItalic: 'U+1D608-U+1D63B',
          sansSerifBoldItalic: 'U+1D63C-U+1D66F',
          monospace: 'U+1D670-U+1D6A3'
        }
      }
    }
  };
}

/**
 * Usage Examples Resource
 * Sample text transformations and use cases
 */
export function getUsageExamples() {
  return {
    version: '1.0.0',
    description: 'Sample text transformations and practical use cases',
    categories: {
      social_media: {
        title: 'Social Media',
        description: 'Stand out in posts, comments, and profiles',
        examples: [
          {
            input: 'Follow me for more tips!',
            style: 'bold',
            output: '𝗙𝗼𝗹𝗹𝗼𝘄 𝗺𝗲 𝗳𝗼𝗿 𝗺𝗼𝗿𝗲 𝘁𝗶𝗽𝘀!',
            platforms: ['Twitter', 'Instagram', 'Facebook', 'LinkedIn']
          },
          {
            input: 'New video out now!',
            style: 'cursive',
            output: '𝒩ℯ𝓌 𝓋𝒾𝒹ℯℴ ℴ𝓊𝓉 𝓃ℴ𝓌!',
            platforms: ['YouTube', 'TikTok', 'Instagram']
          },
          {
            input: 'LIMITED TIME OFFER',
            style: 'squared',
            output: '🅻🅸🅼🅸🆃🅴🅳 🆃🅸🅼🅴 🅾🅵🅵🅴🆁',
            platforms: ['Instagram', 'Facebook', 'Twitter']
          }
        ]
      },
      gaming: {
        title: 'Gaming',
        description: 'Stand out in usernames, chat, and profiles',
        examples: [
          {
            input: 'Player One',
            style: 'fraktur',
            output: '𝔓𝔩𝔞𝔶𝔢𝔯 𝔒𝔫𝔢',
            platforms: ['Discord', 'Steam', 'Xbox Live', 'PlayStation']
          },
          {
            input: 'VICTORY',
            style: 'doubleStruck',
            output: '𝕍𝕀ℂ𝕋𝕆ℝ𝕐',
            platforms: ['Discord', 'Twitch', 'Gaming Forums']
          },
          {
            input: 'GG Well Played',
            style: 'monospace',
            output: '𝙶𝙶 𝚆𝚎𝚕𝚕 𝙿𝚕𝚊𝚢𝚎𝚍',
            platforms: ['Discord', 'In-game chat', 'Forums']
          }
        ]
      },
      professional: {
        title: 'Professional',
        description: 'Subtle styling for business communications',
        examples: [
          {
            input: 'Important Notice',
            style: 'bold',
            output: '𝗜𝗺𝗽𝗼𝗿𝘁𝗮𝗻𝘁 𝗡𝗼𝘁𝗶𝗰𝗲',
            platforms: ['Email', 'Slack', 'Teams', 'LinkedIn']
          },
          {
            input: 'Meeting Agenda',
            style: 'italic',
            output: '𝘔𝘦𝘦𝘵𝘪𝘯𝘨 𝘈𝘨𝘦𝘯𝘥𝘢',
            platforms: ['Documents', 'Email', 'Presentations']
          }
        ]
      },
      creative: {
        title: 'Creative & Artistic',
        description: 'Expressive styling for artistic projects',
        examples: [
          {
            input: 'Art Exhibition',
            style: 'cursive',
            output: '𝒜𝓇𝓉 ℰ𝓍𝒽𝒾𝒷𝒾𝓉𝒾ℴ𝓃',
            platforms: ['Instagram', 'Portfolio sites', 'Art platforms']
          },
          {
            input: 'Poetry Corner',
            style: 'fraktur',
            output: '𝔓𝔬𝔢𝔱𝔯𝔶 ℭ𝔬𝔯𝔫𝔢𝔯',
            platforms: ['Blogs', 'Literary sites', 'Social media']
          },
          {
            input: 'CHAOS THEORY',
            style: 'zalgo',
            output: 'C̵̱̏H̴̰̾A̷͎̅O̶̰͐S̵̰̈́ ̴̱̾T̶̰̂H̵̱̋Ḛ̴̅O̷̰͌Ṟ̶̈́Y̵̰̾',
            platforms: ['Art projects', 'Creative writing', 'Horror themes']
          }
        ]
      },
      educational: {
        title: 'Educational',
        description: 'Mathematical and academic styling',
        examples: [
          {
            input: 'Mathematics',
            style: 'doubleStruck',
            output: '𝕄𝕒𝕥𝕙𝔢𝕞𝕒𝕥𝕚𝕔𝕤',
            platforms: ['Academic papers', 'Math forums', 'Educational content']
          },
          {
            input: 'Theorem 1',
            style: 'boldSerif',
            output: '𝐓𝐡𝐞𝐨𝐫𝐞𝐦 𝟏',
            platforms: ['Academic documents', 'Research papers']
          },
          {
            input: 'code example',
            style: 'monospace',
            output: '𝚌𝚘𝚍𝚎 𝚎𝚡𝚊𝚖𝚙𝚕𝚎',
            platforms: ['Code documentation', 'Technical blogs']
          }
        ]
      }
    },
    best_practices: {
      readability: [
        'Use bold or italic for emphasis without sacrificing readability',
        'Avoid zalgo or flipped text for important information',
        'Consider your audience and platform when choosing styles'
      ],
      accessibility: [
        'Mathematical styles may not be readable by screen readers',
        'Combining marks (underline, strikethrough) are more accessible',
        'Provide alt text or plain text alternatives when necessary'
      ],
      platform_compatibility: [
        'Test styled text on your target platform before publishing',
        'Some platforms may not display all Unicode characters correctly',
        'Mobile apps may have different font support than desktop'
      ]
    }
  };
}

/**
 * Platform Compatibility Resource
 * Style support across different platforms and apps
 */
export function getPlatformCompatibility() {
  return {
    version: '1.0.0',
    description: 'Style compatibility across major platforms and applications',
    platforms: {
      social_media: {
        twitter: {
          name: 'Twitter/X',
          support: {
            mathematical: 'excellent',
            combining: 'good',
            enclosed: 'excellent',
            regional: 'limited',
            special: 'poor'
          },
          recommended_styles: ['bold', 'italic', 'cursive', 'monospace', 'fraktur'],
          notes: 'Mathematical styles work well, zalgo may be filtered as spam'
        },
        instagram: {
          name: 'Instagram',
          support: {
            mathematical: 'excellent',
            combining: 'good',
            enclosed: 'excellent',
            regional: 'good',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'cursive', 'circled', 'squared'],
          notes: 'Great support for decorative styles, popular for bios and captions'
        },
        facebook: {
          name: 'Facebook',
          support: {
            mathematical: 'good',
            combining: 'fair',
            enclosed: 'good',
            regional: 'limited',
            special: 'poor'
          },
          recommended_styles: ['bold', 'italic', 'cursive'],
          notes: 'Basic mathematical styles work well, complex combining may not display'
        },
        discord: {
          name: 'Discord',
          support: {
            mathematical: 'excellent',
            combining: 'excellent',
            enclosed: 'excellent',
            regional: 'good',
            special: 'excellent'
          },
          recommended_styles: ['bold', 'italic', 'monospace', 'fraktur', 'zalgo'],
          notes: 'Excellent Unicode support, popular for gaming usernames and memes'
        },
        linkedin: {
          name: 'LinkedIn',
          support: {
            mathematical: 'good',
            combining: 'fair',
            enclosed: 'fair',
            regional: 'limited',
            special: 'poor'
          },
          recommended_styles: ['bold', 'italic'],
          notes: 'Conservative styling recommended for professional context'
        }
      },
      messaging: {
        whatsapp: {
          name: 'WhatsApp',
          support: {
            mathematical: 'good',
            combining: 'good',
            enclosed: 'good',
            regional: 'fair',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'strikethrough', 'monospace'],
          notes: 'Good Unicode support across devices'
        },
        telegram: {
          name: 'Telegram',
          support: {
            mathematical: 'excellent',
            combining: 'excellent',
            enclosed: 'excellent',
            regional: 'good',
            special: 'excellent'
          },
          recommended_styles: ['bold', 'italic', 'monospace', 'cursive', 'fraktur'],
          notes: 'Excellent Unicode support, popular for stylized text'
        },
        imessage: {
          name: 'iMessage',
          support: {
            mathematical: 'excellent',
            combining: 'good',
            enclosed: 'excellent',
            regional: 'excellent',
            special: 'good'
          },
          recommended_styles: ['bold', 'italic', 'cursive', 'circled'],
          notes: 'Great support on iOS devices, may vary on other platforms'
        }
      },
      gaming: {
        steam: {
          name: 'Steam',
          support: {
            mathematical: 'good',
            combining: 'fair',
            enclosed: 'good',
            regional: 'limited',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'fraktur'],
          notes: 'Basic Unicode support, depends on system fonts'
        },
        minecraft: {
          name: 'Minecraft',
          support: {
            mathematical: 'poor',
            combining: 'poor',
            enclosed: 'poor',
            regional: 'poor',
            special: 'poor'
          },
          recommended_styles: ['normal'],
          notes: 'Limited Unicode support, use formatting codes instead'
        }
      },
      productivity: {
        slack: {
          name: 'Slack',
          support: {
            mathematical: 'good',
            combining: 'good',
            enclosed: 'good',
            regional: 'fair',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'monospace', 'strikethrough'],
          notes: 'Good support, monospace popular for code snippets'
        },
        notion: {
          name: 'Notion',
          support: {
            mathematical: 'excellent',
            combining: 'good',
            enclosed: 'good',
            regional: 'fair',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'cursive', 'monospace'],
          notes: 'Great Unicode support for rich text content'
        },
        google_docs: {
          name: 'Google Docs',
          support: {
            mathematical: 'excellent',
            combining: 'good',
            enclosed: 'good',
            regional: 'fair',
            special: 'fair'
          },
          recommended_styles: ['bold', 'italic', 'cursive', 'doubleStruck'],
          notes: 'Excellent support, but native formatting usually preferred'
        }
      }
    },
    device_compatibility: {
      ios: {
        support: 'excellent',
        notes: 'iOS has excellent Unicode support across most apps'
      },
      android: {
        support: 'good',
        notes: 'Support varies by device manufacturer and Android version'
      },
      windows: {
        support: 'good',
        notes: 'Depends on installed fonts and application support'
      },
      macos: {
        support: 'excellent',
        notes: 'Excellent Unicode support with comprehensive font library'
      },
      linux: {
        support: 'good',
        notes: 'Support depends on installed fonts and desktop environment'
      }
    },
    recommendations: {
      universal: ['bold', 'italic', 'monospace'],
      social_media: ['bold', 'italic', 'cursive', 'circled', 'squared'],
      professional: ['bold', 'italic', 'underline'],
      gaming: ['bold', 'fraktur', 'doubleStruck', 'monospace'],
      creative: ['cursive', 'fraktur', 'zalgo', 'flipped'],
      technical: ['monospace', 'doubleStruck', 'subscript', 'superscript']
    }
  };
}

/**
 * Generate Unicode Style Workflow Prompt
 */
export function generateUnicodeStyleWorkflowPrompt(args: any): string {
  const { text, context } = args;

  return `To style "${text}" with Unicode:

1. Call list_available_styles to see all 23 options
2. Call preview_styles with your text to compare styles
3. Call unicode_style_text with chosen style to transform

${context ? `Context: ${context}` : ''}

Tools to use: list_available_styles → preview_styles → unicode_style_text`;
}

/**
 * Generate Unicode Bulk Styling Prompt
 */
export function generateUnicodeBulkStylingPrompt(args: any): string {
  const { texts, style } = args;
  const textArray = Array.isArray(texts) ? texts : [texts];

  return `To apply "${style}" to ${textArray.length} texts:

Call unicode_style_text once for each text:
${textArray.map((text, i) => `${i + 1}. unicode_style_text(text: "${text}", style: "${style}")`).join('\n')}

Tool to use: unicode_style_text (repeat for each text)`;
}

/**
 * Generate Unicode Compatibility Check Prompt
 */
export function generateUnicodeCompatibilityCheckPrompt(args: any): string {
  const { text, style, platform } = args;

  return `To check "${style}" compatibility for "${text}" on ${platform}:

Call get_style_info with style: "${style}" to see:
- Platform compatibility ratings
- Character support details
- Alternative style suggestions

Tool to use: get_style_info`;
}

/**
 * Generate Unicode Troubleshooting Prompt
 */
export function generateUnicodeTroubleshootingPrompt(args: any): string {
  const { text, style, error } = args;

  return `If unicode_style_text failed for "${text}" with style "${style}":

1. Call get_style_info with style: "${style}" to check:
   - Character support limitations
   - Platform compatibility issues
2. Try preview_styles to see if other styles work
3. Check if text length exceeds limits

${error ? `Error encountered: ${error}` : ''}

Tools to use: get_style_info → preview_styles`;
}

/**
 * Text Banner Font Definitions Resource
 * R2-based figlet font metadata for stylized text banner generation
 */
export async function getTextBannerFontDefinitions(r2Bucket: R2Bucket) {
  try {
    // Import here to avoid circular dependencies
    const { getFigletFontDefinitions: getDefinitions } = await import('./figlet-engine.js');
    const definitions = await getDefinitions(r2Bucket);

    return {
      version: '1.0.0',
      description: 'Text banner font definitions loaded from R2 storage',
      totalFonts: definitions.length,
      source: 'R2 Bucket (textarttools-figlet-fonts)',
      fonts: definitions,
      categories: {
        popular: definitions.filter(f => f.category === 'popular'),
        decorative: definitions.filter(f => f.category === 'decorative'),
        '3d': definitions.filter(f => f.category === '3d'),
        outline: definitions.filter(f => f.category === 'outline')
      }
    };
  } catch (error) {
    return {
      version: '1.0.0',
      description: 'Error loading text banner font definitions',
      error: error instanceof Error ? error.message : 'Unknown error',
      totalFonts: 0,
      fonts: []
    };
  }
}

/**
 * Text Banner Font Character Mappings Resource
 * Information about figlet font character mapping for text banners
 */
export function getTextBannerCharacterMappings() {
  return {
    version: '1.0.0',
    description: 'Text banner character mapping information for figlet fonts',
    format: 'Figlet Font (.flf)',
    support: {
      characters: 'ASCII printable characters (32-126)',
      extended: 'Unicode characters (varies by font)',
      specialCharacters: {
        hardblank: 'Represents space in font definitions',
        endmark: '@ or @@ marks end of character definition'
      }
    },
    fontStructure: {
      header: {
        signature: 'flf2a format identifier',
        hardblank: 'Character used to represent spaces',
        height: 'Height of characters in lines',
        baseline: 'Baseline position',
        maxLength: 'Maximum character width',
        oldLayout: 'Legacy layout settings',
        commentLines: 'Number of comment lines after header'
      },
      characters: {
        standard: 'Characters 32-126 (space through tilde)',
        extended: 'Additional Unicode characters if present',
        definition: 'Each character defined by height number of lines'
      }
    },
    categories: {
      standard: {
        description: 'Basic readable fonts for general use',
        examples: ['Standard', 'Big', 'Small', 'Slant'],
        characteristics: ['Good readability', 'Wide platform support', 'Compact size']
      },
      decorative: {
        description: 'Stylized fonts for visual impact',
        examples: ['Bubble', 'Shadow', 'Graffiti', 'Broadway'],
        characteristics: ['High visual impact', 'Larger size', 'Artistic style']
      },
      geometric: {
        description: 'Fonts based on geometric shapes',
        examples: ['Block', 'Digital', 'Isometric1', 'Lean'],
        characteristics: ['Clean lines', 'Technical appearance', 'Good for logos']
      },
      script: {
        description: 'Cursive and handwriting-style fonts',
        examples: ['Script', 'Cursive', 'Calligraphy'],
        characteristics: ['Flowing style', 'Elegant appearance', 'Personal touch']
      }
    },
    usage: {
      headers: {
        description: 'Large text for titles and banners',
        recommendedFonts: ['Big', 'Banner', 'Block', 'Slant'],
        maxLength: 'Keep under 20 characters for readability'
      },
      logos: {
        description: 'Brand and identity text',
        recommendedFonts: ['3D-ASCII', 'Shadow', 'Graffiti', 'Broadway'],
        considerations: ['Platform compatibility', 'Size limitations', 'Character support']
      },
      documentation: {
        description: 'Code comments and technical docs',
        recommendedFonts: ['Small', 'Standard', 'Lean', 'Term'],
        considerations: ['Readability', 'Monospace compatibility', 'Size efficiency']
      },
      artistic: {
        description: 'Creative and decorative projects',
        recommendedFonts: ['Bubble', 'Graffiti', 'Gothic', 'Poison'],
        considerations: ['Visual impact', 'Theme matching', 'Audience appropriateness']
      }
    },
    bestPractices: {
      performance: [
        'Fonts are cached per request for efficiency',
        'R2 storage provides global edge caching',
        'Popular fonts load faster due to caching patterns'
      ],
      compatibility: [
        'All fonts support basic ASCII characters (32-126)',
        'Extended Unicode support varies by font',
        'Test on target platform before deployment'
      ],
      accessibility: [
        'Text banners are not screen-reader friendly',
        'Provide alt text or plain text alternatives',
        'Consider context and audience accessibility needs'
      ]
    }
  };
}

/**
 * Generate Text Banner Workflow Prompt
 */
export function generateTextBannerWorkflowPrompt(args: any): string {
  const { text, context, maxWidth } = args;

  return `To create a stylized text banner for "${text}":


1. Call list_figlet_fonts to see all 322+ font options
2. Call preview_figlet_fonts with your text to compare fonts
3. Call ascii_art_text with chosen font to generate

${context ? `Context: ${context}` : ''}
${maxWidth ? `Max Width: ${maxWidth}` : ''}

Tools to use: list_figlet_fonts → preview_figlet_fonts → ascii_art_text`;
}

/**
 * Generate Text Banner Font Selection Prompt
 */
export function generateTextBannerFontSelectionPrompt(args: any): string {
  const { text, category, count } = args;
  const previewCount = count || 5;

  return `To compare ${previewCount} fonts for "${text}":

Call preview_figlet_fonts with:
- text: "${text}"
- fonts: [list of ${previewCount} fonts${category ? ` from ${category} category` : ''}]

This shows actual text banner output for each font to help you choose.

Tool to use: preview_figlet_fonts`;
}

/**
 * Generate Text Banner Troubleshooting Prompt
 */
export function generateTextBannerTroubleshootingPrompt(args: any): string {
  const { text, font, error } = args;

  return `If ascii_art_text failed for "${text}" with font "${font}":

1. Call list_figlet_fonts to verify font name exists
2. Check if text contains unsupported characters
3. Try a different font from list_figlet_fonts
4. Use preview_figlet_fonts to test alternatives

${error ? `Error encountered: ${error}` : ''}

Tools to use: list_figlet_fonts → preview_figlet_fonts`;
}

/**
 * Text Banner Usage Resource
 * Practical guidance for using text banner tools effectively
 */
export function getTextBannerUsage() {
  return {
    version: '1.0.0',
    description: 'Practical guidance for text banner generation with figlet fonts',
    workflow: {
      basic: [
        '1. Use list_figlet_fonts to see available fonts',
        '2. Use preview_figlet_fonts to compare fonts with your text',
        '3. Use ascii_art_text to generate final text banner'
      ],
      troubleshooting: [
        'If ascii_art_text fails, check font name with list_figlet_fonts',
        'Try shorter text if output is too wide',
        'Use preview_figlet_fonts to test alternatives'
      ]
    },
    bestPractices: {
      textLength: 'Keep text under 20 characters for best readability',
      fontSelection: 'Use preview_figlet_fonts to compare before choosing',
      compatibility: 'Text banners work best in monospace environments',
      performance: 'Fonts are cached per request for efficiency'
    },
    toolMapping: {
      'list_figlet_fonts': 'See all 322+ available fonts with metadata',
      'preview_figlet_fonts': 'Compare how text looks in multiple fonts',
      'ascii_art_text': 'Generate final text banner with chosen font'
    },
    categories: {
      popular: 'Standard, Big, Slant, Banner - good for general use',
      decorative: 'Bubble, Shadow, Graffiti - high visual impact',
      '3d': '3D-ASCII, Isometric1 - dimensional effects',
      technical: 'Digital, Binary - tech/code themes'
    }
  };
}

/**
 * MCP Request Examples Resource
 * Correct JSON-RPC 2.0 request format examples for all tools
 */
export function getMcpRequestExamples() {
  return {
    version: '1.0.0',
    description: 'Correct MCP JSON-RPC 2.0 request format examples',
    endpoint: 'POST /sse (Content-Type: application/json)',

    unicodeExamples: {
      'unicode_style_text': {
        description: 'Transform text with Unicode styling',
        request: {
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
        }
      },
      'list_available_styles': {
        description: 'Get all 23 available Unicode styles',
        request: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'list_available_styles',
            arguments: {}
          }
        }
      },
      'preview_styles': {
        description: 'Preview text in multiple styles',
        request: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'preview_styles',
            arguments: {
              text: 'Hello',
              styles: ['bold', 'italic', 'cursive']
            }
          }
        }
      },
      'get_style_info': {
        description: 'Get detailed info about a specific style',
        request: {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'get_style_info',
            arguments: {
              style: 'bold'
            }
          }
        }
      }
    },

    textBannerExamples: {
      'ascii_art_text': {
        description: 'Generate stylized text banners with figlet fonts',
        request: {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'ascii_art_text',
            arguments: {
              text: 'CODE',
              font: 'Standard'
            }
          }
        }
      },
      'list_figlet_fonts': {
        description: 'Get all 322+ available text banner fonts',
        request: {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'list_figlet_fonts',
            arguments: {}
          }
        }
      },
      'preview_figlet_fonts': {
        description: 'Preview text in multiple text banner fonts',
        request: {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'preview_figlet_fonts',
            arguments: {
              text: 'Hi',
              fonts: ['Standard', 'Big', 'Slant']
            }
          }
        }
      }
    },

    mcpProtocolExamples: {
      'tools/list': {
        description: 'List all available MCP tools',
        request: {
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/list',
          params: {}
        }
      },
      'prompts/list': {
        description: 'List all available prompts',
        request: {
          jsonrpc: '2.0',
          id: 9,
          method: 'prompts/list',
          params: {}
        }
      },
      'resources/list': {
        description: 'List all available resources',
        request: {
          jsonrpc: '2.0',
          id: 10,
          method: 'resources/list',
          params: {}
        }
      }
    },

    curlExamples: {
      unicode_style_text: `curl -X POST https://mcp.textarttools.com/sse \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "unicode_style_text",
      "arguments": {
        "text": "Hello World",
        "style": "bold"
      }
    }
  }'`,

      ascii_art_text: `curl -X POST https://mcp.textarttools.com/sse \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "ascii_art_text",
      "arguments": {
        "text": "CODE",
        "font": "Standard"
      }
    }
  }'`
    },

    commonMistakes: {
      missingContentType: 'Always include -H "Content-Type: application/json"',
      wrongMethod: 'Use POST, not GET',
      invalidJson: 'Ensure JSON is properly formatted with correct quotes',
      missingId: 'Every request needs a unique "id" field',
      wrongEndpoint: 'Use /sse endpoint, not /api or /'
    }
  };
}