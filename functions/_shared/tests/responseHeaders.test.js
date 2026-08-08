import { describe, expect, it } from 'vitest';
import { BASELINE_RESPONSE_HEADERS, withBaselineHeaders } from '../responseHeaders.js';

describe('Function response headers', () => {
  it('applies the complete baseline while preserving response-specific headers', () => {
    const headers = withBaselineHeaders({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    for (const [name, value] of Object.entries(BASELINE_RESPONSE_HEADERS)) {
      expect(headers.get(name), name).toBe(value);
    }
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('Vary')).toBe('Origin');
  });

  it('allows a response-specific value to override a baseline intentionally', () => {
    expect(withBaselineHeaders({ 'Referrer-Policy': 'no-referrer' }).get('Referrer-Policy')).toBe('no-referrer');
  });
});
