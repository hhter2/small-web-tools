import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AutoDetectConverter from './ui/AutoDetectConverter';
import { analyzeUrl } from './UrlEncoderDecoder/lib/urlDomain';

function ScopeSelector({ scope, setScope }) {
  const { t } = useTranslation('tools');
  return (
    <section className="rounded-xl border border-border bg-app/70 p-4" aria-labelledby="url-scope-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="url-scope-title" className="text-sm font-bold text-text-main">{t('tool-url.ui.scope')}</h3>
          <p className="mt-1 text-xs text-text-muted">
            {t('tool-url.ui.scopeHint')}
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-card p-1" role="group" aria-label={t('tool-url.ui.scopeLabel')}>
          <button
            type="button"
            aria-pressed={scope === 'full'}
            onClick={() => setScope('full')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              scope === 'full' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('tool-url.ui.fullUrl')}
          </button>
          <button
            type="button"
            aria-pressed={scope === 'component'}
            onClick={() => setScope('component')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              scope === 'component' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('tool-url.ui.component')}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        {scope === 'full'
          ? t('tool-url.ui.fullHint')
          : t('tool-url.ui.componentHint')}
      </p>
    </section>
  );
}

export default function UrlEncoderDecoder() {
  const { t } = useTranslation('tools');
  const [scope, setScope] = useState('full');
  const analyze = useCallback(
    (input, mode) => {
      const result = analyzeUrl(input, mode, scope);
      return {
        ...result,
        sourceLabel: result.sourceKey ? t(`tool-url.ui.${result.sourceKey}`) : '',
        targetLabel: result.targetKey ? t(`tool-url.ui.${result.targetKey}`) : '',
        outputPlaceholder: t(`tool-url.ui.${result.outputPlaceholderKey}`),
        error: result.errorKey ? t(`tool-url.ui.${result.errorKey}`) : result.error,
      };
    },
    [scope, t],
  );

  return (
    <AutoDetectConverter
      toolId="tool-url"
      title={t('tool-url.title')}
      inputPlaceholder={t('tool-url.ui.placeholder')}
      emptyTargetLabel={t('tool-url.ui.converted')}
      analyze={analyze}
      renderSupplementary={() => <ScopeSelector scope={scope} setScope={setScope} />}
    />
  );
}
