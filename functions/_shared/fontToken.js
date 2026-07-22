const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_TTL_MS = 10 * 60 * 1000;

function requireSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('FONT_PROXY_SIGNING_SECRET must contain at least 32 characters');
  }
  return secret;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url encoding');
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requireSecret(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signFontToken(fontUrl, secret, options = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > MAX_TTL_MS) {
    throw new Error('Font token TTL is outside the allowed range');
  }

  const now = Date.now();
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  const payload = {
    url: new URL(fontUrl).href,
    aud: options.audience,
    iat: now,
    exp: now + ttlMs,
    jti: bytesToBase64Url(nonce),
  };
  if (!payload.aud) throw new Error('Font token audience is required');

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = bytesToBase64Url(payloadBytes);
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64),
  );
  return payloadB64 + '.' + bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyFontToken(token, secret, options = {}) {
  if (!token || typeof token !== 'string') throw new Error('Token is missing');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Malformed token structure');
  const [payloadB64, signatureB64] = parts;

  let signature;
  try {
    signature = base64UrlToBytes(signatureB64);
  } catch {
    throw new Error('Invalid token signature encoding');
  }

  const key = await getHmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) throw new Error('Invalid font token signature');

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
  } catch {
    throw new Error('Invalid token payload JSON');
  }

  const now = options.now ?? Date.now();
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) {
    throw new Error('Font token timestamps are invalid');
  }
  if (payload.exp <= now) throw new Error('Font token has expired');
  if (payload.iat > now + 30_000 || payload.exp - payload.iat > MAX_TTL_MS) {
    throw new Error('Font token lifetime is invalid');
  }
  if (!payload.url || !payload.jti) throw new Error('Font token payload is incomplete');
  if (!options.audience || payload.aud !== options.audience) {
    throw new Error('Font token audience mismatch');
  }

  return payload;
}
