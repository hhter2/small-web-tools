const STORAGE_KEY = 'small_web_tools_consent';
const CURRENT_CONSENT_VERSION = '1.0.0';

export const THIRD_PARTY_SERVICES = {
  currency: {
    id: 'currency',
    name: 'Open Exchange Rates API',
    provider: 'Open Exchange Rates',
    purpose: 'Fetching real-time exchange rates for currency conversion.',
    dataTransmitted: 'HTTP GET request to fetch currency rates',
    privacyUrl: 'https://openexchangerates.org/privacy',
    fallback: 'Manual Rate Override mode (100% local)'
  },
  iplookup: {
    id: 'iplookup',
    name: 'IP Geolocation API',
    provider: 'ipapi.co / Edge Proxy',
    purpose: 'Retrieving IP address location, ISP, and network details.',
    dataTransmitted: 'IP address submitted for lookup',
    privacyUrl: 'https://ipapi.co/privacy/',
    fallback: 'Local IP format validation'
  },
  speedtest: {
    id: 'speedtest',
    name: 'Network Speed Test Benchmark',
    provider: 'Cloudflare Speed Test Assets',
    purpose: 'Measuring network latency, download speed, and jitter.',
    dataTransmitted: 'Sample test payloads for bandwidth measurement',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    fallback: 'N/A (Benchmark tool)'
  },
  fontextractor: {
    id: 'fontextractor',
    name: 'Website Font Extractor Proxy',
    provider: 'Server Proxy & Target Website',
    purpose: 'Fetching target website CSS and font files for inspection.',
    dataTransmitted: 'Target website URL',
    privacyUrl: 'https://github.com/hhter2/small-web-tools',
    fallback: 'Static CSS inspection'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Tiles',
    provider: 'OpenStreetMap Foundation',
    purpose: 'Displaying interactive geographic map preview.',
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
  } catch (e) {
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
  } catch (e) {}
}

export function revokeConsent(serviceId) {
  try {
    const store = getStoredConsents();
    delete store.services[serviceId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('consent_updated'));
  } catch (e) {}
}

export function resetAllConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('consent_updated'));
  } catch (e) {}
}
