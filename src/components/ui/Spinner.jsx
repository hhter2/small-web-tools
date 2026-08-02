import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Spinner — Phase 6 Tailwind migration.
 *
 * Parity targets in styles.css:
 *   .loader-container  (line 955) — optional flex column wrapper
 *   .spinner           (line 964) — animated ring, 40px default
 *   .spinner--small    (line 1017) — 13px variant, 2px border
 *
 * Usage:
 *   // Standalone spinner
 *   <Spinner />
 *   <Spinner size="small" />
 *
 *   // With container (loader-container parity)
 *   <Spinner container label="Loading…" />
 *   <Spinner container size="small" />
 *
 * Note: the @keyframes spin animation is still defined in styles.css — Tailwind's
 * built-in `animate-spin` uses a 1s linear infinite rotation which is identical.
 */
export default function Spinner({
  size = 'default', // 'default' | 'small'
  container = false, // if true, wraps in a flex column centering container
  label = '',        // text shown below spinner (only when container=true)
  className = '',
  ...props
}) {
  const { t } = useTranslation('common');
  const ring = size === 'small'
    ? 'w-[13px] h-[13px] border-2'
    : 'w-10 h-10 border-4';

  const spinnerEl = (
    <div
      className={`rounded-full border-border border-t-accent animate-spin ${ring} ${!container ? className : ''}`}
      role="status"
      aria-label={t('states.loading')}
      {...(!container ? props : {})}
    />
  );

  if (!container) return spinnerEl;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}
      {...props}
    >
      {spinnerEl}
      {label && (
        <span className="text-[0.85rem] text-text-muted">{label}</span>
      )}
    </div>
  );
}
