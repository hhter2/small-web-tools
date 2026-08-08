import { beforeEach, describe, expect, it, vi } from 'vitest';

const safeExternalFetch = vi.fn();
const enforceRateLimit = vi.fn(async () => null);

vi.mock('../../_shared/safeExternalFetch.js', async (importOriginal) => ({
  ...(await importOriginal()),
  safeExternalFetch,
}));
vi.mock('../../_shared/rateLimit.js', () => ({ enforceRateLimit }));

const { onRequestPost } = await import('../extract-fonts.js');
const { FONT_EXTRACTION_EGRESS_POLICY } = await import('../../_shared/fontExtractionCapability.js');
const ORIGIN = 'https://small-web-tools.pages.dev';

function currentVerification() {
  const now = Date.now();
  return JSON.stringify({
    schemaVersion: FONT_EXTRACTION_EGRESS_POLICY.schemaVersion,
    runtime: FONT_EXTRACTION_EGRESS_POLICY.runtime,
    outcome: 'pass',
    compatibilityDate: FONT_EXTRACTION_EGRESS_POLICY.compatibilityDate,
    implementationRevision: FONT_EXTRACTION_EGRESS_POLICY.implementationRevision,
    evidenceSha256: 'a'.repeat(64),
    verifiedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    scenarios: [...FONT_EXTRACTION_EGRESS_POLICY.requiredScenarios],
  });
}

function postContext(body, rawBody, env = {}) {
  return {
    request: new Request(`${ORIGIN}/api/extract-fonts`, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        'Sec-Fetch-Site': 'same-origin',
        'Content-Type': 'application/json',
      },
      body: rawBody ?? JSON.stringify(body),
    }),
    env: {
      FONT_EXTRACTION_EGRESS_VERIFICATION: currentVerification(),
      ...env,
    },
  };
}

function fetched(text, url) {
  return {
    response: new Response(text),
    buffer: new TextEncoder().encode(text).buffer,
    url,
  };
}

