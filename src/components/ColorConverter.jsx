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

function parseHsbColor(value) {
  const trimmed = value.trim();
  const match =
    trimmed.match(
      /^hsb\(\s*([0-9]{1,3}(?:\.\d+)?)\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*\)$/i
    ) ||
    trimmed.match(
      /^hsv\(\s*([0-9]{1,3}(?:\.\d+)?)\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*\)$/i
    ) ||
    trimmed.match(
      /^([0-9]{1,3}(?:\.\d+)?)\s*,\s*([0-9]{1,3}(?:\.\d+)?)%\s*,\s*([0-9]{1,3}(?:\.\d+)?)%$/
    );
  if (!match) return null;
  const h = Number(match[1]);
  const s = Number(match[2]);
  const b = Number(match[3]);
  if ([h, s, b].some(Number.isNaN)) return null;
  if (h < 0 || h > 360 || s < 0 || s > 100 || b < 0 || b > 100) return null;
  return { h, s, b };
}

function parseCmykColor(value) {
  const trimmed = value.trim();
  const match =
    trimmed.match(
      /^cmyk\(\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?\s*\)$/i
    ) ||
    trimmed.match(
      /^([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*([0-9]{1,3}(?:\.\d+)?)%?$/
    );
  if (!match) return null;
  const c = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const k = Number(match[4]);
  if ([c, m, y, k].some(Number.isNaN)) return null;
  if (c < 0 || c > 100 || m < 0 || m > 100 || y < 0 || y > 100 || k < 0 || k > 100) return null;
  return { c, m, y, k };
}

function parseLabColor(value) {
  const trimmed = value.trim();
  const match =
    trimmed.match(
      /^lab\(\s*([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*(-?[0-9]{1,3}(?:\.\d+)?)\s*,\s*(-?[0-9]{1,3}(?:\.\d+)?)\s*\)$/i
    ) ||
    trimmed.match(
      /^([0-9]{1,3}(?:\.\d+)?)%?\s*,\s*(-?[0-9]{1,3}(?:\.\d+)?)\s*,\s*(-?[0-9]{1,3}(?:\.\d+)?)$/
    );
  if (!match) return null;
  const l = Number(match[1]);
  const a = Number(match[2]);
  const b = Number(match[3]);
  if ([l, a, b].some(Number.isNaN)) return null;
  if (l < 0 || l > 100 || a < -128 || a > 127 || b < -128 || b > 127) return null;
  return { l, a, b };
}

function rgbToHsb({ r, g, b }) {
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
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    b: Math.round(max * 100),
  };
}

function hsbToRgb({ h, s, b }) {
  const sNorm = s / 100;
  const bNorm = b / 100;
  const c = bNorm * sNorm;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hPrime >= 0 && hPrime < 1) { r1 = c; g1 = x; }
  else if (hPrime < 2) { r1 = x; g1 = c; }
  else if (hPrime < 3) { g1 = c; b1 = x; }
  else if (hPrime < 4) { g1 = x; b1 = c; }
  else if (hPrime < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = bNorm - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToCmyk({ r, g, b }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
}

function cmykToRgb({ c, m, y, k }) {
  const cNorm = c / 100;
  const mNorm = m / 100;
  const yNorm = y / 100;
  const kNorm = k / 100;
  const r = Math.round(255 * (1 - cNorm) * (1 - kNorm));
  const g = Math.round(255 * (1 - mNorm) * (1 - kNorm));
  const b = Math.round(255 * (1 - yNorm) * (1 - kNorm));
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b))
  };
}

function rgbToLab({ r, g, b }) {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;
  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;
  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;
  const xN = x * 100 / 95.047;
  const yN = y * 100 / 100.000;
  const zN = z * 100 / 108.883;
  const f = (t) => t > 0.008856 ? Math.pow(t, 1/3) : 7.787 * t + 16/116;
  const fx = f(xN);
  const fy = f(yN);
  const fz = f(zN);
  const lVal = 116 * fy - 16;
  const aVal = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return {
    l: Math.round(lVal),
    a: Math.round(aVal),
    b: Math.round(bVal)
  };
}

function labToRgb({ l, a, b }) {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const fx3 = Math.pow(fx, 3);
  const fy3 = Math.pow(fy, 3);
  const fz3 = Math.pow(fz, 3);
  const xN = fx3 > 0.008856 ? fx3 : (fx - 16/116) / 7.787;
  const yN = fy3 > 0.008856 ? fy3 : (fy - 16/116) / 7.787;
  const zN = fz3 > 0.008856 ? fz3 : (fz - 16/116) / 7.787;
  const x = xN * 95.047 / 100;
  const y = yN * 100.000 / 100;
  const z = zN * 108.883 / 100;
  let rL = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let gL = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bL = x * 0.0557 + y * -0.2040 + z * 1.0570;
  rL = Math.max(0, Math.min(1, rL));
  gL = Math.max(0, Math.min(1, gL));
  bL = Math.max(0, Math.min(1, bL));
  const toSrgb = (c) => c > 0.0031308 ? 1.055 * Math.pow(c, 1/2.4) - 0.055 : 12.92 * c;
  const rOut = Math.round(toSrgb(rL) * 255);
  const gOut = Math.round(toSrgb(gL) * 255);
  const bOut = Math.round(toSrgb(bL) * 255);
  return {
    r: Math.max(0, Math.min(255, rOut)),
    g: Math.max(0, Math.min(255, gOut)),
    b: Math.max(0, Math.min(255, bOut))
  };
}

function formatHsb({ h, s, b }) {
  return `hsb(${h}, ${s}%, ${b}%)`;
}

function formatCmyk({ c, m, y, k }) {
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

function formatLab({ l, a, b }) {
  return `lab(${l}%, ${a}, ${b})`;
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
  const [hslState, setHslState] = useState({ h: 244, s: 76, l: 59 }); // HSL Spectrum Selector coordinates
  const [swatchSelectedHex, setSwatchSelectedHex] = useState('#4F46E5'); // HSL Swatches Grid highlight state
  const [isSynced, setIsSynced] = useState(true); // Sync selection state toggle
  const [sliderModel, setSliderModel] = useState('HSB'); // Interactive Slider model
  
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
  let hsbVal = "";
  let cmykVal = "";
  let labVal = "";
  let statusText = "Enter a HEX, RGB, HSL, HSB, CMYK, or LAB color.";
  let swatchBg = "transparent";

  // Parse current text input to update the outputs
  if (trimmed) {
    const parsedHsl = parseHslColor(trimmed);
    const parsedHsb = parseHsbColor(trimmed);
    const parsedCmyk = parseCmykColor(trimmed);
    const parsedLab = parseLabColor(trimmed);

    const rgb =
      parseHexColor(trimmed) ||
      parseRgbColor(trimmed) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null) ||
      (parsedHsb ? hsbToRgb(parsedHsb) : null) ||
      (parsedCmyk ? cmykToRgb(parsedCmyk) : null) ||
      (parsedLab ? labToRgb(parsedLab) : null);

    if (rgb) {
      const hex = rgbToHex(rgb);
      const computedHsl = rgbToHsl(rgb);
      const computedHsb = rgbToHsb(rgb);
      const computedCmyk = rgbToCmyk(rgb);
      const computedLab = rgbToLab(rgb);

      hexVal = hex;
      rgbVal = formatRgb(rgb);
      hslVal = formatHsl(computedHsl);
      hsbVal = formatHsb(computedHsb);
      cmykVal = formatCmyk(computedCmyk);
      labVal = formatLab(computedLab);
      
      statusText = "";
      swatchBg = hex;
    } else {
      statusText = "Invalid color format.";
    }
  }

  // Derive slider states from the always-valid hslState
  const activeRgb = hslToRgb(hslState);
  const activeHsb = rgbToHsb(activeRgb);
  const activeCmyk = rgbToCmyk(activeRgb);
  const activeLab = rgbToLab(activeRgb);



    // Handle manual typing in the text input box and update coordinates
  const handleUserTextChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const trimmedVal = val.trim();
    if (!trimmedVal) return;

    const parsedHsl = parseHslColor(trimmedVal);
    const parsedHsb = parseHsbColor(trimmedVal);
    const parsedCmyk = parseCmykColor(trimmedVal);
    const parsedLab = parseLabColor(trimmedVal);

    const rgb =
      parseHexColor(trimmedVal) ||
      parseRgbColor(trimmedVal) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null) ||
      (parsedHsb ? hsbToRgb(parsedHsb) : null) ||
      (parsedCmyk ? cmykToRgb(parsedCmyk) : null) ||
      (parsedLab ? labToRgb(parsedLab) : null);

    if (rgb) {
      const computedHsl = rgbToHsl(rgb);
      const hex = rgbToHex(rgb);

      // Always update HSL Spectrum Selector coordinates
      setHslState(computedHsl);

      // Only update Swatches Grid selection if Sync mode is active
      if (isSynced) {
        setSwatchSelectedHex(hex);
      }
    }
  };

  // Handle Sync toggle click
  const handleSyncToggle = () => {
    const nextSync = !isSynced;
    setIsSynced(nextSync);
    if (nextSync) {
      // Force sync Swatches Grid highlight to match current Spectrum selector color
      const rgb = hslToRgb(hslState);
      const hex = rgbToHex(rgb);
      setSwatchSelectedHex(hex);
    }
  };

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
      setSwatchSelectedHex(hex);
      addRecentColor(hex);
      if (isSynced) {
        setHslState(rgbToHsl(parseHexColor(hex)));
      }
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

    if (isSynced) {
      setSwatchSelectedHex(hex);
    }
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

    if (isSynced) {
      setSwatchSelectedHex(hex);
    }
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
      const trimmedVal = input.trim();
      const parsedHsl = parseHslColor(trimmedVal);
      const parsedHsb = parseHsbColor(trimmedVal);
      const parsedCmyk = parseCmykColor(trimmedVal);
      const parsedLab = parseLabColor(trimmedVal);

      const rgb =
        parseHexColor(trimmedVal) ||
        parseRgbColor(trimmedVal) ||
        (parsedHsl ? hslToRgb(parsedHsl) : null) ||
        (parsedHsb ? hsbToRgb(parsedHsb) : null) ||
        (parsedCmyk ? cmykToRgb(parsedCmyk) : null) ||
        (parsedLab ? labToRgb(parsedLab) : null);

      if (rgb) {
        addRecentColor(rgbToHex(rgb));
      }
    }
  };

  const handleInputBlur = () => {
    const trimmedVal = input.trim();
    const parsedHsl = parseHslColor(trimmedVal);
    const parsedHsb = parseHsbColor(trimmedVal);
    const parsedCmyk = parseCmykColor(trimmedVal);
    const parsedLab = parseLabColor(trimmedVal);

    const rgb =
      parseHexColor(trimmedVal) ||
      parseRgbColor(trimmedVal) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null) ||
      (parsedHsb ? hsbToRgb(parsedHsb) : null) ||
      (parsedCmyk ? cmykToRgb(parsedCmyk) : null) ||
      (parsedLab ? labToRgb(parsedLab) : null);

    if (rgb) {
      addRecentColor(rgbToHex(rgb));
    }
  };

  // Swatch click helper (Updates Code Converter input and highlights cell)
  const handleSwatchClick = (hex) => {
    setInput(hex);
    setSwatchSelectedHex(hex);
    addRecentColor(hex);

    // Sync HSL Spectrum selector coordinates if sync is active
    if (isSynced) {
      const rgb = parseHexColor(hex);
      if (rgb) {
        setHslState(rgbToHsl(rgb));
      }
    }
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

  const handleSliderValueChange = (newRgb, formattedString) => {
    const hex = rgbToHex(newRgb);
    setHslState(rgbToHsl(newRgb));
    setInput(formattedString);
    if (isSynced) {
      setSwatchSelectedHex(hex);
    }
  };

  const renderSlider = (label, value, min, max, gradient, onChange) => {
    return (
      <div className="slider-item" key={label}>
        <div className="slider-header-row">
          <span className="slider-label">{label}</span>
          <span className="slider-value">{value}</span>
        </div>
        <div className="slider-input-container">
          <input
            type="range"
            className="interactive-slider-input"
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            style={{
              '--track-background': gradient,
              '--thumb-color': `rgb(${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b})`
            }}
          />
        </div>
      </div>
    );
  };

  const renderInteractiveSliders = () => {
    let sliders = [];
    if (sliderModel === 'HSB') {
      sliders.push(renderSlider('Hue', activeHsb.h, 0, 360,
        `linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)`,
        (e) => {
          const h = Number(e.target.value);
          const newHsb = { ...activeHsb, h };
          handleSliderValueChange(hsbToRgb(newHsb), formatHsb(newHsb));
        }));
      const s0Rgb = hsbToRgb({ h: activeHsb.h, s: 0, b: activeHsb.b });
      const s100Rgb = hsbToRgb({ h: activeHsb.h, s: 100, b: activeHsb.b });
      sliders.push(renderSlider('Saturation', activeHsb.s, 0, 100,
        `linear-gradient(to right, rgb(${s0Rgb.r}, ${s0Rgb.g}, ${s0Rgb.b}), rgb(${s100Rgb.r}, ${s100Rgb.g}, ${s100Rgb.b}))`,
        (e) => {
          const s = Number(e.target.value);
          const newHsb = { ...activeHsb, s };
          handleSliderValueChange(hsbToRgb(newHsb), formatHsb(newHsb));
        }));
      const b100Rgb = hsbToRgb({ h: activeHsb.h, s: activeHsb.s, b: 100 });
      sliders.push(renderSlider('Brightness', activeHsb.b, 0, 100,
        `linear-gradient(to right, #000000, rgb(${b100Rgb.r}, ${b100Rgb.g}, ${b100Rgb.b}))`,
        (e) => {
          const b = Number(e.target.value);
          const newHsb = { ...activeHsb, b };
          handleSliderValueChange(hsbToRgb(newHsb), formatHsb(newHsb));
        }));
    } else if (sliderModel === 'HSL') {
      sliders.push(renderSlider('Hue', hslState.h, 0, 360,
        `linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)`,
        (e) => {
          const h = Number(e.target.value);
          const newHsl = { ...hslState, h };
          handleSliderValueChange(hslToRgb(newHsl), formatHsl(newHsl));
        }));
      const s0Rgb = hslToRgb({ h: hslState.h, s: 0, l: hslState.l });
      const s100Rgb = hslToRgb({ h: hslState.h, s: 100, l: hslState.l });
      sliders.push(renderSlider('Saturation', hslState.s, 0, 100,
        `linear-gradient(to right, rgb(${s0Rgb.r}, ${s0Rgb.g}, ${s0Rgb.b}), rgb(${s100Rgb.r}, ${s100Rgb.g}, ${s100Rgb.b}))`,
        (e) => {
          const s = Number(e.target.value);
          const newHsl = { ...hslState, s };
          handleSliderValueChange(hslToRgb(newHsl), formatHsl(newHsl));
        }));
      const l50Rgb = hslToRgb({ h: hslState.h, s: hslState.s, l: 50 });
      sliders.push(renderSlider('Luminance', hslState.l, 0, 100,
        `linear-gradient(to right, #000000, rgb(${l50Rgb.r}, ${l50Rgb.g}, ${l50Rgb.b}) 50%, #ffffff)`,
        (e) => {
          const l = Number(e.target.value);
          const newHsl = { ...hslState, l };
          handleSliderValueChange(hslToRgb(newHsl), formatHsl(newHsl));
        }));
    } else if (sliderModel === 'RGB') {
      sliders.push(renderSlider('Red', activeRgb.r, 0, 255,
        `linear-gradient(to right, rgb(0, ${activeRgb.g}, ${activeRgb.b}), rgb(255, ${activeRgb.g}, ${activeRgb.b}))`,
        (e) => {
          const r = Number(e.target.value);
          const newRgb = { ...activeRgb, r };
          handleSliderValueChange(newRgb, formatRgb(newRgb));
        }));
      sliders.push(renderSlider('Green', activeRgb.g, 0, 255,
        `linear-gradient(to right, rgb(${activeRgb.r}, 0, ${activeRgb.b}), rgb(${activeRgb.r}, 255, ${activeRgb.b}))`,
        (e) => {
          const g = Number(e.target.value);
          const newRgb = { ...activeRgb, g };
          handleSliderValueChange(newRgb, formatRgb(newRgb));
        }));
      sliders.push(renderSlider('Blue', activeRgb.b, 0, 255,
        `linear-gradient(to right, rgb(${activeRgb.r}, ${activeRgb.g}, 0), rgb(${activeRgb.r}, ${activeRgb.g}, 255))`,
        (e) => {
          const b = Number(e.target.value);
          const newRgb = { ...activeRgb, b };
          handleSliderValueChange(newRgb, formatRgb(newRgb));
        }));
    } else if (sliderModel === 'CMYK') {
      sliders.push(renderSlider('Cyan', activeCmyk.c, 0, 100,
        `linear-gradient(to right, rgb(${cmykToRgb({ ...activeCmyk, c: 0 }).r}, ${cmykToRgb({ ...activeCmyk, c: 0 }).g}, ${cmykToRgb({ ...activeCmyk, c: 0 }).b}), rgb(${cmykToRgb({ ...activeCmyk, c: 100 }).r}, ${cmykToRgb({ ...activeCmyk, c: 100 }).g}, ${cmykToRgb({ ...activeCmyk, c: 100 }).b}))`,
        (e) => {
          const c = Number(e.target.value);
          const newCmyk = { ...activeCmyk, c };
          handleSliderValueChange(cmykToRgb(newCmyk), formatCmyk(newCmyk));
        }));
      sliders.push(renderSlider('Magenta', activeCmyk.m, 0, 100,
        `linear-gradient(to right, rgb(${cmykToRgb({ ...activeCmyk, m: 0 }).r}, ${cmykToRgb({ ...activeCmyk, m: 0 }).g}, ${cmykToRgb({ ...activeCmyk, m: 0 }).b}), rgb(${cmykToRgb({ ...activeCmyk, m: 100 }).r}, ${cmykToRgb({ ...activeCmyk, m: 100 }).g}, ${cmykToRgb({ ...activeCmyk, m: 100 }).b}))`,
        (e) => {
          const m = Number(e.target.value);
          const newCmyk = { ...activeCmyk, m };
          handleSliderValueChange(cmykToRgb(newCmyk), formatCmyk(newCmyk));
        }));
      sliders.push(renderSlider('Yellow', activeCmyk.y, 0, 100,
        `linear-gradient(to right, rgb(${cmykToRgb({ ...activeCmyk, y: 0 }).r}, ${cmykToRgb({ ...activeCmyk, y: 0 }).g}, ${cmykToRgb({ ...activeCmyk, y: 0 }).b}), rgb(${cmykToRgb({ ...activeCmyk, y: 100 }).r}, ${cmykToRgb({ ...activeCmyk, y: 100 }).g}, ${cmykToRgb({ ...activeCmyk, y: 100 }).b}))`,
        (e) => {
          const y = Number(e.target.value);
          const newCmyk = { ...activeCmyk, y };
          handleSliderValueChange(cmykToRgb(newCmyk), formatCmyk(newCmyk));
        }));
      sliders.push(renderSlider('Key', activeCmyk.k, 0, 100,
        `linear-gradient(to right, rgb(${cmykToRgb({ ...activeCmyk, k: 0 }).r}, ${cmykToRgb({ ...activeCmyk, k: 0 }).g}, ${cmykToRgb({ ...activeCmyk, k: 0 }).b}), rgb(${cmykToRgb({ ...activeCmyk, k: 100 }).r}, ${cmykToRgb({ ...activeCmyk, k: 100 }).g}, ${cmykToRgb({ ...activeCmyk, k: 100 }).b}))`,
        (e) => {
          const k = Number(e.target.value);
          const newCmyk = { ...activeCmyk, k };
          handleSliderValueChange(cmykToRgb(newCmyk), formatCmyk(newCmyk));
        }));
    } else if (sliderModel === 'LAB') {
      sliders.push(renderSlider('Luminance', activeLab.l, 0, 100,
        `linear-gradient(to right, rgb(${labToRgb({ ...activeLab, l: 0 }).r}, ${labToRgb({ ...activeLab, l: 0 }).g}, ${labToRgb({ ...activeLab, l: 0 }).b}), rgb(${labToRgb({ ...activeLab, l: 100 }).r}, ${labToRgb({ ...activeLab, l: 100 }).g}, ${labToRgb({ ...activeLab, l: 100 }).b}))`,
        (e) => {
          const l = Number(e.target.value);
          const newLab = { ...activeLab, l };
          handleSliderValueChange(labToRgb(newLab), formatLab(newLab));
        }));
      sliders.push(renderSlider('Green-Red', activeLab.a, -128, 127,
        `linear-gradient(to right, rgb(${labToRgb({ ...activeLab, a: -128 }).r}, ${labToRgb({ ...activeLab, a: -128 }).g}, ${labToRgb({ ...activeLab, a: -128 }).b}), rgb(${labToRgb({ ...activeLab, a: 127 }).r}, ${labToRgb({ ...activeLab, a: 127 }).g}, ${labToRgb({ ...activeLab, a: 127 }).b}))`,
        (e) => {
          const a = Number(e.target.value);
          const newLab = { ...activeLab, a };
          handleSliderValueChange(labToRgb(newLab), formatLab(newLab));
        }));
      sliders.push(renderSlider('Blue-Yellow', activeLab.b, -128, 127,
        `linear-gradient(to right, rgb(${labToRgb({ ...activeLab, b: -128 }).r}, ${labToRgb({ ...activeLab, b: -128 }).g}, ${labToRgb({ ...activeLab, b: -128 }).b}), rgb(${labToRgb({ ...activeLab, b: 127 }).r}, ${labToRgb({ ...activeLab, b: 127 }).g}, ${labToRgb({ ...activeLab, b: 127 }).b}))`,
        (e) => {
          const b = Number(e.target.value);
          const newLab = { ...activeLab, b };
          handleSliderValueChange(labToRgb(newLab), formatLab(newLab));
        }));
    }

    return (
      <div className="interactive-sliders-card">
        <div className="interactive-sliders-body">
          {sliders}
        </div>
        <div className="interactive-sliders-footer">
          <div className="model-dropdown-wrapper">
            <select
              value={sliderModel}
              onChange={(e) => setSliderModel(e.target.value)}
              className="model-select"
            >
              <option value="HSB">HSB</option>
              <option value="HSL">HSL</option>
              <option value="RGB">RGB</option>
              <option value="CMYK">CMYK</option>
              <option value="LAB">LAB</option>
            </select>
          </div>
          <div className="footer-actions">
            {hasEyeDropper && (
              <button
                type="button"
                className="action-btn"
                onClick={handleEyeDropper}
                title="Pick color from screen"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 22l6-6M8 16l4 4M19.5 4.5a3.53 3.53 0 0 1 0 5L12 17l-5-5 7.5-7.5a3.53 3.53 0 0 1 5 0z"></path>
                </svg>
              </button>
            )}
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                let copyStr = '';
                if (sliderModel === 'HSB') copyStr = formatHsb(activeHsb);
                else if (sliderModel === 'HSL') copyStr = formatHsl(hslState);
                else if (sliderModel === 'RGB') copyStr = formatRgb(activeRgb);
                else if (sliderModel === 'CMYK') copyStr = formatCmyk(activeCmyk);
                else if (sliderModel === 'LAB') copyStr = formatLab(activeLab);
                navigator.clipboard.writeText(copyStr);
              }}
              title="Copy color code"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
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
                onChange={handleUserTextChange}
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
          
          <div className="row outputs outputs-grid-two">
            <div className="form-group">
              <label htmlFor="color-hex">HEX</label>
              <input id="color-hex" type="text" readOnly value={hexVal} />
            </div>
            <div className="form-group">
              <label htmlFor="color-selected-format">{sliderModel}</label>
              <input 
                id="color-selected-format" 
                type="text" 
                readOnly 
                value={
                  sliderModel === 'HSB' ? hsbVal :
                  sliderModel === 'HSL' ? hslVal :
                  sliderModel === 'RGB' ? rgbVal :
                  sliderModel === 'CMYK' ? cmykVal :
                  sliderModel === 'LAB' ? labVal : ''
                } 
              />
            </div>
          </div>
          
          <p className="small status-msg" id="color-status">{statusText}</p>

          <div className="interactive-sliders-wrapper">
            {renderInteractiveSliders()}
          </div>
        </div>

        {/* Panel 2: Visual Swatches Grid Selector */}
        <div className="color-picker-section">
          <div className="section-header-row">
            <h3>HSL Swatches</h3>
            <button
              type="button"
              className={`sync-toggle-btn ${isSynced ? 'synced' : ''}`}
              onClick={handleSyncToggle}
              title={isSynced ? "Disconnect sync with Spectrum picker" : "Synchronize with Spectrum picker"}
            >
              {isSynced ? "COLOR SYNC: ON" : "COLOR SYNC: OFF"}
            </button>
          </div>
          
          <div className="swatches-block-grid">
            {SWATCH_GRID.map((row, rIdx) => 
              row.map((hex, cIdx) => {
                const isSelected = swatchSelectedHex.toUpperCase() === hex.toUpperCase();
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
