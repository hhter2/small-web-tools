function encodeUrl(input, scope) {
  try {
    return {
      output: scope === 'full' ? encodeURI(input) : encodeURIComponent(input),
      error: null,
    };
  } catch {
    return {
      output: '',
      errorKey: 'invalidUnicode',
      error: null,
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
      errorKey: 'malformedEncoding',
      error: null,
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
      sourceKey: mode === 'auto' ? 'urlOrEncoded' : encoding ? 'decoded' : 'encoded',
      targetKey: mode === 'auto' ? null : encoding ? 'encoded' : 'decoded',
      output: '',
      outputPlaceholderKey: 'convertedPlaceholder',
      error: null,
    };
  }

  const shouldDecode = mode === 'decode' || (mode === 'auto' && looksPercentEncoded(input));
  const converted = shouldDecode ? decodeUrl(input, scope) : encodeUrl(input, scope);

  return {
    sourceKey: shouldDecode ? 'encoded' : scope === 'full' ? 'fullUrl' : 'component',
    targetKey: shouldDecode ? 'decoded' : 'encoded',
    output: converted.output,
    outputPlaceholderKey: shouldDecode ? 'decodedPlaceholder' : 'encodedPlaceholder',
    error: converted.error,
    errorKey: converted.errorKey ?? null,
  };
}
