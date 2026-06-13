const $ = (id) => document.getElementById(id);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const currencyLocales = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
};

function setupSlashConverter() {
  const input = $("slash-input");
  const output = $("slash-output");
  const button = $("slash-convert");

  // Intent: Normalize Windows-style paths for web and URL usage.
  const update = () => {
    output.value = input.value.replace(/\\/g, "/");
  };

  button.addEventListener("click", update);
  input.addEventListener("input", update);
  update();
}

function countWords(text) {
  // Matches individual CJK characters (Han, Hiragana, Katakana) or sequences of other characters (words) while ignoring punctuation and symbols.
  const regex = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+(?:[-'’][^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+)*/gu;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function setupWordCounter() {
  const input = $("wc-input");
  const wordsEl = $("wc-words");
  const charsEl = $("wc-chars");

  const update = () => {
    wordsEl.textContent = countWords(input.value);
    charsEl.textContent = input.value.length;
  };

  input.addEventListener("input", update);
  update();
}

function parseDateToUTC(dateString) {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  // Decision: Use UTC midnight to avoid timezone-based day shifts.
  return Date.UTC(year, month - 1, day);
}

function setupDateCounter() {
  const startInput = $("date-start");
  const endInput = $("date-end");
  const output = $("date-output");

  const update = () => {
    const startMs = parseDateToUTC(startInput.value);
    const endMs = parseDateToUTC(endInput.value);

    if (startMs === null || endMs === null) {
      output.textContent = "Select both dates.";
      return;
    }

    const diffDays = Math.round((endMs - startMs) / MS_PER_DAY);
    output.textContent = `${diffDays} day(s) (end - start)`;
  };

  startInput.addEventListener("input", update);
  endInput.addEventListener("input", update);
  update();
}

function parseAmountLines(text) {
  // Assumption: One numeric amount per line; ignore stray symbols.
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/,/g, "").match(/-?\d+(\.\d+)?/))
    .filter(Boolean)
    .map((match) => Number(match[0]));
}

function setupCurrencyCounter() {
  const currencySelect = $("currency-code");
  const input = $("currency-input");
  const totalEl = $("currency-total");
  const countEl = $("currency-count");
  const statusEl = $("currency-status");

  const update = () => {
    const amounts = parseAmountLines(input.value);
    countEl.textContent = String(amounts.length);

    if (amounts.length === 0) {
      totalEl.textContent = "—";
      statusEl.textContent = "Enter one amount per line.";
      return;
    }

    const sum = amounts.reduce((total, value) => total + value, 0);
    const currency = currencySelect.value;
    const locale = currencyLocales[currency] || "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });

    totalEl.textContent = formatter.format(sum);
    statusEl.textContent = "";
  };

  currencySelect.addEventListener("change", update);
  input.addEventListener("input", update);
  update();
}

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
  if ([r, g, b].some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
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

  if ([h, s, l].some((value) => Number.isNaN(value))) {
    return null;
  }
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    return null;
  }

  return { h, s, l };
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => value.toString(16).padStart(2, "0").toUpperCase();
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

function setupColorConverter() {
  const input = $("color-input");
  const hexOutput = $("color-hex");
  const rgbOutput = $("color-rgb");
  const hslOutput = $("color-hsl");
  const status = $("color-status");
  const swatch = $("color-preview-swatch");

  const clearOutputs = (message) => {
    hexOutput.value = "";
    rgbOutput.value = "";
    hslOutput.value = "";
    status.textContent = message;
    if (swatch) {
      swatch.style.backgroundColor = "transparent";
    }
  };

  const update = () => {
    const value = input.value.trim();
    if (!value) {
      clearOutputs("Enter a HEX, RGB, or HSL color.");
      return;
    }

    // Decision: Try formats in the order most likely typed by users.
    const parsedHsl = parseHslColor(value);
    const rgb =
      parseHexColor(value) ||
      parseRgbColor(value) ||
      (parsedHsl ? hslToRgb(parsedHsl) : null);

    if (!rgb) {
      clearOutputs("Invalid color format.");
      return;
    }

    const hex = rgbToHex(rgb);
    const computedHsl = rgbToHsl(rgb);

    hexOutput.value = hex;
    rgbOutput.value = formatRgb(rgb);
    hslOutput.value = formatHsl(computedHsl);
    status.textContent = "";
    if (swatch) {
      swatch.style.backgroundColor = hex;
    }
  };

  input.addEventListener("input", update);
  update();
}

function textToAscii(text) {
  return Array.from(text, (char) => char.charCodeAt(0)).join(" ");
}

function asciiToText(codes) {
  if (!codes.trim()) {
    return { text: "", error: null };
  }

  const values = codes.split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const value of values) {
    const code = Number.parseInt(value, 10);
    // Guardrail: ASCII is defined for 0-127, so reject higher values.
    if (Number.isNaN(code) || code < 0 || code > 127) {
      return { text: "", error: "ASCII codes must be between 0 and 127." };
    }
    chars.push(String.fromCharCode(code));
  }

  return { text: chars.join(""), error: null };
}

function setupAsciiConverter() {
  const textInput = $("ascii-text");
  const codesOutput = $("ascii-codes");
  const codesInput = $("ascii-codes-input");
  const textOutput = $("ascii-text-output");
  const status = $("ascii-status");

  const updateFromText = () => {
    codesOutput.value = textToAscii(textInput.value);
  };

  const updateFromCodes = () => {
    const result = asciiToText(codesInput.value);
    textOutput.textContent = result.text || "—";
    status.textContent = result.error || "";
  };

  textInput.addEventListener("input", updateFromText);
  codesInput.addEventListener("input", updateFromCodes);
  updateFromText();
  updateFromCodes();
}

function textToUnicode(text) {
  return Array.from(text)
    .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
    .join(" ");
}

function unicodeToText(codes) {
  if (!codes.trim()) {
    return { text: "", error: null };
  }

  const values = codes.split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const raw of values) {
    const cleaned = raw.replace(/^U\+/i, "").replace(/^0x/i, "");
    const codePoint = Number.parseInt(cleaned, 16);
    if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return { text: "", error: "Unicode values must be valid hex code points." };
    }
    chars.push(String.fromCodePoint(codePoint));
  }

  return { text: chars.join(""), error: null };
}

function setupUnicodeConverter() {
  const textInput = $("unicode-text");
  const codesOutput = $("unicode-codes");
  const codesInput = $("unicode-codes-input");
  const textOutput = $("unicode-text-output");
  const status = $("unicode-status");

  const updateFromText = () => {
    codesOutput.value = textToUnicode(textInput.value);
  };

  const updateFromCodes = () => {
    const result = unicodeToText(codesInput.value);
    textOutput.textContent = result.text || "—";
    status.textContent = result.error || "";
  };

  textInput.addEventListener("input", updateFromText);
  codesInput.addEventListener("input", updateFromCodes);
  updateFromText();
  updateFromCodes();
}

function parseBigIntFromBase(value, base) {
  let text = value.trim().toUpperCase();
  if (!text) {
    return null;
  }

  let sign = 1n;
  if (text.startsWith("-")) {
    sign = -1n;
    text = text.slice(1);
  }

  if (!text) {
    return null;
  }

  let cleaned = text;
  if (base === 16 && cleaned.startsWith("0X")) {
    cleaned = cleaned.slice(2);
  }
  if (base === 8 && cleaned.startsWith("0O")) {
    cleaned = cleaned.slice(2);
  }
  if (base === 2 && cleaned.startsWith("0B")) {
    cleaned = cleaned.slice(2);
  }

  let result = 0n;
  for (const ch of cleaned) {
    const digit = DIGITS.indexOf(ch);
    if (digit < 0 || digit >= base) {
      return null;
    }
    result = result * BigInt(base) + BigInt(digit);
  }

  return result * sign;
}

