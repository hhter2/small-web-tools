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

  const svRef = useRef(null);
  const lRef = useRef(null);

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

  return (
    <article id="tool-color" className="tool-card tool-card--wide active">
      <h2>Color Code Converter & HSL Selector</h2>
      
      <div className="color-tool-layout">
        
        {/* Left Column: Code Converter Inputs/Outputs */}
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

        {/* Right Column: PowerPoint Customize Page HSL Selector */}
        <div className="color-picker-section">
          <h3>Visual HSL Selector</h3>
          
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

          <div className="swatches-section">
            <span className="swatches-label">Standard Palettes</span>
            <div className="swatches-grid">
              {DEFAULT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className="swatch-btn"
                  style={{ backgroundColor: hex }}
                  title={hex}
                  onClick={() => handleSwatchClick(hex)}
                />
              ))}
            </div>
          </div>

          {recentColors.length > 0 && (
            <div className="swatches-section recent-colors">
              <span className="swatches-label">Recent Colors</span>
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
