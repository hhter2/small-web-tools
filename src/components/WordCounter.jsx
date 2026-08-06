import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

function countWords(text) {
  const regex = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+(?:[-''][^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+)*/gu;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function countGraphemes(text) {
  if (!text) return 0;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      count++;
    }
    return count;
  }
  return [...text].length;
}

function countGraphemesNoSpaces(text) {
  if (!text) return 0;
  const noSpaces = text.replace(/\s+/g, '');
  return countGraphemes(noSpaces);
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function countSentences(text) {
  if (!text.trim()) return 0;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    let count = 0;
    for (const segment of segmenter.segment(text)) {
      if (segment.segment.trim()) count++;
    }
    return count;
  }
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : 1;
}

export function calculateReadingMinutes(text) {
  const cjkCount = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? []).length;
  const nonCjkText = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ');
  const latinWordCount = countWords(nonCjkText);
  return (cjkCount / 500) + (latinWordCount / 200);
}

export default function WordCounter() {
  const { t, i18n } = useTranslation('tools');
  const [text, setText] = useState('');

  const wordCount = countWords(text);
  const charCount = countGraphemes(text);
  const charNoSpacesCount = countGraphemesNoSpaces(text);
  const lineCount = countLines(text);
  const sentenceCount = countSentences(text);
  const readingMinutes = calculateReadingMinutes(text);
  const roundedMinutes = Math.ceil(readingMinutes);
  const readingTime = readingMinutes === 0
    ? t('tool-wc.ui.zeroMinutes')
    : readingMinutes <= 1
      ? t('tool-wc.ui.underMinute')
      : t('tool-wc.ui.minutes', { count: new Intl.NumberFormat(i18n.resolvedLanguage).format(roundedMinutes) });

  return (
    <Card id="tool-wc" variant="tool">
      <ToolHeader title={t('tool-wc.ui.heading')} />
      <FieldInput
        as="textarea"
        id="wc-input"
        label={t('tool-wc.ui.text')}
        rows={5}
        placeholder={t('tool-wc.ui.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-2">
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.words')}</span>
          <span id="wc-words" className="text-[1.5rem] font-extrabold text-accent">{wordCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.characters')}</span>
          <span id="wc-chars" className="text-[1.5rem] font-extrabold text-accent">{charCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.lines')}</span>
          <span id="wc-lines" className="text-[1.5rem] font-extrabold text-accent">{lineCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.noSpaces')}</span>
          <span id="wc-chars-nospace" className="text-[1.5rem] font-extrabold text-accent">{charNoSpacesCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.sentences')}</span>
          <span id="wc-sentences" className="text-[1.5rem] font-extrabold text-accent">{sentenceCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">{t('tool-wc.ui.readingTime')}</span>
          <span id="wc-readingtime" className="text-[1.5rem] font-extrabold text-accent">{readingTime}</span>
        </div>
      </div>
      <p className="text-sm text-text-muted">{t('tool-wc.ui.graphemeHint')}</p>
    </Card>
  );
}
