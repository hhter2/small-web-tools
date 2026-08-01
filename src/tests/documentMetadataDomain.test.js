import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDocumentDate,
  formatDurationMinutes,
} from '../components/DocMeta/lib/documentMetadata.js';

describe('document metadata domain', () => {
  it('formats bounded metadata values', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatDurationMinutes('PT1H30M')).toBe('1h 30m (90 mins)');
    expect(formatDocumentDate('not-a-date')).toBe('not-a-date');
  });
});
