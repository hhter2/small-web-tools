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
  const count = Array.isArray(files) ? files.length : files.size || 0;
  if (count > maxCount) {
    return {
      valid: false,
      error: `Number of selected ${category} (${count}) exceeds maximum batch limit of ${maxCount}.`
    };
  }
  return { valid: true, error: null };
}
