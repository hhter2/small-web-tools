const fallbackBuckets = new Map();

function getClientId(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

export async function enforceRateLimit(context, options) {
  const now = Date.now();
  const windowMs = options.windowMs ?? 60_000;
  const bucket = Math.floor(now / windowMs);
  const clientId = getClientId(context.request);
  const key = 'rate:' + options.name + ':' + clientId + ':' + bucket;
  const limiter = context.env?.RATE_LIMITER;
  const store = context.env?.RATE_LIMIT_KV;

  let count;
  if (limiter?.limit) {
    const result = await limiter.limit({ key: options.name + ':' + clientId });
    if (result.success) return null;
    count = options.limit + 1;
  } else if (store?.get && store?.put) {
    count = Number(await store.get(key) || 0) + 1;
    await store.put(key, String(count), { expirationTtl: Math.ceil(windowMs / 1000) + 60 });
  } else {
    count = (fallbackBuckets.get(key) || 0) + 1;
    fallbackBuckets.set(key, count);
    if (fallbackBuckets.size > 5000) {
      for (const existingKey of fallbackBuckets.keys()) {
        if (!existingKey.endsWith(':' + bucket)) fallbackBuckets.delete(existingKey);
      }
    }
  }

  if (count > options.limit) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.ceil(windowMs / 1000)),
      },
    });
  }
  return null;
}
