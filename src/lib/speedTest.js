export const DATA_CONFIG = {
  light: { downloadBytes: 20_000_000, uploadBytes: 5_000_000 },
  standard: { downloadBytes: 50_000_000, uploadBytes: 15_000_000 },
  heavy: { downloadBytes: 100_000_000, uploadBytes: 25_000_000 },
};

export const CUSTOM_MB_MIN = 1;
export const CUSTOM_MB_MAX = 1000;
export const MAX_HISTORY_SAMPLES = 200;

function parseCustomMegabytes(value, label) {
  if (typeof value === 'string' && value.trim() === '') {
    throw new RangeError(`${label} must be between 1 and 1000 MB.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < CUSTOM_MB_MIN || parsed > CUSTOM_MB_MAX) {
    throw new RangeError(`${label} must be a finite value between 1 and 1000 MB.`);
  }
  return parsed;
}

export function getDataPlan(mode, customDownloadMb = 0, customUploadMb = 0) {
  const plan = mode === 'custom'
    ? {
        downloadBytes: parseCustomMegabytes(customDownloadMb, 'Download') * 1_000_000,
        uploadBytes: parseCustomMegabytes(customUploadMb, 'Upload') * 1_000_000,
      }
    : DATA_CONFIG[mode] || DATA_CONFIG.light;
  return {
    downloadBytes: Math.round(plan.downloadBytes),
    uploadBytes: Math.round(plan.uploadBytes),
    totalBytes: Math.round(plan.downloadBytes + plan.uploadBytes),
  };
}

export function appendBoundedSample(history, sample, maxSamples = MAX_HISTORY_SAMPLES) {
  if (history.length < maxSamples) return [...history, sample];
  return [
    ...history.filter((_value, index) => index % 2 === 0),
    sample,
  ];
}

export function isConstrainedConnection(connection) {
  if (!connection) return false;
  return Boolean(
    connection.saveData
    || connection.type === 'cellular'
    || /(^|-)2g$|(^|-)3g$/i.test(connection.effectiveType || ''),
  );
}

export function formatDecimalMb(bytes) {
  return (bytes / 1_000_000).toFixed(bytes % 1_000_000 === 0 ? 0 : 2) + ' MB';
}
