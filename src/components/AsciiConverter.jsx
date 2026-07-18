import React from 'react';
import AutoDetectConverter from './ui/AutoDetectConverter';

function encodeAscii(text) {
  const codes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code > 127) {
      return {
        output: '',
        error: `The character "${char}" is outside the ASCII range. Use Unicode Converter for non-ASCII text.`,
      };
    }
    codes.push(code);
  }
  return { output: codes.join(' '), error: null };
}

function decodeAscii(codes) {
  const values = codes.trim().split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      return { output: '', error: `"${value}" is not a decimal ASCII code.` };
    }
    const code = Number(value);
    if (code < 0 || code > 127) {
      return { output: '', error: `ASCII code ${value} is outside the allowed range of 0 to 127.` };
    }
    chars.push(String.fromCharCode(code));
  }
  return { output: chars.join(''), error: null };
}

function analyzeAscii(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      sourceLabel: 'Text or ASCII codes',
      targetLabel: '',
      output: '',
      outputPlaceholder: 'The converted result appears here.',
      error: null,
    };
  }

  const looksLikeCodes = /^[\d\s,]+$/.test(trimmed);
  if (looksLikeCodes) {
    const decoded = decodeAscii(trimmed);
    return {
      sourceLabel: 'ASCII codes',
      targetLabel: 'Plain text',
      output: decoded.output,
      outputPlaceholder: 'Decoded text appears here.',
      error: decoded.error,
    };
  }

  const encoded = encodeAscii(input);
  return {
    sourceLabel: 'Plain text',
    targetLabel: 'ASCII codes',
    output: encoded.output,
    outputPlaceholder: 'Decimal ASCII codes appear here.',
    error: encoded.error,
  };
}

export default function AsciiConverter() {
  return (
    <AutoDetectConverter
      toolId="tool-ascii"
      title="ASCII Converter"
      description="Convert between standard ASCII text and decimal character codes with automatic format detection."
      inputPlaceholder={'Hello\nor\n72 101 108 108 111'}
      emptyTargetLabel="Converted result"
      analyze={analyzeAscii}
    />
  );
}
