import React, { useState } from 'react';

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

export default function UnicodeConverter() {
  const [textVal, setTextVal] = useState('');
  const [codesVal, setCodesVal] = useState('');

  const textToUnicodeOutput = textToUnicode(textVal);
  const codesToTextResult = unicodeToText(codesVal);

  return (
    <article id="tool-unicode" className="tool-card active">
      <h2>Unicode Converter</h2>
      <div className="form-group">
        <label htmlFor="unicode-text">Text to Unicode</label>
        <textarea
          id="unicode-text"
          rows="3"
          placeholder="Hello"
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="unicode-codes">Unicode codes</label>
        <textarea
          id="unicode-codes"
          rows="3"
          readOnly
          value={textToUnicodeOutput}
        />
      </div>
      <div className="form-group border-top">
        <label htmlFor="unicode-codes-input">Unicode codes to text</label>
        <input
          id="unicode-codes-input"
          type="text"
          placeholder="U+4F60 U+597D"
          value={codesVal}
          onChange={(e) => setCodesVal(e.target.value)}
        />
      </div>
      <div className="result-banner">
        <span className="banner-label">Decoded Text:</span>
        <strong id="unicode-text-output">{codesToTextResult.text || "—"}</strong>
      </div>
      <p className="small status-msg" id="unicode-status">{codesToTextResult.error || ""}</p>
    </article>
  );
}
