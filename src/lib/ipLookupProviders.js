export const IP_LOOKUP_TIMEOUT_MS = 5000;

export function countryNameFromCode(code) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || '';
  } catch {
    return '';
  }
}

export function finiteCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getIpLookupProviders(ip = '') {
  const encodedIp = encodeURIComponent(ip);
  return [
    { name: 'api.ip.sb', url: ip ? `https://api.ip.sb/geoip/${encodedIp}` : 'https://api.ip.sb/geoip' },
    { name: 'ipapi.co', url: ip ? `https://ipapi.co/${encodedIp}/json/` : 'https://ipapi.co/json/' },
    { name: 'ipinfo.io', url: ip ? `https://ipinfo.io/${encodedIp}/json` : 'https://ipinfo.io/json' },
  ];
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
      asn: data.asn ? `AS${String(data.asn).replace(/^AS/i, '')}` : '',
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

async function fetchProviderJson(provider, { fetchImpl, signal, headers }) {
  const response = await fetchImpl(provider.url, { signal, headers });
  if (!response.ok) throw new Error(`${provider.name} returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.reason || `${provider.name} rejected lookup`);
  return data;
}

export async function lookupIpGeolocation(ip = '', options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = options.timeoutMs || IP_LOOKUP_TIMEOUT_MS;
  const headers = options.headers || {
    Accept: 'application/json',
    'User-Agent': 'Small-Web-Tools/1.0',
  };
  const onProviderError = options.onProviderError || (() => {});

  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');

  let lastErrorMessage = '';
  for (const provider of getIpLookupProviders(ip)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const data = await fetchProviderJson(provider, {
        fetchImpl,
        signal: controller.signal,
        headers,
      });
      return normalizeProviderResponse(provider.name, data);
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      onProviderError(provider, error);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastErrorMessage || 'All IP lookup providers failed');
}
