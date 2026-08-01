import networkServices from '../../config/network-services.json';

const STORAGE_KEY = 'small_web_tools_consent';
export const CURRENT_CONSENT_VERSION = '3.0.0';

export const NETWORK_SERVICES = networkServices;
export const THIRD_PARTY_SERVICES = Object.fromEntries(
  networkServices
    .filter((service) => service.consentMode === 'explicit-consent')
    .map((service) => [service.id, {
      ...service,
      privacyUrl: service.policyUrl,
      consentVersion: CURRENT_CONSENT_VERSION,
    }]),
);

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
  return Boolean(getStoredConsents().services[serviceId]);
}

export function grantConsent(serviceId) {
  try {
    const store = getStoredConsents();
    store.services[serviceId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('consent_updated'));
  } catch {
    // Storage may be unavailable; consent remains ungranted.
  }
}

export function revokeConsent(serviceId) {
  try {
    const store = getStoredConsents();
    delete store.services[serviceId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('consent_updated'));
  } catch {
    // Storage may be unavailable; consumers re-check the current state.
  }
}

export function resetAllConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('consent_updated'));
  } catch {
    // Storage may be unavailable; consumers re-check the current state.
  }
}
