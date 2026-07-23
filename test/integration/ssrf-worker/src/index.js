import { safeExternalFetch } from '../../../../functions/_shared/safeExternalFetch.js';

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ ok: false, code: 'NOT_FOUND' }, 404);
    if (!env.SSRF_TEST_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.SSRF_TEST_TOKEN}`) {
      return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
    }
    const { target } = await request.json();
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return json({ ok: false, code: 'INVALID_TARGET' }, 400);
    }
    const allowedHosts = new Set((env.SSRF_TEST_HOSTS || '').split(',').map((host) => host.trim()).filter(Boolean));
    if (!allowedHosts.has(parsed.hostname)) {
      return json({ ok: false, code: 'TARGET_NOT_IN_TEST_ALLOWLIST' }, 403);
    }

    try {
      const result = await safeExternalFetch(parsed.href, {
        maxBytes: 64 * 1024,
        timeoutMs: 5000,
        maxRedirects: 3,
      });
      return json({ ok: true, finalUrl: result.url, bytes: result.buffer.byteLength });
    } catch (error) {
      return json({ ok: false, code: error.code || 'SAFE_FETCH_REJECTED' }, 422);
    }
  },
};
