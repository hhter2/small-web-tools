import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { changeLocale, SUPPORTED_LOCALES } from '../i18n/index.js';

export default function MobileLanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const [portalTarget, setPortalTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('mobile-header'));
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!portalTarget) return null;

  return createPortal(
    <div ref={containerRef} className="relative shrink-0 md:hidden">
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-app text-text-muted transition hover:border-accent hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${isOpen ? 'border-accent text-accent' : ''}`}
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.25" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={t('language.label')}
          className="absolute right-0 top-full z-[1100] mt-2 flex min-w-[10rem] flex-col gap-1 rounded-lg border border-border bg-[var(--bg-card-solid,var(--bg-card))] p-1 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="menuitemradio"
              aria-checked={i18n.resolvedLanguage === locale}
              className={`w-full rounded-sm border-none px-3 py-2 text-left text-[0.8rem] font-medium ${i18n.resolvedLanguage === locale ? 'bg-accent-light text-accent' : 'bg-transparent text-text-main hover:bg-nav-hover-bg'}`}
              onClick={() => {
                void changeLocale(locale);
                setIsOpen(false);
              }}
            >
              {t(`language.${locale}`)}
            </button>
          ))}
        </div>
      )}
    </div>,
    portalTarget,
  );
}
