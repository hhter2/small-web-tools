import { beforeEach, describe, expect, it, vi } from 'vitest';

const safeExternalFetch = vi.fn();
const enforceRateLimit = vi.fn(async () => null);

vi.mock('../../functions/_shared/safeExternalFetch.js', async (importOriginal) => ({
  ...(await importOriginal()),
  safeExternalFetch,
}));
vi.mock('../../functions/_shared/rateLimit.js', () => ({ enforceRateLimit }));

const { onRequestOptions, onRequestPost } = await import('../../functions/api/extract-fonts.js');
const ORIGIN = 'https://tools.example.com';

function responseBody(text) {
  return {
    response: new Response(text),
    buffer: new TextEncoder().encode(text).buffer,
  };
}

function postContext(body, options = {}) {
  const headers = {
    Origin: ORIGIN,
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  return {
    request: new Request(`${ORIGIN}/api/extract-fonts`, {
      method: 'POST',
      headers,
      body: options.rawBody ?? JSON.stringify(body),
    }),
    env: options.env || {},
  };
}

describe('font extractor handler', () => {
  beforeEach(() => {
    safeExternalFetch.mockReset();
    enforceRateLimit.mockClear();
  });

  it('permits only same-origin preflight requests', async () => {
    const sameOrigin = await onRequestOptions({
      request: new Request(`${ORIGIN}/api/extract-fonts`, {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
    });
    expect(sameOrigin.status).toBe(204);
    expect(sameOrigin.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const crossOrigin = await onRequestOptions({
      request: new Request(`${ORIGIN}/api/extract-fonts`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker.example' },
      }),
    });
    expect(crossOrigin.status).toBe(403);
  });

  it.each([
    [{ headers: { Origin: '' } }, 403],
    [{ headers: { Origin: 'https://attacker.example' } }, 403],
    [{ headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    [{ headers: { 'Content-Type': 'text/plain' } }, 415],
  ])('rejects invalid browser request policy before rate limiting', async (options, status) => {
    const response = await onRequestPost(postContext({ url: 'https://example.com' }, options));
    expect(response.status).toBe(status);
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('rate limits before parsing or upstream work', async () => {
    enforceRateLimit.mockResolvedValueOnce(new Response('limited', { status: 429 }));
    const response = await onRequestPost(postContext({ url: 'https://example.com' }));
    expect(response.status).toBe(429);
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('rejects bodies over 4 KiB', async () => {
    const response = await onRequestPost(postContext(null, {
      rawBody: JSON.stringify({ url: 'https://example.com', padding: 'x'.repeat(4096) }),
    }));
    expect(response.status).toBe(413);
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('returns metadata without source URLs, tokens, or proxy fields', async () => {
    const html = [
      '<style>',
      '@font-face { font-family: "Demo"; src: url("/demo.woff2") format("woff2");',
      'font-weight: 600; font-style: italic; }',
      '</style>',
    ].join('');
    safeExternalFetch.mockResolvedValue(responseBody(html));

    const response = await onRequestPost(postContext({ url: 'https://example.com/page' }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.fonts).toEqual([
      expect.objectContaining({
        family: 'Demo',
        format: 'WOFF2',
        weight: '600',
        style: 'italic',
        sourceHost: 'example.com',
      }),
    ]);
    expect(JSON.stringify(result.fonts)).not.toMatch(/url|token|proxy/iu);
  });

  it('deduplicates stylesheet jobs and stops at the configured job cap', async () => {
    const html = [
      '<link rel="stylesheet" href="/a.css">',
      '<link rel="stylesheet" href="/a.css">',
      '<link rel="stylesheet" href="/b.css">',
    ].join('');
    const css = '@font-face { font-family: Demo; src: url("/demo.woff2") format("woff2"); }';
    safeExternalFetch
      .mockResolvedValueOnce(responseBody(html))
      .mockResolvedValueOnce(responseBody(css));

    const response = await onRequestPost(postContext(
      { url: 'https://example.com' },
      { env: { FONT_EXTRACTION_LIMITS: { stylesheets: 1, concurrency: 1 } } },
    ));
    const result = await response.json();
    expect(safeExternalFetch).toHaveBeenCalledTimes(2);
    expect(result.truncation).toMatchObject({
      truncated: true,
      reasons: expect.arrayContaining(['stylesheets']),
      consumed: { stylesheets: 1, fontFaces: 1 },
    });
  });

  it('returns machine-readable truncation when the face cap is reached', async () => {
    const html = [
      '<style>',
      '@font-face { font-family: A; src: url("/a.woff2"); }',
      '@font-face { font-family: B; src: url("/b.woff2"); }',
      '</style>',
    ].join('');
    safeExternalFetch.mockResolvedValue(responseBody(html));
    const result = await (await onRequestPost(postContext(
      { url: 'https://example.com' },
      { env: { FONT_EXTRACTION_LIMITS: { fontFaces: 1 } } },
    ))).json();
    expect(result.fonts).toHaveLength(1);
    expect(result.truncation.reasons).toContain('font-faces');
  });
});
