import React, { useState, useEffect, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import Spinner from './ui/Spinner';

// ── fontSimilarity: Lightweight local matcher ─────────────────────────────────
// Given a font family name, returns up to 3 suggested Google Fonts alternatives
// based on explicit mapping or fuzzy category keyword matching.

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

const BADGE_STYLES = {
  WOFF2:    'bg-accent-light text-accent',
  WOFF:     'bg-blue-500/10 text-blue-500 dark:text-blue-400',
  TRUETYPE: 'bg-purple-500/10 text-purple-500 dark:text-purple-400',
  OPENTYPE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  EOT:      'bg-red-500/10 text-red-500 dark:text-red-400',
  SVG:      'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
};

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
function getSimilarGoogleFonts(family) {
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

// ── Format badge colour using CSS variables already in the project ────────────
function formatBadgeClass(format) {
  const norm = format?.toUpperCase() || '';
  return `inline-flex items-center px-2 py-0.5 rounded font-semibold text-[0.7rem] tracking-wider whitespace-nowrap shrink-0 ${BADGE_STYLES[norm] || 'bg-slate-500/10 text-text-muted'}`;
}

// ── Single font card ──────────────────────────────────────────────────────────
function FontCard({ font, index, previewText }) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleTriggerClick = (e) => {
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  const handleMouseEnter = () => {
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    setShowDropdown(false);
  };

  const handleOptionClick = () => {
    setShowDropdown(false);
  };

  const fontId = `font-ext-preview-${index}`;

  const isDataUrl = font.url.startsWith('data:');
  const proxyUrl = isDataUrl
    ? font.url
    : `/api/font-proxy?url=${encodeURIComponent(font.url)}&referer=${encodeURIComponent(font.referer || '')}`;

  const previewFamily = `FontExtPreview${index}`;
  const similar = getSimilarGoogleFonts(font.family);

  // Inject @font-face into document head for live preview
  useEffect(() => {
    setFontLoaded(false);
    const existing = document.getElementById(fontId);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = fontId;
    style.textContent = `
      @font-face {
        font-family: '${previewFamily}';
        src: url('${proxyUrl}');
        font-weight: ${font.weight || 'normal'};
        font-style: ${font.style || 'normal'};
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => setFontLoaded(true), isDataUrl ? 100 : 900);

    return () => {
      const el = document.getElementById(fontId);
      if (el) el.remove();
    };
  }, [font.url, proxyUrl]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = font.name || `${font.family}.${font.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(font.url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const displayText = previewText.trim() || 'The quick brown fox jumps over the lazy dog';

  return (
    <div className="flex flex-col gap-3.5 bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-accent hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[1.05rem] font-bold text-text-main truncate tracking-tight">{font.family}</h3>
          <p className="text-[0.74rem] text-text-muted mt-0.5 truncate">{font.name}</p>
        </div>
        <span className={formatBadgeClass(font.format)}>{font.format}</span>
      </div>

      {/* Live preview */}
      <div className="bg-app border border-border rounded-xl p-4 min-h-[80px] flex items-center justify-center">
        {fontLoaded ? (
          <p
            className="text-lg text-text-main text-center leading-relaxed break-all"
            style={{
              fontFamily: `'${previewFamily}', sans-serif`,
              fontStyle: font.style || 'normal',
              fontWeight: font.weight || 'normal',
            }}
          >
            {displayText}
          </p>
        ) : (
          <div className="flex items-center gap-2.5 text-text-muted text-[0.83rem]">
            <Spinner size="small" />
            <span>Loading preview…</span>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex gap-4.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[0.79rem] text-text-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          Weight: {font.weight || '400'}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.79rem] text-text-muted capitalize">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          Style: {font.style || 'normal'}
        </span>
      </div>

      {/* Action row */}
      <div className="flex gap-2 flex-wrap">
        <div
          className="relative flex-1 min-w-[120px]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            id={`font-ext-download-${index}`}
            className="w-full justify-center"
            variant="primary"
            disabled={downloading}
            onClick={handleTriggerClick}
          >
            {downloading ? (
              <>
                <Spinner size="small" />
                Downloading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </Button>

          {showDropdown && !downloading && (
            <div className="block absolute top-full left-0 w-max min-w-full z-[100] pt-1.5 bg-transparent animate-[fontDropdownFadeIn_0.15s_ease-out]">
              <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2.5 px-4 bg-transparent border-none text-text-main text-[0.82rem] font-medium text-left cursor-pointer transition-colors duration-150 hover:bg-nav-hover-bg hover:text-accent border-b border-border last:border-b-0"
                  onClick={() => {
                    handleDownload();
                    handleOptionClick();
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Directly
                </button>
                <a
                  href={`https://fonts.google.com/?query=${encodeURIComponent(font.family)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full p-2.5 px-4 bg-transparent border-none text-text-main text-[0.82rem] font-medium text-left cursor-pointer transition-colors duration-150 hover:bg-nav-hover-bg hover:text-accent border-b border-border last:border-b-0"
                  onClick={handleOptionClick}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Find on Google Fonts
                </a>
              </div>
            </div>
          )}
        </div>
        <Button
          id={`font-ext-similar-toggle-${index}`}
          className="flex-1 justify-center"
          variant="secondary"
          active={showSimilar}
          onClick={() => setShowSimilar(v => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Similar Fonts
        </Button>
      </div>

      {/* Google Fonts suggestions panel */}
      {showSimilar && (
        <div className="bg-app border border-border rounded-xl p-[13px_14px] flex flex-col gap-2.5">
          <p className="text-[0.77rem] text-text-muted font-medium">Free Google Fonts alternatives:</p>
          <div className="flex flex-wrap gap-1.5">
            {similar.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 p-1.5 px-3 bg-card border border-border rounded-lg text-[0.79rem] text-text-main font-medium transition-all duration-150 hover:bg-accent-light hover:border-accent hover:text-accent"
                title={`View ${s.name} on Google Fonts`}
              >
                <span>{s.name}</span>
                <span className="text-[0.69rem] text-text-muted italic">{s.cat}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main tool component ───────────────────────────────────────────────────────
export default function WebsiteFontExtractor() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [fonts, setFonts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const inputRef = useRef(null);

  const exampleUrls = ['stripe.com', 'linear.app', 'vercel.com'];

  const doExtract = async (rawUrl) => {
    let target = (rawUrl || urlInput).trim();
    if (!target) {
      setStatus('Please enter a website URL.');
      return;
    }
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    setLoading(true);
    setStatus('Scanning website and extracting fonts…');
    setFonts([]);
    setSearched(true);

    try {
      const res = await fetch('/api/extract-fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();

      if (!data.ok) {
        setStatus(`Error: ${data.error || 'Extraction failed.'}`);
        return;
      }

      if (!data.fonts || data.fonts.length === 0) {
        setStatus('No web fonts found on this website. The site may use system fonts or dynamic font loading.');
        return;
      }

      setFonts(data.fonts);
      setStatus('');
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') doExtract();
  };

  const handleExampleClick = (url) => {
    setUrlInput(url);
    inputRef.current?.focus();
  };

  const handleCopyUrl = () => {
    if (!urlInput.trim()) return;
    navigator.clipboard.writeText(urlInput).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
    });
  };

  return (
    <Card id="tool-fontextractor" variant="tool" size="wide">
      <ToolHeader 
        title="Website Font Extractor" 
      />

      {/* URL Input section */}
      <div className="flex flex-col gap-2 w-full mt-4">
        <label htmlFor="fontextractor-input" className="text-sm font-semibold text-text-main">Website URL</label>
        <div className="search-input-group">
          <input
            ref={inputRef}
            id="fontextractor-input"
            type="url"
            className="flex-1 min-w-0 px-4 py-2.5 bg-card border border-border rounded-lg text-text-main placeholder-text-muted/50 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-light/20"
            placeholder="Enter a website URL (e.g., stripe.com)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            id="fontextractor-btn"
            variant="primary"
            onClick={() => doExtract()}
            disabled={loading}
          >
            {loading ? 'Scanning…' : 'Extract'}
          </Button>
        </div>
        <p className="text-[0.78rem] text-text-muted mt-1">
          Try:&nbsp;
          {exampleUrls.map((u, i) => (
            <React.Fragment key={u}>
              <button
                type="button"
                className="bg-none border-none text-accent text-inherit cursor-pointer p-0 underline underline-offset-2 transition-colors hover:text-accent/80"
                onClick={() => handleExampleClick(u)}
              >
                {u}
              </button>
              {i < exampleUrls.length - 1 && ', '}
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* Loading indicator */}
      {loading && (
        <Spinner
          id="fontextractor-loader"
          container
          label="Fetching stylesheets and parsing font definitions…"
          className="py-12 w-full"
        />
      )}

      {/* Error / info status */}
      {!loading && status && (
        <p className="min-h-[18px] text-red-500 font-medium text-sm mt-2" id="fontextractor-status">{status}</p>
      )}

      {/* Results section */}
      {!loading && fonts.length > 0 && (
        <div id="fontextractor-results" className="flex flex-col gap-5 w-full mt-4">

          {/* Results header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 px-4 bg-app border border-border rounded-xl">
            <div className="flex items-center gap-1.5 text-[0.88rem] text-text-muted whitespace-nowrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <strong>{fonts.length}</strong>&nbsp;font{fonts.length !== 1 ? ' families' : ' family'} found
            </div>

            {/* Preview text input */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 md:justify-end max-md:w-full max-md:justify-start">
              <label htmlFor="fontextractor-preview-text" className="text-[0.82rem] text-text-muted whitespace-nowrap shrink-0">
                Preview text:
              </label>
              <input
                id="fontextractor-preview-text"
                type="text"
                className="flex-1 min-w-0 md:max-w-[280px] max-md:w-full p-[7px_12px] border border-border rounded-lg bg-card text-text-main text-[0.83rem] outline-none transition-all focus:border-accent focus:ring-3 focus:ring-accent-light/20"
                placeholder="The quick brown fox…"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          {/* Font cards grid */}
          <div className="max-h-[250px] md:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fonts.map((font, i) => (
                <FontCard
                  key={`${font.url}-${i}`}
                  font={font}
                  index={i}
                  previewText={previewText}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state after search with no results */}
      {!loading && searched && fonts.length === 0 && !status && (
        <div className="flex flex-col items-center gap-2.5 py-10 px-5 text-center text-text-muted w-full">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <p className="text-[0.95rem] text-text-main font-medium">No web fonts found on this website.</p>
          <span className="text-[0.82rem] text-text-muted max-w-[360px]">The site may use only system fonts or load fonts dynamically via JavaScript.</span>
        </div>
      )}
    </Card>
  );
}
