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
  const status = $("dna-status");

  const clearOutputs = (msg) => {
    oppositeOutput.value = "";
    revcompOutput.value = "";
    status.textContent = msg || "";
  };

  const getComplement = (sequence, isRna) => {
    const map = isRna ? rnaComplementMap : dnaComplementMap;
    return sequence.split("").map(char => map[char] || char).join("");
  };

  const reverseString = (str) => {
    return str.split("").reverse().join("");
  };

  // Handle copying and styling transitions
  document.querySelectorAll(".copy-btn-inline").forEach(button => {
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

    // Validate characters: only A, T, C, G, U are allowed
    if (/[^ACGUT]/.test(cleaned)) {
      clearOutputs("Error: Only A, T, C, G, and U characters are allowed.");
      return;
    }
    status.textContent = "";

    // 3. Auto-detect sequence type (DNA vs RNA)
    let isRna = false;
    const selectedType = seqTypeSelect.value;
    if (selectedType === "auto") {
      const hasU = cleaned.includes("U");
      const hasT = cleaned.includes("T");
      if (hasU && hasT) {
        status.textContent = "Warning: Both T and U detected. Defaulting to DNA.";
        status.style.color = "#ef4444";
        isRna = false;
      } else if (hasU) {
        isRna = true;
      } else {
        isRna = false; // defaults to DNA
      }
    } else {
      isRna = selectedType === "rna";
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

    oppositeOutput.value = oppositeStr;
    revcompOutput.value = revcompStr;
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
  }
};

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

function init() {
  setupTheme();
  setupSidebar();
  setupSlashConverter();
  setupWordCounter();
  setupDateCounter();
  setupCurrencyCounter();
  setupColorConverter();
  setupAsciiConverter();
  setupUnicodeConverter();
  setupBaseConverter();
  setupDnaConverter();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
