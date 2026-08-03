import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { grantConsent, hasConsent } from '../lib/thirdPartyServices';

export default function ExternalMapPreview({
  latitude,
  longitude,
  title,
  delta = 0.01,
  collapsible = false,
}) {
  const { t } = useTranslation('common');
  const displayTitle = title ?? t('map.title');
  const [allowed, setAllowed] = useState(() => hasConsent('osm'));
  const [expanded, setExpanded] = useState(!collapsible);

  useEffect(() => {
    const handleConsentUpdate = () => setAllowed(hasConsent('osm'));
    window.addEventListener('consent_updated', handleConsentUpdate);
    return () => window.removeEventListener('consent_updated', handleConsentUpdate);
  }, []);

  const mapUrl = useMemo(() => {
    const bbox = [
      longitude - delta,
      latitude - delta,
      longitude + delta,
      latitude + delta,
    ].join(',');
    const url = new URL('https://www.openstreetmap.org/export/embed.html');
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('layer', 'mapnik');
    url.searchParams.set('marker', `${latitude},${longitude}`);
    return url.href;
  }, [delta, latitude, longitude]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;

  return (
    <section className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3 shadow-sm w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{displayTitle}</h4>
          <p className="text-xs font-mono text-text-main font-semibold">{latitude}, {longitude}</p>
        </div>
        <div className="flex items-center gap-2">
          {collapsible && (
            <Button variant="secondary" size="sm" onClick={() => setExpanded((visible) => !visible)}>
              {t(expanded ? 'map.hide' : 'map.show')}
            </Button>
          )}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-border bg-app hover:bg-nav-hover-bg text-text-main text-[11px] font-bold"
          >
            {t('map.google')}
          </a>
        </div>
      </div>

      {expanded && (
        allowed ? (
          <div className="w-full overflow-hidden rounded-lg border border-border min-h-[250px]">
            <iframe
              title={t('map.frameTitle', { title: displayTitle })}
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={mapUrl}
              className="w-full border-none"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-app p-4 text-center">
            <p className="text-xs text-text-muted mb-3">
              {t('map.disclosure')}
            </p>
            <Button variant="secondary" size="sm" onClick={() => grantConsent('osm')}>
              {t('map.enable')}
            </Button>
          </div>
        )
      )}
    </section>
  );
}
