import React, { useState } from 'react';

export default function SlashesConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleConvert = (val) => {
    const newVal = val !== undefined ? val : input;
    setOutput(newVal.replace(/\\/g, '/'));
  };

  return (
    <article id="tool-slash" className="tool-card active">
      <h2>Slashes Converter</h2>
      <div className="form-group">
        <label htmlFor="slash-input">Input Path</label>
        <textarea
          id="slash-input"
          rows="3"
          placeholder="Paste a Windows path..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleConvert(e.target.value);
          }}
        />
      </div>
      <button
        id="slash-convert"
        type="button"
        className="btn-primary"
        onClick={() => handleConvert()}
      >
        Convert
      </button>
      <div className="form-group">
        <label htmlFor="slash-output">Output Path</label>
        <textarea
          id="slash-output"
          rows="3"
          readOnly
          value={output}
        />
      </div>
    </article>
  );
}
