import { enforceRateLimit } from '../_shared/rateLimit';
import { errorResponse } from '../_shared/errorResponse';

const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PROVIDER_BYTES = 256 * 1024;
export const SUPPORTED_CURRENCIES = Object.freeze([
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'TWD', 'HKD', 'SGD', 'CAD', 'AUD', 'KRW',
  'INR', 'PHP', 'MYR', 'THB', 'VND', 'NZD', 'CHF', 'ZAR', 'BRL', 'MXN',
]);
let cache = null;

export function resetExchangeRateCache() {
  cache = null;
}

async function readJsonWithLimit(response, maxBytes = MAX_PROVIDER_BYTES) {
  const contentType = response.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new Error('INVALID_PROVIDER_RESPONSE');
  const contentLength = Number(response.headers.get('Content-Length') || 0);
  if (contentLength > maxBytes) throw new Error('INVALID_PROVIDER_RESPONSE');

  if (!response.body) {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxBytes) throw new Error('INVALID_PROVIDER_RESPONSE');
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('provider response limit exceeded');
      throw new Error('INVALID_PROVIDER_RESPONSE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateProviderPayload(data, nowMs) {
  const unixTimestamp = Number(data?.time_last_update_unix);
  if (!Number.isFinite(unixTimestamp) || unixTimestamp <= 0) {
    throw new Error('INVALID_PROVIDER_RESPONSE');
  }
  const timestampMs = unixTimestamp * 1000;
  if (!Number.isFinite(timestampMs) || timestampMs > nowMs + 24 * 60 * 60 * 1000) {
    throw new Error('INVALID_PROVIDER_RESPONSE');
  }
  if (!data?.rates || typeof data.rates !== 'object' || Array.isArray(data.rates)) {
    throw new Error('INVALID_PROVIDER_RESPONSE');
  }

  const rates = {};
  for (const code of SUPPORTED_CURRENCIES) {
    const rate = Number(data.rates[code]);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('INVALID_PROVIDER_RESPONSE');
    rates[code] = rate;
  }
  if (rates.USD !== 1) throw new Error('INVALID_PROVIDER_RESPONSE');
  return { rates, dataDate: new Date(timestampMs).toISOString() };
}

async function fetchProvider(fetchImpl, nowMs, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(PROVIDER_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('PROVIDER_UNAVAILABLE');
    const data = await readJsonWithLimit(response);
    return validateProviderPayload(data, nowMs);
  } finally {
    clearTimeout(timer);
  }
}

function response(body, status, cacheControl) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function createExchangeRatesHandler({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  return async function handle(context) {
    const limited = await enforceRateLimit(context, { name: 'exchange-rates' });
    if (limited) return limited;

    const timestamp = now();
    if (cache && timestamp - cache.cachedAt < CACHE_TTL_MS) {
      return response({ ...cache.payload, cache: 'hit' }, 200, 'public, max-age=300');
    }

    try {
      const validated = await fetchProvider(fetchImpl, timestamp);
      const payload = {
        ok: true,
        provider: 'ExchangeRate-API open endpoint',
        base: 'USD',
        rates: validated.rates,
        dataDate: validated.dataDate,
        fetchedAt: new Date(timestamp).toISOString(),
      };
      cache = { cachedAt: timestamp, payload };
      return response({ ...payload, cache: 'miss' }, 200, 'public, max-age=300');
    } catch (error) {
      const timedOut = error.name === 'AbortError';
      return errorResponse(timedOut ? 'UPSTREAM_TIMEOUT' : 'PROVIDER_UNAVAILABLE', timedOut ? 504 : 502, {
        error,
        diagnostic: timedOut ? 'exchange-provider-timeout' : 'exchange-provider',
      });
    }
  };
}

export const onRequestGet = createExchangeRatesHandler();
