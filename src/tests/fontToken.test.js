import { describe, expect, it } from 'vitest';
import { signFontToken, verifyFontToken } from '../../functions/_shared/fontToken.js';

const SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
const AUDIENCE = 'https://tools.example.com';

describe('font proxy token', () => {
  it('round-trips a Unicode URL with an audience and bounded expiry', async () => {
    const token = await signFontToken('https://fonts.example.com/字型.woff2', SECRET, {
      audience: AUDIENCE,
      ttlMs: 60_000,
    });
    const payload = await verifyFontToken(token, SECRET, { audience: AUDIENCE });
    expect(payload.url).toContain('%E5%AD%97%E5%9E%8B.woff2');
    expect(payload.exp - payload.iat).toBe(60_000);
    expect(payload.jti).toBeTruthy();
  });

  it('rejects a wrong secret, audience, tampering, and expiry', async () => {
    const token = await signFontToken('https://fonts.example.com/a.woff2', SECRET, {
      audience: AUDIENCE,
      ttlMs: 1_000,
    });
    await expect(verifyFontToken(token, SECRET + 'x', { audience: AUDIENCE }))
      .rejects.toThrow('signature');
    await expect(verifyFontToken(token, SECRET, { audience: 'https://other.example.com' }))
      .rejects.toThrow('audience');
    await expect(verifyFontToken(token.slice(0, -1) + 'A', SECRET, { audience: AUDIENCE }))
      .rejects.toThrow();

    const payload = await verifyFontToken(token, SECRET, { audience: AUDIENCE });
    await expect(verifyFontToken(token, SECRET, {
      audience: AUDIENCE,
      now: payload.exp,
    })).rejects.toThrow('expired');
  });

  it('requires a deployment secret and rejects excessive TTLs', async () => {
    await expect(signFontToken('https://fonts.example.com/a.woff2', 'short', {
      audience: AUDIENCE,
    })).rejects.toThrow('at least 32');
    await expect(signFontToken('https://fonts.example.com/a.woff2', SECRET, {
      audience: AUDIENCE,
      ttlMs: 60 * 60 * 1000,
    })).rejects.toThrow('TTL');
  });
});
