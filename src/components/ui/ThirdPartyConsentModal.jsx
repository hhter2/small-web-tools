import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';
import {
  THIRD_PARTY_SERVICES,
  getStoredConsents,
  grantConsent,
  revokeConsent,
  resetAllConsent
} from '../../lib/thirdPartyServices';

export default function ThirdPartyConsentModal({ isOpen, onClose, onOpenPrivacy }) {
  const [consents, setConsents] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const refreshConsents = () => {
    const store = getStoredConsents();
    setConsents(store.services || {});
  };

  useEffect(() => {
    refreshConsents();
    window.addEventListener('consent_updated', refreshConsents);
    return () => window.removeEventListener('consent_updated', refreshConsents);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocusedRef.current = document.activeElement;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || []);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <Card
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-dialog-title"
        aria-describedby="consent-dialog-description"
        tabIndex={-1}
        className="w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6 bg-card border border-border shadow-2xl rounded-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="consent-dialog-title" className="text-lg font-bold text-text-main flex items-center gap-2">
            🛡️ Third-Party Service Consent Manager
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close consent manager"
            className="text-text-muted hover:text-text-main text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <p id="consent-dialog-description" className="text-xs text-text-muted">
          Small Web Tools is local-first. The services below remain blocked until you explicitly allow them.
          Runtime downloads and user-selected external links use separate point-of-use disclosures.
        </p>
        <button type="button" onClick={onOpenPrivacy} className="self-start text-xs font-semibold text-accent hover:underline">
          Read the full Privacy &amp; Network Services policy
        </button>

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
                    onClick={() => {
                      if (isGranted) {
                        revokeConsent(service.id);
                        setAnnouncement(`${service.name} is now blocked.`);
                      } else {
                        grantConsent(service.id);
                        setAnnouncement(`${service.name} is now allowed.`);
                      }
                    }}
                    aria-pressed={isGranted}
                    aria-label={`${isGranted ? 'Revoke' : 'Allow'} ${service.name}`}
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
            onClick={() => {
              resetAllConsent();
              setAnnouncement('All third-party service preferences were reset.');
            }}
          >
            Reset All Preferences
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </Card>
    </div>
  );
}
