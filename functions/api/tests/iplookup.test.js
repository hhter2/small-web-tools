import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enforceRateLimit = vi.fn(async () => null);
const fetchMock = vi.fn();

vi.mock('../../_shared/rateLimit.js', () => ({ enforceRateLimit }));

const { onRequestGet } = await import('../iplookup.js');

function context(ip = '', cf) {
  const request = new Request(
    `https://small-web-tools.pages.dev/api/iplookup${ip ? `?ip=${encodeURIComponent(ip)}` : ''}`,
    { headers: { 'CF-Connecting-IP': '198.51.100.12' } },
  );
  if (cf) Object.defineProperty(request, 'cf', { value: cf });
  return { request, env: {} };
}

describe('iplookup API handler', () => {
  beforeEach(() => {
    enforceRateLimit.mockReset();
    enforceRateLimit.mockResolvedValue(null);
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed input before rate limiting or provider access', async () => {
    const response = await onRequestGet(context('1.2.3.4/admin'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a rate-limit response before provider access', async () => {
    enforceRateLimit.mockResolvedValueOnce(Response.json(
      { ok: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': '60' } },
    ));

    const response = await onRequestGet(context('203.0.113.8'));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Cloudflare request metadata for an empty lookup without contacting providers', async () => {
    enforceRateLimit.mockResolvedValueOnce(Response.json(
      { ok: false, code: 'RATE_LIMITED' },
      { status: 429 },
    ));

    const response = await onRequestGet(context('', {
      city: 'Taipei',
      region: 'Taipei City',
      country: 'TW',
      postalCode: '100',
      asOrganization: 'Example Network',
      asn: 64500,
      timezone: 'Asia/Taipei',
      latitude: '25.04',
      longitude: 'invalid',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        ip: '198.51.100.12',
        city: 'Taipei',
        country_code: 'TW',
        asn: 'AS64500',
        latitude: 25.04,
        longitude: null,
      },
    });
    expect(body.data.country_name.length).toBeGreaterThan(2);
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns normalized data from the first successful provider', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      ip: '203.0.113.8',
      city: 'Taipei',
      country: 'Taiwan',
      country_code: 'tw',
      asn: 'AS3462',
      latitude: '25.03',
      longitude: '121.56',
    }));

    const response = await onRequestGet(context('203.0.113.8'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        ip: '203.0.113.8',
        country_name: 'Taiwan',
        country_code: 'TW',
        asn: 'AS3462',
        latitude: 25.03,
        longitude: 121.56,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.ip.sb/geoip/203.0.113.8',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('falls back after a provider failure and normalizes the next response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({
        ip: '203.0.113.9',
        country_name: 'Taiwan',
        country_code: 'tw',
        organization: 'Fallback Network',
      }));

    const response = await onRequestGet(context('203.0.113.9'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      ip: '203.0.113.9',
      country_name: 'Taiwan',
      country_code: 'TW',
      org: 'Fallback Network',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://ipapi.co/203.0.113.9/json/');
  });

  it('returns a sanitized 502 after every provider fails', async () => {
    fetchMock.mockRejectedValue(new Error('secret upstream diagnostic'));

    const response = await onRequestGet(context('203.0.113.10'));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, code: 'PROVIDER_UNAVAILABLE' });
    expect(JSON.stringify(body)).not.toContain('secret upstream diagnostic');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
