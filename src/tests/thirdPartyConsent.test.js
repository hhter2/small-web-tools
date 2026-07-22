import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_CONSENT_VERSION,
  getStoredConsents,
  grantConsent,
  hasConsent,
  resetAllConsent,
  revokeConsent,
  THIRD_PARTY_SERVICES,
} from '../lib/thirdPartyServices.js';

describe('third-party consent registry', () => {
  beforeEach(() => localStorage.clear());

  it('documents provider, data, trigger, policy, fallback, and version for every service', () => {
    for (const service of Object.values(THIRD_PARTY_SERVICES)) {
      expect(service).toMatchObject({
        id: expect.any(String),
        provider: expect.any(String),
        purpose: expect.any(String),
        dataTransmitted: expect.any(String),
        trigger: expect.any(String),
        privacyUrl: expect.stringMatching(/^https:/),
        fallback: expect.any(String),
        consentVersion: CURRENT_CONSENT_VERSION,
      });
    }
  });

  it('grants, revokes, and resets decisions', () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    expect(hasConsent('speedtest')).toBe(false);
    grantConsent('speedtest');
    expect(hasConsent('speedtest')).toBe(true);
    revokeConsent('speedtest');
    expect(hasConsent('speedtest')).toBe(false);
    grantConsent('currency');
    resetAllConsent();
    expect(hasConsent('currency')).toBe(false);
    expect(dispatch).toHaveBeenCalled();
  });

  it('invalidates stored consent when the version changes', () => {
    localStorage.setItem('small_web_tools_consent', JSON.stringify({
      version: '1.0.0',
      services: { speedtest: true },
    }));
    expect(getStoredConsents()).toEqual({
      version: CURRENT_CONSENT_VERSION,
      services: {},
    });
  });
});
