import React from 'react';
import BidirectionalConverter from './ui/BidirectionalConverter';

const modes = [
  {
    id: 'forward',
    shortLabel: '\\ → /',
    detailLabel: 'Windows to Web / Unix',
    inputLabel: 'Backslash path',
    inputHint: 'Paste one path or multiple lines',
    inputPlaceholder: 'C:\\Users\\name\\Documents\\report.pdf',
    outputLabel: 'Forward-slash path',
    outputPlaceholder: 'C:/Users/name/Documents/report.pdf',
    emptyMessage: 'Paste a Windows-style path. Every backslash will be replaced automatically.',
    convert: (value) => ({ value: value.replace(/\\/g, '/'), error: null }),
  },
  {
    id: 'backward',
    shortLabel: '/ → \\',
    detailLabel: 'Web / Unix to Windows',
    inputLabel: 'Forward-slash path',
    inputHint: 'Best for file-system paths, not URLs',
    inputPlaceholder: '/Users/name/Documents/report.pdf',
    outputLabel: 'Backslash path',
    outputPlaceholder: '\\Users\\name\\Documents\\report.pdf',
    emptyMessage: 'Paste a forward-slash file path. Every slash will be replaced automatically.',
    convert: (value) => ({ value: value.replace(/\//g, '\\'), error: null }),
  },
];

export default function SlashesConverter() {
  return (
    <BidirectionalConverter
      toolId="tool-slash"
      title="Slashes Converter"
      description="Convert file paths in either direction with a live preview, then copy or switch the result back in one click."
      modes={modes}
      defaultMode="forward"
    />
  );
}
