import { enforceRateLimit } from '../_shared/rateLimit';

const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;

export function resetExchangeRateCache() {
  cache = null;
}

async function fetchProvider(fetchImpl, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(PROVIDER_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Exchange-rate provider returned ' + response.status);
    const data = await response.json();
    if (!data?.rates || typeof data.rates !== 'object' || data.rates.USD !== 1) {
      throw new Error('Exchange-rate provider returned invalid data');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function createExchangeRatesHandler({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function handle(context) {
    const limited = await enforceRateLimit(context, { name: 'exchange-rates', limit: 60 });
    if (limited) return limited;

    const timestamp = now();
    if (cache && timestamp - cache.cachedAt < CACHE_TTL_MS) {
      return Response.json({ ...cache.payload, cache: 'hit' }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    try {
      const data = await fetchProvider(fetchImpl);
      const payload = {
        ok: true,
        provider: 'ExchangeRate-API open endpoint',
        base: 'USD',
        rates: data.rates,
        dataDate: data.time_last_update_unix
          ? new Date(data.time_last_update_unix * 1000).toISOString()
          : null,
        fetchedAt: new Date(timestamp).toISOString(),
      };
      cache = { cachedAt: timestamp, payload };
      return Response.json({ ...payload, cache: 'miss' }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    } catch (error) {
      return Response.json({
        ok: false,
        error: error.name === 'AbortError'
          ? 'Exchange-rate provider timed out'
          : 'Unable to retrieve live exchange rates',
      }, {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  };
}

export const onRequestGet = createExchangeRatesHandler();
