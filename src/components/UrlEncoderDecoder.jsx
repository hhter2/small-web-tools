import React, { useCallback, useState } from 'react';
import AutoDetectConverter from './ui/AutoDetectConverter';
import { analyzeUrl } from './UrlEncoderDecoder/lib/urlDomain';

function ScopeSelector({ scope, setScope }) {
  return (
    <section className="rounded-xl border border-border bg-app/70 p-4" aria-labelledby="url-scope-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="url-scope-title" className="text-sm font-bold text-text-main">Encoding scope</h3>
          <p className="mt-1 text-xs text-text-muted">
            UTF-8 percent-encoding is used; conversion stays in this browser.
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-card p-1" role="group" aria-label="URL encoding scope">
          <button
            type="button"
            aria-pressed={scope === 'full'}
            onClick={() => setScope('full')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              scope === 'full' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Full URL
          </button>
          <button
            type="button"
            aria-pressed={scope === 'component'}
            onClick={() => setScope('component')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              scope === 'component' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
            }`}
          >
            URL component
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        {scope === 'full'
          ? 'Preserves URL structure such as : / ? & = and # while encoding Chinese characters and spaces.'
          : 'Encodes every reserved separator, suitable for an address or other value placed inside a query parameter.'}
      </p>
    </section>
  );
}

export default function UrlEncoderDecoder() {
  const [scope, setScope] = useState('full');
  const analyze = useCallback(
    (input, mode) => analyzeUrl(input, mode, scope),
    [scope],
  );

  return (
    <AutoDetectConverter
      toolId="tool-url"
      title="URL Encoder & Decoder"
      inputPlaceholder="Paste a URL, Chinese address, or percent-encoded value"
      emptyTargetLabel="Converted URL"
      analyze={analyze}
      renderSupplementary={() => <ScopeSelector scope={scope} setScope={setScope} />}
    />
  );
}
