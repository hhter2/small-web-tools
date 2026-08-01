import React from 'react';
import AutoDetectConverter from './ui/AutoDetectConverter';

function analyzePath(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      sourceLabel: 'Path style',
      targetLabel: '',
      output: '',
      outputPlaceholder: 'The normalized path appears here.',
      error: null,
    };
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return {
      sourceLabel: 'Web URL',
      targetLabel: 'Web URL',
      output: input,
      outputPlaceholder: '',
      error: null,
    };
  }

  const backslashCount = (input.match(/\\/g) || []).length;
  const forwardSlashCount = (input.match(/\//g) || []).length;

  if (backslashCount > 0 && backslashCount >= forwardSlashCount) {
    return {
      sourceLabel: 'Backslash path',
      targetLabel: 'Forward-slash path',
      output: input.replace(/\\/g, '/'),
      outputPlaceholder: '',
      error: null,
    };
  }

  if (forwardSlashCount > 0) {
    return {
      sourceLabel: 'Forward-slash path',
      targetLabel: 'Backslash path',
      output: input.replace(/\//g, '\\'),
      outputPlaceholder: '',
      error: null,
    };
  }

  return {
    sourceLabel: 'Plain text',
    targetLabel: 'Unchanged text',
    output: input,
    outputPlaceholder: '',
    error: null,
  };
}

export default function SlashesConverter() {
  return (
    <AutoDetectConverter
      toolId="tool-slash"
      title="Slashes Converter"
      inputPlaceholder={'C:\\Users\\name\\Documents\\report.pdf\nor\n/Users/name/Documents/report.pdf'}
      emptyTargetLabel="Converted path"
      analyze={analyzePath}
      showManualModes={false}
    />
  );
}
