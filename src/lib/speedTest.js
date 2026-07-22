export const DATA_CONFIG = {
  light: { downloadBytes: 20_000_000, uploadBytes: 5_000_000 },
  standard: { downloadBytes: 50_000_000, uploadBytes: 15_000_000 },
  heavy: { downloadBytes: 100_000_000, uploadBytes: 25_000_000 },
};

export function getDataPlan(mode, customDownloadMb = 0, customUploadMb = 0) {
  const plan = mode === 'custom'
    ? {
        downloadBytes: Math.max(1, Number(customDownloadMb) || 1) * 1_000_000,
        uploadBytes: Math.max(1, Number(customUploadMb) || 1) * 1_000_000,
      }
    : DATA_CONFIG[mode] || DATA_CONFIG.light;
  return {
    downloadBytes: Math.round(plan.downloadBytes),
    uploadBytes: Math.round(plan.uploadBytes),
    totalBytes: Math.round(plan.downloadBytes + plan.uploadBytes),
  };
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
