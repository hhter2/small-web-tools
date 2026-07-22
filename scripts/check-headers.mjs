import { readFile } from 'node:fs/promises';

const headers = await readFile('public/_headers', 'utf8');
const requiredHeaders = [
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(self), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy: same-origin',
  'Content-Security-Policy:',
];

for (const header of requiredHeaders) {
  if (!headers.includes(header)) throw new Error(`Missing security header: ${header}`);
}

for (const directive of [
  "default-src 'self'",
  "connect-src 'self' https://speed.cloudflare.com https://unpkg.com",
  'frame-src https://www.openstreetmap.org',
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'none'",
]) {
  if (!headers.includes(directive)) throw new Error(`Missing CSP directive: ${directive}`);
}

if (/connect-src[^;]*\*/u.test(headers) || /frame-src[^;]*\*/u.test(headers)) {
  throw new Error('CSP connect-src and frame-src must not contain wildcards.');
}

console.log('Static security header policy passed.');
