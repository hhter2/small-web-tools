import React, { useState, useEffect, useRef } from 'react';
import { getSimilarGoogleFonts } from '../utils/fontSimilarity.js';

// ── Format badge colour using CSS variables already in the project ────────────
function formatBadgeClass(format) {
  const map = {
    WOFF2:    'font-badge--woff2',
    WOFF:     'font-badge--woff',
    TRUETYPE: 'font-badge--ttf',
    OPENTYPE: 'font-badge--otf',
    EOT:      'font-badge--eot',
    SVG:      'font-badge--svg',
  };
  return `font-badge ${map[format?.toUpperCase()] || 'font-badge--unknown'}`;
}

// ── Single font card ──────────────────────────────────────────────────────────
function FontCard({ font, index, previewText }) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
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
      window.open(font.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const displayText = previewText.trim() || 'The quick brown fox jumps over the lazy dog';

  return (
    <div className="font-ext-card">
      {/* Header row */}
      <div className="font-ext-card-header">
        <div className="font-ext-card-title-group">
          <h3 className="font-ext-card-family">{font.family}</h3>
          <p className="font-ext-card-filename">{font.name}</p>
        </div>
        <span className={formatBadgeClass(font.format)}>{font.format}</span>
      </div>

      {/* Live preview */}
      <div className="font-ext-preview-box">
        {fontLoaded ? (
          <p
            className="font-ext-preview-text"
            style={{
              fontFamily: `'${previewFamily}', sans-serif`,
              fontStyle: font.style || 'normal',
              fontWeight: font.weight || 'normal',
            }}
          >
            {displayText}
          </p>
        ) : (
          <div className="font-ext-preview-loading">
            <div className="spinner" />
            <span>Loading preview…</span>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="font-ext-meta-row">
        <span className="font-ext-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          Weight: {font.weight || '400'}
        </span>
        <span className="font-ext-meta-item" style={{ textTransform: 'capitalize' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          Style: {font.style || 'normal'}
        </span>
      </div>

      {/* Action row */}
      <div className="font-ext-actions">
        <button
          className="btn-primary font-ext-btn-download"
          onClick={handleDownload}
          disabled={downloading}
          id={`font-ext-download-${index}`}
        >
          {downloading ? (
            <>
              <div className="spinner spinner--small" />
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
            </>
          )}
        </button>
        <button
          className={`btn-secondary font-ext-btn-similar ${showSimilar ? 'active' : ''}`}
          onClick={() => setShowSimilar(v => !v)}
          id={`font-ext-similar-toggle-${index}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Similar Fonts
        </button>
      </div>

      {/* Google Fonts suggestions panel */}
      {showSimilar && (
        <div className="font-ext-similar-panel">
          <p className="font-ext-similar-label">Free Google Fonts alternatives:</p>
          <div className="font-ext-similar-list">
            {similar.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-ext-similar-chip"
                title={`View ${s.name} on Google Fonts`}
              >
                <span>{s.name}</span>
                <span className="font-ext-similar-cat">{s.cat}</span>
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
    <article id="tool-fontextractor" className="tool-card tool-card--wide active">
      <h2>Website Font Extractor</h2>

      {/* URL Input section */}
      <div className="form-group">
        <label htmlFor="fontextractor-input">Website URL</label>
        <div className="search-input-group">
          <input
            ref={inputRef}
            id="fontextractor-input"
            type="url"
            placeholder="Enter a website URL (e.g., stripe.com)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            id="fontextractor-btn"
            type="button"
            className="btn-primary"
            onClick={() => doExtract()}
            disabled={loading}
          >
            {loading ? 'Scanning…' : 'Extract'}
          </button>
        </div>
        <p className="font-ext-hint">
          Try:&nbsp;
          {exampleUrls.map((u, i) => (
            <React.Fragment key={u}>
              <button
                type="button"
                className="font-ext-example-link"
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
        <div id="fontextractor-loader" className="loader-container">
          <div className="spinner" />
          <span>Fetching stylesheets and parsing font definitions…</span>
        </div>
      )}

      {/* Error / info status */}
      {!loading && status && (
        <p className="small status-msg" id="fontextractor-status">{status}</p>
      )}

      {/* Results section */}
      {!loading && fonts.length > 0 && (
        <div id="fontextractor-results" className="font-ext-results">

          {/* Results header */}
          <div className="font-ext-results-header">
            <div className="font-ext-results-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <strong>{fonts.length}</strong>&nbsp;font{fonts.length !== 1 ? ' families' : ' family'} found
            </div>

            {/* Preview text input */}
            <div className="font-ext-preview-input-wrap">
              <label htmlFor="fontextractor-preview-text" className="font-ext-preview-input-label">
                Preview text:
              </label>
              <input
                id="fontextractor-preview-text"
                type="text"
                className="font-ext-preview-input"
                placeholder="The quick brown fox…"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          {/* Font cards grid */}
          <div className="font-ext-grid">
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
      )}

      {/* Empty state after search with no results */}
      {!loading && searched && fonts.length === 0 && !status && (
        <div className="font-ext-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <p>No web fonts found on this website.</p>
          <span>The site may use only system fonts or load fonts dynamically via JavaScript.</span>
        </div>
      )}
    </article>
  );
}
