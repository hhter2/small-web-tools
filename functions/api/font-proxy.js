import { verifyFontToken } from '../_shared/fontToken';
import { safeExternalFetch } from '../_shared/safeExternalFetch';

// Font Proxy API — GET /api/font-proxy?token=...
export async function onRequestGet(context) {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const token = urlObj.searchParams.get('token') || '';

  if (!token) {
    return new Response('Missing required font token', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  }

  const secretStr = env?.FONT_PROXY_SIGNING_SECRET;

  let payload;
  try {
    payload = await verifyFontToken(token, secretStr);
  } catch (err) {
    return new Response(`Token verification failed: ${err.message}`, {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  }

  try {
    const fontUrl = payload.url;
    const { response, buffer } = await safeExternalFetch(fontUrl, {
      maxBytes: 15 * 1024 * 1024, // 15 MB max font file size
      timeoutMs: 10000,
    });

    const ct = response.headers.get('content-type') || 'font/woff2';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': urlObj.origin,
      }
    });
  } catch (e) {
    console.error('[font-proxy]', e.message);
    return new Response('Font fetch failed: ' + e.message, {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  }
}
