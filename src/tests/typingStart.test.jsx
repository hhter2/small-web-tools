import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TypingSpeedTest from '../components/TypingSpeedTest.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<TypingSpeedTest />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Typing Speed Test start guidance', () => {
  it('provides an explicit start action and focuses the typing input', async () => {
    expect(container).toHaveTextContent('The timer starts with your first keystroke.');
    const startButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Start Test');

    await act(async () => startButton.click());

    expect(container.querySelector('[aria-label="Typing input"]')).toHaveFocus();
  });

  it('requires custom text before enabling the start action', async () => {
    const customButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Custom');
    await act(async () => customButton.click());

    const startButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Start Test');
    expect(startButton).toBeDisabled();
    expect(container).toHaveTextContent('Enter or upload custom template text before starting.');
  });
});
