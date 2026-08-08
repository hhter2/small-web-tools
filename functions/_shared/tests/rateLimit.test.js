import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceRateLimit } from '../rateLimit.js';

const SECRET = 'x'.repeat(32);

function context(fetchImpl) {
  return {
    request: new Request('https://example.test/api', {
      headers: { 'CF-Connecting-IP': '203.0.113.5' },
    }),
    env: {
      RATE_LIMIT_HMAC_SECRET: SECRET,
      RATE_LIMITER_SERVICE: { fetch: fetchImpl },
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rate-limit service binding', () => {
  it('preserves normal allow and limited responses', async () => {
    /** @type {Request | null} */
    let serviceRequest = null;
    const allowed = await enforceRateLimit(context(async (request) => {
      serviceRequest = request;
      return Response.json({ allowed: true });
    }), { name: 'iplookup', serviceTimeoutMs: 50 });

    expect(allowed).toBeNull();
    if (!serviceRequest) throw new Error('Service request was not observed.');
    expect(serviceRequest.signal.aborted).toBe(false);
    expect(await serviceRequest.json()).toMatchObject({ route: 'iplookup' });

    const limited = await enforceRateLimit(context(async () => Response.json({ allowed: false })), {
      name: 'iplookup', serviceTimeoutMs: 50,
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
  });

  it('propagates timeout cancellation to the service Request and returns promptly', async () => {
    let observedAbort = false;
    const startedAt = Date.now();
    const response = await enforceRateLimit(context((request) => new Promise((resolve) => {
      request.signal.addEventListener('abort', () => {
        observedAbort = true;
        resolve(Response.json({ allowed: true }));
      }, { once: true });
    })), { name: 'extract-fonts', serviceTimeoutMs: 20 });

    expect(response.status).toBe(503);
    expect(observedAbort).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
      diagnostic: 'rate-limiter-timeout',
    }));
  });

  it.each([
    ['service failure', async () => new Response(null, { status: 500 }), 'rate-limiter-service-failure'],
    ['malformed response', async () => Response.json({ allowed: 'yes' }), 'rate-limiter-malformed-response'],
  ])('fails closed with a distinct diagnostic for %s', async (_label, fetchImpl, diagnostic) => {
    const response = await enforceRateLimit(context(fetchImpl), {
      name: 'exchange-rates', serviceTimeoutMs: 50,
    });

    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith(expect.objectContaining({ diagnostic }));
  });

  it('cleans the deadline timer after a completed request', async () => {
    /** @type {Request | null} */
    let serviceRequest = null;
    await enforceRateLimit(context(async (request) => {
      serviceRequest = request;
      return Response.json({ allowed: true });
    }), { name: 'iplookup', serviceTimeoutMs: 20 });

    if (!serviceRequest) throw new Error('Service request was not observed.');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(serviceRequest.signal.aborted).toBe(false);
  });
});
