import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

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
    <Card id="tool-unicode" variant="tool">
      <ToolHeader title="Unicode Converter" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start mt-2">
        {/* Left Column: Text to Unicode */}
        <div className="flex flex-col gap-4">
          <FieldInput
            as="textarea"
            id="unicode-text"
            label="Text to Unicode"
            rows={3}
            placeholder="Hello"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
          />
          <FieldInput
            as="textarea"
            id="unicode-codes"
            label="Unicode codes"
            rows={3}
            readOnly
            value={textToUnicodeOutput}
          />
        </div>

        {/* Right Column: Unicode to Text */}
        <div className="flex flex-col gap-4">
          <FieldInput
            id="unicode-codes-input"
            label="Unicode codes to text"
            type="text"
            placeholder="U+4F60 U+597D"
            value={codesVal}
            onChange={(e) => setCodesVal(e.target.value)}
          />
          <div className="bg-accent-light border-l-4 border-accent rounded-[4px_12px_12px_4px] px-5 py-4 font-semibold text-text-main text-[1.05rem] min-h-[52px] flex items-center gap-2 transition-all duration-300">
            <span className="text-text-muted font-medium">Decoded Text:</span>
            <strong id="unicode-text-output">{codesToTextResult.text || "—"}</strong>
          </div>
          <p className="min-h-[18px] text-red-500 font-medium text-sm" id="unicode-status">
            {codesToTextResult.error || ""}
          </p>
        </div>
      </div>
    </Card>
  );
}
