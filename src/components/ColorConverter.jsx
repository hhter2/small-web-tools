import React, { useState, useEffect, useRef } from 'react';

function parseHexColor(value) {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function parseRgbColor(value) {
  const trimmed = value.trim();
  const match =
    trimmed.match(
      /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i
    ) || trimmed.match(/^([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})$/);

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if ([r, g, b].some((val) => Number.isNaN(val) || val < 0 || val > 255)) {
    return null;
  }

  return { r, g, b };
}

function parseHslColor(value) {
  const trimmed = value.trim();
  const match =
    trimmed.match(
      /^hsl\(\s*([0-9]{1,3}(?:\.\d+)?)\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*\)$/i
    ) ||
    trimmed.match(
      /^([0-9]{1,3}(?:\.\d+)?)\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*,\s*([0-9]{1,3}(?:\.\d+)?)%$/
    );

  if (!match) {
    return null;
  }

  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);

  if ([h, s, l].some((val) => Number.isNaN(val))) {
    return null;
  }
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    return null;
  }

  return { h, s, l };
}

function rgbToHex({ r, g, b }) {
  const toHex = (val) => val.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb({ h, s, l }) {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
  } else if (hPrime < 2) {
    r1 = x;
    g1 = c;
  } else if (hPrime < 3) {
    g1 = c;
    b1 = x;
  } else if (hPrime < 4) {
    g1 = x;
    b1 = c;
  } else if (hPrime < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const m = lNorm - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function formatRgb({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function formatHsl({ h, s, l }) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// HSL Swatches Block Grid Generation (12 columns x 10 rows)
const SWATCH_GRID = (() => {
  const grid = [];
  const rowsCount = 10;
  
  // Grayscale values for Column 1
  const grayscaleL = [100, 89, 78, 67, 56, 45, 34, 23, 12, 0];
  
  // 11 Hue columns spaced across spectrum
  const hues = [0, 25, 45, 80, 140, 180, 205, 230, 265, 300, 330];
  // Lightness levels for Hues
  const hueL = [95, 85, 75, 65, 55, 45, 35, 25, 15, 8];

  for (let r = 0; r < rowsCount; r++) {
    const row = [];
    
    // Column 1: Grayscale (S = 0%)
    const grayRgb = hslToRgb({ h: 0, s: 0, l: grayscaleL[r] });
    const grayHex = rgbToHex(grayRgb);
    row.push(grayHex);

    // Columns 2-12: Hues (S = 100%)
    for (let c = 0; c < hues.length; c++) {
      const hueRgb = hslToRgb({ h: hues[c], s: 100, l: hueL[r] });
      const hueHex = rgbToHex(hueRgb);
      row.push(hueHex);
    }
    
    grid.push(row);
  }
  
  return grid;
})();

// Cookie Helper Functions
const saveCookie = (name, value, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/`;
};

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    try {
      return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
    } catch (e) {}
  }
  return null;
};

// 12 Curated modern presets
const DEFAULT_PRESETS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#4F46E5", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#94A3B8", // Slate
  "#1E293B", // Charcoal
];

export default function ColorConverter() {
  const [input, setInput] = useState('#4F46E5');
  const [hslState, setHslState] = useState({ h: 244, s: 76, l: 59 });
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = localStorage.getItem("recentColors");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // State for Customizable Standard Palettes
  const [presets, setPresets] = useState(() => {
    try {
      const savedLocal = localStorage.getItem("customPresets");
      if (savedLocal) return JSON.parse(savedLocal);
    } catch (e) {}

    const savedCookie = getCookie("customPresets");
    if (savedCookie) return savedCookie;

    return DEFAULT_PRESETS;
  });

  const [isEditingPresets, setIsEditingPresets] = useState(false);

  const svRef = useRef(null);
  const lRef = useRef(null);
  const fileInputRef = useRef(null);

  const trimmed = input.trim();

  let hexVal = "";
  let rgbVal = "";
  let hslVal = "";
  let statusText = "Enter a HEX, RGB, or HSL color.";
  let swatchBg = "transparent";

  // Parse current text input to update the outputs
  if (trimmed) {
    const parsedHsl = parseHslColor(trimmed);
    const rgb =
      parseHexColor(trimmed) ||
      parseRgbColor(trimmed) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null);

    if (rgb) {
      const hex = rgbToHex(rgb);
      const computedHsl = rgbToHsl(rgb);
      hexVal = hex;
      rgbVal = formatRgb(rgb);
      hslVal = formatHsl(computedHsl);
      statusText = "";
      swatchBg = hex;
    } else {
      statusText = "Invalid color format.";
    }
  }

  // Sync text input edits to visual HSL state
  useEffect(() => {
    if (!trimmed) return;
    const parsedHsl = parseHslColor(trimmed);
    const rgb =
      parseHexColor(trimmed) ||
      parseRgbColor(trimmed) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null);

    if (rgb) {
      const computedHsl = rgbToHsl(rgb);
      setHslState((prev) => {
        if (
          prev.h === computedHsl.h &&
          prev.s === computedHsl.s &&
          prev.l === computedHsl.l
        ) {
          return prev;
        }
        return computedHsl;
      });
    }
  }, [input]);

  // Add a hex color to recent colors list
  const addRecentColor = (hex) => {
    if (!hex) return;
    const formatted = hex.toUpperCase();
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toUpperCase() !== formatted);
      const next = [formatted, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("recentColors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Clear Recent Colors
  const handleClearRecents = () => {
    setRecentColors([]);
    try {
      localStorage.removeItem("recentColors");
    } catch (e) {}
  };

  // Eyedropper API
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      setInput(hex);
      addRecentColor(hex);
    } catch (err) {
      console.log("EyeDropper cancelled or failed", err);
    }
  };

  // Drag handlers for Hue-Saturation Board
  const updateSv = (clientX, clientY) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    const h = Math.round((x / rect.width) * 360);
    const s = Math.round((1 - y / rect.height) * 100);
    const l = hslState.l; // Preserve current Lightness

    const nextHsl = { h, s, l };
    setHslState(nextHsl);

    const rgb = hslToRgb(nextHsl);
    const hex = rgbToHex(rgb);
    setInput(hex);
  };

  const handleSvMouseDown = (e) => {
    e.preventDefault();
    updateSv(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent) => {
      updateSv(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Add final selected color to recents
      setHslState((curr) => {
        const rgb = hslToRgb(curr);
        addRecentColor(rgbToHex(rgb));
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSvTouchStart = (e) => {
    updateSv(e.touches[0].clientX, e.touches[0].clientY);

    const handleTouchMove = (moveEvent) => {
      updateSv(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      setHslState((curr) => {
        const rgb = hslToRgb(curr);
        addRecentColor(rgbToHex(rgb));
        return curr;
      });
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Drag handlers for Lightness Slider
  const updateL = (clientX, clientY) => {
    if (!lRef.current) return;
    const rect = lRef.current.getBoundingClientRect();
    let y = clientY - rect.top;

    y = Math.max(0, Math.min(y, rect.height));

    const l = Math.round((1 - y / rect.height) * 100);
    const h = hslState.h;
    const s = hslState.s;

    const nextHsl = { h, s, l };
    setHslState(nextHsl);

    const rgb = hslToRgb(nextHsl);
    const hex = rgbToHex(rgb);
    setInput(hex);
  };

  const handleLMouseDown = (e) => {
    e.preventDefault();
    updateL(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent) => {
      updateL(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setHslState((curr) => {
        const rgb = hslToRgb(curr);
        addRecentColor(rgbToHex(rgb));
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleLTouchStart = (e) => {
    updateL(e.touches[0].clientX, e.touches[0].clientY);

    const handleTouchMove = (moveEvent) => {
      updateL(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      setHslState((curr) => {
        const rgb = hslToRgb(curr);
        addRecentColor(rgbToHex(rgb));
        return curr;
      });
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Handle manual input confirm to add to recent list
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmed = input.trim();
      const parsedHsl = parseHslColor(trimmed);
      const rgb =
        parseHexColor(trimmed) ||
        parseRgbColor(trimmed) ||
        (parsedHsl ? hslToRgb(parsedHsl) : null);
      if (rgb) {
        addRecentColor(rgbToHex(rgb));
      }
    }
  };

  const handleInputBlur = () => {
    const trimmed = input.trim();
    const parsedHsl = parseHslColor(trimmed);
    const rgb =
      parseHexColor(trimmed) ||
      parseRgbColor(trimmed) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null);
    if (rgb) {
      addRecentColor(rgbToHex(rgb));
    }
  };

  // Swatch click helper
  const handleSwatchClick = (hex) => {
    setInput(hex);
    addRecentColor(hex);
  };

  // Preset customization controls
  const handleAddPreset = () => {
    if (swatchBg && swatchBg !== 'transparent') {
      const formatted = swatchBg.toUpperCase();
      if (presets.includes(formatted)) {
        alert("This color is already in the standard palette!");
        return;
      }
      const next = [...presets, formatted];
      setPresets(next);
      try {
        localStorage.setItem("customPresets", JSON.stringify(next));
      } catch (e) {}
      saveCookie("customPresets", next);
    }
  };

  const handleDeletePreset = (indexToDelete) => {
    const next = presets.filter((_, idx) => idx !== indexToDelete);
    setPresets(next);
    try {
      localStorage.setItem("customPresets", JSON.stringify(next));
    } catch (e) {}
    saveCookie("customPresets", next);
  };

  const handleResetPresets = () => {
    if (window.confirm("Are you sure you want to reset the Standard Palette to the default 12 colors?")) {
      setPresets(DEFAULT_PRESETS);
      try {
        localStorage.removeItem("customPresets");
      } catch (e) {}
      document.cookie = "customPresets=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  };

  const handleExportPresets = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "custom_color_palette.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportPresets = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string' && item.startsWith('#'))) {
          setPresets(parsed);
          try {
            localStorage.setItem("customPresets", JSON.stringify(parsed));
          } catch (e) {}
          saveCookie("customPresets", parsed);
        } else {
          alert("Invalid file format. The JSON file must contain an array of hex color strings (e.g. ['#FF0000', '#00FF00']).");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    fileReader.readAsText(file);
    e.target.value = "";
  };

  return (
    <article id="tool-color" className="tool-card tool-card--wide active">
      <h2>Color Code Converter & HSL Selector</h2>
      
      <div className="color-tool-layout">
        
        {/* Panel 1: Code Converter Inputs/Outputs */}
        <div className="color-converter-section">
          <h3>Code Converter</h3>
          <div className="form-group">
            <label htmlFor="color-input">HEX, RGB, or HSL Code</label>
            <div className="input-with-button">
              <input
                id="color-input"
                type="text"
                placeholder="#4F46E5 or rgb(79, 70, 229) or hsl(244, 76%, 59%)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
              />
              {hasEyeDropper && (
                <button
                  type="button"
                  className="eyedropper-btn"
                  title="Pick color from screen"
                  onClick={handleEyeDropper}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 22l6-6M8 16l4 4M19.5 4.5a3.53 3.53 0 0 1 0 5L12 17l-5-5 7.5-7.5a3.53 3.53 0 0 1 5 0z"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div
            className="color-preview-bar"
            id="color-preview-swatch"
            style={{ backgroundColor: swatchBg }}
          />
          
          <div className="row outputs">
            <div className="form-group">
              <label htmlFor="color-hex">HEX</label>
              <input id="color-hex" type="text" readOnly value={hexVal} />
            </div>
            <div className="form-group">
              <label htmlFor="color-rgb">RGB</label>
              <input id="color-rgb" type="text" readOnly value={rgbVal} />
            </div>
            <div className="form-group">
              <label htmlFor="color-hsl">HSL</label>
              <input id="color-hsl" type="text" readOnly value={hslVal} />
            </div>
          </div>
          
          <p className="small status-msg" id="color-status">{statusText}</p>
        </div>

        {/* Panel 2: Visual Swatches Grid Selector */}
        <div className="color-picker-section">
          <h3>HSL Swatches</h3>
          
          <div className="swatches-block-grid">
            {SWATCH_GRID.map((row, rIdx) => 
              row.map((hex, cIdx) => {
                const isSelected = hexVal.toUpperCase() === hex.toUpperCase();
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    type="button"
                    className={`swatch-block ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                    onClick={() => handleSwatchClick(hex)}
                  />
                );
              })
            )}
          </div>

          {/* Standard Palette section */}
          <div className="swatches-section">
            <div className="swatches-header">
              <span className="swatches-label">Standard Palettes</span>
              <div className="swatches-controls">
                {!isEditingPresets ? (
                  <button
                    type="button"
                    className="palette-control-btn"
                    onClick={() => setIsEditingPresets(true)}
                  >
                    Customize
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="palette-control-btn primary"
                      onClick={() => setIsEditingPresets(false)}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="palette-control-btn danger"
                      onClick={handleResetPresets}
                      title="Reset to default 12 colors"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="palette-control-btn"
                      onClick={handleExportPresets}
                      title="Export palette as JSON"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className="palette-control-btn"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      title="Import palette from JSON"
                    >
                      Import
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleImportPresets}
                    />
                  </>
                )}
              </div>
            </div>
            
            <div className={`swatches-grid ${isEditingPresets ? 'editing' : ''}`}>
              {presets.map((hex, idx) => (
                <div key={`${hex}-${idx}`} className="swatch-wrapper">
                  <button
                    type="button"
                    className="swatch-btn"
                    style={{ backgroundColor: hex }}
                    title={hex}
                    onClick={() => !isEditingPresets && handleSwatchClick(hex)}
                  />
                  {isEditingPresets && (
                    <button
                      type="button"
                      className="swatch-delete-btn"
                      title="Delete color"
                      onClick={() => handleDeletePreset(idx)}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              {isEditingPresets && swatchBg && swatchBg !== 'transparent' && (
                <button
                  type="button"
                  className="swatch-add-btn"
                  title={`Add current color (${swatchBg})`}
                  onClick={handleAddPreset}
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Visual HSL Spectrum Selector */}
        <div className="color-picker-section">
          <h3>HSL Spectrum</h3>
          
          <div className="hsl-picker-container">
            {/* 2D Hue-Saturation board */}
            <div
              ref={svRef}
              className="hsl-picker-board"
              onMouseDown={handleSvMouseDown}
              onTouchStart={handleSvTouchStart}
            >
              {/* Rainbow horizontal overlay + gray vertical overlay */}
              <div className="hsl-picker-board-rainbow" />
              <div className="hsl-picker-board-saturation" />
              
              {/* Slider marker indicator */}
              <div
                className="hsl-marker"
                style={{
                  left: `${(hslState.h / 360) * 100}%`,
                  top: `${100 - hslState.s}%`,
                  backgroundColor: `hsl(${hslState.h}, ${hslState.s}%, ${hslState.l}%)`
                }}
              />
            </div>

            {/* Vertical Lightness slider */}
            <div className="lightness-slider-wrapper">
              <span className="slider-label">Lightness</span>
              <div
                ref={lRef}
                className="lightness-slider"
                style={{
                  background: `linear-gradient(to top, #000 0%, hsl(${hslState.h}, ${hslState.s}%, 50%) 50%, #fff 100%)`
                }}
                onMouseDown={handleLMouseDown}
                onTouchStart={handleLTouchStart}
              >
                {/* Vertical slider handle indicator */}
                <div
                  className="lightness-handle"
                  style={{
                    top: `${100 - hslState.l}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recent Colors section */}
          {recentColors.length > 0 && (
            <div className="swatches-section recent-colors">
              <div className="swatches-header">
                <span className="swatches-label">Recent Colors</span>
                <button
                  type="button"
                  className="palette-control-btn danger"
                  onClick={handleClearRecents}
                >
                  Clear
                </button>
              </div>
              <div className="swatches-grid">
                {recentColors.map((hex, idx) => (
                  <button
                    key={`${hex}-${idx}`}
                    type="button"
                    className="swatch-btn"
                    style={{ backgroundColor: hex }}
                    title={hex}
                    onClick={() => handleSwatchClick(hex)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </article>
  );
}
