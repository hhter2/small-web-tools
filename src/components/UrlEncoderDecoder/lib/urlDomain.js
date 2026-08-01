function encodeUrl(input, scope) {
  try {
    return {
      output: scope === 'full' ? encodeURI(input) : encodeURIComponent(input),
      error: null,
    };
  } catch {
    return {
      output: '',
      error: 'The source contains an invalid Unicode sequence that cannot be URL-encoded.',
    };
  }
}

function decodeUrl(input, scope) {
  try {
    return {
      output: scope === 'full' ? decodeURI(input) : decodeURIComponent(input),
      error: null,
    };
  } catch {
    return {
      output: '',
      error: 'The source contains malformed or incomplete percent-encoding.',
    };
  }
}

export function looksPercentEncoded(input) {
  return /%[0-9a-f]{2}/i.test(input);
}

export function analyzeUrl(input, mode = 'auto', scope = 'full') {
  if (!input) {
    const encoding = mode !== 'decode';
    return {
      sourceLabel: mode === 'auto' ? 'URL or encoded URL' : encoding ? 'Decoded URL' : 'Percent-encoded URL',
      targetLabel: mode === 'auto' ? '' : encoding ? 'Percent-encoded URL' : 'Decoded URL',
      output: '',
      outputPlaceholder: 'The converted URL appears here.',
      error: null,
    };
  }

  const shouldDecode = mode === 'decode' || (mode === 'auto' && looksPercentEncoded(input));
  const converted = shouldDecode ? decodeUrl(input, scope) : encodeUrl(input, scope);

  return {
    sourceLabel: shouldDecode ? 'Percent-encoded URL' : scope === 'full' ? 'Full URL' : 'URL component',
    targetLabel: shouldDecode ? 'Decoded URL' : 'Percent-encoded URL',
    output: converted.output,
    outputPlaceholder: shouldDecode ? 'Decoded URL appears here.' : 'Encoded URL appears here.',
    error: converted.error,
  };
}
