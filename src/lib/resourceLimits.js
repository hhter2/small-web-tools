// Centralized Resource Limits Configuration

export const RESOURCE_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: 100 * 1024 * 1024,   // 100 MB
  MAX_DOC_SIZE_BYTES: 100 * 1024 * 1024,     // 100 MB
  MAX_MEDIA_SIZE_BYTES: 500 * 1024 * 1024,   // 500 MB
  MAX_QR_IMAGE_BYTES: 25 * 1024 * 1024,      // 25 MB
  MAX_FOLDER_FILES_COUNT: 1000,
  MAX_BATCH_FILES_COUNT: 100,
  MAX_ZIP_ENTRIES_COUNT: 1000,
  MAX_UNCOMPRESSED_ZIP_BYTES: 512 * 1024 * 1024, // 512 MB
  MAX_ZIP_COMPRESSION_RATIO: 100,
  MAX_REMOTE_RESPONSE_BYTES: 10 * 1024 * 1024,
  REMOTE_REQUEST_TIMEOUT_MS: 8000,
};

export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function validateFileSize(file, maxBytes, category = 'File') {
  if (!file) return { valid: false, error: 'No file provided' };
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `${category} "${file.name}" exceeds maximum allowed size of ${formatBytes(maxBytes)} (File size: ${formatBytes(file.size)}).`
    };
  }
  return { valid: true, error: null };
}

export function validateBatchCount(files, maxCount, category = 'files') {
  if (!files) return { valid: true, error: null };
  const count = typeof files.length === 'number' ? files.length : files.size || 0;
  if (count > maxCount) {
    return {
      valid: false,
      error: `Number of selected ${category} (${count}) exceeds maximum batch limit of ${maxCount}.`
    };
  }
  return { valid: true, error: null };
}

export function inspectZipCentralDirectory(buffer) {
  const view = new DataView(buffer);
  let entries = 0;
  let totalCompressedBytes = 0;
  let totalUncompressedBytes = 0;

  for (let offset = 0; offset + 46 <= view.byteLength;) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const compressedBytes = view.getUint32(offset + 20, true);
    const uncompressedBytes = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    entries += 1;
    totalCompressedBytes += compressedBytes;
    totalUncompressedBytes += uncompressedBytes;
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return {
    entries,
    totalCompressedBytes,
    totalUncompressedBytes,
    compressionRatio: totalUncompressedBytes / Math.max(1, totalCompressedBytes),
  };
}

export function validateZipSummary(summary, limits = RESOURCE_LIMITS) {
  if (summary.entries > limits.MAX_ZIP_ENTRIES_COUNT) {
    return { valid: false, error: `Archive contains more than ${limits.MAX_ZIP_ENTRIES_COUNT} entries.` };
  }
  if (summary.totalUncompressedBytes > limits.MAX_UNCOMPRESSED_ZIP_BYTES) {
    return { valid: false, error: `Archive expands beyond ${formatBytes(limits.MAX_UNCOMPRESSED_ZIP_BYTES)}.` };
  }
  if (summary.compressionRatio > limits.MAX_ZIP_COMPRESSION_RATIO) {
    return { valid: false, error: `Archive compression ratio exceeds ${limits.MAX_ZIP_COMPRESSION_RATIO}:1.` };
  }
  return { valid: true, error: null };
}

export async function validateZipArchive(file, limits = RESOURCE_LIMITS) {
  const summary = inspectZipCentralDirectory(await file.arrayBuffer());
  return { ...validateZipSummary(summary, limits), summary };
}
