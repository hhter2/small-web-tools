import React, { useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import ToolHeader from './ToolHeader';

const editorClasses =
  'block w-full min-h-[210px] resize-y border-0 bg-transparent px-4 py-3.5 ' +
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
  description,
  inputPlaceholder,
  emptyTargetLabel,
  analyze,
}) {
  const [input, setInput] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const result = useMemo(() => analyze(input), [analyze, input]);
  const output = result.output || '';

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
    <Card id={toolId} variant="tool" size="wide" className="max-w-[920px] !gap-3">
      <ToolHeader title={title} description={description} />

      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="pointer-events-none absolute left-1/2 top-[23px] z-10 hidden h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-sm text-accent shadow-sm md:flex" aria-hidden="true">
          →
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <section className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r" aria-label="Source">
            <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/70 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-bold text-accent">Auto-detect</span>
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
              rows={7}
              spellCheck={false}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setCopyState('idle');
              }}
              placeholder={inputPlaceholder}
              aria-label="Source input"
              aria-describedby={`${toolId}-status`}
              className={editorClasses}
            />

            <div
              id={`${toolId}-status`}
              role={result.error ? 'alert' : 'status'}
              className={`flex min-h-10 items-center gap-2 border-t border-border px-4 py-2 text-xs ${result.error ? 'bg-red-500/10 text-red-500' : 'bg-app/55 text-text-muted'}`}
            >
              <span className={`h-2 w-2 flex-none rounded-full ${result.error ? 'bg-red-500' : input.trim() ? 'bg-accent' : 'bg-text-muted/35'}`} />
              <span>{result.status}</span>
            </div>
          </section>

          <section className="flex min-w-0 flex-col bg-accent-light/20" aria-label="Result">
            <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/45 px-4 py-2.5">
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-text-main">
                  {result.targetLabel || emptyTargetLabel}
                </span>
                <span className="block text-[0.68rem] font-medium text-text-muted">Live result</span>
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
              rows={7}
              readOnly
              value={output}
              placeholder={result.error ? 'Fix the source input to see a result.' : result.outputPlaceholder}
              aria-label="Converted result"
              aria-live="polite"
              className={`${editorClasses} bg-accent-light/15`}
            />

            <div className="flex min-h-10 items-center justify-between gap-3 border-t border-border bg-app/35 px-4 py-2 text-xs text-text-muted">
              <span>{output && !result.error ? 'Converted automatically' : 'Waiting for source input'}</span>
              <span className="font-mono">{output && !result.error ? `${Array.from(output).length} chars` : ''}</span>
            </div>
          </section>
        </div>
      </div>
    </Card>
  );
}
