import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import {
  THIRD_PARTY_SERVICES,
  getStoredConsents,
  grantConsent,
  revokeConsent,
  resetAllConsent
} from '../../lib/thirdPartyServices';

export default function ThirdPartyConsentModal({ isOpen, onClose }) {
  const [consents, setConsents] = useState({});

  const refreshConsents = () => {
    const store = getStoredConsents();
    setConsents(store.services || {});
  };

  useEffect(() => {
    refreshConsents();
    window.addEventListener('consent_updated', refreshConsents);
    return () => window.removeEventListener('consent_updated', refreshConsents);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <Card className="w-full max-w-xl p-6 bg-card border border-border shadow-2xl rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            🛡️ Third-Party Service Consent Manager
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-main text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-text-muted">
          Small Web Tools operates on a local-first policy. External network requests to third-party services require your explicit consent. You can manage or revoke permissions below at any time.
        </p>

        <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {Object.values(THIRD_PARTY_SERVICES).map((service) => {
            const isGranted = Boolean(consents[service.id]);
            return (
              <div
                key={service.id}
                className="p-3 bg-app border border-border rounded-xl flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-text-main">
                    {service.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => (isGranted ? revokeConsent(service.id) : grantConsent(service.id))}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      isGranted
                        ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-red-500/15 hover:text-red-500 hover:border-red-500/30'
                        : 'bg-card border border-border text-text-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {isGranted ? 'Allowed (Click to Revoke)' : 'Blocked (Click to Allow)'}
                  </button>
                </div>
                <p className="text-xs text-text-muted m-0">{service.purpose}</p>
                <div className="flex justify-between text-[0.72rem] text-text-muted/80">
                  <span>Fallback: {service.fallback}</span>
                  <a
                    href={service.privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Privacy Policy ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
          <Button
            variant="secondary"
            className="text-xs text-red-500 hover:border-red-500/50"
            onClick={resetAllConsent}
          >
            Reset All Preferences
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