describe('extract-fonts API handler failures', () => {
  beforeEach(() => {
    safeExternalFetch.mockReset();
    enforceRateLimit.mockReset();
    enforceRateLimit.mockResolvedValue(null);
  });

  it.each([
    ['missing', undefined],
    ['malformed', '{'],
    ['stale', JSON.stringify({
      schemaVersion: FONT_EXTRACTION_EGRESS_POLICY.schemaVersion,
      runtime: FONT_EXTRACTION_EGRESS_POLICY.runtime,
      outcome: 'pass',
      compatibilityDate: FONT_EXTRACTION_EGRESS_POLICY.compatibilityDate,
      implementationRevision: FONT_EXTRACTION_EGRESS_POLICY.implementationRevision,
      evidenceSha256: 'a'.repeat(64),
      verifiedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
      scenarios: [...FONT_EXTRACTION_EGRESS_POLICY.requiredScenarios],
    })],
  ])('fails closed when runtime verification is %s', async (_label, metadata) => {
    const response = await onRequestPost(postContext(
      { url: 'https://fonts.google.com' },
      undefined,
      { FONT_EXTRACTION_EGRESS_VERIFICATION: metadata },
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: 'FEATURE_UNAVAILABLE' });
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['missing URL', {}, 400, 'VALIDATION_FAILED'],
    ['non-string URL', { url: 123 }, 400, 'VALIDATION_FAILED'],
    ['blocked private target', { url: 'http://127.0.0.1/fonts' }, 400, 'BLOCKED_TARGET'],
  ])('rejects %s before upstream access', async (_label, body, status, code) => {
    const response = await onRequestPost(postContext(body));

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, code });
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before upstream access', async () => {
    const response = await onRequestPost(postContext(null, '{"url":'));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('returns a sanitized timeout response for an upstream timeout', async () => {
    safeExternalFetch.mockRejectedValueOnce(Object.assign(
      new Error('internal DNS and timeout detail'),
      { code: 'UPSTREAM_TIMEOUT' },
    ));

    const response = await onRequestPost(postContext({ url: 'https://fonts.google.com' }));
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toMatchObject({ ok: false, code: 'UPSTREAM_TIMEOUT' });
    expect(JSON.stringify(body)).not.toContain('internal DNS and timeout detail');
  });

  it('returns font metadata from inline and linked stylesheets', async () => {
    safeExternalFetch
      .mockResolvedValueOnce(fetched([
        '<style>@font-face { font-family: Inline; src: url("/inline.woff2"); }</style>',
        '<link rel="stylesheet" href="/site.css">',
      ].join('')))
      .mockResolvedValueOnce(fetched(
        '@font-face { font-family: Linked; src: url("/linked.ttf") format("truetype"); }',
      ));

    const response = await onRequestPost(postContext({ url: 'https://fonts.google.com/page' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      sourceUrl: 'https://fonts.google.com/page',
      total: 2,
    });
    expect(body.fonts).toEqual([
      expect.objectContaining({ family: 'Inline', format: 'WOFF2' }),
      expect.objectContaining({ family: 'Linked', format: 'TRUETYPE' }),
    ]);
    expect(safeExternalFetch).toHaveBeenCalledTimes(2);
  });

  it('resolves redirected stylesheet imports and font sources from the final URL', async () => {
    safeExternalFetch
      .mockResolvedValueOnce(fetched(
        '<link rel="stylesheet" href="/site.css">',
        'https://fonts.google.com/page',
      ))
      .mockResolvedValueOnce(fetched([
        '@import "./nested.css";',
        '@font-face { font-family: Redirected; src: url("./fonts/redirected.woff2"); }',
      ].join('\n'), 'https://cdn.example/assets/site.css'))
      .mockResolvedValueOnce(fetched(
        '@font-face { font-family: Nested; src: url("./nested.woff2"); }',
        'https://cdn.example/assets/nested.css',
      ));

    const response = await onRequestPost(postContext({ url: 'https://fonts.google.com/page' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.fonts).toEqual([
      expect.objectContaining({
        family: 'Redirected',
        name: 'redirected.woff2',
        sourceHost: 'cdn.example',
      }),
      expect.objectContaining({
        family: 'Nested',
        name: 'nested.woff2',
        sourceHost: 'cdn.example',
      }),
    ]);
    expect(safeExternalFetch).toHaveBeenNthCalledWith(
      3,
      'https://cdn.example/assets/nested.css',
      expect.any(Object),
    );
  });

  it('parses tokenized stylesheet links and every ordered remote font fallback', async () => {
    safeExternalFetch
      .mockResolvedValueOnce(fetched([
        '<link REL="preload stylesheet" AS="style" href="/fonts/site.css">',
        '<link rel=stylesheet href=/fonts/site.css>',
      ].join('\n'), 'https://example.com/page'))
      .mockResolvedValueOnce(fetched([
        '/* @font-face { font-family: Hidden; src: url("/hidden.woff2"); } */',
        '@font-face {',
        '  font-family: "Fallback Face";',
        '  src: local("Installed"),',
        '       url(data:font/woff2;base64,AAAA) format("woff2"),',
        '       url("./fallback.woff2") format("woff2"),',
        '       url(./fallback.woff) format(woff),',
        '       url("./fallback.woff2") format("woff2");',
        '  font-weight: 400;',
        '}',
      ].join('\n'), 'https://cdn.example/styles/site.css'));

    const response = await onRequestPost(postContext({ url: 'https://example.com/page' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(safeExternalFetch).toHaveBeenCalledTimes(2);
    expect(body.fonts).toEqual([
      expect.objectContaining({
        family: 'Fallback Face',
        name: 'fallback.woff2',
        format: 'WOFF2',
        sourceHost: 'cdn.example',
      }),
      expect.objectContaining({
        family: 'Fallback Face',
        name: 'fallback.woff',
        format: 'WOFF',
        sourceHost: 'cdn.example',
      }),
    ]);
  });
});
