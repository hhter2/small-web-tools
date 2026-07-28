import { describe, expect, it } from 'vitest';
import {
  analyzeUrl,
  looksPercentEncoded,
} from '../components/UrlEncoderDecoder/lib/urlDomain.js';

describe('URL encoder and decoder domain', () => {
  it('encodes and decodes Chinese characters while preserving full URL structure', () => {
    const source = 'https://example.com/台北市/信義路?地址=台北 101';
    const encoded = analyzeUrl(source, 'encode', 'full');

    expect(encoded.output).toBe(
      'https://example.com/%E5%8F%B0%E5%8C%97%E5%B8%82/%E4%BF%A1%E7%BE%A9%E8%B7%AF?%E5%9C%B0%E5%9D%80=%E5%8F%B0%E5%8C%97%20101',
    );
    expect(analyzeUrl(encoded.output, 'decode', 'full').output).toBe(source);
  });

  it('encodes a complete address as a query-safe component', () => {
    expect(analyzeUrl('台北市信義區 市府路 1 號', 'encode', 'component').output)
      .toBe('%E5%8F%B0%E5%8C%97%E5%B8%82%E4%BF%A1%E7%BE%A9%E5%8D%80%20%E5%B8%82%E5%BA%9C%E8%B7%AF%201%20%E8%99%9F');
  });

  it('auto-detects percent encoding and reports malformed sequences', () => {
    expect(looksPercentEncoded('%E5%8F%B0')).toBe(true);
    expect(analyzeUrl('%E5%8F%B0%E5%8C%97', 'auto', 'full').output).toBe('台北');
    expect(analyzeUrl('%E0%A4%A', 'auto', 'full').error).toMatch(/malformed/);
  });

  it('reports unpaired surrogate input without throwing', () => {
    expect(analyzeUrl('\uD800', 'encode', 'component').error).toMatch(/invalid Unicode/);
  });
});
