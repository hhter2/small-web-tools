import React from 'react';
import BidirectionalConverter from './ui/BidirectionalConverter';

function textToUnicode(text) {
  return {
    value: Array.from(text)
      .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
      .join(' '),
    error: null,
  };
}

function unicodeToText(codes) {
  if (!codes.trim()) return { value: '', error: null };

  const values = codes.split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const raw of values) {
    const cleaned = raw.replace(/^U\+/i, '').replace(/^0x/i, '');
    if (!/^[0-9A-F]+$/i.test(cleaned)) {
      return { value: '', error: `“${raw}” is not a hexadecimal Unicode code point.` };
    }

    const codePoint = Number.parseInt(cleaned, 16);
    const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    if (codePoint > 0x10ffff || isSurrogate) {
      return { value: '', error: `“${raw}” is not a valid Unicode scalar value.` };
    }
    chars.push(String.fromCodePoint(codePoint));
  }

  return { value: chars.join(''), error: null };
}

const modes = [
  {
    id: 'encode',
    shortLabel: 'Text → Unicode',
    detailLabel: 'Encode',
    inputLabel: 'Text',
    inputHint: 'Supports multilingual text, symbols, and emoji',
    inputPlaceholder: 'Hello 你好 👋',
    outputLabel: 'Unicode code points',
    outputPlaceholder: 'U+0048 U+0065 U+006C U+006C U+006F',
    emptyMessage: 'Enter text to inspect its Unicode code points.',
    convert: textToUnicode,
  },
  {
    id: 'decode',
    shortLabel: 'Unicode → Text',
    detailLabel: 'Decode',
    inputLabel: 'Unicode code points',
    inputHint: 'Accepts U+4F60, 0x4F60, or bare hexadecimal values',
    inputPlaceholder: 'U+4F60 U+597D U+1F44B',
    outputLabel: 'Decoded text',
    outputPlaceholder: '你好👋',
    emptyMessage: 'Enter hexadecimal Unicode code points separated by spaces or commas.',
    convert: unicodeToText,
  },
];

export default function UnicodeConverter() {
  return (
    <BidirectionalConverter
      toolId="tool-unicode"
      title="Unicode Converter"
      description="Inspect text as Unicode code points or turn hexadecimal code points back into text."
      modes={modes}
      defaultMode="encode"
    />
  );
}
