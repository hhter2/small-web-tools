export function phredToErrorProbability(score) {
  if (!Number.isFinite(score) || score < 0 || score > 300) return null;
  return 10 ** (-score / 10);
}

export function errorProbabilityToPhred(probability) {
  if (!Number.isFinite(probability) || probability <= 0 || probability > 1) return null;
  return -10 * Math.log10(probability);
}

export function calculatePhredMetrics(mode, rawValue) {
  const value = Number(rawValue);
  if (!rawValue.trim() || !Number.isFinite(value)) return null;

  const score = mode === 'score' ? value : errorProbabilityToPhred(value);
  const errorProbability = mode === 'score' ? phredToErrorProbability(value) : value;
  if (score === null || errorProbability === null) return null;

  return {
    score,
    errorProbability,
    accuracy: 1 - errorProbability,
    oneIn: 1 / errorProbability,
  };
}

export function formatProbability(value) {
  if (value === 0) return '0';
  if (value < 0.0001) return value.toExponential(3);
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatPhredScore(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
