const STORAGE_KEY = 'small_web_tools_consent';
export const CURRENT_CONSENT_VERSION = '2.0.0';

export const THIRD_PARTY_SERVICES = {
  currency: {
    id: 'currency',
    name: 'Live Exchange Rates',
    provider: 'ExchangeRate-API open endpoint via same-origin Function',
    purpose: 'Fetching real-time exchange rates for currency conversion.',
    trigger: 'When the user allows live rates while Manual Rate Override is off.',
    consentVersion: CURRENT_CONSENT_VERSION,
    dataTransmitted: 'HTTP GET request to fetch currency rates',
    privacyUrl: 'https://www.exchangerate-api.com/privacy',
    fallback: 'Manual Rate Override mode (100% local)'
  },
  iplookup: {
    id: 'iplookup',
    name: 'IP Geolocation API',
    provider: 'ipapi.co / Edge Proxy',
    purpose: 'Retrieving IP address location, ISP, and network details.',
    trigger: 'When the user presses Lookup after allowing the service.',
    consentVersion: CURRENT_CONSENT_VERSION,
    dataTransmitted: 'IP address submitted for lookup',
    privacyUrl: 'https://ipapi.co/privacy/',
    fallback: 'Local IP format validation'
  },
  speedtest: {
    id: 'speedtest',
    name: 'Network Speed Test Benchmark',
    provider: 'Cloudflare Speed Test Assets',
    purpose: 'Measuring network latency, download speed, and jitter.',
    trigger: 'When the user presses Start Test after allowing the service.',
    consentVersion: CURRENT_CONSENT_VERSION,
    dataTransmitted: 'Sample test payloads for bandwidth measurement',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    fallback: 'N/A (Benchmark tool)'
  },
  fontextractor: {
    id: 'fontextractor',
    name: 'Website Font Extractor Proxy',
    provider: 'Server Proxy & Target Website',
    purpose: 'Fetching target website CSS and font files for inspection.',
    trigger: 'When the user presses Extract after allowing the service.',
    consentVersion: CURRENT_CONSENT_VERSION,
    dataTransmitted: 'Target website URL',
    privacyUrl: 'https://github.com/hhter2/small-web-tools',
    fallback: 'Static CSS inspection'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Tiles',
    provider: 'OpenStreetMap Foundation',
    purpose: 'Displaying interactive geographic map preview.',
    trigger: 'When the user allows the map preview for a lookup result.',
    consentVersion: CURRENT_CONSENT_VERSION,
    dataTransmitted: 'Map tile coordinate requests',
    privacyUrl: 'https://wiki.osmfoundation.org/wiki/Privacy_Policy',
    fallback: 'Coordinate text display'
  }
};

export function getStoredConsents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: CURRENT_CONSENT_VERSION, services: {} };
    const parsed = JSON.parse(raw);
    if (parsed.version !== CURRENT_CONSENT_VERSION) {
      return { version: CURRENT_CONSENT_VERSION, services: {} };
    }
    return parsed;
  } catch {
    return { version: CURRENT_CONSENT_VERSION, services: {} };
  }
}

export function hasConsent(serviceId) {
  const store = getStoredConsents();
  return Boolean(store.services[serviceId]);
}

export function grantConsent(serviceId) {
  try {
    const store = getStoredConsents();
    store.services[serviceId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('consent_updated'));
  } catch {}
}

export function revokeConsent(serviceId) {
  try {
    const store = getStoredConsents();
    delete store.services[serviceId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('consent_updated'));
  } catch {}
}

export function resetAllConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('consent_updated'));
  } catch {}
}
