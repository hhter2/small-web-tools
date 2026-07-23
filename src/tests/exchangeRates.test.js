import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../functions/_shared/rateLimit.js', () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

const {
  createExchangeRatesHandler,
  resetExchangeRateCache,
  SUPPORTED_CURRENCIES,
} = await import('../../functions/api/exchange-rates.js');

const context = {
  request: new Request('https://tools.example.com/api/exchange-rates'),
  env: {},
};
const now = 1_800_000_000_000;

function validRates() {
  return Object.fromEntries(SUPPORTED_CURRENCIES.map((code, index) => [code, code === 'USD' ? 1 : index + 2]));
}

function providerResponse(overrides = {}, init = {}) {
  return new Response(JSON.stringify({
    result: 'success',
    time_last_update_unix: 1_700_000_000,
    rates: validRates(),
    ...overrides,
  }), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

describe('exchange-rates API', () => {
  beforeEach(() => resetExchangeRateCache());

  it('returns only supported validated rates and serves a cache hit', async () => {
    const fetchImpl = vi.fn(async () => providerResponse({
      rates: { ...validRates(), FAKE: 99 },
    }));
    let timestamp = now;
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => timestamp });
    const first = await (await handler(context)).json();
    expect(first.ok).toBe(true);
    expect(Object.keys(first.rates)).toEqual(SUPPORTED_CURRENCIES);
    expect(first.rates.FAKE).toBeUndefined();
    timestamp += 60_000;
    expect((await (await handler(context)).json()).cache).toBe('hit');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['provider 500', () => new Response(null, { status: 500 })],
    ['wrong MIME', () => providerResponse({}, { headers: { 'Content-Type': 'text/html' } })],
    ['missing currency', () => {
      const rates = validRates();
      delete rates.TWD;
      return providerResponse({ rates });
    }],
    ['zero rate', () => providerResponse({ rates: { ...validRates(), TWD: 0 } })],
    ['negative rate', () => providerResponse({ rates: { ...validRates(), TWD: -1 } })],
    ['NaN rate', () => providerResponse({ rates: { ...validRates(), TWD: 'NaN' } })],
    ['invalid timestamp', () => providerResponse({ time_last_update_unix: 'invalid' })],
  ])('does not cache or return rates for %s', async (_label, makeResponse) => {
    const fetchImpl = vi.fn()
      .mockImplementationOnce(async () => makeResponse())
      .mockImplementationOnce(async () => providerResponse());
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => now });
    const firstResponse = await handler(context);
    expect(firstResponse.status).toBe(502);
    expect((await firstResponse.json()).rates).toBeUndefined();
    expect((await (await handler(context)).json()).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects oversized provider bodies before caching', async () => {
    const oversized = JSON.stringify({
      time_last_update_unix: 1_700_000_000,
      rates: validRates(),
      padding: 'x'.repeat(300 * 1024),
    });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(oversized, {
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(providerResponse());
    const handler = createExchangeRatesHandler({ fetchImpl, now: () => now });
    expect((await handler(context)).status).toBe(502);
    expect((await (await handler(context)).json()).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
