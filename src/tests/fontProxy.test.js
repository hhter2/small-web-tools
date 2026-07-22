import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signFontToken } from '../../functions/_shared/fontToken.js';

const safeExternalFetch = vi.fn();
vi.mock('../../functions/_shared/safeExternalFetch.js', () => ({ safeExternalFetch }));
vi.mock('../../functions/_shared/rateLimit.js', () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

const { onRequestGet } = await import('../../functions/api/font-proxy.js');

const SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
const ORIGIN = 'https://tools.example.com';

async function makeContext(fontUrl = 'https://fonts.example.com/a.woff2') {
  const token = await signFontToken(fontUrl, SECRET, { audience: ORIGIN });
  return {
    request: new Request(ORIGIN + '/api/font-proxy?token=' + encodeURIComponent(token)),
    env: { FONT_PROXY_SIGNING_SECRET: SECRET },
  };
}

describe('font proxy handler', () => {
  beforeEach(() => {
    safeExternalFetch.mockReset();
  });

  it('serves a signed font using its detected type and private no-store caching', async () => {
    safeExternalFetch.mockResolvedValue({
      response: new Response(),
      buffer: Uint8Array.from([0x77, 0x4f, 0x46, 0x32, 0, 0]).buffer,
    });
    const response = await onRequestGet(await makeContext());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('font/woff2');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('rejects missing deployment configuration', async () => {
    const context = await makeContext();
    context.env = {};
    const response = await onRequestGet(context);
    expect(response.status).toBe(503);
    expect(safeExternalFetch).not.toHaveBeenCalled();
  });

  it('rejects a non-font upstream body even with a valid token', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeExternalFetch.mockResolvedValue({
      response: new Response(),
      buffer: new TextEncoder().encode('<html>error</html>').buffer,
    });
    const response = await onRequestGet(await makeContext());
    expect(response.status).toBe(502);
    expect(await response.text()).toContain('not a supported font');
    errorSpy.mockRestore();
  });
});
