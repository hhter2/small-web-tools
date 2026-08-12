import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  calculatePhredMetrics,
  decodeFastqQualityString,
  encodeFastqQualityScores,
  fastqCodeForScore,
  FASTQ_PHRED_OFFSETS,
  formatFastqQualityScores,
  formatPhredScore,
  formatProbability,
} from './PhredScaleConverter/lib/phredDomain';

const REFERENCE_SCORES = [10, 20, 30, 40];
const OFFSET_OPTIONS = [
  { id: 'phred33', label: 'Phred+33', offset: FASTQ_PHRED_OFFSETS.phred33 },
  { id: 'phred64', label: 'Phred+64', offset: FASTQ_PHRED_OFFSETS.phred64 },
];
const OFFSET_USAGE = [
  { offset: 'Phred+33', platforms: ['Sanger', 'Illumina 1.8+'] },
  { offset: 'Phred+64', platforms: ['Illumina 1.3–1.7'] },
];

export default function PhredScaleConverter() {
  const { t, i18n } = useTranslation('tools');

  const [mode, setMode] = useState('score');
  const [calculatorInput, setCalculatorInput] = useState('30');
  const metrics = useMemo(
    () => calculatePhredMetrics(mode, calculatorInput),
    [mode, calculatorInput],
  );
  const calculatorHasError = Boolean(calculatorInput.trim()) && !metrics;

  const [offset, setOffset] = useState(Number(FASTQ_PHRED_OFFSETS.phred33));
  const [fastqDirection, setFastqDirection] = useState('decode');
  const [fastqInput, setFastqInput] = useState('IIIIIIII');
  const decodedScores = useMemo(
    () => (fastqDirection === 'decode' ? decodeFastqQualityString(fastqInput, offset) : null),
    [fastqDirection, fastqInput, offset],
  );
  const encodedQuality = useMemo(
    () => (fastqDirection === 'encode' ? encodeFastqQualityScores(fastqInput, offset) : null),
    [fastqDirection, fastqInput, offset],
  );
  const fastqOutput = fastqDirection === 'decode'
    ? (decodedScores ? formatFastqQualityScores(decodedScores) : '')
    : (encodedQuality ?? '');
  const fastqHasError = fastqInput.length > 0
    && (fastqDirection === 'decode' ? !decodedScores : encodedQuality === null);

  const selectCalculatorMode = (nextMode) => {
    if (metrics) {
      setCalculatorInput(nextMode === 'score'
        ? formatPhredScore(metrics.score)
        : formatProbability(metrics.errorProbability));
    } else {
      setCalculatorInput('');
    }
    setMode(nextMode);
  };

  const selectFastqDirection = (nextDirection) => {
    if (nextDirection === fastqDirection) return;
    if (nextDirection === 'encode' && decodedScores) {
      setFastqInput(formatFastqQualityScores(decodedScores));
    } else if (nextDirection === 'decode' && encodedQuality) {
      setFastqInput(encodedQuality);
    } else {
      setFastqInput('');
    }
    setFastqDirection(nextDirection);
  };

  return (
    <Card id="tool-phred" variant="tool" size="wide" className="max-w-[980px]">
      <ToolHeader title={t('tool-phred.title')} />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-app/70 p-4">
        <div
          className="flex w-full rounded-md border border-border bg-card p-1"
          role="tablist"
          aria-label={t('tool-phred.ui.inputTypeAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'score'}
            onClick={() => selectCalculatorMode('score')}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
              mode === 'score' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('tool-phred.ui.scoreTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'probability'}
            onClick={() => selectCalculatorMode('probability')}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
              mode === 'probability' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('tool-phred.ui.probabilityTab')}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phred-input" className="text-sm font-bold text-text-main">
            {t(mode === 'score' ? 'tool-phred.ui.scoreLabel' : 'tool-phred.ui.probabilityLabel')}
          </label>
          <input
            id="phred-input"
            type="number"
            min={mode === 'score' ? 0 : Number.MIN_VALUE}
            max={mode === 'score' ? 300 : 1}
            step="any"
            value={calculatorInput}
            onChange={(event) => setCalculatorInput(event.target.value)}
            aria-invalid={calculatorHasError || undefined}
            aria-describedby={calculatorHasError ? 'phred-error' : 'phred-formula'}
            className={`w-full rounded-lg border bg-card px-4 py-3 font-mono text-lg font-semibold text-text-main outline-none transition-all focus:ring-2 ${
              calculatorHasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                : 'border-border hover:border-border-hover focus:border-accent focus:ring-focus'
            }`}
          />
          {calculatorHasError ? (
            <p id="phred-error" role="alert" className="text-xs text-red-500">
              {mode === 'score'
                ? t('tool-phred.ui.scoreError')
                : t('tool-phred.ui.probabilityError')}
            </p>
          ) : (
            <p id="phred-formula" className="text-xs text-text-muted">
              Q = −10 × log₁₀(P), and P = 10^(−Q/10).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          {[
            [t('tool-phred.ui.score'), metrics ? formatPhredScore(metrics.score) : '—'],
            [t('tool-phred.ui.errorProbability'), metrics ? formatProbability(metrics.errorProbability) : '—'],
            [
              t('tool-phred.ui.callAccuracy'),
              metrics
                ? `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(metrics.accuracy * 100)}%`
                : '—',
            ],
            [
              t('tool-phred.ui.expectedFrequency'),
              metrics
                ? t('tool-phred.ui.oneIn', {
                  count: Math.max(1, Math.round(metrics.oneIn)).toLocaleString(i18n.language),
                })
                : '—',
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-accent/15 bg-accent-light p-3">
              <span className="block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">{label}</span>
              <strong className="mt-1 block break-all font-mono text-lg text-accent">{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-app/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div
            className="flex flex-1 rounded-md border border-border bg-card p-1"
            role="tablist"
            aria-label="FASTQ"
          >
            <button
              type="button"
              role="tab"
              aria-selected={fastqDirection === 'decode'}
              onClick={() => selectFastqDirection('decode')}
              className={`flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                fastqDirection === 'decode'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <span>FASTQ</span><span aria-hidden="true">→</span><span>Q</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={fastqDirection === 'encode'}
              onClick={() => selectFastqDirection('encode')}
              className={`flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                fastqDirection === 'encode'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <span>Q</span><span aria-hidden="true">→</span><span>FASTQ</span>
            </button>
          </div>

          <div className="flex flex-1 rounded-md border border-border bg-card p-1" role="tablist" aria-label="ASCII">
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
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phred-fastq-input" className="text-sm font-bold text-text-main">
              {fastqDirection === 'decode' ? 'FASTQ' : t('tool-phred.ui.score')}
            </label>
            <textarea
              id="phred-fastq-input"
              rows={6}
              value={fastqInput}
              onChange={(event) => setFastqInput(event.target.value)}
              spellCheck={false}
              aria-invalid={fastqHasError || undefined}
              aria-describedby={fastqHasError ? 'phred-fastq-error' : undefined}
              className={`min-h-36 w-full resize-y rounded-lg border bg-card px-4 py-3 font-mono text-base font-semibold text-text-main outline-none transition-all focus:ring-2 ${
                fastqHasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-border hover:border-border-hover focus:border-accent focus:ring-focus'
              }`}
            />
            {fastqHasError && (
              <p id="phred-fastq-error" role="alert" className="text-xs text-red-500">
                {fastqDirection === 'decode' ? `ASCII ${offset}–126` : `Q 0–${126 - offset}`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phred-fastq-output" className="text-sm font-bold text-text-main">
              {fastqDirection === 'decode' ? t('tool-phred.ui.score') : 'FASTQ'}
            </label>
            <textarea
              id="phred-fastq-output"
              rows={6}
              readOnly
              value={fastqOutput}
              aria-live="polite"
              className="min-h-36 w-full resize-y rounded-lg border border-border bg-card px-4 py-3 font-mono text-base font-semibold text-text-main outline-none"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="phred-reference-title">
        <div>
          <h3 id="phred-reference-title" className="text-sm font-bold text-text-main">
            {t('tool-phred.ui.referenceTitle')}
          </h3>
          <p className="text-xs text-text-muted">{t('tool-phred.ui.referenceDescription')}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-app text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">Q</th>
                <th className="px-3 py-2">Phred+33</th>
                <th className="px-3 py-2">Phred+64</th>
                <th className="px-3 py-2">{t('tool-phred.ui.errorProbability')}</th>
                <th className="px-3 py-2">{t('tool-phred.ui.accuracy')}</th>
                <th className="px-3 py-2">{t('tool-phred.ui.expectedErrors')}</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_SCORES.map((score) => {
                const row = calculatePhredMetrics('score', String(score));
                return (
                  <tr key={score} className="border-t border-border bg-card hover:bg-accent-light/40">
                    <td className="p-0">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('score');
                          setCalculatorInput(String(score));
                        }}
                        className="w-full px-3 py-2 text-left font-mono font-extrabold text-accent"
                        aria-label={t('tool-phred.ui.useScoreAria', { score })}
                      >
                        {score}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono">{fastqCodeForScore(score, FASTQ_PHRED_OFFSETS.phred33)}</td>
                    <td className="px-3 py-2 font-mono">{fastqCodeForScore(score, FASTQ_PHRED_OFFSETS.phred64)}</td>
                    <td className="px-3 py-2 font-mono">{formatProbability(row.errorProbability)}</td>
                    <td className="px-3 py-2">{(row.accuracy * 100).toFixed(Math.min(6, score / 10 + 1))}%</td>
                    <td className="px-3 py-2">
                      {t('tool-phred.ui.oneIn', {
                        count: Math.max(1, Math.round(row.oneIn)).toLocaleString(i18n.language),
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted">{t('tool-phred.ui.note')}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="FASTQ">
        {OFFSET_USAGE.map((item) => (
          <div key={item.offset} className="rounded-xl border border-border bg-app/70 p-4">
            <strong className="font-mono text-sm text-accent">{item.offset}</strong>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.platforms.map((platform) => (
                <span key={platform} className="rounded-md border border-border bg-card px-2 py-1 text-xs text-text-main">
                  {platform}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </Card>
  );
}
