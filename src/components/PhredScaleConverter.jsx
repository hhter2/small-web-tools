import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  calculatePhredMetrics,
  formatPhredScore,
  formatProbability,
} from './PhredScaleConverter/lib/phredDomain';

const REFERENCE_SCORES = [0, 10, 20, 30, 40, 50, 60];

export default function PhredScaleConverter() {
  const { t, i18n } = useTranslation('tools');
  const [mode, setMode] = useState('score');
  const [input, setInput] = useState('30');
  const metrics = useMemo(() => calculatePhredMetrics(mode, input), [mode, input]);
  const hasError = Boolean(input.trim()) && !metrics;

  const selectMode = (nextMode) => {
    if (metrics) {
      setInput(nextMode === 'score'
        ? formatPhredScore(metrics.score)
        : formatProbability(metrics.errorProbability));
    } else {
      setInput('');
    }
    setMode(nextMode);
  };

  return (
    <Card id="tool-phred" variant="tool" size="wide" className="max-w-[920px]">
      <ToolHeader title={t('tool-phred.title')} />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-app/70 p-4">
        <div className="flex w-full rounded-md border border-border bg-card p-1" role="tablist" aria-label={t('tool-phred.ui.inputTypeAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'score'}
            onClick={() => selectMode('score')}
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
            onClick={() => selectMode('probability')}
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
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'phred-error' : 'phred-formula'}
            className={`w-full rounded-lg border bg-card px-4 py-3 font-mono text-lg font-semibold text-text-main outline-none transition-all focus:ring-2 ${
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                : 'border-border hover:border-border-hover focus:border-accent focus:ring-focus'
            }`}
          />
          {hasError ? (
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
            [t('tool-phred.ui.callAccuracy'), metrics ? `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(metrics.accuracy * 100)}%` : '—'],
            [t('tool-phred.ui.expectedFrequency'), metrics ? t('tool-phred.ui.oneIn', { count: Math.max(1, Math.round(metrics.oneIn)).toLocaleString(i18n.language) }) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-accent/15 bg-accent-light p-3">
              <span className="block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">{label}</span>
              <strong className="mt-1 block break-all font-mono text-lg text-accent">{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="phred-reference-title">
        <div>
          <h3 id="phred-reference-title" className="text-sm font-bold text-text-main">{t('tool-phred.ui.referenceTitle')}</h3>
          <p className="text-xs text-text-muted">{t('tool-phred.ui.referenceDescription')}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="bg-app text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">Q</th>
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
                          setInput(String(score));
                        }}
                        className="w-full px-3 py-2 text-left font-mono font-extrabold text-accent"
                        aria-label={t('tool-phred.ui.useScoreAria', { score })}
                      >
                        {score}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono">{formatProbability(row.errorProbability)}</td>
                    <td className="px-3 py-2">{(row.accuracy * 100).toFixed(score === 0 ? 0 : Math.min(6, score / 10 + 1))}%</td>
                    <td className="px-3 py-2">{t('tool-phred.ui.oneIn', { count: Math.max(1, Math.round(row.oneIn)).toLocaleString(i18n.language) })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted">
          {t('tool-phred.ui.note')}
        </p>
      </section>
    </Card>
  );
}
