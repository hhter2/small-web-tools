export const FONT_EXTRACTION_LIMITS = Object.freeze({
  requestBytes: 4 * 1024,
  htmlBytes: 2 * 1024 * 1024,
  cssBytes: 1 * 1024 * 1024,
  totalUpstreamBytes: 6 * 1024 * 1024,
  stylesheets: 12,
  importDepth: 3,
  fontFaces: 100,
  concurrency: 4,
  deadlineMs: 10_000,
});

function isLocalDevelopment(request, env) {
  const hostname = new URL(request.url).hostname;
  return env?.ALLOW_LOCAL_DEVELOPMENT === 'true'
    && (hostname === 'localhost' || hostname === '127.0.0.1');
}

export function validateSameSiteJsonRequest(request, env = {}) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (!origin && !isLocalDevelopment(request, env)) {
    return { status: 403, error: 'Missing request origin' };
  }
  if (origin && origin !== expectedOrigin) {
    return { status: 403, error: 'Cross-origin requests are not allowed' };
  }
  if (fetchSite && !['same-origin', 'same-site'].includes(fetchSite)) {
    return { status: 403, error: 'Cross-site requests are not allowed' };
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return { status: 415, error: 'Content-Type must be application/json' };
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > FONT_EXTRACTION_LIMITS.requestBytes) {
    return { status: 413, error: 'Request body is too large' };
  }
  return null;
}

export async function readLimitedJson(request, maxBytes = FONT_EXTRACTION_LIMITS.requestBytes) {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('Request body limit exceeded');
      throw new RangeError('Request body is too large');
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
