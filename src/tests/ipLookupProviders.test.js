import { describe, expect, it, vi } from 'vitest';
import {
  getIpLookupProviders,
  lookupIpGeolocation,
  normalizeProviderResponse,
} from '../lib/ipLookupProviders.js';

describe('shared IP lookup provider domain', () => {
  it('keeps provider order and URL construction deterministic', () => {
    expect(getIpLookupProviders('2001:db8::1')).toEqual([
      { name: 'api.ip.sb', url: 'https://api.ip.sb/geoip/2001%3Adb8%3A%3A1' },
      { name: 'ipapi.co', url: 'https://ipapi.co/2001%3Adb8%3A%3A1/json/' },
      { name: 'ipinfo.io', url: 'https://ipinfo.io/2001%3Adb8%3A%3A1/json' },
    ]);
  });

  it('normalizes provider-specific payloads through one source', () => {
    expect(normalizeProviderResponse('api.ip.sb', {
      country: 'Taiwan',
      country_code: 'tw',
      asn: 3462,
    })).toMatchObject({
      country_name: 'Taiwan',
      country_code: 'TW',
      asn: 'AS3462',
    });

    expect(normalizeProviderResponse('ipinfo.io', {
      country: 'TW',
      loc: '25.03,121.56',
    })).toMatchObject({
      country_code: 'TW',
      latitude: 25.03,
      longitude: 121.56,
    });
  });

  it('falls back in provider order and returns normalized data', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ip: '203.0.113.9',
        country_name: 'Taiwan',
        country_code: 'TW',
        latitude: '25.03',
        longitude: '121.56',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const failures = [];

    await expect(lookupIpGeolocation('203.0.113.9', {
      fetchImpl,
      onProviderError: (provider) => failures.push(provider.name),
    })).resolves.toMatchObject({
      ip: '203.0.113.9',
      country_name: 'Taiwan',
      country_code: 'TW',
      latitude: 25.03,
      longitude: 121.56,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(failures).toEqual(['api.ip.sb']);
  });
});
