import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Card from './Card';
import ToolHeader from './ToolHeader';

const editorClasses =
  'block w-full resize-y border-0 bg-transparent px-4 py-3.5 ' +
  'font-mono text-[0.92rem] leading-6 text-text-main outline-none ' +
  'placeholder:text-text-muted/45 focus:ring-0 read-only:cursor-default read-only:opacity-90';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4V2h6v2M9 12h6M12 9v6" />
    </svg>
  );
}

export default function AutoDetectConverter({
  toolId,
  title,
  inputPlaceholder,
  emptyTargetLabel,
  analyze,
  editorMinHeightClass = 'min-h-[210px]',
  editorRows = 7,
  renderSupplementary = null,
  showManualModes = true,
}) {
  const { t } = useTranslation('common');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto' | 'encode' | 'decode'
  const [copyState, setCopyState] = useState('idle');
  const [pasteState, setPasteState] = useState('idle');
  const result = useMemo(() => analyze(input, mode), [analyze, input, mode]);
  const output = result.output || '';

  const updateInput = (value) => {
    setInput(value);
    setCopyState('idle');
    setPasteState('idle');
  };

  const handlePaste = async () => {
    setPasteState('reading');
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      setCopyState('idle');
      setPasteState('pasted');
    } catch {
      setPasteState('error');
    }
  };

  const handleCopy = async () => {
    if (!output || result.error) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <Card id={toolId} variant="tool" size="wide" className="max-w-[920px]">
      <ToolHeader title={title} />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <section className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r" aria-label={t('converter.source')}>
            <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-2 border-b border-border bg-app/70 px-4 py-2.5 md:h-[54px] md:flex-nowrap">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex rounded-md border border-border bg-card p-0.5" role="group" aria-label={t('converter.mode')}>
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                      mode === 'auto' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {t('converter.auto')}
                  </button>
                  {showManualModes && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMode('encode')}
                        className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                          mode === 'encode' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t('converter.encode')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('decode')}
                        className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                          mode === 'decode' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t('converter.decode')}
                      </button>
                    </>
                  )}
                </div>
                {input.trim() && (
                  <span className="truncate rounded-full border border-border bg-card px-2 py-0.5 text-[0.68rem] font-bold text-text-muted">
                    {result.sourceLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pasteState === 'reading'}
                  onClick={handlePaste}
                  aria-label={t(pasteState === 'error' ? 'converter.retryPaste' : 'converter.pasteLabel')}
                  className="min-w-[74px]"
                >
                  <PasteIcon />
                  {pasteState === 'reading' ? t('states.pasting') : pasteState === 'pasted' ? t('states.pasted') : pasteState === 'error' ? t('actions.retry') : t('converter.paste')}
                </Button>
                <button
                  type="button"
                  disabled={!input}
                  onClick={() => {
                    updateInput('');
                  }}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-nav-hover-bg hover:text-text-main disabled:cursor-default disabled:opacity-30"
                >
                  {t('actions.clear')}
                </button>
              </div>
            </header>

            <textarea
              id={`${toolId}-input`}
              rows={editorRows}
              spellCheck={false}
              value={input}
              onChange={(event) => {
                updateInput(event.target.value);
              }}
              placeholder={inputPlaceholder}
              aria-label={t('converter.sourceInput')}
              aria-describedby={result.error ? `${toolId}-error` : undefined}
              className={`${editorClasses} ${editorMinHeightClass}`}
            />

            {result.error && (
              <div
                id={`${toolId}-error`}
                role="alert"
                className="border-t border-border bg-red-500/10 px-4 py-2 text-xs text-red-500"
              >
                {result.error}
              </div>
            )}
          </section>

          <section className="flex min-w-0 flex-col bg-accent-light/20" aria-label={t('converter.result')}>
            <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/45 px-4 py-2.5 md:h-[54px]">
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-text-main">
                  {result.targetLabel || emptyTargetLabel}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!output || Boolean(result.error)}
                onClick={handleCopy}
                aria-label={t(copyState === 'error' ? 'converter.retryCopy' : 'converter.copyLabel')}
                className="min-w-[74px]"
              >
                <CopyIcon />
                {copyState === 'copied' ? t('actions.copied') : copyState === 'error' ? t('actions.retry') : t('actions.copy')}
              </Button>
            </header>

            <textarea
              id={`${toolId}-output`}
              rows={editorRows}
              readOnly
              value={output}
              placeholder={result.error ? t('converter.fixInput') : result.outputPlaceholder}
              aria-label={t('converter.convertedResult')}
              aria-live="polite"
              className={`${editorClasses} ${editorMinHeightClass} bg-accent-light/15`}
            />
          </section>
        </div>
      </div>

      {renderSupplementary?.({ input, setInput: updateInput })}
    </Card>
  );
}
