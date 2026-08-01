import React, { useState } from 'react';
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

function calcReadingTime(wordCount) {
  if (wordCount === 0) return '0 min';
  const minutes = Math.ceil(wordCount / 200);
  return minutes <= 1 ? '< 1 min' : `~${minutes} min`;
}

export default function WordCounter() {
  const [text, setText] = useState('');

  const wordCount = countWords(text);
  const charCount = countGraphemes(text);
  const charNoSpacesCount = countGraphemesNoSpaces(text);
  const lineCount = countLines(text);
  const sentenceCount = countSentences(text);
  const readingTime = calcReadingTime(wordCount);

  return (
    <Card id="tool-wc" variant="tool">
      <ToolHeader title="Word & Character Counter" />
      <FieldInput
        as="textarea"
        id="wc-input"
        label="Text"
        rows={5}
        placeholder="Type or paste text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-2">
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">Words</span>
          <span id="wc-words" className="text-[1.5rem] font-extrabold text-accent">{wordCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">Characters</span>
          <span id="wc-chars" className="text-[1.5rem] font-extrabold text-accent">{charCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">Lines</span>
          <span id="wc-lines" className="text-[1.5rem] font-extrabold text-accent">{lineCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">No Spaces</span>
          <span id="wc-chars-nospace" className="text-[1.5rem] font-extrabold text-accent">{charNoSpacesCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">Sentences</span>
          <span id="wc-sentences" className="text-[1.5rem] font-extrabold text-accent">{sentenceCount}</span>
        </div>
        <div className="bg-accent-light border border-accent/10 rounded-xl p-3.5 flex flex-col gap-1 transition-all duration-300">
          <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-[0.05em]">Reading Time</span>
          <span id="wc-readingtime" className="text-[1.5rem] font-extrabold text-accent">{readingTime}</span>
        </div>
      </div>
      <p className="text-sm text-text-muted">Character count includes perceived Unicode grapheme clusters (emojis & combining marks).</p>
    </Card>
  );
}
