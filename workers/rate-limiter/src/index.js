const POLICY_BINDINGS = Object.freeze({
  'extract-fonts': 'EXPENSIVE_LIMITER',
  'exchange-rates': 'STANDARD_LIMITER',
  iplookup: 'STANDARD_LIMITER',
});

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function createRateLimiterWorker() {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method !== 'POST' || url.pathname !== '/limit') {
        return json({ ok: false, code: 'NOT_FOUND' }, 404);
      }

      let input;
      try {
        input = await request.json();
      } catch {
        return json({ ok: false, code: 'INVALID_REQUEST' }, 400);
      }
      const bindingName = POLICY_BINDINGS[input?.route];
      if (
        !bindingName
        || typeof input.clientKey !== 'string'
        || !/^[a-f0-9]{64}$/u.test(input.clientKey)
      ) {
        return json({ ok: false, code: 'INVALID_REQUEST' }, 400);
      }
      const limiter = env[bindingName];
      if (!limiter?.limit) return json({ ok: false, code: 'LIMITER_UNAVAILABLE' }, 503);

      const result = await limiter.limit({ key: `${input.route}:${input.clientKey}` });
      return json({ ok: true, allowed: Boolean(result.success) });
    },
  };
}

export default createRateLimiterWorker();
