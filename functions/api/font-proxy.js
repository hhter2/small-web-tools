// Font Proxy API — GET /api/font-proxy?url=...&referer=...
export async function onRequestGet(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const fontUrl = urlObj.searchParams.get('url') || '';
  const referer = urlObj.searchParams.get('referer') || '';

  if (!fontUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  try {
    const origin = referer ? new URL(referer).origin : undefined;
    const fontRes = await fetch(fontUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': referer || new URL(fontUrl).origin,
        ...(origin ? { 'Origin': origin } : {})
      }
    });

    if (!fontRes.ok) {
      return new Response('Font fetch failed', { status: fontRes.status });
    }

    const ct = fontRes.headers.get('content-type') || 'font/woff2';
    return new Response(fontRes.body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('[font-proxy]', e.message);
    return new Response('Proxy error: ' + e.message, { status: 502 });
  }
}
