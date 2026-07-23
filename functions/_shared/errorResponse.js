import { getPublicError } from '../../src/lib/publicErrors';

export function createCorrelationId() {
  return crypto.randomUUID?.()
    || Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function errorResponse(code, status, options = {}) {
  const correlationId = options.correlationId || createCorrelationId();
  const publicError = getPublicError(code);
  if (options.log !== false) {
    (options.logger || console.error)({
      correlationId,
      code: publicError.code,
      diagnostic: options.diagnostic || options.error?.name || 'unspecified',
    });
  }
  return Response.json({
    ok: false,
    code: publicError.code,
    error: publicError.message,
    correlationId,
  }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...options.headers,
    },
  });
}
