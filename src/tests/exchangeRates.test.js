import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../functions/_shared/rateLimit.js', () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

const {
  createExchangeRatesHandler,
  resetExchangeRateCache,
} = await import('../../functions/api/exchange-rates.js');

const context = {
  request: new Request('https://tools.example.com/api/exchange-rates'),
  env: {},
};

describe('exchange-rates API', () => {
  beforeEach(() => resetExchangeRateCache());

  it('returns provider metadata and serves a short-lived cache hit', async () => {
    const fetchImpl = vi.fn(async () => Response.json({
      result: 'success',
      time_last_update_unix: 1_700_000_000,
      rates: { USD: 1, TWD: 32 },
    }));
    let timestamp = 1_800_000_000_000;
    const handler = createExchangeRatesHandler({
      fetchImpl,
      now: () => timestamp,
    });

    const first = await (await handler(context)).json();
    expect(first).toMatchObject({
      ok: true,
      provider: 'ExchangeRate-API open endpoint',
      cache: 'miss',
    });
    timestamp += 60_000;
    const second = await (await handler(context)).json();
    expect(second.cache).toBe('hit');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails visibly without returning stale bundled rates', async () => {
    const handler = createExchangeRatesHandler({
      fetchImpl: vi.fn(async () => new Response(null, { status: 503 })),
    });
    const response = await handler(context);
    const result = await response.json();
    expect(response.status).toBe(502);
    expect(result.ok).toBe(false);
    expect(result.rates).toBeUndefined();
  });
});
