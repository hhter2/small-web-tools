import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsciiConverter from '../components/AsciiConverter';
import BaseConverter from '../components/BaseConverter';
import SlashesConverter from '../components/SlashesConverter';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const clipboard = {
  readText: vi.fn(),
  writeText: vi.fn(),
};

let container;
let root;

beforeEach(() => {
  clipboard.readText.mockReset();
  clipboard.writeText.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('converter clipboard controls', () => {
  it('pastes into an auto-detect converter and copies its converted result', async () => {
    clipboard.readText.mockResolvedValue('C:\\Users\\name\\report.txt');
    clipboard.writeText.mockResolvedValue();
    await act(async () => {
      root.render(<SlashesConverter />);
    });

    const pasteButton = container.querySelector('[aria-label="Paste from clipboard"]');
    await act(async () => pasteButton.click());

    expect(container.querySelector('[aria-label="Source input"]')).toHaveValue('C:\\Users\\name\\report.txt');
    expect(pasteButton).toHaveTextContent('Pasted');
    expect(container.querySelector('[aria-label="Converted result"]')).toHaveValue('C:/Users/name/report.txt');

    const copyButton = container.querySelector('[aria-label="Copy converted result"]');
    await act(async () => copyButton.click());

    expect(clipboard.writeText).toHaveBeenCalledWith('C:/Users/name/report.txt');
    expect(copyButton).toHaveTextContent('Copied');
  });

  it.each([
    ['Slashes Converter', SlashesConverter],
    ['ASCII Converter', AsciiConverter],
  ])('keeps only automatic mode controls for %s', async (_title, Component) => {
    await act(async () => {
      root.render(<Component />);
    });

    const modeGroup = container.querySelector('[aria-label="Conversion Mode"]');
    expect(modeGroup).toHaveTextContent('Auto');
    expect(modeGroup).not.toHaveTextContent('Encode');
    expect(modeGroup).not.toHaveTextContent('Decode');
  });

  it('pastes into the Base Converter and exposes clipboard failures as retry actions', async () => {
    clipboard.readText.mockResolvedValue('255');
    clipboard.writeText.mockRejectedValue(new Error('Clipboard permission denied'));
    await act(async () => {
      root.render(<BaseConverter />);
    });

    const pasteButton = container.querySelector('[aria-label="Paste from clipboard"]');
    await act(async () => pasteButton.click());

    expect(container.querySelector('#base-input')).toHaveValue('255');
    expect(pasteButton).toHaveTextContent('Pasted');

    const copyButton = container.querySelector('[aria-label="Copy Hexadecimal value"]');
    await act(async () => copyButton.click());

    expect(container.querySelector('[aria-label="Retry copying Hexadecimal value"]')).toHaveTextContent('Retry');
    expect(clipboard.writeText).toHaveBeenCalledWith('FF');
  });
});
