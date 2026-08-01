import { errorResponse } from './errorResponse';

const developmentBuckets = new Map();
const WINDOW_MS = 60_000;
const SERVICE_TIMEOUT_MS = 1500;

function limiterError(status, code, extraHeaders = {}, log = false) {
  return errorResponse(code, status, {
    headers: extraHeaders,
    log,
    diagnostic: 'rate-limiter-boundary',
  });
}

function getNetworkIdentifier(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

async function hmacClientKey(secret, networkIdentifier, period) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${networkIdentifier}:${period}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function developmentLimit(name, clientKey, limit, now) {
  const bucket = Math.floor(now / WINDOW_MS);
  const key = `${name}:${clientKey}:${bucket}`;
  const count = (developmentBuckets.get(key) || 0) + 1;
  developmentBuckets.set(key, count);
  if (developmentBuckets.size > 5000) {
    for (const existingKey of developmentBuckets.keys()) {
      if (!existingKey.endsWith(`:${bucket}`)) developmentBuckets.delete(existingKey);
    }
  }
  return count <= limit;
}

export function resetDevelopmentRateLimits() {
  developmentBuckets.clear();
}

export async function enforceRateLimit(context, options) {
  const env = context.env || {};
  const developmentMode = env.RATE_LIMIT_DEVELOPMENT_MODE === 'true';
  const secret = env.RATE_LIMIT_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    return limiterError(503, 'RATE_LIMIT_UNAVAILABLE', {}, true);
  }

  const now = options.now?.() ?? Date.now();
  const period = Math.floor(now / 86_400_000);
  const clientKey = await hmacClientKey(
    secret,
    getNetworkIdentifier(context.request),
    period,
  );

  if (!env.RATE_LIMITER_SERVICE?.fetch) {
    if (developmentMode) {
      const allowed = developmentLimit(options.name, clientKey, options.limit, now);
      return allowed
        ? null
        : limiterError(429, 'RATE_LIMITED', { 'Retry-After': '60' });
    }
    return limiterError(503, 'RATE_LIMIT_UNAVAILABLE', {}, true);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);
  try {
    const serviceCall = env.RATE_LIMITER_SERVICE.fetch(
      new Request('https://rate-limiter.internal/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route: options.name, clientKey }),
      }),
    );
    const response = await Promise.race([
      serviceCall,
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(
          new DOMException('Rate limiter timed out', 'TimeoutError'),
        ), { once: true });
      }),
    ]);
    if (!response.ok) throw new Error('limiter service failure');
    const result = await response.json();
    if (typeof result?.allowed !== 'boolean') throw new Error('invalid limiter response');
    return result.allowed
      ? null
      : limiterError(429, 'RATE_LIMITED', { 'Retry-After': '60' });
  } catch {
    return limiterError(503, 'RATE_LIMIT_UNAVAILABLE', {}, true);
  } finally {
    clearTimeout(timer);
  }
}