function parseBase60(value) {
  let text = value.trim();
  if (!text) {
    return null;
  }

  let sign = 1n;
  if (text.startsWith("-")) {
    sign = -1n;
    text = text.slice(1);
  }

  const parts = text.split(":");
  if (parts.some((part) => part.trim() === "")) {
    return null;
  }

  let result = 0n;
  for (const part of parts) {
    const digit = Number.parseInt(part, 10);
    if (Number.isNaN(digit) || digit < 0 || digit > 59) {
      return null;
    }
    result = result * 60n + BigInt(digit);
  }

  return result * sign;
}

function formatBase60(value) {
  if (value === 0n) {
    return "0";
  }

  const sign = value < 0n ? "-" : "";
  let current = value < 0n ? -value : value;
  const parts = [];

  while (current > 0n) {
    const remainder = current % 60n;
    parts.push(remainder.toString());
    current /= 60n;
  }

  return sign + parts.reverse().join(":");
}

function setupBaseConverter() {
  const input = $("base-input");
  const baseSelect = $("base-from");
  const status = $("base-status");

  const outputs = {
    2: $("base-bin"),
    8: $("base-oct"),
    10: $("base-dec"),
    16: $("base-hex"),
    60: $("base-60"),
  };

  const clearOutputs = () => {
    Object.values(outputs).forEach((field) => {
      field.value = "";
    });
  };

  const update = () => {
    const base = Number(baseSelect.value);
    const value = input.value.trim();
    if (!value) {
      clearOutputs();
      status.textContent = "Enter a value to convert.";
      return;
    }

    const parsed =
      base === 60 ? parseBase60(value) : parseBigIntFromBase(value, base);

    if (parsed === null) {
      clearOutputs();
      status.textContent = "Invalid input for the selected base.";
      return;
    }

    // Decision: Use BigInt to keep large integers precise across bases.
    outputs[2].value = parsed.toString(2);
    outputs[8].value = parsed.toString(8);
    outputs[10].value = parsed.toString(10);
    outputs[16].value = parsed.toString(16).toUpperCase();
    outputs[60].value = formatBase60(parsed);
    status.textContent = "";
  };

  baseSelect.addEventListener("change", update);
  input.addEventListener("input", update);
  update();
}

const dnaComplementMap = {
  'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
  'a': 't', 't': 'a', 'c': 'g', 'g': 'c',
  'U': 'A', 'u': 'a',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
  'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D', 'N': 'N',
  'r': 'y', 'y': 'r', 's': 's', 'w': 'w', 'k': 'm', 'm': 'k',
  'b': 'v', 'v': 'b', 'd': 'h', 'h': 'd', 'n': 'n'
};

const rnaComplementMap = {
  'A': 'U', 'U': 'A', 'C': 'G', 'G': 'C',
  'a': 'u', 'u': 'a',
  'T': 'A', 't': 'a',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
  'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D', 'N': 'N',
  'r': 'y', 'y': 'r', 's': 's', 'w': 'w', 'k': 'm', 'm': 'k',
  'b': 'v', 'v': 'b', 'd': 'h', 'h': 'd', 'n': 'n'
};

