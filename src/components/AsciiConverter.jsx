import React from 'react';
import BidirectionalConverter from './ui/BidirectionalConverter';

function textToAscii(text) {
  if (!text) return { value: '', error: null };

  const codes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code > 127) {
      return {
        value: '',
        error: `“${char}” is outside the ASCII range. Use Unicode Converter for non-ASCII text.`,
      };
    }
    codes.push(code);
  }

  return { value: codes.join(' '), error: null };
}

function asciiToText(codes) {
  if (!codes.trim()) return { value: '', error: null };

  const values = codes.split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      return { value: '', error: `“${value}” is not a decimal ASCII code.` };
    }
    const code = Number(value);
    if (code < 0 || code > 127) {
      return { value: '', error: `ASCII code ${value} is outside the allowed range of 0–127.` };
    }
    chars.push(String.fromCharCode(code));
  }

  return { value: chars.join(''), error: null };
}

const modes = [
  {
    id: 'encode',
    shortLabel: 'Text → ASCII',
    detailLabel: 'Encode',
    inputLabel: 'Plain text',
    inputHint: 'Standard ASCII characters only (0–127)',
    inputPlaceholder: 'Hello',
    outputLabel: 'Decimal ASCII codes',
    outputPlaceholder: '72 101 108 108 111',
    emptyMessage: 'Enter ASCII text to see its decimal character codes.',
    convert: textToAscii,
  },
  {
    id: 'decode',
    shortLabel: 'ASCII → Text',
    detailLabel: 'Decode',
    inputLabel: 'Decimal ASCII codes',
    inputHint: 'Separate codes with spaces, commas, or new lines',
    inputPlaceholder: '72 101 108 108 111',
    outputLabel: 'Decoded text',
    outputPlaceholder: 'Hello',
    emptyMessage: 'Enter decimal values from 0 to 127 to decode them as text.',
    convert: asciiToText,
  },
];

export default function AsciiConverter() {
  return (
    <BidirectionalConverter
      toolId="tool-ascii"
      title="ASCII Converter"
      description="Encode standard ASCII text as decimal codes or decode decimal codes back into readable text."
      modes={modes}
      defaultMode="encode"
    />
  );
}
