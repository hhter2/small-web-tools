import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  decodeFastqQualityString,
  FASTQ_PHRED_OFFSETS,
  formatFastqQualityScores,
} from './PhredScaleConverter/lib/phredDomain';

const OFFSET_OPTIONS = [
  { id: 'phred33', label: 'Phred+33', offset: FASTQ_PHRED_OFFSETS.phred33 },
  { id: 'phred64', label: 'Phred+64', offset: FASTQ_PHRED_OFFSETS.phred64 },
];

export default function PhredScaleConverter() {
  const { t } = useTranslation('tools');
  const [offset, setOffset] = useState(FASTQ_PHRED_OFFSETS.phred33);
  const [input, setInput] = useState('IIIIIIII');
  const scores = useMemo(() => decodeFastqQualityString(input, offset), [input, offset]);
  const hasError = input.length > 0 && !scores;
  const output = scores ? formatFastqQualityScores(scores) : '';

  return (
    <Card id="tool-phred" variant="tool" size="wide" className="max-w-[920px]">
      <ToolHeader title={t('tool-phred.title')} />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-app/70 p-4">
        <div
          className="flex w-full rounded-md border border-border bg-card p-1"
          role="tablist"
          aria-label={t('tool-phred.ui.inputTypeAria')}
        >
          {OFFSET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={offset === option.offset}
              onClick={() => setOffset(option.offset)}
              className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                offset === option.offset
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phred-fastq-input" className="text-sm font-bold text-text-main">
              FASTQ Q score
            </label>
            <textarea
              id="phred-fastq-input"
              rows={7}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? 'phred-fastq-error' : undefined}
              className={`min-h-40 w-full resize-y rounded-lg border bg-card px-4 py-3 font-mono text-base font-semibold text-text-main outline-none transition-all focus:ring-2 ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-border hover:border-border-hover focus:border-accent focus:ring-focus'
              }`}
            />
            {hasError && (
              <p id="phred-fastq-error" role="alert" className="text-xs text-red-500">
                ASCII {offset}–126
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phred-fastq-output" className="text-sm font-bold text-text-main">
              {t('tool-phred.ui.score')}
            </label>
            <textarea
              id="phred-fastq-output"
              rows={7}
              readOnly
              value={output}
              aria-live="polite"
              className="min-h-40 w-full resize-y rounded-lg border border-border bg-card px-4 py-3 font-mono text-base font-semibold text-text-main outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-accent/15 bg-accent-light p-3">
            <span className="block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
              ASCII offset
            </span>
            <strong className="mt-1 block font-mono text-lg text-accent">{offset}</strong>
          </div>
          <div className="rounded-xl border border-accent/15 bg-accent-light p-3">
            <span className="block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
              Q score range
            </span>
            <strong className="mt-1 block font-mono text-lg text-accent">0–{126 - offset}</strong>
          </div>
        </div>
      </section>
    </Card>
  );
}