function setupDnaConverter() {
  const input = $("dna-input");
  const seqTypeSelect = $("dna-seq-type");
  const directionSelect = $("dna-direction");
  
  const oppositeOutput = $("dna-output-opposite");
  const revcompOutput = $("dna-output-revcomp");
  const reverseOutput = $("dna-output-reverse");
  const status = $("dna-status");

  const clearOutputs = (msg) => {
    oppositeOutput.value = "";
    revcompOutput.value = "";
    reverseOutput.value = "";
    status.textContent = msg || "";
    status.style.color = "";
  };

  const getComplement = (sequence, isRna) => {
    const map = isRna ? rnaComplementMap : dnaComplementMap;
    return sequence.split("").map(char => map[char] || char).join("");
  };

  const reverseString = (str) => {
    return str.split("").reverse().join("");
  };

  // Track if direction was programmatically updated to avoid feedback loops
  let isUpdatingProgrammatically = false;

  const update = () => {
    const val = input.value;
    if (!val.trim()) {
      clearOutputs("Enter a sequence to convert.");
      return;
    }

    // 1. Detect and parse direction if marked explicitly in sequence
    const lowerVal = val.toLowerCase();
    const has5PrimeStart = /^\s*5['’]/.test(lowerVal);
    const has3PrimeStart = /^\s*3['’]/.test(lowerVal);
    const has5PrimeEnd = /5['’]\s*$/.test(lowerVal);
    const has3PrimeEnd = /3['’]\s*$/.test(lowerVal);

    if (!isUpdatingProgrammatically) {
      if (has5PrimeStart || has3PrimeEnd) {
        isUpdatingProgrammatically = true;
        directionSelect.value = "5-3";
        isUpdatingProgrammatically = false;
      } else if (has3PrimeStart || has5PrimeEnd) {
        isUpdatingProgrammatically = true;
        directionSelect.value = "3-5";
        isUpdatingProgrammatically = false;
      }
    }

    // 2. Clean the sequence (remove 5', 3', hyphens, whitespace, numbers, etc.)
    let cleaned = val
      .replace(/5['’](-)?/gi, '')
      .replace(/3['’](-)?/gi, '')
      .replace(/[-'’\s\d]/g, '')
      .toUpperCase();

    if (!cleaned) {
      clearOutputs("Please enter a valid sequence.");
      return;
    }

    // Validate characters: only A, T, C, G, U, and N are allowed
    if (/[^ACGUTN]/.test(cleaned)) {
      clearOutputs("Error: Only A, T, C, G, U, and N characters are allowed.");
      return;
    }

    let warningMessage = "";
    if (cleaned.includes("N")) {
      warningMessage = "Notification: 'N' detected (can attach to any base: A, T, C, or G).";
    }

    // 3. Auto-detect sequence type (DNA vs RNA)
    let isRna = false;
    const selectedType = seqTypeSelect.value;
    if (selectedType === "auto") {
      const hasU = cleaned.includes("U");
      const hasT = cleaned.includes("T");
      if (hasU && hasT) {
        warningMessage = (warningMessage ? warningMessage + " " : "") + "Warning: Both T and U detected. Defaulting to DNA.";
        isRna = false;
      } else if (hasU) {
        isRna = true;
      } else {
        isRna = false; // defaults to DNA
      }
    } else {
      isRna = selectedType === "rna";
    }

    if (warningMessage) {
      status.textContent = warningMessage;
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      status.style.color = isDark ? "#fbbf24" : "#b45309"; // Amber/yellow color for warnings
    } else {
      status.textContent = "";
      status.style.color = "";
    }

    const direction = directionSelect.value;

    // 4. Perform conversions
    // Get 5' to 3' representation of input sequence to facilitate standard revcomp
    const seq5to3 = (direction === "5-3") ? cleaned : reverseString(cleaned);

    // Outputs:
    // A. Opposite Strand (3' ↔ 5' Swap)
    const oppositeComplement = getComplement(cleaned, isRna);
    const oppositeStr = (direction === "5-3") 
      ? `3'-${oppositeComplement}-5'` 
      : `5'-${oppositeComplement}-3'`;

    // B. Standard Reverse Complement (always written 5' → 3')
    const revcompSeq = reverseString(getComplement(seq5to3, isRna));
    const revcompStr = `5'-${revcompSeq}-3'`;

    // C. Same Strand (Reverse Direction)
    const reversedSeq = reverseString(cleaned);
    const reverseStr = (direction === "5-3")
      ? `3'-${reversedSeq}-5'`
      : `5'-${reversedSeq}-3'`;

    oppositeOutput.value = oppositeStr;
    revcompOutput.value = revcompStr;
    reverseOutput.value = reverseStr;
  };

  input.addEventListener("input", update);
  seqTypeSelect.addEventListener("change", update);
  directionSelect.addEventListener("change", update);
  update();
}


const toolDetails = {
  "tool-slash": {
    title: "Slashes Converter",
    desc: "Normalize Windows paths to web-friendly forward slashes."
  },
  "tool-wc": {
    title: "Word & Character Counter",
    desc: "Calculate words, character lengths, and line endings in real time."
  },
  "tool-date": {
    title: "Date Counter",
    desc: "Calculate the exact number of days between two specified dates."
  },
  "tool-currency": {
    title: "Currency Counter",
    desc: "Sum multiple currency amounts with clean line-by-line inputs."
  },
  "tool-color": {
    title: "Color Code Converter",
    desc: "Seamlessly translate colors between HEX, RGB, and HSL formats."
  },
  "tool-ascii": {
    title: "ASCII Converter",
    desc: "Convert text characters to their ASCII codes and vice versa."
  },
  "tool-unicode": {
    title: "Unicode Converter",
    desc: "Encode text to Unicode code points or decode raw code points to text."
  },
  "tool-base": {
    title: "Base Converter",
    desc: "Interconvert numbers between binary, octal, decimal, hexadecimal, and sexagesimal."
  },
  "tool-dna": {
    title: "DNA/RNA Direction Transfer",
    desc: "Perform sequence base complementation, reversing, and swap 5'/3' strand orientations."
  },
  "tool-iplookup": {
    title: "IP Address Lookup",
    desc: "Identify geographical location, timezone, ISP, and coordinates for any IP address."
  },
  "tool-exif": {
    title: "EXIF Data Analyzer",
    desc: "Extract and analyze EXIF, GPS, and custom camera metadata from image files (including Canon .CR3 RAW files) locally in the browser."
  },
  "tool-wheel": {
    title: "Random Wheel",
    desc: "Set options, spin the wheel, and draw random items with optional single-draw elimination."
  }
};

async function ipLookup(ip) {
  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isDev) {
    // Dev: let the Vite Node.js middleware handle the external request
    // This bypasses any browser-level network blocks completely
    const qs = ip ? `?ip=${encodeURIComponent(ip.trim())}` : '';
    const res = await fetch(`/api/iplookup${qs}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Server-side IP lookup failed');
    return result.data;
  }

  // Production: try external APIs directly from the browser
  const tryProvider = async (url, normalize) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} returned ${r.status}`);
    return normalize(await r.json());
  };

  const providers = [
    () => tryProvider(
      ip ? `https://api.ip.sb/geoip/${ip}` : 'https://api.ip.sb/geoip',
      (d) => ({
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country || '', country_code: d.country_code || '',
        postal: '', org: d.isp || d.organization || '',
        asn: d.asn ? `AS${d.asn}` : '', timezone: d.timezone || '',
        utc_offset: '', latitude: d.latitude, longitude: d.longitude,
      })
    ),
    () => tryProvider(
      ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/',
      (d) => {
        if (d.error) throw new Error(d.reason || 'ipapi.co error');
        return {
          ip: d.ip, city: d.city || '', region: d.region || '',
          country_name: d.country_name || '', country_code: d.country_code || '',
          postal: d.postal || '', org: d.org || '', asn: d.asn || '',
          timezone: d.timezone || '', utc_offset: d.utc_offset || '',
          latitude: d.latitude, longitude: d.longitude,
        };
      }
    ),
  ];

  let lastErr = null;
  for (const p of providers) {
    try { return await p(); } catch (e) { lastErr = e; }
  }
  throw new Error(`IP lookup failed: ${lastErr?.message}`);
}

function getFlagEmoji(countryCode) {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}

function setupCopyButtons() {
  document.querySelectorAll(".copy-btn-inline").forEach(button => {
    if (button.dataset.hasCopyListener) return;
    button.dataset.hasCopyListener = "true";
    
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = button.getAttribute("data-target");
      const targetInput = $(targetId);
      if (targetInput && targetInput.value) {
        navigator.clipboard.writeText(targetInput.value).then(() => {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          button.classList.add("copied");
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove("copied");
          }, 1500);
        }).catch(err => {
          console.error("Clipboard copy failed", err);
        });
      }
    });
  });
}

function setupIpLookup() {
  const input = $("iplookup-input");
  const lookupBtn = $("iplookup-btn");
  const myBtn = $("iplookup-my-btn");
  const loader = $("iplookup-loader");
  const results = $("iplookup-results");
  const status = $("iplookup-status");

  const resIp = $("iplookup-res-ip");
  const resLocation = $("iplookup-res-location");
  const resRegionCountry = $("iplookup-res-region-country");
  const resOrg = $("iplookup-res-org");
  const resTimezone = $("iplookup-res-timezone");
  const resCoords = $("iplookup-res-coords");
  const mapIframe = $("iplookup-map");

  const doLookup = async (ipAddress) => {
    loader.style.display = "flex";
    results.style.display = "none";
    status.textContent = "";

    try {
      const data = await ipLookup(ipAddress.trim());
      
      resIp.value = data.ip || "Unknown";
      
      const city = data.city || "";
      const postal = data.postal || "";
      resLocation.value = city && postal ? `${city} (${postal})` : (city || postal || "Unknown");
      
      const countryCode = data.country_code || "";
      const flag = getFlagEmoji(countryCode);
      const region = data.region || "";
      const country = data.country_name || "";
      resRegionCountry.value = `${region}${region && country ? ", " : ""}${country} ${flag}`.trim() || "Unknown";
      
      resOrg.value = data.org || "Unknown";
      resTimezone.value = data.timezone ? `${data.timezone} (UTC ${data.utc_offset || ""})` : "Unknown";
      
      if (data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null) {
        resCoords.value = `${data.latitude}, ${data.longitude}`;
        const lat = data.latitude;
        const lon = data.longitude;
        mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
        mapIframe.parentElement.style.display = "block";
      } else {
        resCoords.value = "Unknown";
        mapIframe.src = "";
        mapIframe.parentElement.style.display = "none";
      }

      results.style.display = "block";
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    } finally {
      loader.style.display = "none";
    }
  };

  lookupBtn.addEventListener("click", () => {
    doLookup(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      doLookup(input.value);
    }
  });

  myBtn.addEventListener("click", () => {
    input.value = "";
    doLookup("");
  });
}


function setupTheme() {
  const toggleBtn = $("theme-toggle");
  if (!toggleBtn) return;
  
  const getPreferredTheme = () => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
    } catch (e) {
      // Storage access blocked
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const setTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // Storage access blocked
    }
  };

  const currentTheme = getPreferredTheme();
  setTheme(currentTheme);

  toggleBtn.addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(theme);
  });
}

function setupSidebar() {
  const navItems = document.querySelectorAll(".nav-item");
  const toolCards = document.querySelectorAll(".tool-card");
  const searchInput = $("tool-search");
  const activeTitle = $("active-tool-title");
  const activeDesc = $("active-tool-desc");
  
  // Mobile hamburger toggling
  const sidebar = $("sidebar");
  const sidebarToggle = $("sidebar-toggle");
  const sidebarOverlay = $("sidebar-overlay");
  
  const toggleMobileSidebar = () => {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("visible");
    }
  };
  
  if (sidebarToggle && sidebarOverlay) {
    sidebarToggle.addEventListener("click", toggleMobileSidebar);
    sidebarOverlay.addEventListener("click", toggleMobileSidebar);
  }

  // Desktop sidebar toggling
  const footerSidebarToggle = $("sidebar-collapse-btn");
  const appLayout = document.querySelector(".app-layout");

  const toggleDesktopSidebar = () => {
    if (appLayout) {
      appLayout.classList.toggle("collapsed-sidebar");
      try {
        const isCollapsed = appLayout.classList.contains("collapsed-sidebar");
        localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
      } catch (e) {
        // Storage access blocked
      }
    }
  };

  if (footerSidebarToggle) {
    footerSidebarToggle.addEventListener("click", toggleDesktopSidebar);
  }

  // Load persistent sidebar collapsed state
  try {
    const sidebarCollapsed = localStorage.getItem("sidebarCollapsed");
    if (sidebarCollapsed === "true" && appLayout) {
      appLayout.classList.add("collapsed-sidebar");
    }
  } catch (e) {
    // Storage access blocked
  }

  const toolStage = document.querySelector(".tool-stage");

  const activateTool = (toolId) => {
    // Hide all tool cards and remove active classes
    toolCards.forEach(card => card.classList.remove("active"));
    navItems.forEach(item => item.classList.remove("active"));

    // Find requested card and nav item
    const targetCard = $(toolId);
    const targetNav = document.querySelector(`.nav-item[data-tool="${toolId}"]`);

    if (targetCard && targetNav) {
      targetCard.classList.add("active");
      targetNav.classList.add("active");

      // EXIF and Wheel tools need extra width; remove constraint for them
      if (toolStage) {
        toolStage.classList.toggle("wide-tool", toolId === "tool-exif" || toolId === "tool-wheel");
      }
      
      // Update header
      if (toolDetails[toolId]) {
        if (activeTitle) activeTitle.textContent = toolDetails[toolId].title;
        if (activeDesc) activeDesc.textContent = toolDetails[toolId].desc;
      }
      
      // Save state
      try {
        localStorage.setItem("activeTool", toolId);
      } catch (e) {
        // Storage access blocked
      }
    }
  };

  // Nav item click event
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const toolId = item.getAttribute("data-tool");
      activateTool(toolId);
      
      // Close mobile sidebar if open
      if (sidebar && sidebar.classList.contains("open")) {
        toggleMobileSidebar();
      }
    });
  });

  // Load last active tool or default to first
  let lastTool = null;
  try {
    lastTool = localStorage.getItem("activeTool");
  } catch (e) {
    // Storage access blocked
  }

  if (lastTool && toolDetails[lastTool]) {
    activateTool(lastTool);
  } else {
    activateTool("tool-slash");
  }

  // Live tool filtering/search
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      navItems.forEach(item => {
        const labelText = item.querySelector("span").textContent.toLowerCase();
        if (labelText.includes(query)) {
          item.style.display = "flex";
        } else {
          item.style.display = "none";
        }
      });
    });
  }
}

