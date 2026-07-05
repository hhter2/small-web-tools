/**
 * fontSimilarity.js
 * Lightweight local matcher: given a font family name, returns up to 3
 * suggested Google Fonts alternatives based on explicit mapping or fuzzy
 * category keyword matching.
 */

// ── Explicit known-font → Google Fonts mapping ───────────────────────────────
const EXPLICIT_MAP = {
  // System / OS / Premium → common open-source alternatives
  'helvetica':          [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Montserrat', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }],
  'helvetica neue':     [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'arial':              [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Roboto', cat: 'sans-serif' }, { name: 'Source Sans 3', cat: 'sans-serif' }],
  'segoe ui':           [{ name: 'Inter', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }, { name: 'Figtree', cat: 'sans-serif' }],
  'san francisco':      [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Plus Jakarta Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  '-apple-system':      [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }],
  'sf pro':             [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Plus Jakarta Sans', cat: 'sans-serif' }],
  'sf pro text':        [{ name: 'Inter', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'sf pro display':     [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Outfit', cat: 'sans-serif' }],
  'roboto':             [{ name: 'Roboto', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'Lato', cat: 'sans-serif' }],
  'open sans':          [{ name: 'Open Sans', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'Source Sans 3', cat: 'sans-serif' }],
  'lato':               [{ name: 'Lato', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }, { name: 'Raleway', cat: 'sans-serif' }],
  'montserrat':         [{ name: 'Montserrat', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }, { name: 'Raleway', cat: 'sans-serif' }],
  'inter':              [{ name: 'Inter', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }, { name: 'Figtree', cat: 'sans-serif' }],
  'times new roman':    [{ name: 'Lora', cat: 'serif' }, { name: 'Playfair Display', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'times':              [{ name: 'Lora', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'georgia':            [{ name: 'Merriweather', cat: 'serif' }, { name: 'Lora', cat: 'serif' }, { name: 'Playfair Display', cat: 'serif' }],
  'garamond':           [{ name: 'EB Garamond', cat: 'serif' }, { name: 'Cormorant Garamond', cat: 'serif' }, { name: 'Crimson Pro', cat: 'serif' }],
  'baskerville':        [{ name: 'Libre Baskerville', cat: 'serif' }, { name: 'Crimson Pro', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'palatino':           [{ name: 'EB Garamond', cat: 'serif' }, { name: 'Playfair Display', cat: 'serif' }],
  'courier':            [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Roboto Mono', cat: 'monospace' }, { name: 'Source Code Pro', cat: 'monospace' }],
  'courier new':        [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Roboto Mono', cat: 'monospace' }, { name: 'IBM Plex Mono', cat: 'monospace' }],
  'consolas':           [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Fira Code', cat: 'monospace' }, { name: 'Source Code Pro', cat: 'monospace' }],
  'monaco':             [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Fira Code', cat: 'monospace' }],
  'menlo':              [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'IBM Plex Mono', cat: 'monospace' }],
  'fira code':          [{ name: 'Fira Code', cat: 'monospace' }, { name: 'JetBrains Mono', cat: 'monospace' }],
  'jetbrains mono':     [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Fira Code', cat: 'monospace' }],
  'ubuntu':             [{ name: 'Ubuntu', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }],
  'noto sans':          [{ name: 'Noto Sans', cat: 'sans-serif' }, { name: 'Inter', cat: 'sans-serif' }],
  'noto serif':         [{ name: 'Noto Serif', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'source sans':        [{ name: 'Source Sans 3', cat: 'sans-serif' }, { name: 'Open Sans', cat: 'sans-serif' }],
  'source sans pro':    [{ name: 'Source Sans 3', cat: 'sans-serif' }, { name: 'Open Sans', cat: 'sans-serif' }],
  'source serif':       [{ name: 'Source Serif 4', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'source code pro':    [{ name: 'Source Code Pro', cat: 'monospace' }, { name: 'JetBrains Mono', cat: 'monospace' }],
  'ibm plex sans':      [{ name: 'IBM Plex Sans', cat: 'sans-serif' }, { name: 'Inter', cat: 'sans-serif' }],
  'ibm plex serif':     [{ name: 'IBM Plex Serif', cat: 'serif' }, { name: 'Lora', cat: 'serif' }],
  'ibm plex mono':      [{ name: 'IBM Plex Mono', cat: 'monospace' }, { name: 'Fira Code', cat: 'monospace' }],
  'dm sans':            [{ name: 'DM Sans', cat: 'sans-serif' }, { name: 'Inter', cat: 'sans-serif' }],
  'dm serif display':   [{ name: 'DM Serif Display', cat: 'serif' }, { name: 'Playfair Display', cat: 'serif' }],
  'poppins':            [{ name: 'Poppins', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }],
  'raleway':            [{ name: 'Raleway', cat: 'sans-serif' }, { name: 'Montserrat', cat: 'sans-serif' }],
  'josefin sans':       [{ name: 'Josefin Sans', cat: 'sans-serif' }, { name: 'Raleway', cat: 'sans-serif' }],
  'nunito':             [{ name: 'Nunito', cat: 'sans-serif' }, { name: 'Poppins', cat: 'sans-serif' }],
  'nunito sans':        [{ name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'Open Sans', cat: 'sans-serif' }],
  'outfit':             [{ name: 'Outfit', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }],
  'syne':               [{ name: 'Syne', cat: 'sans-serif' }, { name: 'Space Grotesk', cat: 'sans-serif' }],
  'space grotesk':      [{ name: 'Space Grotesk', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'playfair display':   [{ name: 'Playfair Display', cat: 'serif' }, { name: 'DM Serif Display', cat: 'serif' }],
  'merriweather':       [{ name: 'Merriweather', cat: 'serif' }, { name: 'Lora', cat: 'serif' }],
  'lora':               [{ name: 'Lora', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }],
  'crimson text':       [{ name: 'Crimson Pro', cat: 'serif' }, { name: 'EB Garamond', cat: 'serif' }],
  'trade gothic':       [{ name: 'Barlow', cat: 'sans-serif' }, { name: 'Barlow Condensed', cat: 'sans-serif' }],
  'futura':             [{ name: 'Jost', cat: 'sans-serif' }, { name: 'Montserrat', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }],
  'gill sans':          [{ name: 'Cabin', cat: 'sans-serif' }, { name: 'Karla', cat: 'sans-serif' }],
  'gotham':             [{ name: 'Montserrat', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }],
  'avenir':             [{ name: 'Nunito', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'proxima nova':       [{ name: 'Inter', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'brandon grotesque':  [{ name: 'Nunito Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'circular':           [{ name: 'Plus Jakarta Sans', cat: 'sans-serif' }, { name: 'Nunito', cat: 'sans-serif' }],
  'figtree':            [{ name: 'Figtree', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'jakarta':            [{ name: 'Plus Jakarta Sans', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }],
  'plus jakarta sans':  [{ name: 'Plus Jakarta Sans', cat: 'sans-serif' }, { name: 'Inter', cat: 'sans-serif' }],
};

// ── Keyword → fallback suggestions ───────────────────────────────────────────
const KEYWORD_FALLBACKS = [
  { keywords: ['mono', 'code', 'console', 'terminal', 'type', 'writer'], suggestions: [{ name: 'JetBrains Mono', cat: 'monospace' }, { name: 'Fira Code', cat: 'monospace' }, { name: 'IBM Plex Mono', cat: 'monospace' }] },
  { keywords: ['serif', 'roman', 'text', 'story', 'book', 'italic'], suggestions: [{ name: 'Lora', cat: 'serif' }, { name: 'Merriweather', cat: 'serif' }, { name: 'Playfair Display', cat: 'serif' }] },
  { keywords: ['display', 'head', 'title', 'hero', 'large', 'bold', 'heavy'], suggestions: [{ name: 'Syne', cat: 'sans-serif' }, { name: 'Space Grotesk', cat: 'sans-serif' }, { name: 'DM Serif Display', cat: 'serif' }] },
  { keywords: ['condensed', 'narrow', 'compact', 'cond'], suggestions: [{ name: 'Barlow Condensed', cat: 'sans-serif' }, { name: 'Roboto Condensed', cat: 'sans-serif' }] },
  { keywords: ['sans', 'grotesk', 'grotesque', 'gothic'], suggestions: [{ name: 'Inter', cat: 'sans-serif' }, { name: 'DM Sans', cat: 'sans-serif' }, { name: 'Nunito Sans', cat: 'sans-serif' }] },
  { keywords: ['rounded', 'soft', 'friendly', 'round'], suggestions: [{ name: 'Nunito', cat: 'sans-serif' }, { name: 'Comfortaa', cat: 'display' }, { name: 'Quicksand', cat: 'sans-serif' }] },
  { keywords: ['handwriting', 'script', 'cursive', 'brush', 'written', 'ink'], suggestions: [{ name: 'Dancing Script', cat: 'handwriting' }, { name: 'Pacifico', cat: 'handwriting' }, { name: 'Sacramento', cat: 'handwriting' }] },
];

// ── Default generic fallbacks ─────────────────────────────────────────────────
const GENERIC_FALLBACK = [
  { name: 'Inter', cat: 'sans-serif' },
  { name: 'Lora', cat: 'serif' },
  { name: 'JetBrains Mono', cat: 'monospace' },
];

/**
 * Builds a Google Fonts specimen URL.
 */
function googleFontsUrl(name) {
  return `https://fonts.google.com/specimen/${encodeURIComponent(name.replace(/ /g, '+'))}`;
}

/**
 * Returns an array of { name, cat, url } suggestion objects
 * for a given font family string.
 * @param {string} family  The extracted font-family name.
 * @returns {{ name: string, cat: string, url: string }[]}
 */
export function getSimilarGoogleFonts(family) {
  const key = family.toLowerCase().trim();

  // 1. Explicit exact match
  if (EXPLICIT_MAP[key]) {
    return EXPLICIT_MAP[key].slice(0, 3).map(s => ({ ...s, url: googleFontsUrl(s.name) }));
  }

  // 2. Partial / substring match in the explicit map
  for (const [mapKey, sug] of Object.entries(EXPLICIT_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return sug.slice(0, 3).map(s => ({ ...s, url: googleFontsUrl(s.name) }));
    }
  }

  // 3. Keyword fuzzy match against category keyword lists
  for (const { keywords, suggestions } of KEYWORD_FALLBACKS) {
    if (keywords.some(kw => key.includes(kw))) {
      return suggestions.slice(0, 3).map(s => ({ ...s, url: googleFontsUrl(s.name) }));
    }
  }

  // 4. Generic fallback
  return GENERIC_FALLBACK.map(s => ({ ...s, url: googleFontsUrl(s.name) }));
}
