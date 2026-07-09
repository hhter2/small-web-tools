import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

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
    <Card id="tool-ascii" variant="tool">
      <ToolHeader title="ASCII Converter" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start mt-2">
        {/* Left Column: Text to ASCII */}
        <div className="flex flex-col gap-4">
          <FieldInput
            as="textarea"
            id="ascii-text"
            label="Text to ASCII codes"
            rows={3}
            placeholder="Hello"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
          />
          <FieldInput
            as="textarea"
            id="ascii-codes"
            label="ASCII codes"
            rows={3}
            readOnly
            value={textToAsciiOutput}
          />
        </div>

        {/* Right Column: ASCII to Text */}
        <div className="flex flex-col gap-4">
          <FieldInput
            id="ascii-codes-input"
            label="ASCII codes to text"
            type="text"
            placeholder="72 101 108 108 111"
            value={codesVal}
            onChange={(e) => setCodesVal(e.target.value)}
          />
          <div className="bg-accent-light border-l-4 border-accent rounded-[4px_12px_12px_4px] px-5 py-4 font-semibold text-text-main text-[1.05rem] min-h-[52px] flex items-center gap-2 transition-all duration-300">
            <span className="text-text-muted font-medium">Decoded Text:</span>
            <strong id="ascii-text-output">{codesToTextResult.text || "—"}</strong>
          </div>
          <p className="min-h-[18px] text-red-500 font-medium text-sm" id="ascii-status">
            {codesToTextResult.error || ""}
          </p>
        </div>
      </div>
    </Card>
  );
}
