import React, { useMemo, useState } from 'react';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  calculatePhredMetrics,
  formatPhredScore,
  formatProbability,
} from './PhredScaleConverter/lib/phredDomain';

const REFERENCE_SCORES = [0, 10, 20, 30, 40, 50, 60];

export default function PhredScaleConverter() {
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
      <ToolHeader title="Mapping Quality & Phred Scale Converter" />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-app/70 p-4">
        <div className="flex w-full rounded-md border border-border bg-card p-1" role="tablist" aria-label="Phred input type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'score'}
            onClick={() => selectMode('score')}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
              mode === 'score' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Phred score (Q)
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
            Error probability (P)
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phred-input" className="text-sm font-bold text-text-main">
            {mode === 'score' ? 'Phred score (0–300)' : 'Error probability (greater than 0, up to 1)'}
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
                ? 'Enter a Phred score from 0 to 300.'
                : 'Enter an error probability greater than 0 and no greater than 1.'}
            </p>
          ) : (
            <p id="phred-formula" className="text-xs text-text-muted">
              Q = −10 × log₁₀(P), and P = 10^(−Q/10).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          {[
            ['Phred score', metrics ? formatPhredScore(metrics.score) : '—'],
            ['Error probability', metrics ? formatProbability(metrics.errorProbability) : '—'],
            ['Call accuracy', metrics ? `${(metrics.accuracy * 100).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}%` : '—'],
            ['Expected frequency', metrics ? `1 in ${Math.max(1, Math.round(metrics.oneIn)).toLocaleString()}` : '—'],
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
          <h3 id="phred-reference-title" className="text-sm font-bold text-text-main">Common Phred scores</h3>
          <p className="text-xs text-text-muted">Select a score to inspect its error rate and accuracy.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="bg-app text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">Q</th>
                <th className="px-3 py-2">Error probability</th>
                <th className="px-3 py-2">Accuracy</th>
                <th className="px-3 py-2">Expected errors</th>
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
                        aria-label={`Use Phred score ${score}`}
                      >
                        {score}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono">{formatProbability(row.errorProbability)}</td>
                    <td className="px-3 py-2">{(row.accuracy * 100).toFixed(score === 0 ? 0 : Math.min(6, score / 10 + 1))}%</td>
                    <td className="px-3 py-2">1 in {Math.max(1, Math.round(row.oneIn)).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted">
          Mapping quality estimates whether a read is placed incorrectly; base quality estimates whether an individual base call is incorrect. Both commonly use the same Phred transformation.
        </p>
      </section>
    </Card>
  );
}
