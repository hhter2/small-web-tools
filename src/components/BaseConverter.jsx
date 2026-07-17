import React, { useState } from 'react';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const BASE_OPTIONS = [
  { base: 2, short: 'BIN', label: 'Binary', example: '101010' },
  { base: 8, short: 'OCT', label: 'Octal', example: '377' },
  { base: 10, short: 'DEC', label: 'Decimal', example: '255' },
  { base: 16, short: 'HEX', label: 'Hexadecimal', example: 'FF' },
  { base: 60, short: 'BASE 60', label: 'Sexagesimal', example: '3:25:15' },
];

function parseBigIntFromBase(value, base) {
  let text = value.trim().toUpperCase();
  if (!text) return null;

  let sign = 1n;
  if (text.startsWith('-')) {
    sign = -1n;
    text = text.slice(1);
  }
  if (!text) return null;

  if (base === 16 && text.startsWith('0X')) text = text.slice(2);
  if (base === 8 && text.startsWith('0O')) text = text.slice(2);
  if (base === 2 && text.startsWith('0B')) text = text.slice(2);
  if (!text) return null;

  let result = 0n;
  for (const char of text) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0 || digit >= base) return null;
    result = result * BigInt(base) + BigInt(digit);
  }
  return result * sign;
}

function parseBase60(value) {
  let text = value.trim();
  if (!text) return null;

  let sign = 1n;
  if (text.startsWith('-')) {
    sign = -1n;
    text = text.slice(1);
  }

  const parts = text.split(':');
  if (parts.some((part) => !/^\d+$/.test(part))) return null;

  let result = 0n;
  for (const part of parts) {
    const digit = Number(part);
    if (digit < 0 || digit > 59) return null;
    result = result * 60n + BigInt(digit);
  }
  return result * sign;
}

