import React, { useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import ToolHeader from './ToolHeader';

const textareaClasses =
  'w-full min-h-[156px] resize-y rounded-lg border border-border bg-app px-4 py-3 ' +
  'font-mono text-[0.9rem] leading-6 text-text-main outline-none transition-all ' +
  'placeholder:text-text-muted/55 hover:border-border-hover focus:border-accent focus:bg-card focus:ring-2 focus:ring-focus ' +
  'read-only:cursor-default read-only:opacity-90 read-only:focus:border-border read-only:focus:ring-0';

function DirectionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h11l-3-3" />
      <path d="m18 7-3 3" />
      <path d="M17 17H6l3 3" />
      <path d="m6 17 3-3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function BidirectionalConverter({
  toolId,
  title,
  description,
  modes,
  defaultMode,
}) {
  const [modeId, setModeId] = useState(defaultMode || modes[0].id);
  const [input, setInput] = useState('');
  const [copyState, setCopyState] = useState('idle');

  const activeMode = modes.find((mode) => mode.id === modeId) || modes[0];
  const result = useMemo(() => activeMode.convert(input), [activeMode, input]);
  const output = result.value || '';

  const switchDirection = (nextModeId) => {
    if (nextModeId === modeId) return;
    setInput(result.error ? '' : output);
    setModeId(nextModeId);
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

  const statusText = result.error
    ? result.error
    : input
      ? activeMode.successMessage || 'Converted automatically as you type.'
      : activeMode.emptyMessage || 'Enter a value to begin. Conversion happens automatically.';

  return (
    <Card id={toolId} variant="tool" size="wide" className="max-w-[920px]">
      <ToolHeader title={title} description={description} />

      <div className="rounded-xl border border-border bg-app/70 p-1.5" aria-label="Conversion direction">
        <div className="grid grid-cols-2 gap-1.5">
          {modes.map((mode) => {
            const active = mode.id === modeId;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => switchDirection(mode.id)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${active
                  ? 'border-accent bg-accent text-white shadow-[0_4px_12px_var(--accent-light)]'
                  : 'border-transparent bg-transparent text-text-muted hover:border-border hover:bg-card hover:text-text-main'}`}
              >
                <span>{mode.shortLabel}</span>
                <span className="hidden text-xs font-medium opacity-75 sm:inline">{mode.detailLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-text-main">{activeMode.inputLabel}</p>
              <p className="text-xs text-text-muted">{activeMode.inputHint}</p>
            </div>
            <button
              type="button"
              disabled={!input}
              onClick={() => {
                setInput('');
                setCopyState('idle');
              }}
              className="rounded-md px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-nav-hover-bg hover:text-text-main disabled:cursor-default disabled:opacity-35"
            >
              Clear
            </button>
          </div>
          <textarea
            id={`${toolId}-input`}
            rows={6}
            spellCheck={false}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setCopyState('idle');
            }}
            placeholder={activeMode.inputPlaceholder}
            aria-label={activeMode.inputLabel}
            className={textareaClasses}
          />
        </section>

        <button
          type="button"
          disabled={!output || Boolean(result.error)}
          onClick={() => switchDirection(modes.find((mode) => mode.id !== modeId)?.id)}
          className="mx-auto flex h-10 w-10 rotate-90 items-center justify-center self-center rounded-full border border-border bg-card text-accent shadow-sm transition-all hover:border-accent hover:bg-accent-light disabled:cursor-default disabled:opacity-35 md:rotate-0"
          title="Switch direction and use the current output as input"
          aria-label="Switch direction and use the current output as input"
        >
          <DirectionIcon />
        </button>

        <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-accent-light/45 p-4">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-text-main">{activeMode.outputLabel}</p>
              <p className="text-xs text-text-muted">Live result</p>
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
          </div>
          <textarea
            id={`${toolId}-output`}
            rows={6}
            readOnly
            value={output}
            placeholder={result.error ? 'Fix the input to see a result.' : activeMode.outputPlaceholder}
            aria-label={activeMode.outputLabel}
            aria-live="polite"
            className={`${textareaClasses} bg-accent-light/30`}
          />
        </section>
      </div>

      <div
        role={result.error ? 'alert' : 'status'}
        className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${result.error
          ? 'border-red-500/30 bg-red-500/10 text-red-500'
          : 'border-border bg-app text-text-muted'}`}
      >
        <span className={`h-2 w-2 flex-none rounded-full ${result.error ? 'bg-red-500' : input ? 'bg-accent' : 'bg-text-muted/40'}`} />
        <span>{statusText}</span>
      </div>
    </Card>
  );
}
