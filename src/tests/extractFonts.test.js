import { beforeEach, describe, expect, it, vi } from 'vitest';

const safeExternalFetch = vi.fn();
vi.mock('../../functions/_shared/safeExternalFetch.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, safeExternalFetch };
});
vi.mock('../../functions/_shared/rateLimit.js', () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

const { onRequestOptions, onRequestPost } = await import('../../functions/api/extract-fonts.js');
const SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
const ORIGIN = 'https://tools.example.com';

function postContext(body, env = { FONT_PROXY_SIGNING_SECRET: SECRET }) {
  return {
    request: new Request(ORIGIN + '/api/extract-fonts', {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
    env,
  };
}

describe('font extractor handler', () => {
  beforeEach(() => safeExternalFetch.mockReset());

  it('permits only same-origin preflight requests', async () => {
    const sameOrigin = await onRequestOptions({
      request: new Request(ORIGIN + '/api/extract-fonts', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
    });
    expect(sameOrigin.status).toBe(204);
    expect(sameOrigin.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const crossOrigin = await onRequestOptions({
      request: new Request(ORIGIN + '/api/extract-fonts', {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker.example' },
      }),
    });
    expect(crossOrigin.status).toBe(403);
  });

  it('fails closed when the signing secret is absent', async () => {
    const response = await onRequestPost(postContext({ url: 'https://example.com' }, {}));
    expect(response.status).toBe(503);
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('extracts a font and returns only a signed proxy URL', async () => {
    const html = [
      '<style>',
      '@font-face { font-family: "Demo"; src: url("/demo.woff2") format("woff2");',
      'font-weight: 600; font-style: italic; }',
      '</style>',
    ].join('');
    safeExternalFetch.mockResolvedValue({
      response: new Response(html, { headers: { 'Content-Type': 'text/html' } }),
      buffer: new TextEncoder().encode(html).buffer,
    });

    const response = await onRequestPost(postContext({ url: 'https://example.com/page' }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.fonts).toHaveLength(1);
    expect(result.fonts[0].proxyUrl).toMatch(/^\/api\/font-proxy\?token=/);
    expect(result.fonts[0].proxyUrl).not.toContain('demo.woff2');
    expect(safeExternalFetch).toHaveBeenCalledWith(
      'https://example.com/page',
      expect.objectContaining({
        allowedContentTypes: ['text/html', 'application/xhtml+xml'],
      }),
    );
  });

  it('preserves distinct faces, variable metadata, and unicode ranges', async () => {
    const html = [
      '<style>',
      '@font-face { font-family: Demo; src: url("/demo.woff2") format("woff2");',
      'font-weight: 400; font-style: normal; unicode-range: U+0000-00FF; }',
      '@font-face { font-family: Demo; src: url("/demo.woff2") format("woff2");',
      'font-weight: 700; font-style: normal; unicode-range: U+0000-00FF; }',
      '@font-face { font-family: Demo; src: url("/variable.woff2") format("woff2");',
      'font-weight: 100 900; font-style: italic; font-stretch: 75% 125%;',
      'font-variation-settings: "wght" 450; unicode-range: U+0100-024F; }',
      '@font-face { font-family: Demo; src: url("/demo.woff2") format("woff2");',
      'font-weight: 400; font-style: normal; unicode-range: U+0000-00FF; }',
      '</style>',
    ].join('');
    safeExternalFetch.mockResolvedValue({
      response: new Response(html, { headers: { 'Content-Type': 'text/html' } }),
      buffer: new TextEncoder().encode(html).buffer,
    });

    const result = await (await onRequestPost(
      postContext({ url: 'https://example.com/page' }),
    )).json();
    expect(result.fonts).toHaveLength(3);
    expect(result.fonts.map((font) => font.weight)).toEqual(['100 900', '400', '700']);
    expect(result.fonts[0]).toMatchObject({
      style: 'italic',
      stretch: '75% 125%',
      unicodeRange: 'U+0100-024F',
      variationSettings: '"wght" 450',
      isVariable: true,
    });
  });
});