// ==========================================================
// EXIF Data Analyzer Tool Implementation
// ==========================================

function isCR3(arrayBuffer) {
  if (arrayBuffer.byteLength < 12) return false;
  const view = new DataView(arrayBuffer);
  try {
    const type = view.getUint32(4);
    const brand = view.getUint32(8);
    return type === 0x66747970 && brand === 0x63727820; // 'ftyp' and 'crx '
  } catch (e) {
    return false;
  }
}

function extractCR3Boxes(buffer) {
  const view = new DataView(buffer);
  const cmtBoxes = {};
  let jpegThumbnail = null;

  function readString(offset, length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
  }

  function scan(offset, end) {
    while (offset + 8 <= end) {
      const size = view.getUint32(offset);
      const type = readString(offset + 4, 4);
      let boxSize = size;
      let headerSize = 8;
      if (size === 1) {
        const high = view.getUint32(offset + 8);
        const low = view.getUint32(offset + 12);
        boxSize = high * 4294967296 + low;
        headerSize = 16;
      } else if (size === 0) {
        boxSize = end - offset;
      }

      if (boxSize < headerSize || offset + boxSize > end) {
        break;
      }

      const trimmedType = type.trim();

      if (trimmedType === 'moov' || trimmedType === 'uuid') {
        let subStart = offset + headerSize;
        const subEnd = offset + boxSize;
        if (trimmedType === 'uuid') {
          subStart += 16; // Skip UUID
        }
        scan(subStart, subEnd);
      } else if (['CMT1', 'CMT2', 'CMT3', 'CMT4'].includes(trimmedType)) {
        const dataStart = offset + headerSize;
        cmtBoxes[trimmedType] = buffer.slice(dataStart, offset + boxSize);
      } else if (trimmedType === 'THMB') {
        const dataStart = offset + headerSize;
        const dataEnd = offset + boxSize;
        const thmbBytes = new Uint8Array(buffer, dataStart, dataEnd - dataStart);
        
        let jpegOffset = -1;
        for (let i = 0; i < thmbBytes.length - 1; i++) {
          if (thmbBytes[i] === 0xFF && thmbBytes[i+1] === 0xD8) {
            jpegOffset = i;
            break;
          }
        }
        if (jpegOffset !== -1) {
          jpegThumbnail = buffer.slice(dataStart + jpegOffset, dataEnd);
        }
      }

      offset += boxSize;
    }
  }

  scan(0, buffer.byteLength);
  return { cmtBoxes, jpegThumbnail };
}

function parseCR3Metadata(arrayBuffer) {
  const { cmtBoxes, jpegThumbnail } = extractCR3Boxes(arrayBuffer);
  const combinedTags = {};
  
  for (const [name, cmtData] of Object.entries(cmtBoxes)) {
    try {
      const tags = ExifReader.load(cmtData);
      Object.assign(combinedTags, tags);
    } catch (err) {
      console.warn(`Failed to parse ${name} tag:`, err);
    }
  }
  
  if (jpegThumbnail) {
    const bytes = new Uint8Array(jpegThumbnail);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    combinedTags['Thumbnail'] = {
      image: jpegThumbnail,
      base64: base64,
      type: 'image/jpeg'
    };
  }
  
  combinedTags['FileType'] = {
    value: 'cr3',
    description: 'Canon CR3 RAW'
  };
  
  return combinedTags;
}

function getTagCategory(tagName) {
  // Returns one of: 'exposure', 'colors', 'optics', 'others'
  // Used for Advanced tab category filter only
  const name = tagName.toLowerCase();
  if (name.includes('gps') || tagName === 'Latitude' || tagName === 'Longitude' || tagName === 'Altitude') return 'gps';
  const exposureTags = ['exposuretime','fnumber','isospeed','exposureprogram','shutterspeed','aperture','exposurebias','meteringmode','flash','whitebalance','sensingmethod','exposuremode','brightness','contrast','saturation','sharpness','lightsource'];
  if (exposureTags.some(t => name.includes(t))) return 'exposure';
  const cameraTags = ['make','model','software','serialnumber','bodyserialnumber','ownername','cameraownername','firmware','device','lensmodel','lensmake','lensspecification','lensserialnumber','imagewidth','imagelength'];
  if (cameraTags.some(t => name.includes(t))) return 'camera';
  return 'other';
}

