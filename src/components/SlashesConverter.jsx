import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';

export default function SlashesConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleConvert = (val) => {
    const newVal = val !== undefined ? val : input;
    setOutput(newVal.replace(/\\/g, '/'));
  };

  return (
    <Card id="tool-slash" variant="tool" size="compact">
      <ToolHeader title="Slashes Converter" />
      <FieldInput
        as="textarea"
        id="slash-input"
        label="Input Path"
        rows={3}
        placeholder="Paste a Windows path..."
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          handleConvert(e.target.value);
        }}
      />
      <Button
        id="slash-convert"
        type="button"
        variant="primary"
        onClick={() => handleConvert()}
      >
        Convert
      </Button>
      <FieldInput
        as="textarea"
        id="slash-output"
        label="Output Path"
        rows={3}
        readOnly
        value={output}
      />
    </Card>
  );
}
