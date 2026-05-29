// Da-Qian (大千式) Bopomofo Keyboard Mappings
export const ZHUYIN_MAP = {
  '1': 'ㄅ', '2': 'ㄉ', '3': 'ˇ', '4': 'ˋ', '5': 'ㄓ', '6': 'ˊ', '7': '˙', '8': 'ㄚ', '9': 'ㄞ', '0': 'ㄢ', '-': 'ㄦ',
  'q': 'ㄆ', 'w': 'ㄊ', 'e': 'ㄍ', 'r': 'ㄐ', 't': 'ㄔ', 'y': 'ㄗ', 'u': 'ㄧ', 'i': 'ㄛ', 'o': 'ㄟ', 'p': 'ㄣ',
  'a': 'ㄇ', 's': 'ㄋ', 'd': 'ㄎ', 'f': 'ㄑ', 'g': 'ㄕ', 'h': 'ㄘ', 'j': 'ㄨ', 'k': 'ㄜ', 'l': 'ㄠ', ';': 'ㄤ',
  'z': 'ㄈ', 'x': 'ㄌ', 'c': 'ㄏ', 'v': 'ㄒ', 'b': 'ㄖ', 'n': 'ㄙ', 'm': 'ㄩ', ',': 'ㄝ', '.': 'ㄡ', '/': 'ㄥ'
};

// Create reverse mapping for lookup (e.g. 'ㄅ' -> '1')
export const REVERSE_ZHUYIN_MAP = {};
Object.entries(ZHUYIN_MAP).forEach(([key, val]) => {
  REVERSE_ZHUYIN_MAP[val] = key;
});

// Consonants (聲母)
export const CONSONANTS = [
  'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ',
  'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ'
];

// Medials (介母)
export const MEDIALS = ['ㄧ', 'ㄨ', 'ㄩ'];

// Rhymes/Vowels (韻母)
export const RHYMES = [
  'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'
];

// Tones (聲調)
export const TONES = ['ˊ', 'ˇ', 'ˋ', '˙']; // 2nd, 3rd, 4th, neutral tones. 1st tone is Space (often omitted)

// All Zhuyin characters that can fall
export const ZHUYIN_CHARS = [
  ...CONSONANTS,
  ...MEDIALS,
  ...RHYMES,
  ...TONES
];

// Standard key labels for UI virtual keyboard representation
export const KEYBOARD_LAYOUT = [
  // Row 1
  [
    { key: '1', zhuyin: 'ㄅ' }, { key: '2', zhuyin: 'ㄉ' }, { key: '3', zhuyin: 'ˇ' }, { key: '4', zhuyin: 'ˋ' },
    { key: '5', zhuyin: 'ㄓ' }, { key: '6', zhuyin: 'ˊ' }, { key: '7', zhuyin: '˙' }, { key: '8', zhuyin: 'ㄚ' },
    { key: '9', zhuyin: 'ㄞ' }, { key: '0', zhuyin: 'ㄢ' }, { key: '-', zhuyin: 'ㄦ' }
  ],
  // Row 2
  [
    { key: 'q', zhuyin: 'ㄆ' }, { key: 'w', zhuyin: 'ㄊ' }, { key: 'e', zhuyin: 'ㄍ' }, { key: 'r', zhuyin: 'ㄐ' },
    { key: 't', zhuyin: 'ㄔ' }, { key: 'y', zhuyin: 'ㄗ' }, { key: 'u', zhuyin: 'ㄧ' }, { key: 'i', zhuyin: 'ㄛ' },
    { key: 'o', zhuyin: 'ㄟ' }, { key: 'p', zhuyin: 'ㄣ' }
  ],
  // Row 3
  [
    { key: 'a', zhuyin: 'ㄇ' }, { key: 's', zhuyin: 'ㄋ' }, { key: 'd', zhuyin: 'ㄎ' }, { key: 'f', zhuyin: 'ㄑ' },
    { key: 'g', zhuyin: 'ㄕ' }, { key: 'h', zhuyin: 'ㄘ' }, { key: 'j', zhuyin: 'ㄨ' }, { key: 'k', zhuyin: 'ㄜ' },
    { key: 'l', zhuyin: 'ㄠ' }, { key: ';', zhuyin: 'ㄤ' }
  ],
  // Row 4
  [
    { key: 'z', zhuyin: 'ㄈ' }, { key: 'x', zhuyin: 'ㄌ' }, { key: 'c', zhuyin: 'ㄏ' }, { key: 'v', zhuyin: 'ㄒ' },
    { key: 'b', zhuyin: 'ㄖ' }, { key: 'n', zhuyin: 'ㄙ' }, { key: 'm', zhuyin: 'ㄩ' }, { key: ',', zhuyin: 'ㄝ' },
    { key: '.', zhuyin: 'ㄡ' }, { key: '/', zhuyin: 'ㄥ' }
  ]
];

/**
 * Validates if the key typed matches the expected Zhuyin character
 * @param {string} keyTyped - The physical key pressed (e.g. '1', 'q')
 * @param {string} targetZhuyin - The falling Zhuyin character (e.g. 'ㄅ', 'ㄆ')
 * @returns {boolean} True if they match
 */
export function checkZhuyinMatch(keyTyped, targetZhuyin) {
  const normalizedKey = keyTyped.toLowerCase();
  return ZHUYIN_MAP[normalizedKey] === targetZhuyin;
}

/**
 * Gets a random Bopomofo character
 * @returns {string} A random Bopomofo character
 */
export function getRandomZhuyin() {
  const index = Math.floor(Math.random() * ZHUYIN_CHARS.length);
  return ZHUYIN_CHARS[index];
}

/**
 * Gets a random English character (uppercase)
 * @returns {string} A random English character A-Z
 */
export function getRandomEnglish() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const index = Math.floor(Math.random() * chars.length);
  return chars[index];
}