function downloadJson(tags, filename) {
  const cleanedTags = {};
  for (const [key, val] of Object.entries(tags)) {
    if (key === 'Thumbnail') {
      cleanedTags[key] = {
        base64: val.base64 ? val.base64.substring(0, 100) + '... [truncated]' : undefined,
        type: val.type
      };
    } else {
      cleanedTags[key] = val;
    }
  }
  const jsonString = JSON.stringify(cleanedTags, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.[^/.]+$/, "") + "_metadata.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── EXIF Smart Value Formatters ──────────────────────────────────────────────

function exifGet(tags, ...keys) {
  for (const k of keys) {
    if (tags[k] !== undefined) return tags[k];
  }
  return null;
}

function fmtVal(tag) {
  if (!tag) return null;
  const d = tag.description;
  const v = tag.value;
  if (d !== undefined && d !== null && String(d).trim() !== '') return String(d).trim();
  if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  return null;
}

function fmtShutterSpeed(tags) {
  const tag = exifGet(tags, 'ExposureTime', 'ShutterSpeedValue');
  if (!tag) return null;
  if (tag.value !== undefined) {
    const num = Array.isArray(tag.value) ? tag.value[0] / tag.value[1] : Number(tag.value);
    if (isNaN(num)) return fmtVal(tag);
    if (num >= 1) return num % 1 === 0 ? `${num}"` : `${num.toFixed(1)}"`;
    return `1/${Math.round(1/num)}`;
  }
  return fmtVal(tag);
}

function fmtAperture(tags) {
  const tag = exifGet(tags, 'FNumber', 'ApertureValue');
  if (!tag) return null;
  if (tag.value !== undefined) {
    let num;
    if (Array.isArray(tag.value)) num = tag.value[0] / tag.value[1];
    else if (typeof tag.value === 'number') num = tag.value;
    // ApertureValue is APEX: f = 2^(apex/2)
    else if (tag.description) {
      const d = parseFloat(tag.description);
      return isNaN(d) ? fmtVal(tag) : `f/${d}`;
    }
    if (num !== undefined && !isNaN(num)) {
      if (String(Object.keys(tags).find(k => tags[k] === tag)).includes('Aperture'))
        num = Math.pow(2, num / 2);
      return `f/${parseFloat(num.toFixed(1))}`;
    }
  }
  return fmtVal(tag);
}

function fmtISO(tags) {
  const tag = exifGet(tags, 'ISOSpeedRatings', 'PhotographicSensitivity', 'ISO');
  if (!tag) return null;
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return v !== undefined ? `ISO ${v}` : fmtVal(tag);
}

function fmtFocalLength(tags) {
  const tag = exifGet(tags, 'FocalLength');
  if (!tag) return null;
  if (Array.isArray(tag.value)) {
    const mm = tag.value[0] / tag.value[1];
    return isNaN(mm) ? fmtVal(tag) : `${parseFloat(mm.toFixed(1))} mm`;
  }
  return fmtVal(tag);
}

function fmtFocalLength35(tags) {
  const tag = exifGet(tags, 'FocalLengthIn35mmFilm', 'FocalLengthIn35mmFormat');
  if (!tag) return null;
  const v = Array.isArray(tag.value) ? tag.value[0] : Number(tag.value);
  return isNaN(v) ? fmtVal(tag) : `${v} mm`;
}

function fmtCropFactor(tags) {
  const fl = exifGet(tags, 'FocalLength');
  const fl35 = exifGet(tags, 'FocalLengthIn35mmFilm', 'FocalLengthIn35mmFormat');
  if (!fl || !fl35) return null;
  const flMm = Array.isArray(fl.value) ? fl.value[0] / fl.value[1] : Number(fl.value);
  const fl35Mm = Array.isArray(fl35.value) ? fl35.value[0] : Number(fl35.value);
  if (!flMm || !fl35Mm) return null;
  const crop = fl35Mm / flMm;
  return `${parseFloat(crop.toFixed(2))}×`;
}

function fmtAspectRatio(tags) {
  const wTag = exifGet(tags, 'ImageWidth', 'PixelXDimension', 'ExifImageWidth');
  const hTag = exifGet(tags, 'ImageLength', 'PixelYDimension', 'ExifImageHeight');
  if (!wTag || !hTag) return null;
  const w = Number(Array.isArray(wTag.value) ? wTag.value[0] : wTag.value);
  const h = Number(Array.isArray(hTag.value) ? hTag.value[0] : hTag.value);
  if (!w || !h) return null;
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const g = gcd(w, h);
  return `${w/g}:${h/g} (${w}×${h})`;
}

function fmtResolution(tags) {
  const wTag = exifGet(tags, 'ImageWidth', 'PixelXDimension', 'ExifImageWidth');
  const hTag = exifGet(tags, 'ImageLength', 'PixelYDimension', 'ExifImageHeight');
  if (!wTag || !hTag) return null;
  const w = Number(Array.isArray(wTag.value) ? wTag.value[0] : wTag.value);
  const h = Number(Array.isArray(hTag.value) ? hTag.value[0] : hTag.value);
  if (!w || !h) return null;
  const mp = ((w * h) / 1_000_000).toFixed(1);
  return `${w} × ${h} px  (${mp} MP)`;
}

function fmtMeteringMode(tags) {
  const tag = exifGet(tags, 'MeteringMode');
  if (!tag) return null;
  const map = { 0:'Unknown', 1:'Average', 2:'Center-weighted', 3:'Spot', 4:'Multi-spot', 5:'Multi-zone', 6:'Partial', 255:'Other' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtFlash(tags) {
  const tag = exifGet(tags, 'Flash');
  if (!tag) return null;
  if (tag.description) return tag.description;
  const v = Array.isArray(tag.value) ? tag.value[0] : Number(tag.value);
  const fired = (v & 0x01) ? 'Flash fired' : 'No flash';
  return fired;
}

function fmtWhiteBalance(tags) {
  const tag = exifGet(tags, 'WhiteBalance');
  if (!tag) return null;
  const map = { 0:'Auto', 1:'Manual' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtColorSpace(tags) {
  const tag = exifGet(tags, 'ColorSpace');
  if (!tag) return null;
  const map = { 1:'sRGB', 65535:'Uncalibrated', 2:'Adobe RGB' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtColorDepth(tags) {
  const tag = exifGet(tags, 'BitsPerSample');
  if (!tag) return null;
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return v ? `${v}-bit` : fmtVal(tag);
}

function fmtGPS(tags) {
  const lat = exifGet(tags, 'GPSLatitude');
  const lon = exifGet(tags, 'GPSLongitude');
  if (!lat || !lon) return null;
  
  const getDirAbbr = (ref) => {
    if (!ref) return '';
    const s = String(ref).trim().toUpperCase();
    if (s.startsWith('N')) return 'N';
    if (s.startsWith('S')) return 'S';
    if (s.startsWith('E')) return 'E';
    if (s.startsWith('W')) return 'W';
    return ref;
  };

  const roundCoord = (raw) => {
    const n = parseFloat(raw);
    return isNaN(n) ? raw : n.toFixed(6);
  };

  const latRef = getDirAbbr(fmtVal(exifGet(tags, 'GPSLatitudeRef')) || 'N');
  const lonRef = getDirAbbr(fmtVal(exifGet(tags, 'GPSLongitudeRef')) || 'E');
  const latStr = roundCoord(fmtVal(lat));
  const lonStr = roundCoord(fmtVal(lon));
  return `${latStr} ${latRef}, ${lonStr} ${lonRef}`;
}

function fmtDateTime(tags) {
  const tag = exifGet(tags, 'DateTimeOriginal', 'DateTimeDigitized', 'DateTime');
  if (!tag) return null;
  const v = fmtVal(tag);
  if (!v) return null;
  // EXIF date format: "YYYY:MM:DD HH:MM:SS"
  return v.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
}

function fmtEditTime(tags) {
  const tag = exifGet(tags, 'DateTime', 'FileModifyDate');
  if (!tag) return null;
  return fmtVal(tag)?.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') || null;
}

function fmtExposureMode(tags) {
  const tag = exifGet(tags, 'ExposureProgram');
  if (!tag) return null;
  const map = { 0:'Not defined', 1:'Manual', 2:'Program AE', 3:'Aperture priority', 4:'Shutter priority', 5:'Creative', 6:'Action', 7:'Portrait', 8:'Landscape', 9:'Bulb' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

// ─── Camera param group definitions ───────────────────────────────────────────

const EXIF_GROUPS = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: '📷',
    tabs: ['exposure', 'all'],
    params: [
      { label: 'Shutter Speed', fn: fmtShutterSpeed },
      { label: 'Aperture',      fn: fmtAperture },
      { label: 'ISO',           fn: fmtISO },
      { label: 'Exp. Bias',     fn: (t) => fmtVal(exifGet(t, 'ExposureBiasValue', 'ExposureCompensation')) },
      { label: 'Exposure Mode', fn: fmtExposureMode },
      { label: 'Metering Mode', fn: fmtMeteringMode },
      { label: 'Flash',         fn: fmtFlash },
    ],
  },
  {
    id: 'colors',
    label: 'Colors',
    icon: '🎨',
    tabs: ['colors', 'all'],
    params: [
      { label: 'White Balance', fn: fmtWhiteBalance },
      { label: 'Color Space',   fn: fmtColorSpace },
      { label: 'Color Depth',   fn: fmtColorDepth },
    ],
  },
  {
    id: 'optics',
    label: 'Optics',
    icon: '🔭',
    tabs: ['optics', 'all'],
    params: [
      { label: 'Focal Length',   fn: fmtFocalLength },
      { label: 'Focal (35mm eq.)', fn: fmtFocalLength35 },
      { label: 'Image Ratio',    fn: fmtAspectRatio },
      { label: 'Crop Factor',    fn: fmtCropFactor },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    icon: '🗂️',
    tabs: ['others', 'all'],
    params: [
      { label: 'Resolution',    fn: fmtResolution },
      { label: 'Shooting Time', fn: fmtDateTime },
      { label: 'Last Edit Time',fn: fmtEditTime },
      { label: 'Manufacturer',  fn: (t) => fmtVal(exifGet(t, 'Make')) },
      { label: 'File Type',     fn: (t) => fmtVal(exifGet(t, 'FileType')) },
      { label: 'GPS',           fn: fmtGPS },
    ],
  },
];

function setupExifAnalyzer() {
  const dropzone = $("exif-dropzone");
  const fileInput = $("exif-file-input");
  const resultsArea = $("exif-results");
  const previewImg = $("exif-preview-img");
  const rawIcon = $("exif-raw-icon");
  const fileNameEl = $("exif-file-name");
  const fileTypeEl = $("exif-file-type");
  const fileSizeEl = $("exif-file-size");
  const tableBody = $("exif-table-body");
  const noTagsEl = $("exif-no-tags");
  const camView = $("exif-cam-view");
  const tableWrapper = $("exif-table-wrapper");
  const searchInput = $("exif-tag-search");
  const downloadBtn = $("exif-download-json");
  const clearBtn = $("exif-clear");
  const statusEl = $("exif-status");

  let currentTags = null;
  let currentFileName = "";
  let activeTab = "all";

  if (!dropzone) return;

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  });
  dropzone.addEventListener("click", (e) => {
    if (e.target === fileInput || e.target.closest("label")) {
      return;
    }
    fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) processFile(fileInput.files[0]);
  });

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetTool = () => {
    currentTags = null;
    currentFileName = "";
    activeTab = "all";
    fileInput.value = "";
    searchInput.value = "";
    tableBody.innerHTML = "";
    camView.innerHTML = "";
    previewImg.src = "";
    previewImg.style.display = "none";
    rawIcon.style.display = "none";
    resultsArea.style.display = "none";
    dropzone.style.display = "flex";
    statusEl.textContent = "";
    document.querySelectorAll(".exif-tabs .tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === "all");
    });
  };
  clearBtn.addEventListener("click", resetTool);

  // ─── Export JSON ──────────────────────────────────────────────────────────
  downloadBtn.addEventListener("click", () => {
    if (currentTags) downloadJson(currentTags, currentFileName);
  });

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  document.querySelectorAll(".exif-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".exif-tabs .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.getAttribute("data-tab");
      renderView();
    });
  });

  searchInput.addEventListener("input", () => renderView());

  // ─── Render ───────────────────────────────────────────────────────────────
  function renderView() {
    if (!currentTags) return;
    if (activeTab === 'advanced') {
      camView.style.display = 'none';
      tableWrapper.style.display = 'block';
      renderTable();
    } else {
      tableWrapper.style.display = 'none';
      camView.style.display = 'flex';
      renderCamView();
    }
  }

  function renderCamView() {
    camView.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    let anyGroup = false;

    for (const group of EXIF_GROUPS) {
      if (!group.tabs.includes(activeTab)) continue;

      const params = group.params.map(p => ({
        label: p.label,
        value: p.fn(currentTags),
      })).filter(p => {
        if (!query) return true;
        return p.label.toLowerCase().includes(query) || (p.value || '').toLowerCase().includes(query);
      });

      if (params.length === 0) continue;
      anyGroup = true;

      const groupEl = document.createElement('div');
      groupEl.className = 'exif-param-group';

      const header = document.createElement('div');
      header.className = 'exif-param-group-header';
      header.innerHTML = `<span class="group-icon">${group.icon}</span>${group.label}`;
      groupEl.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'exif-param-grid';

      params.forEach(p => {
        const cell = document.createElement('div');
        cell.className = 'exif-stat-cell';

        const lbl = document.createElement('div');
        lbl.className = 'exif-stat-label';
        lbl.textContent = p.label;

        const val = document.createElement('div');
        val.className = 'exif-stat-value' + (p.value ? '' : ' not-available');
        val.textContent = p.value || '—';
        val.title = p.value || '';

        cell.appendChild(lbl);
        cell.appendChild(val);
        grid.appendChild(cell);
      });

      // Remove bottom border from last row of cells
      const allCells = grid.querySelectorAll('.exif-stat-cell');
      // Rough: mark all cells in last visual row as no-bottom
      // We can't know the grid flow easily, so just strip bottom from all
      // Actually, leave border on all for clean look

      groupEl.appendChild(grid);
      camView.appendChild(groupEl);
    }

    if (!anyGroup) {
      camView.innerHTML = '<div class="exif-no-tags-cam">No matching parameters found.</div>';
    }
  }

  function renderTable() {
    tableBody.innerHTML = "";
    const query = searchInput.value.toLowerCase().trim();
    let matchCount = 0;

    Object.keys(currentTags).sort().forEach(tagName => {
      if (tagName === 'Thumbnail' || tagName === 'thumbnail') return;

      const tagData = currentTags[tagName];
      const valStr = String(tagData.value !== undefined ? tagData.value : '');
      const descStr = String(tagData.description !== undefined ? tagData.description : '');

      if (query) {
        if (!tagName.toLowerCase().includes(query) &&
            !valStr.toLowerCase().includes(query) &&
            !descStr.toLowerCase().includes(query)) return;
      }

      const row = document.createElement("tr");
      const tdName = document.createElement("td");
      tdName.textContent = tagName;
      const tdVal = document.createElement("td");
      tdVal.textContent = valStr;
      tdVal.title = valStr;
      const tdDesc = document.createElement("td");
      tdDesc.textContent = descStr || "—";
      tdDesc.title = descStr;

      row.appendChild(tdName);
      row.appendChild(tdVal);
      row.appendChild(tdDesc);
      tableBody.appendChild(row);
      matchCount++;
    });

    noTagsEl.style.display = matchCount === 0 ? "block" : "none";
  }

  // ─── Process File ─────────────────────────────────────────────────────────
  function processFile(file) {
    statusEl.textContent = "";
    currentFileName = file.name;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      try {
        if (isCR3(arrayBuffer)) {
          fileTypeEl.textContent = "Canon CR3 RAW";
          currentTags = parseCR3Metadata(arrayBuffer);
          if (currentTags.Thumbnail && currentTags.Thumbnail.base64) {
            previewImg.src = 'data:image/jpeg;base64,' + currentTags.Thumbnail.base64;
            previewImg.style.display = "block";
            rawIcon.style.display = "none";
          } else {
            previewImg.style.display = "none";
            rawIcon.style.display = "flex";
          }
        } else {
          fileTypeEl.textContent = file.name.split('.').pop().toUpperCase() || "Unknown";
          try {
            currentTags = ExifReader.load(arrayBuffer);
          } catch (exifErr) {
            console.warn("ExifReader failed:", exifErr);
            currentTags = { 'Error': { value: exifErr.message, description: 'No EXIF metadata found or format unsupported.' } };
          }
          const imgReader = new FileReader();
          imgReader.onload = (ev) => {
            previewImg.src = ev.target.result;
            previewImg.style.display = "block";
            rawIcon.style.display = "none";
          };
          imgReader.readAsDataURL(file);
        }

        dropzone.style.display = "none";
        resultsArea.style.display = "grid";
        renderView();
      } catch (err) {
        console.error("Processing error:", err);
        statusEl.textContent = "Error processing file: " + err.message;
      }
    };
    reader.onerror = () => { statusEl.textContent = "Failed to read file."; };
    reader.readAsArrayBuffer(file);
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }
}

