import React from 'react';
import AutoDetectConverter from './ui/AutoDetectConverter';

function encodeUnicode(text) {
  return Array.from(text)
    .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}

function decodeUnicode(codes) {
  const values = codes.trim().split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const raw of values) {
    const cleaned = raw.replace(/^U\+/i, '').replace(/^0x/i, '');
    if (!/^[0-9A-F]+$/i.test(cleaned)) {
      return { output: '', error: `"${raw}" is not a hexadecimal Unicode code point.` };
    }

    const codePoint = Number.parseInt(cleaned, 16);
    const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    if (codePoint > 0x10ffff || isSurrogate) {
      return { output: '', error: `"${raw}" is not a valid Unicode scalar value.` };
    }
    chars.push(String.fromCodePoint(codePoint));
  }

  return { output: chars.join(''), error: null };
}

function looksLikeUnicodeCodes(text) {
  const values = text.trim().split(/[\s,]+/).filter(Boolean);
  if (!values.length) return false;

  const hasExplicitPrefix = values.some((value) => /^(?:U\+|0x)/i.test(value));
  if (hasExplicitPrefix) return true;

  return values.length > 1
    && values.every((value) => /^[0-9A-F]{2,6}$/i.test(value))
    && values.some((value) => /\d/.test(value));
}

function analyzeUnicode(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      sourceLabel: 'Text or code points',
      targetLabel: '',
      output: '',
      outputPlaceholder: 'The converted result appears here.',
      error: null,
      status: 'Type text or paste Unicode code points. The direction will be detected automatically.',
    };
  }

  if (looksLikeUnicodeCodes(trimmed)) {
    const decoded = decodeUnicode(trimmed);
    return {
      sourceLabel: 'Unicode code points',
      targetLabel: 'Plain text',
      output: decoded.output,
      outputPlaceholder: 'Decoded text appears here.',
      error: decoded.error,
      status: decoded.error || 'Unicode code points detected and decoded automatically.',
    };
  }

  return {
    sourceLabel: 'Plain text',
    targetLabel: 'Unicode code points',
    output: encodeUnicode(input),
    outputPlaceholder: 'Unicode code points appear here.',
    error: null,
    status: 'Plain text detected and encoded automatically.',
  };
}

export default function UnicodeConverter() {
  return (
    <AutoDetectConverter
      toolId="tool-unicode"
      title="Unicode Converter"
      description="Convert between text and hexadecimal Unicode code points with automatic format detection."
      inputPlaceholder={'Hello 👋\nor\nU+0048 U+0065 U+006C U+006C U+006F'}
      emptyTargetLabel="Converted result"
      analyze={analyzeUnicode}
    />
  );
}
