import React, { useState } from 'react';

function countWords(text) {
  const regex = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+(?:[-'’][^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\p{P}\p{S}]+)*/gu;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export default function WordCounter() {
  const [text, setText] = useState('');

  const wordCount = countWords(text);
  const charCount = text.length;

  return (
    <article id="tool-wc" className="tool-card active">
      <h2>Word &amp; Character Counter</h2>
      <div className="form-group">
        <label htmlFor="wc-input">Text</label>
        <textarea
          id="wc-input"
          rows="5"
          placeholder="Type or paste text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="row count-results">
        <div className="result-box">
          <span className="result-label">Words</span>
          <span className="result-val" id="wc-words">{wordCount}</span>
        </div>
        <div className="result-box">
          <span className="result-label">Characters</span>
          <span className="result-val" id="wc-chars">{charCount}</span>
        </div>
      </div>
      <p className="small note">Characters include spaces and line breaks.</p>
    </article>
  );
}
