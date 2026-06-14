import React, { useState } from 'react';

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
    if (Number.isNaN(code) || code < 0 || code > 127) {
      return { text: "", error: "ASCII codes must be between 0 and 127." };
    }
    chars.push(String.fromCharCode(code));
  }

  return { text: chars.join(""), error: null };
}

export default function AsciiConverter() {
  const [textVal, setTextVal] = useState('');
  const [codesVal, setCodesVal] = useState('');

  const textToAsciiOutput = textToAscii(textVal);
  const codesToTextResult = asciiToText(codesVal);

  return (
    <article id="tool-ascii" className="tool-card active">
      <h2>ASCII Converter</h2>
      <div className="form-group">
        <label htmlFor="ascii-text">Text to ASCII codes</label>
        <textarea
          id="ascii-text"
          rows="3"
          placeholder="Hello"
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="ascii-codes">ASCII codes</label>
        <textarea
          id="ascii-codes"
          rows="3"
          readOnly
          value={textToAsciiOutput}
        />
      </div>
      <div className="form-group border-top">
        <label htmlFor="ascii-codes-input">ASCII codes to text</label>
        <input
          id="ascii-codes-input"
          type="text"
          placeholder="72 101 108 108 111"
          value={codesVal}
          onChange={(e) => setCodesVal(e.target.value)}
        />
      </div>
      <div className="result-banner">
        <span className="banner-label">Decoded Text:</span>
        <strong id="ascii-text-output">{codesToTextResult.text || "—"}</strong>
      </div>
      <p className="small status-msg" id="ascii-status">{codesToTextResult.error || ""}</p>
    </article>
  );
}
