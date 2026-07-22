import React, { useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import ToolHeader from './ToolHeader';

const editorClasses =
  'block w-full resize-y border-0 bg-transparent px-4 py-3.5 ' +
  'font-mono text-[0.92rem] leading-6 text-text-main outline-none ' +
  'placeholder:text-text-muted/45 focus:ring-0 read-only:cursor-default read-only:opacity-90';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
}) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto' | 'encode' | 'decode'
  const [copyState, setCopyState] = useState('idle');
  const result = useMemo(() => analyze(input, mode), [analyze, input, mode]);
  const output = result.output || '';

  const updateInput = (value) => {
    setInput(value);
    setCopyState('idle');
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
          <section className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r" aria-label="Source">
            <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-2 border-b border-border bg-app/70 px-4 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex rounded-md border border-border bg-card p-0.5" role="group" aria-label="Conversion Mode">
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                      mode === 'auto' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('encode')}
                    className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                      mode === 'encode' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Encode
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('decode')}
                    className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                      mode === 'decode' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Decode
                  </button>
                </div>
                {input.trim() && (
                  <span className="truncate rounded-full border border-border bg-card px-2 py-0.5 text-[0.68rem] font-bold text-text-muted">
                    {result.sourceLabel}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={!input}
                onClick={() => {
                  setInput('');
                  setCopyState('idle');
                }}
                className="rounded-md px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-nav-hover-bg hover:text-text-main disabled:cursor-default disabled:opacity-30"
              >
                Clear
              </button>
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
              aria-label="Source input"
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

          <section className="flex min-w-0 flex-col bg-accent-light/20" aria-label="Result">
            <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/45 px-4 py-2.5">
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
                className="min-w-[74px]"
              >
                <CopyIcon />
                {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Retry' : 'Copy'}
              </Button>
            </header>

            <textarea
              id={`${toolId}-output`}
              rows={editorRows}
              readOnly
              value={output}
              placeholder={result.error ? 'Fix the source input to see a result.' : result.outputPlaceholder}
              aria-label="Converted result"
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
