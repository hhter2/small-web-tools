import { describe, it, expect } from 'vitest';
import {
  RESOURCE_LIMITS,
  formatBytes,
  validateFileSize,
  validateBatchCount,
  inspectZipCentralDirectory,
  validateZipSummary,
} from '../lib/resourceLimits.js';

describe('RESOURCE_LIMITS constants', () => {
  it('has positive byte limits', () => {
    expect(RESOURCE_LIMITS.MAX_IMAGE_SIZE_BYTES).toBeGreaterThan(0);
    expect(RESOURCE_LIMITS.MAX_DOC_SIZE_BYTES).toBeGreaterThan(0);
    expect(RESOURCE_LIMITS.MAX_MEDIA_SIZE_BYTES).toBeGreaterThan(0);
  });

  it('has count limits', () => {
    expect(RESOURCE_LIMITS.MAX_FOLDER_FILES_COUNT).toBeGreaterThan(0);
    expect(RESOURCE_LIMITS.MAX_BATCH_FILES_COUNT).toBeGreaterThan(0);
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('formats GB', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });
});

describe('validateFileSize', () => {
  it('returns invalid for null file', () => {
    const result = validateFileSize(null, 1024);
    expect(result.valid).toBe(false);
  });

  it('returns valid for file within limit', () => {
    const fakeFile = { name: 'test.jpg', size: 500 };
    const result = validateFileSize(fakeFile, 1024);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns invalid for file over limit', () => {
    const fakeFile = { name: 'large.jpg', size: 2048 };
    const result = validateFileSize(fakeFile, 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });
});

describe('validateBatchCount', () => {
  it('returns valid for null files', () => {
    const result = validateBatchCount(null, 100);
    expect(result.valid).toBe(true);
  });

  it('returns valid for array within limit', () => {
    const files = new Array(50).fill({});
    const result = validateBatchCount(files, 100);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for array over limit', () => {
    const files = new Array(150).fill({});
    const result = validateBatchCount(files, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });
});

describe('ZIP archive safeguards', () => {
  const centralDirectoryEntry = (compressed, uncompressed) => {
    const buffer = new ArrayBuffer(46);
    const view = new DataView(buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint32(20, compressed, true);
    view.setUint32(24, uncompressed, true);
    return buffer;
  };

  it('reads entry sizes without decompressing the archive', () => {
    const summary = inspectZipCentralDirectory(centralDirectoryEntry(100, 500));
    expect(summary).toMatchObject({
      entries: 1,
      totalCompressedBytes: 100,
      totalUncompressedBytes: 500,
      compressionRatio: 5,
    });
  });

  it('accepts values exactly on configured boundaries', () => {
    expect(validateZipSummary({
      entries: RESOURCE_LIMITS.MAX_ZIP_ENTRIES_COUNT,
      totalUncompressedBytes: RESOURCE_LIMITS.MAX_UNCOMPRESSED_ZIP_BYTES,
      compressionRatio: RESOURCE_LIMITS.MAX_ZIP_COMPRESSION_RATIO,
    }).valid).toBe(true);
  });

  it.each([
    ['entry count', { entries: 1001, totalUncompressedBytes: 1, compressionRatio: 1 }],
    ['expanded size', { entries: 1, totalUncompressedBytes: 513 * 1024 * 1024, compressionRatio: 1 }],
    ['compression ratio', { entries: 1, totalUncompressedBytes: 101, compressionRatio: 101 }],
  ])('rejects an archive over the %s limit', (_label, summary) => {
    expect(validateZipSummary(summary).valid).toBe(false);
  });
});
