// HMAC-SHA-256 Signed Token Generator and Verifier for Font Proxy (H-03)

const DEFAULT_SECRET = 'small_web_tools_font_proxy_secret_key_2026';

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function getHmacKey(secretStr) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr || DEFAULT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signFontToken(fontUrl, secretStr, ttlMs = 600_000) {
  const exp = Date.now() + ttlMs;
  const payload = JSON.stringify({ url: fontUrl, exp });
  const payloadB64 = base64UrlEncode(payload);

  const key = await getHmacKey(secretStr);
  const enc = new TextEncoder();
  const signatureBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));

  const sigB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuf)));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyFontToken(token, secretStr) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed token structure');
  }

  const [payloadB64, sigB64] = parts;

  const key = await getHmacKey(secretStr);
  const enc = new TextEncoder();

  let rawSig;
  try {
    const rawSigStr = base64UrlDecode(sigB64);
    rawSig = new Uint8Array(rawSigStr.length);
    for (let i = 0; i < rawSigStr.length; i++) {
      rawSig[i] = rawSigStr.charCodeAt(i);
    }
  } catch {
    throw new Error('Invalid token signature encoding');
  }

  const isValid = await crypto.subtle.verify('HMAC', key, rawSig, enc.encode(payloadB64));
  if (!isValid) {
    throw new Error('Invalid font token signature');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    throw new Error('Invalid token payload JSON');
  }

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('Font token has expired');
  }

  if (!payload.url) {
    throw new Error('Font token payload is missing target URL');
  }

  return payload;
}