function formatBase60(value) {
  if (value === 0n) return '0';

  const sign = value < 0n ? '-' : '';
  let current = value < 0n ? -value : value;
  const parts = [];
  while (current > 0n) {
    parts.push((current % 60n).toString());
    current /= 60n;
  }
  return sign + parts.reverse().join(':');
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function BaseConverter() {
  const [input, setInput] = useState('');
  const [baseFrom, setBaseFrom] = useState(10);
  const [copiedBase, setCopiedBase] = useState(null);

  const trimmed = input.trim();
  const parsed = trimmed
    ? baseFrom === 60
      ? parseBase60(trimmed)
      : parseBigIntFromBase(trimmed, baseFrom)
    : null;
  const hasError = Boolean(trimmed) && parsed === null;
  const selectedBase = BASE_OPTIONS.find((option) => option.base === baseFrom);

  const results = [
    { base: 2, short: 'BIN', label: 'Binary', value: parsed === null ? '' : parsed.toString(2) },
    { base: 8, short: 'OCT', label: 'Octal', value: parsed === null ? '' : parsed.toString(8) },
    { base: 10, short: 'DEC', label: 'Decimal', value: parsed === null ? '' : parsed.toString(10) },
    { base: 16, short: 'HEX', label: 'Hexadecimal', value: parsed === null ? '' : parsed.toString(16).toUpperCase() },
    { base: 60, short: 'BASE 60', label: 'Sexagesimal', value: parsed === null ? '' : formatBase60(parsed) },
  ];

  const useAsInput = (result) => {
    setInput(result.value);
    setBaseFrom(result.base);
    setCopiedBase(null);
  };

  const copyValue = async (result) => {
    if (!result.value) return;
    try {
      await navigator.clipboard.writeText(result.value);
      setCopiedBase(result.base);
    } catch {
      setCopiedBase(null);
    }
  };

  return (
    <Card id="tool-base" variant="tool" size="wide" className="max-w-[920px] !gap-3 !p-5">
      <ToolHeader title="Base Converter" />

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-app/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-text-main">Choose the input base</p>
          <span className="rounded-full border border-accent/25 bg-accent-light px-2.5 py-1 text-xs font-bold text-accent">
            Base {baseFrom}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Input base">
          {BASE_OPTIONS.map((option) => {
            const active = option.base === baseFrom;
            return (
              <button
                key={option.base}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setBaseFrom(option.base);
                  setCopiedBase(null);
                }}
                className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${active
                  ? 'border-accent bg-accent text-white shadow-[0_4px_12px_var(--accent-light)]'
                  : 'border-border bg-card text-text-muted hover:border-accent hover:text-text-main'}`}
              >
                <span className="block text-xs font-extrabold tracking-wide">{option.short}</span>
                <span className={`block text-[0.68rem] ${active ? 'text-white/75' : 'text-text-muted'}`}>Base {option.base}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="base-input" className="text-sm font-bold text-text-main">Number</label>
            <span className="text-xs text-text-muted">Example: {selectedBase.example}</span>
          </div>
          <div className="flex gap-2">
            <input
              id="base-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setCopiedBase(null);
              }}
              placeholder={selectedBase.example}
              className={`min-w-0 flex-1 rounded-lg border bg-card px-4 py-2.5 font-mono text-lg font-semibold text-text-main outline-none transition-all placeholder:text-text-muted/45 focus:ring-2 ${hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                : 'border-border hover:border-border-hover focus:border-accent focus:ring-focus'}`}
              aria-invalid={hasError || undefined}
              aria-describedby="base-status"
            />
            <button
              type="button"
              disabled={!input}
              onClick={() => {
                setInput('');
                setCopiedBase(null);
              }}
              className="rounded-lg border border-border bg-card px-4 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-35"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <div
        id="base-status"
        role={hasError ? 'alert' : 'status'}
        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${hasError
          ? 'border-red-500/30 bg-red-500/10 text-red-500'
          : 'border-border bg-app text-text-muted'}`}
      >
        <span className={`h-2 w-2 flex-none rounded-full ${hasError ? 'bg-red-500' : trimmed ? 'bg-accent' : 'bg-text-muted/40'}`} />
        <span>{hasError
          ? `“${input}” is not valid ${selectedBase.label.toLowerCase()} input.`
          : trimmed
            ? `Interpreting the value as ${selectedBase.label.toLowerCase()} (base ${baseFrom}).`
            : 'Enter a number to generate all base representations automatically.'}</span>
      </div>

      <section className="flex flex-col gap-2.5" aria-labelledby="base-results-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 id="base-results-title" className="text-sm font-bold text-text-main">Converted values</h3>
            <p className="text-xs text-text-muted">Copy a result or use it as the next input.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {results.map((result) => (
            <div
              key={result.base}
              data-base-result={result.base}
              className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2.5 transition-colors ${result.base === baseFrom
                ? 'border-accent/40 bg-accent-light/45'
                : 'border-border bg-card hover:border-border-hover'} ${result.base === 60 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-app px-2 py-1 text-[0.68rem] font-extrabold tracking-wide text-accent">{result.short}</span>
                  <span className="text-sm font-semibold text-text-main">{result.label}</span>
                </div>
              </div>
              <code className={`min-h-6 break-all font-mono text-[0.9rem] font-semibold leading-6 ${result.value ? 'text-text-main' : 'text-text-muted/45'}`}>
                {result.value || '—'}
              </code>
              <div className="flex items-center justify-end gap-1 border-t border-border/70 pt-1.5">
                <button
                  type="button"
                  disabled={!result.value}
                  onClick={() => useAsInput(result)}
                  aria-label={`Use ${result.label} value as input`}
                  className="rounded-md px-2 py-0.5 text-[0.7rem] font-semibold text-text-muted transition-colors hover:bg-nav-hover-bg hover:text-accent disabled:cursor-default disabled:opacity-35"
                >
                  Set input
                </button>
                <button
                  type="button"
                  disabled={!result.value}
                  onClick={() => copyValue(result)}
                  aria-label={`Copy ${result.label} value`}
                  className="inline-flex min-w-[64px] items-center justify-center gap-1 rounded-md border border-border bg-app px-2 py-0.5 text-[0.7rem] font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-35"
                >
                  <CopyIcon />
                  {copiedBase === result.base ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}
