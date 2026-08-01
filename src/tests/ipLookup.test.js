import { describe, expect, it } from 'vitest';
import {
  normalizeProviderResponse,
  onRequestGet,
} from '../../functions/api/iplookup.js';

describe('IP provider normalization', () => {
  it('normalizes api.ip.sb fields', () => {
    expect(normalizeProviderResponse('api.ip.sb', {
      ip: '203.0.113.1',
      country: 'Taiwan',
      country_code: 'TW',
      asn: 3462,
      latitude: '25.03',
      longitude: '121.56',
    })).toMatchObject({
      country_name: 'Taiwan',
      country_code: 'TW',
      asn: 'AS3462',
      latitude: 25.03,
      longitude: 121.56,
    });
  });

  it('does not put an ipinfo country code into country_name', () => {
    const result = normalizeProviderResponse('ipinfo.io', {
      country: 'TW',
      loc: '25.03,121.56',
    });
    expect(result.country_code).toBe('TW');
    expect(result.country_name).not.toBe('TW');
    expect(result.country_name.length).toBeGreaterThan(2);
  });
});

describe('IP lookup handler validation', () => {
  it('rejects unsafe input before contacting a provider', async () => {
    const response = await onRequestGet({
      request: new Request('https://tools.example.com/api/iplookup?ip=1.2.3.4%2Fadmin'),
      env: {},
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false });
  });
});
