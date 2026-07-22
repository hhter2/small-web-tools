import { verifyFontToken } from '../_shared/fontToken';
import { safeExternalFetch } from '../_shared/safeExternalFetch';
import { detectFontContentType } from '../_shared/fontValidation';
import { enforceRateLimit } from '../_shared/rateLimit';

// Font Proxy API — GET /api/font-proxy?token=...
export async function onRequestGet(context) {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const token = urlObj.searchParams.get('token') || '';

  const limited = await enforceRateLimit(context, { name: 'font-proxy', limit: 60 });
  if (limited) return limited;

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
  if (typeof secretStr !== 'string' || secretStr.length < 32) {
    return new Response('Font proxy is not configured', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  }

  let payload;
  try {
    payload = await verifyFontToken(token, secretStr, { audience: urlObj.origin });
  } catch {
    return new Response('Token verification failed', {
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
    const { buffer } = await safeExternalFetch(fontUrl, {
      maxBytes: 15 * 1024 * 1024, // 15 MB max font file size
      timeoutMs: 10000,
    });

    const contentType = detectFontContentType(buffer);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
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
