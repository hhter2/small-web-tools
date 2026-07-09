import React, { useState } from 'react';
import Card from './ui/Card';
import FieldInput from './ui/FieldInput';
import ToolHeader from './ui/ToolHeader';

function countWords(text) {
  const regex = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+(?:[-''][^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+)*/gu;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export default function WordCounter() {
  const [text, setText] = useState('');

  const wordCount = countWords(text);
  const charCount = text.length;

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
      <div className="flex gap-4 w-full mt-2">
        <div className="flex-1 bg-accent-light border border-accent/10 rounded-xl p-4 flex flex-col gap-1.5 transition-all duration-300">
          <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-[0.05em]">Words</span>
          <span id="wc-words" className="text-[1.75rem] font-extrabold text-accent">{wordCount}</span>
        </div>
        <div className="flex-1 bg-accent-light border border-accent/10 rounded-xl p-4 flex flex-col gap-1.5 transition-all duration-300">
          <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-[0.05em]">Characters</span>
          <span id="wc-chars" className="text-[1.75rem] font-extrabold text-accent">{charCount}</span>
        </div>
      </div>
      <p className="text-sm text-text-muted">Characters include spaces and line breaks.</p>
    </Card>
  );
}
