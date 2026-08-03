import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';
import ToggleSwitch from './ui/ToggleSwitch';

function countWords(text) {
  if (!text) return 0;
  const regex = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+(?:[-'’][^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+)*/gu;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function swapCase(str) {
  return str
    .split('')
    .map((c) => {
      const low = c.toLowerCase();
      const up = c.toUpperCase();
      return c === low ? up : low;
    })
    .join('');
}

function toTitleCase(str) {
  return str.replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}

function toSentenceCase(str, preserveCapitals) {
  let targetStr = str;
  if (!preserveCapitals) {
    targetStr = str.toLowerCase();
  }
  return targetStr.replace(/(?:^|[.!?]\s+)(\p{L})/gu, (match, p1) => {
    return match.replace(p1, p1.toUpperCase());
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeSpecificTerms(str, specificTerms, specificTermsMode) {
  const terms = specificTerms
    .split(/,|\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return str;

  let result = str;
  for (const term of terms) {
    const escaped = escapeRegExp(term);
    const startBoundary = /^\w/.test(term) ? '\\b' : '';
    const endBoundary = /\w$/.test(term) ? '\\b' : '';
    const regex = new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'giu');

    result = result.replace(regex, (match) => {
      const lowerMatch = match.toLowerCase();
      if (specificTermsMode === 'first') {
        return lowerMatch.replace(/\p{L}/u, (c) => c.toUpperCase());
      } else {
        return lowerMatch.replace(/\b\p{L}/gu, (char) => char.toUpperCase());
      }
    });
  }
  return result;
}

export default function CasingSwitcher() {
  const { t, i18n } = useTranslation(['tools', 'common']);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Switch states
  const [enableCaseChange, setEnableCaseChange] = useState(false);
  const [caseChangeMode, setCaseChangeMode] = useState('invert'); // 'invert', 'upper', 'lower'

  const [enableSentenceCase, setEnableSentenceCase] = useState(false);
  const [preserveCapitals, setPreserveCapitals] = useState(true);

  const [enableTitleCase, setEnableTitleCase] = useState(false);

  const [enableSpecificTerms, setEnableSpecificTerms] = useState(false);
  const [specificTerms, setSpecificTerms] = useState('react, javascript, node js');
  const [specificTermsMode, setSpecificTermsMode] = useState('all'); // 'first', 'all'

  // Exclude Specific Words state
  const [enableExcludeWords, setEnableExcludeWords] = useState(false);
  const [excludeWords, setExcludeWords] = useState('and, or, but, to, the, a, an, in, of, for, with, I');

  // Run pipeline whenever input or options change
  useEffect(() => {
    let result = input;

    // 1. All Case Change (if enabled)
    if (enableCaseChange) {
      if (caseChangeMode === 'invert') {
        result = swapCase(result);
      } else if (caseChangeMode === 'upper') {
        result = result.toUpperCase();
      } else if (caseChangeMode === 'lower') {
        result = result.toLowerCase();
      }
    }

    // 2. Title Case / Capitalize Each Word (if enabled)
    if (enableTitleCase) {
      result = toTitleCase(result);
    }

    // 3. Sentence Case (if enabled)
    if (enableSentenceCase) {
      result = toSentenceCase(result, preserveCapitals);
    }

    // 4. Specific Terms (if enabled)
    if (enableSpecificTerms) {
      result = capitalizeSpecificTerms(result, specificTerms, specificTermsMode);
    }

    // Post-processing: Restore original case for excluded words globally
    if (enableExcludeWords && excludeWords.trim()) {
      const excludedSet = new Set(
        excludeWords
          .split(/,|\n/)
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean)
      );

      if (excludedSet.size > 0) {
        const tokensInput = input.split(/(\p{L}+(?:['’]\p{L}+)*)/gu);
        const tokensDraft = result.split(/(\p{L}+(?:['’]\p{L}+)*)/gu);

        const finalTokens = tokensDraft.map((token, index) => {
          const originalToken = tokensInput[index];
          if (!token || !originalToken) return token;

          // Check if it's a word token
          if (/\p{L}/u.test(token)) {
            if (excludedSet.has(originalToken.toLowerCase())) {
              return originalToken; // Keep the original casing
            }
          }
          return token;
        });

        result = finalTokens.join('');
      }
    }

    setOutput(result);
  }, [
    input,
    enableCaseChange,
    caseChangeMode,
    enableSentenceCase,
    preserveCapitals,
    enableTitleCase,
    enableSpecificTerms,
    specificTerms,
    specificTermsMode,
    enableExcludeWords,
    excludeWords,
  ]);

  const handleClear = () => {
    setInput('');
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card id="tool-casing" variant="tool" size="wide">
      <ToolHeader 
        title={t('tools:tool-casing.ui.heading')}
      />
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Column: Text Areas */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 w-full">
            <FieldInput
              id="casing-input"
              as="textarea"
              rows={3}
              label={t('tools:tool-casing.ui.input')}
              placeholder={t('tools:tool-casing.ui.inputPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{t('tools:tool-casing.ui.words', { count: new Intl.NumberFormat(i18n.resolvedLanguage).format(countWords(input)) })}</span>
              <span>{t('tools:tool-casing.ui.characters', { count: new Intl.NumberFormat(i18n.resolvedLanguage).format(input.length) })}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-1 mb-1">
            <Button
              id="casing-clear-btn"
              variant="secondary"
              size="sm"
              onClick={handleClear}
              disabled={!input}
              title={t('tools:tool-casing.ui.clearTitle')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span>{t('common:actions.clear')}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <FieldInput
              id="casing-output"
              as="textarea"
              rows={3}
              readOnly
              label={t('tools:tool-casing.ui.output')}
              placeholder={t('tools:tool-casing.ui.outputPlaceholder')}
              value={output}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{t('tools:tool-casing.ui.words', { count: new Intl.NumberFormat(i18n.resolvedLanguage).format(countWords(output)) })}</span>
              <span>{t('tools:tool-casing.ui.characters', { count: new Intl.NumberFormat(i18n.resolvedLanguage).format(output.length) })}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-1 mb-1">
            <Button
              id="casing-copy-btn"
              variant={copied ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleCopy}
              disabled={!output}
              title={t('tools:tool-casing.ui.copyTitle')}
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{t('common:actions.copied')}</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>{t('tools:tool-casing.ui.copyOutput')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Options Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">{t('tools:tool-casing.ui.controls')}</h3>
            
            {/* Global Setting: Exclude Specific Words */}
            <div className="border-b border-border pb-4">
              <ToggleSwitch
                id="enable-exclude-words"
                checked={enableExcludeWords}
                onChange={(e) => setEnableExcludeWords(e.target.checked)}
                label={t('tools:tool-casing.ui.exclude')}
                labelClassName="font-semibold text-accent"
              />

              {enableExcludeWords && (
                <div className="mt-2.5 pl-14 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 w-full">
                    <FieldInput
                      type="text"
                      id="exclude-words-input"
                      value={excludeWords}
                      onChange={(e) => setExcludeWords(e.target.value)}
                      placeholder={t('tools:tool-casing.ui.excludePlaceholder')}
                      label={t('tools:tool-casing.ui.excludeLabel')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mode 1: Case Change */}
            <div className="border-b border-border pb-4">
              <ToggleSwitch
                id="enable-case-change"
                checked={enableCaseChange}
                onChange={(e) => setEnableCaseChange(e.target.checked)}
                label={t('tools:tool-casing.ui.allCase')}
              />

              {enableCaseChange && (
                <div className="mt-2.5 pl-14 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 items-start radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="caseMode"
                        value="invert"
                        checked={caseChangeMode === 'invert'}
                        onChange={() => setCaseChangeMode('invert')}
                      />
                      {t('tools:tool-casing.ui.invert')}
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="caseMode"
                        value="upper"
                        checked={caseChangeMode === 'upper'}
                        onChange={() => setCaseChangeMode('upper')}
                      />
                      {t('tools:tool-casing.ui.uppercase')}
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="caseMode"
                        value="lower"
                        checked={caseChangeMode === 'lower'}
                        onChange={() => setCaseChangeMode('lower')}
                      />
                      {t('tools:tool-casing.ui.lowercase')}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Mode 4: Title Case */}
            <div className="border-b border-border pb-4">
              <ToggleSwitch
                id="enable-title-case"
                checked={enableTitleCase}
                onChange={(e) => setEnableTitleCase(e.target.checked)}
                label={t('tools:tool-casing.ui.titleCase')}
              />
            </div>

            {/* Mode 2: Sentence Case */}
            <div className="border-b border-border pb-4">
              <ToggleSwitch
                id="enable-sentence-case"
                checked={enableSentenceCase}
                onChange={(e) => setEnableSentenceCase(e.target.checked)}
                label={t('tools:tool-casing.ui.sentenceCase')}
              />

              {enableSentenceCase && (
                <div className="mt-2.5 pl-14 flex flex-col gap-2">
                  <div className="checkbox-wrapper">
                    <label htmlFor="preserve-capitals" className="checkbox-label text-[0.85rem]">
                      <input
                        id="preserve-capitals"
                        type="checkbox"
                        checked={preserveCapitals}
                        onChange={(e) => setPreserveCapitals(e.target.checked)}
                      />
                      {t('tools:tool-casing.ui.preserve')}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Mode 3: Specific Terms */}
            <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
              <ToggleSwitch
                id="enable-specific-terms"
                checked={enableSpecificTerms}
                onChange={(e) => setEnableSpecificTerms(e.target.checked)}
                label={t('tools:tool-casing.ui.specific')}
              />

              {enableSpecificTerms && (
                <div className="mt-2.5 pl-14 flex flex-col gap-2.5">
                  <div className="flex flex-col gap-2 w-full">
                    <FieldInput
                      type="text"
                      id="specific-terms-input"
                      value={specificTerms}
                      onChange={(e) => setExcludeWords(e.target.value)}
                      placeholder={t('tools:tool-casing.ui.termsPlaceholder')}
                      label={t('tools:tool-casing.ui.termsLabel')}
                    />
                  </div>
                  <div className="flex flex-col gap-2 items-start radio-group text-[0.85rem]">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="termsMode"
                        value="first"
                        checked={specificTermsMode === 'first'}
                        onChange={() => setSpecificTermsMode('first')}
                      />
                      {t('tools:tool-casing.ui.firstTerm')}
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="termsMode"
                        value="all"
                        checked={specificTermsMode === 'all'}
                        onChange={() => setSpecificTermsMode('all')}
                      />
                      {t('tools:tool-casing.ui.allTerms')}
                    </label>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </Card>
  );
}
