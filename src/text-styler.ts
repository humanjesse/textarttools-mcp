/**
 * Unicode Text Styling Engine
 * Ported from TextArtTools Unicodestyler.tsx component
 */

import type { UnicodeStyle, CharMap, StyleDefinition } from './types.js';

// Unicode character mappings for each style
export const charMaps: Record<Exclude<UnicodeStyle, 'normal' | 'underline' | 'strikethrough' | 'zalgo' | 'flipped'>, CharMap> & { flipped: CharMap } = {
  bold: {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
    'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
    'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
    'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
    'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  },

  italic: {
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
    'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
    'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
    'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
    'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡'
  },

  boldItalic: {
    'a': '𝙖', 'b': '𝙗', 'c': '𝙘', 'd': '𝙙', 'e': '𝙚', 'f': '𝙛', 'g': '𝙜', 'h': '𝙝', 'i': '𝙞', 'j': '𝙟',
    'k': '𝙠', 'l': '𝙡', 'm': '𝙢', 'n': '𝙣', 'o': '𝙤', 'p': '𝙥', 'q': '𝙦', 'r': '𝙧', 's': '𝙨', 't': '𝙩',
    'u': '𝙪', 'v': '𝙫', 'w': '𝙬', 'x': '𝙭', 'y': '𝙮', 'z': '𝙯',
    'A': '𝘼', 'B': '𝘽', 'C': '𝘾', 'D': '𝘿', 'E': '𝙀', 'F': '𝙁', 'G': '𝙂', 'H': '𝙃', 'I': '𝙄', 'J': '𝙅',
    'K': '𝙆', 'L': '𝙇', 'M': '𝙈', 'N': '𝙉', 'O': '𝙊', 'P': '𝙋', 'Q': '𝙌', 'R': '𝙍', 'S': '𝙎', 'T': '𝙏',
    'U': '𝙐', 'V': '𝙑', 'W': '𝙒', 'X': '𝙓', 'Y': '𝙔', 'Z': '𝙕'
  },

  boldSerif: {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  },

  italicSerif: {
    'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ', 'i': '𝑖', 'j': '𝑗',
    'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡',
    'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧',
    'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺', 'H': '𝐻', 'I': '𝐼', 'J': '𝐽',
    'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇',
    'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍'
  },

  boldItalicSerif: {
    'a': '𝒂', 'b': '𝒃', 'c': '𝒄', 'd': '𝒅', 'e': '𝒆', 'f': '𝒇', 'g': '𝒈', 'h': '𝒉', 'i': '𝒊', 'j': '𝒋',
    'k': '𝒌', 'l': '𝒍', 'm': '𝒎', 'n': '𝒏', 'o': '𝒐', 'p': '𝒑', 'q': '𝒒', 'r': '𝒓', 's': '𝒔', 't': '𝒕',
    'u': '𝒖', 'v': '𝒗', 'w': '𝒘', 'x': '𝒙', 'y': '𝒚', 'z': '𝒛',
    'A': '𝑨', 'B': '𝑩', 'C': '𝑪', 'D': '𝑫', 'E': '𝑬', 'F': '𝑭', 'G': '𝑮', 'H': '𝑯', 'I': '𝑰', 'J': '𝑱',
    'K': '𝑲', 'L': '𝑳', 'M': '𝑴', 'N': '𝑵', 'O': '𝑶', 'P': '𝑷', 'Q': '𝑸', 'R': '𝑹', 'S': '𝑺', 'T': '𝑻',
    'U': '𝑼', 'V': '𝑽', 'W': '𝑾', 'X': '𝑿', 'Y': '𝒀', 'Z': '𝒁'
  },

  fraktur: {
    'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤', 'h': '𝔥', 'i': '𝔦', 'j': '𝔧',
    'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫', 'o': '𝔬', 'p': '𝔭', 'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱',
    'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷',
    'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊', 'H': 'ℌ', 'I': 'ℑ', 'J': '𝔍',
    'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑', 'O': '𝔒', 'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗',
    'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ'
  },

  boldFraktur: {
    'a': '𝖆', 'b': '𝖇', 'c': '𝖈', 'd': '𝖉', 'e': '𝖊', 'f': '𝖋', 'g': '𝖌', 'h': '𝖍', 'i': '𝖎', 'j': '𝖏',
    'k': '𝖐', 'l': '𝖑', 'm': '𝖒', 'n': '𝖓', 'o': '𝖔', 'p': '𝖕', 'q': '𝖖', 'r': '𝖗', 's': '𝖘', 't': '𝖙',
    'u': '𝖚', 'v': '𝖛', 'w': '𝖜', 'x': '𝖝', 'y': '𝖞', 'z': '𝖟',
    'A': '𝕬', 'B': '𝕭', 'C': '𝕮', 'D': '𝕯', 'E': '𝕰', 'F': '𝕱', 'G': '𝕲', 'H': '𝕳', 'I': '𝕴', 'J': '𝕵',
    'K': '𝕶', 'L': '𝕷', 'M': '𝕸', 'N': '𝕹', 'O': '𝕺', 'P': '𝕻', 'Q': '𝕼', 'R': '𝕽', 'S': '𝕾', 'T': '𝕿',
    'U': '𝖀', 'V': '𝖁', 'W': '𝖂', 'X': '𝖃', 'Y': '𝖄', 'Z': '𝖅'
  },

  doubleStruck: {
    'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘', 'h': '𝕙', 'i': '𝕚', 'j': '𝕛',
    'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟', 'o': '𝕠', 'p': '𝕡', 'q': '𝕢', 'r': '𝕣', 's': '𝕤', 't': '𝕥',
    'u': '𝕦', 'v': '𝕧', 'w': '𝕨', 'x': '𝕩', 'y': '𝕪', 'z': '𝕫',
    'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ', 'I': '𝕀', 'J': '𝕁',
    'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋',
    'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ',
    '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡'
  },

  monospace: {
    'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': '𝚒', 'j': '𝚓',
    'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝',
    'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
    'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸', 'J': '𝙹',
    'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃',
    'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
    '0': '𝟶', '1': '𝟷', '2': '𝟸', '3': '𝟹', '4': '𝟺', '5': '𝟻', '6': '𝟼', '7': '𝟽', '8': '𝟾', '9': '𝟿'
  },

  cursive: {
    'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': '𝑒', 'f': '𝒻', 'g': '𝑔', 'h': '𝒽', 'i': '𝒾', 'j': '𝒿',
    'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃', 'o': '𝑜', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉',
    'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
    'A': '𝒜', 'B': 'ℬ', 'C': '𝒞', 'D': '𝒟', 'E': 'ℰ', 'F': 'ℱ', 'G': '𝒢', 'H': 'ℋ', 'I': 'ℐ', 'J': '𝒥',
    'K': '𝒦', 'L': 'ℒ', 'M': 'ℳ', 'N': '𝒩', 'O': '𝒪', 'P': '𝒫', 'Q': '𝒬', 'R': 'ℛ', 'S': '𝒮', 'T': '𝒯',
    'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳', 'Y': '𝒴', 'Z': '𝒵'
  },

  squared: {
    'A': '🅰', 'B': '🅱', 'C': '🅲', 'D': '🅳', 'E': '🅴', 'F': '🅵', 'G': '🅶', 'H': '🅷', 'I': '🅸', 'J': '🅹',
    'K': '🅺', 'L': '🅻', 'M': '🅼', 'N': '🅽', 'O': '🅾', 'P': '🅿', 'Q': '🆀', 'R': '🆁', 'S': '🆂', 'T': '🆃',
    'U': '🆄', 'V': '🆅', 'W': '🆆', 'X': '🆇', 'Y': '🆈', 'Z': '🆉'
  },

  negativeCircled: {
    'A': '🅐', 'B': '🅑', 'C': '🅒', 'D': '🅓', 'E': '🅔', 'F': '🅕', 'G': '🅖', 'H': '🅗', 'I': '🅘', 'J': '🅙',
    'K': '🅚', 'L': '🅛', 'M': '🅜', 'N': '🅝', 'O': '🅞', 'P': '🅟', 'Q': '🅠', 'R': '🅡', 'S': '🅢', 'T': '🅣',
    'U': '🅤', 'V': '🅥', 'W': '🅦', 'X': '🅧', 'Y': '🅨', 'Z': '🅩'
  },

  blue: {
    'A': '🇦', 'B': '🇧', 'C': '🇨', 'D': '🇩', 'E': '🇪', 'F': '🇫', 'G': '🇬', 'H': '🇭', 'I': '🇮', 'J': '🇯',
    'K': '🇰', 'L': '🇱', 'M': '🇲', 'N': '🇳', 'O': '🇴', 'P': '🇵', 'Q': '🇶', 'R': '🇷', 'S': '🇸', 'T': '🇹',
    'U': '🇺', 'V': '🇻', 'W': '🇼', 'X': '🇽', 'Y': '🇾', 'Z': '🇿'
  },

  parenthesized: {
    'a': '⒜', 'b': '⒝', 'c': '⒞', 'd': '⒟', 'e': '⒠', 'f': '⒡', 'g': '⒢', 'h': '⒣', 'i': '⒤', 'j': '⒥',
    'k': '⒦', 'l': '⒧', 'm': '⒨', 'n': '⒩', 'o': '⒪', 'p': '⒫', 'q': '⒬', 'r': '⒭', 's': '⒮', 't': '⒯',
    'u': '⒰', 'v': '⒱', 'w': '⒲', 'x': '⒳', 'y': '⒴', 'z': '⒵',
    '1': '⑴', '2': '⑵', '3': '⑶', '4': '⑷', '5': '⑸', '6': '⑹', '7': '⑺', '8': '⑻', '9': '⑼'
  },

  flipped: {
    'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ',
    'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ',
    'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
    '.': '˙', ',': '\'', '?': '¿', '!': '¡', '_': '‾',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{'
  },

  subscript: {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎'
  },

  superscript: {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
  },

  circled: {
    'a': 'ⓐ', 'b': 'ⓑ', 'c': 'ⓒ', 'd': 'ⓓ', 'e': 'ⓔ', 'f': 'ⓕ', 'g': 'ⓖ', 'h': 'ⓗ', 'i': 'ⓘ', 'j': 'ⓙ',
    'k': 'ⓚ', 'l': 'ⓛ', 'm': 'ⓜ', 'n': 'ⓝ', 'o': 'ⓞ', 'p': 'ⓟ', 'q': 'ⓠ', 'r': 'ⓡ', 's': 'ⓢ', 't': 'ⓣ',
    'u': 'ⓤ', 'v': 'ⓥ', 'w': 'ⓦ', 'x': 'ⓧ', 'y': 'ⓨ', 'z': 'ⓩ',
    'A': 'Ⓐ', 'B': 'Ⓑ', 'C': 'Ⓒ', 'D': 'Ⓓ', 'E': 'Ⓔ', 'F': 'Ⓕ', 'G': 'Ⓖ', 'H': 'Ⓗ', 'I': 'Ⓘ', 'J': 'Ⓙ',
    'K': 'Ⓚ', 'L': 'Ⓛ', 'M': 'Ⓜ', 'N': 'Ⓝ', 'O': 'Ⓞ', 'P': 'Ⓟ', 'Q': 'Ⓠ', 'R': 'Ⓡ', 'S': 'Ⓢ', 'T': 'Ⓣ',
    'U': 'Ⓤ', 'V': 'Ⓥ', 'W': 'Ⓦ', 'X': 'Ⓧ', 'Y': 'Ⓨ', 'Z': 'Ⓩ',
    '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨', '0': '⓪'
  }
};

// Zalgo diacritics for chaotic text effect
const zalgoDiacritics = {
  up: ['\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0303', '\u0302', '\u030c', '\u0350', '\u0300', '\u0301', '\u030b', '\u030f', '\u0312', '\u0313', '\u0314', '\u033d', '\u0309', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036a', '\u036b', '\u036c', '\u036d', '\u036e', '\u036f', '\u033e', '\u035b', '\u0346', '\u031a'],
  middle: ['\u0315', '\u031b', '\u0340', '\u0341', '\u0358', '\u0321', '\u0322', '\u0327', '\u0328', '\u0334', '\u0335', '\u0336', '\u034f', '\u035c', '\u035d', '\u035e', '\u035f', '\u0360', '\u0361', '\u0362', '\u0338', '\u0337', '\u0362', '\u0489'],
  down: ['\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0349', '\u034d', '\u034e', '\u0353', '\u0354', '\u0355', '\u0356', '\u0359', '\u035a', '\u0323']
};

/**
 * Apply Zalgo text effect by adding random diacritical marks
 */
function applyZalgo(text: string): string {
  let newText = '';
  for (const char of text) {
    if (char.trim() === '') {
      newText += char;
      continue;
    }

    let zalgoChar = char;
    const numUp = Math.floor(Math.random() * 8) + 1;
    const numMiddle = Math.floor(Math.random() * 3);
    const numDown = Math.floor(Math.random() * 8) + 1;

    for (let i = 0; i < numUp; i++) {
      zalgoChar += zalgoDiacritics.up[Math.floor(Math.random() * zalgoDiacritics.up.length)];
    }
    for (let i = 0; i < numMiddle; i++) {
      zalgoChar += zalgoDiacritics.middle[Math.floor(Math.random() * zalgoDiacritics.middle.length)];
    }
    for (let i = 0; i < numDown; i++) {
      zalgoChar += zalgoDiacritics.down[Math.floor(Math.random() * zalgoDiacritics.down.length)];
    }

    newText += zalgoChar;
  }
  return newText;
}

/**
 * Transform text using the specified Unicode style
 */
export function transformText(text: string, style: UnicodeStyle, _preserveSpacing: boolean = true): string {
  if (!text) return text;

  switch (style) {
    case 'normal':
      return text;

    case 'underline':
      return text.split('').join('\u0332');

    case 'strikethrough':
      return text.split('').join('\u0336');

    case 'zalgo':
      return applyZalgo(text);

    case 'flipped':
      return text
        .split('')
        .reverse()
        .map(char => charMaps.flipped[char.toLowerCase()] || char)
        .join('');

    case 'squared':
    case 'blue':
    case 'negativeCircled': {
      const map = charMaps[style];
      return text
        .split('')
        .map(char => map[char.toUpperCase()] || char)
        .join('');
    }

    default: {
      const map = charMaps[style];
      if (!map) return text;

      return text
        .split('')
        .map(char => map[char] || char)
        .join('');
    }
  }
}

/**
 * Get style definitions with metadata for all supported styles
 */
export function getStyleDefinitions(): StyleDefinition[] {
  return [
    {
      style: 'normal',
      displayName: 'Normal',
      description: 'Plain text without any transformation',
      example: 'Normal Text',
      suitableFor: ['all platforms'],
      characterSupport: { letters: true, numbers: true, punctuation: true, symbols: true }
    },
    {
      style: 'bold',
      displayName: 'Bold',
      description: 'Mathematical bold characters',
      example: '𝗕𝗼𝗹𝗱 𝗧𝗲𝘅𝘁',
      unicodeRange: 'U+1D400-U+1D7FF',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'italic',
      displayName: 'Italic',
      description: 'Mathematical italic characters',
      example: '𝐼𝑡𝑎𝑙𝑖𝑐 𝑇𝑒𝑥𝑡',
      unicodeRange: 'U+1D400-U+1D7FF',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'boldItalic',
      displayName: 'Bold Italic',
      description: 'Mathematical bold italic characters',
      example: '𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄',
      unicodeRange: 'U+1D400-U+1D7FF',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'underline',
      displayName: 'Underline',
      description: 'Text with combining low line diacritics',
      example: 'U̲n̲d̲e̲r̲l̲i̲n̲e̲ ̲T̲e̲x̲t̲',
      unicodeRange: 'U+0332',
      suitableFor: ['Discord', 'Twitter', 'Instagram'],
      characterSupport: { letters: true, numbers: true, punctuation: true, symbols: true }
    },
    {
      style: 'strikethrough',
      displayName: 'Strikethrough',
      description: 'Text with combining long stroke overlay',
      example: 'S̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶ ̶T̶e̶x̶t̶',
      unicodeRange: 'U+0336',
      suitableFor: ['Discord', 'Twitter', 'Instagram'],
      characterSupport: { letters: true, numbers: true, punctuation: true, symbols: true }
    },
    {
      style: 'subscript',
      displayName: 'Subscript',
      description: 'Subscript characters for mathematical notation',
      example: 'Sᵤᵦₛᶜᵣᵢₚₜ Tₑₓₜ',
      unicodeRange: 'U+2080-U+209F, U+1D62-U+1D6A',
      suitableFor: ['Discord', 'Twitter', 'scientific documents'],
      characterSupport: { letters: false, numbers: true, punctuation: true, symbols: false }
    },
    {
      style: 'superscript',
      displayName: 'Superscript',
      description: 'Superscript characters for mathematical notation',
      example: 'Sᵘᵖᵉʳˢᶜʳⁱᵖᵗ Tᵉˣᵗ',
      unicodeRange: 'U+2070-U+209F, U+1D2C-U+1D6A',
      suitableFor: ['Discord', 'Twitter', 'scientific documents'],
      characterSupport: { letters: true, numbers: true, punctuation: true, symbols: false }
    },
    {
      style: 'circled',
      displayName: 'Circled',
      description: 'Characters enclosed in circles',
      example: 'Ⓒⓘⓡⓒⓛⓔⓓ Ⓣⓔⓧⓣ',
      unicodeRange: 'U+24B6-U+24EA, U+2460-U+2473',
      suitableFor: ['Discord', 'Twitter', 'Instagram'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'fraktur',
      displayName: 'Fraktur',
      description: 'Mathematical Fraktur script',
      example: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯 𝔗𝔢𝔵𝔱',
      unicodeRange: 'U+1D504-U+1D537',
      suitableFor: ['Discord', 'Twitter', 'Gothic themes'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'doubleStruck',
      displayName: 'Double-Struck',
      description: 'Mathematical double-struck characters',
      example: '𝔻𝕠𝕦𝕓𝕝𝔼 𝕊𝕥𝕣𝕦𝕔𝕜',
      unicodeRange: 'U+1D538-U+1D56B',
      suitableFor: ['Discord', 'Twitter', 'mathematical contexts'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'monospace',
      displayName: 'Monospace',
      description: 'Mathematical monospace characters',
      example: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎 𝚃𝚎𝚡𝚝',
      unicodeRange: 'U+1D670-U+1D6A3',
      suitableFor: ['Discord', 'Twitter', 'code contexts'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'cursive',
      displayName: 'Cursive',
      description: 'Mathematical script/cursive characters',
      example: '𝒞𝓊𝓇𝓈𝒾𝓋𝑒 𝒯𝑒𝓍𝓉',
      unicodeRange: 'U+1D49C-U+1D4CF',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'elegant themes'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'squared',
      displayName: 'Squared',
      description: 'Characters in colored squares',
      example: '🆂🆀🆄🅰🆁🅴🅳',
      unicodeRange: 'U+1F170-U+1F189',
      suitableFor: ['Discord', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'flipped',
      displayName: 'Flipped',
      description: 'Upside-down text using special characters',
      example: 'pǝddᴉlℲ ʇxǝT',
      unicodeRange: 'Various IPA and Latin Extended',
      suitableFor: ['Discord', 'Twitter', 'meme contexts'],
      characterSupport: { letters: true, numbers: false, punctuation: true, symbols: false }
    },
    {
      style: 'zalgo',
      displayName: 'Zalgo',
      description: 'Chaotic text with combining diacritical marks',
      example: 'Z̸̰̈a̴̱̾l̵̰̇g̶̱̈o̸̰̽ ̴̱̾Ṫ̵̰ë̶̱x̸̰̽ṯ̴̾',
      unicodeRange: 'U+0300-U+036F (Combining marks)',
      suitableFor: ['Discord', 'Reddit', 'horror themes'],
      characterSupport: { letters: true, numbers: true, punctuation: true, symbols: true }
    },
    {
      style: 'blue',
      displayName: 'Blue',
      description: 'Regional indicator symbols (flag letters)',
      example: '🇧🇱🇺🇪 🇹🇪🇽🇹',
      unicodeRange: 'U+1F1E6-U+1F1FF',
      suitableFor: ['Discord', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'parenthesized',
      displayName: 'Parenthesized',
      description: 'Characters enclosed in parentheses',
      example: '⒫⒜⒭⒠⒩⒯⒣⒠⒮⒤⒵⒠⒟',
      unicodeRange: 'U+249C-U+24B5, U+2474-U+2487',
      suitableFor: ['Discord', 'Twitter', 'lists and numbering'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'negativeCircled',
      displayName: 'Negative Circled',
      description: 'White letters on black circular background',
      example: '🅝🅔🅖🅐🅣🅘🅥🅔',
      unicodeRange: 'U+1F150-U+1F169',
      suitableFor: ['Discord', 'Instagram', 'TikTok'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'boldSerif',
      displayName: 'Bold Serif',
      description: 'Mathematical bold serif characters',
      example: '𝐁𝐨𝐥𝐝 𝐒𝐞𝐫𝐢𝐟',
      unicodeRange: 'U+1D400-U+1D433',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'formal contexts'],
      characterSupport: { letters: true, numbers: true, punctuation: false, symbols: false }
    },
    {
      style: 'italicSerif',
      displayName: 'Italic Serif',
      description: 'Mathematical italic serif characters',
      example: '𝐼𝑡𝑎𝑙𝑖𝑐 𝑆𝑒𝑟𝑖𝑓',
      unicodeRange: 'U+1D434-U+1D467',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'formal contexts'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'boldItalicSerif',
      displayName: 'Bold Italic Serif',
      description: 'Mathematical bold italic serif characters',
      example: '𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄 𝑺𝒆𝒓𝒊𝒇',
      unicodeRange: 'U+1D468-U+1D49B',
      suitableFor: ['Discord', 'Twitter', 'Instagram', 'formal contexts'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    },
    {
      style: 'boldFraktur',
      displayName: 'Bold Fraktur',
      description: 'Mathematical bold Fraktur script',
      example: '𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐𝖙𝖚𝖗',
      unicodeRange: 'U+1D56C-U+1D59F',
      suitableFor: ['Discord', 'Twitter', 'Gothic themes'],
      characterSupport: { letters: true, numbers: false, punctuation: false, symbols: false }
    }
  ];
}

/**
 * Get information about a specific style
 */
export function getStyleInfo(style: UnicodeStyle): StyleDefinition | null {
  const definitions = getStyleDefinitions();
  return definitions.find(def => def.style === style) || null;
}

/**
 * Validate if a style is supported
 */
export function isValidStyle(style: string): style is UnicodeStyle {
  const validStyles: UnicodeStyle[] = [
    'normal', 'bold', 'italic', 'boldItalic', 'underline', 'strikethrough',
    'subscript', 'superscript', 'circled', 'fraktur', 'doubleStruck',
    'monospace', 'cursive', 'squared', 'flipped', 'zalgo', 'blue',
    'parenthesized', 'negativeCircled', 'boldSerif', 'italicSerif',
    'boldItalicSerif', 'boldFraktur'
  ];
  return validStyles.includes(style as UnicodeStyle);
}