function setupRandomWheel() {
  const canvas = $("wheel-canvas");
  const canvasWrapper = $("wheel-canvas-wrapper");
  const centerSpinBtn = $("wheel-spin-btn-center");
  const resultBanner = $("wheel-result-banner");
  const resultText = $("wheel-result-text");
  const resultClose = $("wheel-result-close");
  const spinBtn = $("wheel-spin-btn");
  const resetBtn = $("wheel-reset-btn");
  const clearBtn = $("wheel-clear-btn");
  const titleInput = $("wheel-title-input");
  const titleBtn = $("wheel-title-btn");
  const titleInputGroup = $("wheel-title-input-group");
  const editBtn = $("wheel-edit-btn");
  const textInput = $("wheel-text-input");
  const listView = $("wheel-list-view");
  const allowDuplicateCheckbox = $("wheel-allow-duplicate");
  const displayTitle = $("wheel-display-title");
  
  // Custom Confirmation Modal
  const clearModal = $("wheel-clear-modal");
  const confirmClearBtn = $("wheel-confirm-clear-btn");
  const cancelClearBtn = $("wheel-cancel-clear-btn");
  const modalBackdrop = $("wheel-clear-modal-backdrop");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  
  // Wheel State
  let items = [];
  let isSpinning = false;
  let currentRotationAngle = 0;
  let isEditingOptions = false; // start in list/view mode
  let animationFrameId = null;

  // Aesthetic HSL palettes for premium look
  const colors = [
    "hsl(224, 76%, 60%)",  // indigo
    "hsl(142, 72%, 45%)",  // emerald
    "hsl(38, 92%, 50%)",   // amber
    "hsl(330, 81%, 60%)",  // pink/rose
    "hsl(194, 91%, 48%)",  // cyan
    "hsl(262, 83%, 62%)",  // purple
    "hsl(16, 90%, 54%)",   // orange
    "hsl(209, 89%, 52%)"   // bright blue
  ];

  // 1. Title Sync
  function updateTitle() {
    const titleVal = titleInput.value.trim() || "Random Wheel";
    displayTitle.textContent = titleVal;
    if (toolDetails["tool-wheel"]) {
      toolDetails["tool-wheel"].title = titleVal;
    }
  }
  titleInput.addEventListener("input", updateTitle);
  updateTitle();

  titleBtn.addEventListener("click", () => {
    if (titleInputGroup.style.display === "none") {
      titleInputGroup.style.display = "block";
      titleInput.focus();
    } else {
      titleInputGroup.style.display = "none";
    }
  });

  // 2. Parse and Sync Options
  function parseOptionsFromTextarea() {
    const text = textInput.value;
    const lines = text.split(/\r?\n/).map(line => line.trim());
    
    // Remember disabled status by text value
    const disabledTexts = new Set(
      items.filter(item => item.disabled).map(item => item.text)
    );

    // Filter empty lines but preserve duplicates/indices
    let parsedCount = 0;
    items = [];
    lines.forEach(line => {
      if (line !== "") {
        items.push({
          text: line,
          id: parsedCount++,
          disabled: disabledTexts.has(line)
        });
      }
    });
  }

  function renderListView() {
    listView.innerHTML = "";
    if (items.length === 0) {
      listView.innerHTML = `<div style="color: var(--text-muted); font-style: italic; padding: 12px; font-size: 0.9rem; text-align: center;">No options typed. Press Edit to add options.</div>`;
      return;
    }
    
    items.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "wheel-list-item" + (item.disabled ? " eliminated" : "");
      div.textContent = item.text;
      listView.appendChild(div);
    });
  }

  // Draw Lucky Wheel
  function drawWheel(angle = 0) {
    const dpi = window.devicePixelRatio || 1;
    const size = 450;
    const radius = 210;
    const centerX = size / 2;
    const centerY = size / 2;

    // Set canvas dimensions
    canvas.width = size * dpi;
    canvas.height = size * dpi;
    ctx.scale(dpi, dpi);

    ctx.clearRect(0, 0, size, size);

    const activeItems = items.filter(item => !item.disabled);

    // If no active items, draw a premium placeholder
    if (activeItems.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
      ctx.fill();
      ctx.strokeStyle = "var(--border-color)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Placeholder text
      ctx.fillStyle = "var(--text-muted)";
      ctx.font = '500 16px "Inter", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No active options", centerX, centerY);

      // Draw center pin outline
      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
      ctx.fillStyle = "var(--bg-card)";
      ctx.fill();
      ctx.strokeStyle = "var(--border-color)";
      ctx.lineWidth = 3;
      ctx.stroke();
      return;
    }

    const arcSize = (2 * Math.PI) / activeItems.length;

    // Draw sectors
    for (let i = 0; i < activeItems.length; i++) {
      const startAngle = angle + i * arcSize;
      const endAngle = angle + (i + 1) * arcSize;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Border between sectors
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw option labels text along sector radius
    for (let i = 0; i < activeItems.length; i++) {
      const startAngle = angle + i * arcSize;
      const midAngle = startAngle + arcSize / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);

      // Determine if we need to flip the text to keep it right-side up
      const isLeftHalf = Math.cos(midAngle) < 0;

      ctx.fillStyle = "#ffffff";
      
      // Adapt font size to sector count to avoid clipping
      let fontSize = 16;
      if (activeItems.length > 20) fontSize = 10;
      else if (activeItems.length > 12) fontSize = 12;
      else if (activeItems.length > 8) fontSize = 14;

      ctx.font = `bold ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.textBaseline = "middle";

      // Shadow for text readability
      ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Draw label near the outer border
      const label = activeItems[i].text;
      
      // Truncate text if it's too long
      let displayLabel = label;
      if (label.length > 16) {
        displayLabel = label.substring(0, 14) + "...";
      }

      if (isLeftHalf) {
        ctx.rotate(midAngle + Math.PI);
        ctx.textAlign = "left";
        ctx.fillText(displayLabel, -(radius - 28), 0);
      } else {
        ctx.rotate(midAngle);
        ctx.textAlign = "right";
        ctx.fillText(displayLabel, radius - 28, 0);
      }
      
      ctx.restore();
    }

    // Draw center hub wheel circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.fillStyle = isDark ? "#111827" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = isDark ? "#6366f1" : "#4f46e5";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 3. Edit vs View Mode Toggle
  function setEditingMode(editing) {
    isEditingOptions = editing;
    if (isEditingOptions) {
      listView.style.display = "none";
      textInput.style.display = "block";
      editBtn.textContent = "Done";
      editBtn.classList.add("btn-primary-sm"); // highlight complete
      textInput.focus();
    } else {
      textInput.style.display = "none";
      listView.style.display = "block";
      editBtn.textContent = "Edit";
      editBtn.classList.remove("btn-primary-sm");
      
      // Re-parse and draw
      parseOptionsFromTextarea();
      renderListView();
      drawWheel(currentRotationAngle);
    }
  }

  editBtn.addEventListener("click", () => {
    setEditingMode(!isEditingOptions);
  });

  textInput.addEventListener("input", () => {
    // If they edit the textarea directly, parse and redraw immediately
    parseOptionsFromTextarea();
    drawWheel(currentRotationAngle);
  });

  // 4. Spin Wheel Animation
  function spin() {
    if (isSpinning) return;
    
    // Auto-save edit mode if open
    if (isEditingOptions) {
      setEditingMode(false);
    }

    const activeItems = items.filter(item => !item.disabled);
    if (activeItems.length === 0) {
      alert("Please add at least one active option to spin the wheel!");
      return;
    }

    isSpinning = true;
    resultBanner.style.display = "none";

    // Select winner
    const winIndex = Math.floor(Math.random() * activeItems.length);
    const arcSize = (2 * Math.PI) / activeItems.length;
    
    // Point on wheel to align with right pointer (0 radians)
    // Sector center is at: winIndex * arcSize + arcSize / 2
    // Rotation required to align sector center to 0 is: 2*PI*spins - sector_center
    const targetSectorCenter = winIndex * arcSize + arcSize / 2;
    const spinsCount = 6 + Math.floor(Math.random() * 4); // 6 to 9 full spins
    const targetAngle = 2 * Math.PI * spinsCount - targetSectorCenter;

    const startAngleVal = currentRotationAngle % (2 * Math.PI);
    const startTime = performance.now();
    const duration = 4000; // 4 seconds

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // quintic ease-out deceleration curve
      const ease = 1 - Math.pow(1 - progress, 5);
      currentRotationAngle = startAngleVal + (targetAngle - startAngleVal) * ease;

      drawWheel(currentRotationAngle);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        currentRotationAngle = targetAngle;
        drawWheel(currentRotationAngle);

        // Announce winner
        const winner = activeItems[winIndex];
        announceWinner(winner);
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function announceWinner(winner) {
    resultText.textContent = winner.text;
    resultBanner.style.display = "flex";

    // If duplicate drawing is disabled, eliminate item
    if (!allowDuplicateCheckbox.checked) {
      winner.disabled = true;
      renderListView();
      // Redraw wheel immediately without the eliminated sector
      drawWheel(currentRotationAngle);
    }
  }

  resultClose.addEventListener("click", () => {
    resultBanner.style.display = "none";
  });

  // Bind spin triggers
  spinBtn.addEventListener("click", spin);
  centerSpinBtn.addEventListener("click", spin);
  canvas.addEventListener("click", spin);

  // 5. Reset Items
  function resetItems() {
    if (isSpinning) return;
    items.forEach(item => { item.disabled = false; });
    renderListView();
    drawWheel(currentRotationAngle);
    resultBanner.style.display = "none";
  }
  resetBtn.addEventListener("click", resetItems);

  // 6. Clear Content (with double-check custom modal)
  function showClearModal() {
    if (isSpinning) return;
    clearModal.style.display = "flex";
  }

  function hideClearModal() {
    clearModal.style.display = "none";
  }

  clearBtn.addEventListener("click", showClearModal);
  cancelClearBtn.addEventListener("click", hideClearModal);
  modalBackdrop.addEventListener("click", hideClearModal);

  confirmClearBtn.addEventListener("click", () => {
    hideClearModal();
    textInput.value = "";
    items = [];
    setEditingMode(true); // put in edit mode for writing new content
    renderListView();
    drawWheel(0);
    resultBanner.style.display = "none";
  });

  // 7. Initialize Default Content (1~5)
  textInput.value = "1\n2\n3\n4\n5";
  setEditingMode(false);

  // 8. Re-draw when dark/light theme is toggled
  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      // Small timeout to let theme class propagate
      setTimeout(() => drawWheel(currentRotationAngle), 50);
    });
  }

  // 9. Global Keyboard Shortcuts (active only when tool is visible)
  window.addEventListener("keydown", (e) => {
    // Only intercept when tool-wheel is currently active
    const card = $("tool-wheel");
    if (!card || !card.classList.contains("active")) return;

    // Do not intercept if focus is inside input/textarea fields
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      // Exception: Escape inside textarea saves & switches back to View Mode
      if (e.key === "Escape" && activeEl === textInput) {
        setEditingMode(false);
      }
      return;
    }

    if (e.code === "Space") {
      e.preventDefault();
      spin();
    } else if (e.key.toLowerCase() === "r") {
      resetItems();
    } else if (e.key.toLowerCase() === "c") {
      showClearModal();
    } else if (e.key.toLowerCase() === "e") {
      e.preventDefault();
      setEditingMode(!isEditingOptions);
    }
  });
}

function init() {
  setupTheme();
  setupSidebar();
  setupCopyButtons();
  setupSlashConverter();
  setupWordCounter();
  setupDateCounter();
  setupCurrencyCounter();
  setupColorConverter();
  setupAsciiConverter();
  setupUnicodeConverter();
  setupBaseConverter();
  setupDnaConverter();
  setupIpLookup();
  setupExifAnalyzer();
  setupRandomWheel();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
