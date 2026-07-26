import { beforeEach, describe, expect, it, vi } from 'vitest';

const enforceRateLimit = vi.fn(async () => null);

vi.mock('../../_shared/rateLimit.js', () => ({ enforceRateLimit }));

const {
  createExchangeRatesHandler,
  resetExchangeRateCache,
  SUPPORTED_CURRENCIES,
} = await import('../exchange-rates.js');

const NOW = 1_800_000_000_000;
const context = {
  request: new Request('https://small-web-tools.pages.dev/api/exchange-rates'),
  env: {},
};

function validRates() {
  return Object.fromEntries(
    SUPPORTED_CURRENCIES.map((code, index) => [code, code === 'USD' ? 1 : index + 2]),
  );
}

function providerResponse(overrides = {}) {
  return Response.json({
    time_last_update_unix: 1_700_000_000,
    rates: validRates(),
    ...overrides,
  });
}

describe('exchange-rates API handler', () => {
  beforeEach(() => {
    resetExchangeRateCache();
    enforceRateLimit.mockReset();
    enforceRateLimit.mockResolvedValue(null);
  });

  it('returns a validated currency allowlist on the normal path', async () => {
    const fetchImpl = vi.fn(async () => providerResponse({
      rates: { ...validRates(), UNSUPPORTED: 123 },
    }));
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => NOW });

    const response = await handler(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(body).toMatchObject({ ok: true, base: 'USD', cache: 'miss' });
    expect(Object.keys(body.rates)).toEqual(SUPPORTED_CURRENCIES);
    expect(body.rates.UNSUPPORTED).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/USD',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns a rate-limit response without contacting the provider', async () => {
    enforceRateLimit.mockResolvedValueOnce(Response.json(
      { ok: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': '60' } },
    ));
    const fetchImpl = vi.fn();
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => NOW });

    const response = await handler(context);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns a sanitized timeout response for an aborted upstream request', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('internal provider timeout detail', 'AbortError');
    });
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => NOW });

    const response = await handler(context);
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toMatchObject({ ok: false, code: 'UPSTREAM_TIMEOUT' });
    expect(JSON.stringify(body)).not.toContain('internal provider timeout detail');
  });

  it('rejects malformed provider data without caching or leaking details', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(providerResponse({ rates: [] }))
      .mockResolvedValueOnce(providerResponse());
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => NOW });

    const failed = await handler(context);
    const failedBody = await failed.json();
    const recovered = await handler(context);

    expect(failed.status).toBe(502);
    expect(failedBody).toMatchObject({ ok: false, code: 'PROVIDER_UNAVAILABLE' });
    expect(failedBody.rates).toBeUndefined();
    expect((await recovered.json()).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
