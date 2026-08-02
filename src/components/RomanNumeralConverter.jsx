import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import { convertRomanInput } from './RomanNumeralConverter/lib/romanDomain';

const REFERENCE_VALUES = [
  [1, 'I'],
  [4, 'IV'],
  [5, 'V'],
  [9, 'IX'],
  [10, 'X'],
  [40, 'XL'],
  [50, 'L'],
  [90, 'XC'],
  [100, 'C'],
  [400, 'CD'],
  [500, 'D'],
  [900, 'CM'],
  [1000, 'M'],
];

const LABEL_KEYS = {
  'Decimal or Roman numeral': 'decimalOrRoman',
  'Converted value': 'convertedValue',
  'Decimal number': 'decimalNumber',
  'Roman numeral': 'romanNumeral',
};

const ERROR_KEYS = {
  'Enter a whole number from 1 to 3999.': 'decimalRange',
  'Enter a canonical Roman numeral using I, V, X, L, C, D, and M.': 'invalidRoman',
};

export default function RomanNumeralConverter() {
  const { t, i18n } = useTranslation('tools');
  const [input, setInput] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const result = useMemo(() => convertRomanInput(input), [input]);

  const updateInput = (value) => {
    setInput(value);
    setCopyState('idle');
  };

  const copyResult = async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <Card id="tool-roman" variant="tool" size="wide" className="max-w-[920px]">
      <ToolHeader title={t('tool-roman.title')} />

      <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-2">
        <div className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/70 px-4 py-2.5">
            <span className="text-sm font-bold text-text-main">{t(`tool-roman.ui.label.${LABEL_KEYS[result.inputLabel]}`)}</span>
            <button
              type="button"
              disabled={!input}
              onClick={() => updateInput('')}
              className="rounded-md px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-nav-hover-bg hover:text-text-main disabled:opacity-30"
            >
              {t('tool-roman.ui.clear')}
            </button>
          </div>
          <input
            id="roman-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(event) => updateInput(event.target.value)}
            placeholder="2026 or MMXXVI"
            aria-invalid={Boolean(result.error) || undefined}
            aria-describedby={result.error ? 'roman-error' : undefined}
            className="min-h-[92px] w-full border-0 bg-transparent px-4 py-5 font-mono text-xl font-semibold text-text-main outline-none placeholder:text-text-muted/45"
          />
          {result.error && (
            <div id="roman-error" role="alert" className="border-t border-border bg-red-500/10 px-4 py-2 text-xs text-red-500">
              {t(`tool-roman.ui.error.${ERROR_KEYS[result.error]}`)}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col bg-accent-light/20">
          <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-border bg-app/45 px-4 py-2.5">
            <span className="text-sm font-bold text-text-main">{t(`tool-roman.ui.label.${LABEL_KEYS[result.outputLabel]}`)}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!result.output}
              onClick={copyResult}
              aria-label={t(copyState === 'error' ? 'tool-roman.ui.retryCopyAria' : 'tool-roman.ui.copyAria')}
              className="min-w-[70px]"
            >
              {t(copyState === 'copied'
                ? 'tool-roman.ui.copied'
                : copyState === 'error'
                  ? 'tool-roman.ui.retry'
                  : 'tool-roman.ui.copy')}
            </Button>
          </div>
          <output
            id="roman-output"
            aria-live="polite"
            className="flex min-h-[92px] items-center break-all px-4 py-5 font-mono text-xl font-semibold text-text-main"
          >
            {result.output || '—'}
          </output>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="roman-reference-title">
        <div>
          <h3 id="roman-reference-title" className="text-sm font-bold text-text-main">{t('tool-roman.ui.referenceTitle')}</h3>
          <p className="text-xs text-text-muted">{t('tool-roman.ui.referenceDescription')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {REFERENCE_VALUES.map(([decimal, roman]) => (
            <button
              key={decimal}
              type="button"
              onClick={() => updateInput(String(decimal))}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-app px-3 py-2 text-left transition-colors hover:border-accent hover:bg-accent-light"
              aria-label={t('tool-roman.ui.convertAria', {
                decimal: decimal.toLocaleString(i18n.language), roman,
              })}
            >
              <span className="text-xs font-semibold text-text-muted">{decimal}</span>
              <span className="font-mono text-sm font-extrabold text-accent">{roman}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          {t('tool-roman.ui.note')}
        </p>
      </section>
    </Card>
  );
}
