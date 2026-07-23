import { enforceRateLimit } from '../_shared/rateLimit';
import { parseIpInput } from '../../src/lib/ipValidation';

function countryNameFromCode(code) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || '';
  } catch {
    return '';
  }
}

function finiteCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeProviderResponse(provider, data) {
  const common = {
    ip: data.ip || '',
    city: data.city || '',
    region: data.region || '',
    postal: data.postal || '',
    org: data.org || data.isp || data.organization || '',
    asn: data.asn ? String(data.asn).replace(/^AS/i, 'AS') : '',
    timezone: data.timezone || '',
    utc_offset: data.utc_offset || '',
    latitude: finiteCoordinate(data.latitude),
    longitude: finiteCoordinate(data.longitude),
  };

  if (provider === 'api.ip.sb') {
    return {
      ...common,
      country_name: data.country || '',
      country_code: (data.country_code || '').toUpperCase(),
      asn: data.asn ? 'AS' + String(data.asn).replace(/^AS/i, '') : '',
    };
  }
  if (provider === 'ipinfo.io') {
    const [latitude, longitude] = data.loc
      ? data.loc.split(',').map(finiteCoordinate)
      : [null, null];
    const countryCode = (data.country || '').toUpperCase();
    return {
      ...common,
      country_name: countryNameFromCode(countryCode),
      country_code: countryCode,
      latitude,
      longitude,
    };
  }
  return {
    ...common,
    country_name: data.country_name || '',
    country_code: (data.country_code || '').toUpperCase(),
  };
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Small-Web-Tools/1.0',
    },
  });
  if (!response.ok) throw new Error('Provider returned ' + response.status);
  return response.json();
}

async function withTimeout(operation, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function geoLookup(ip) {
  const encodedIp = encodeURIComponent(ip);
  const providers = [
    {
      name: 'api.ip.sb',
      url: ip ? 'https://api.ip.sb/geoip/' + encodedIp : 'https://api.ip.sb/geoip',
    },
    {
      name: 'ipapi.co',
      url: ip ? 'https://ipapi.co/' + encodedIp + '/json/' : 'https://ipapi.co/json/',
    },
    {
      name: 'ipinfo.io',
      url: ip ? 'https://ipinfo.io/' + encodedIp + '/json' : 'https://ipinfo.io/json',
    },
  ];

  for (const provider of providers) {
    try {
      const data = await withTimeout((signal) => fetchJson(provider.url, signal));
      if (data.error) throw new Error('Provider rejected lookup');
      return normalizeProviderResponse(provider.name, data);
    } catch {
      // Continue to the next normalized server-side provider.
    }
  }
  throw new Error('All IP lookup providers failed');
}

function jsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const parsed = parseIpInput(url.searchParams.get('ip') || '');
  if (parsed.error) {
    return jsonResponse({ ok: false, error: parsed.error }, { status: 400 });
  }

  const limited = await enforceRateLimit(context, { name: 'iplookup', limit: 60 });
  if (limited) return limited;

  if (!parsed.value && context.request.cf) {
    const cf = context.request.cf;
    return jsonResponse({
      ok: true,
      data: {
        ip: context.request.headers.get('CF-Connecting-IP') || '',
        city: cf.city || '',
        region: cf.region || '',
        country_name: countryNameFromCode(cf.country),
        country_code: cf.country || '',
        postal: cf.postalCode || '',
        org: cf.asOrganization || '',
        asn: cf.asn ? 'AS' + cf.asn : '',
        timezone: cf.timezone || '',
        utc_offset: '',
        latitude: finiteCoordinate(cf.latitude),
        longitude: finiteCoordinate(cf.longitude),
      },
    });
  }

  try {
    return jsonResponse({ ok: true, data: await geoLookup(parsed.value) });
  } catch {
    return jsonResponse({
      ok: false,
      error: 'Unable to retrieve IP geolocation',
    }, { status: 502 });
  }
}
