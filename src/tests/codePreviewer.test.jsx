import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CodePreviewer from '../components/CodePreviewer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLSelectElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

beforeEach(async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      readText: vi.fn().mockResolvedValue('echo "hello"'),
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<CodePreviewer />));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root.unmount());
  container.remove();
});

describe('Code Previewer', () => {
  it('edits and highlights code in one VS Code-style surface with line numbers', async () => {
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');
    await act(async () => pasteButton.click());

    expect(container.querySelector('[aria-label="Code editor"]')).toHaveValue('echo "hello"');
    expect(container.querySelector('[aria-label="VS Code editor"] code')).toHaveTextContent('echo "hello"');
    expect(container.querySelectorAll('textarea')).toHaveLength(1);
    expect(container).not.toHaveTextContent('Live preview');
    expect(container).toHaveTextContent('1 line');
  });

  it('copies the complete code to the clipboard', async () => {
    const editor = container.querySelector('[aria-label="Code editor"]');
    await act(async () => setNativeValue(editor, 'const copied = true;\nconsole.log(copied);'));
    const copyButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Copy Code');

    await act(async () => copyButton.click());

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const copied = true;\nconsole.log(copied);');
    expect(container).toHaveTextContent('Copied code to the clipboard.');
  });

  it('applies simple Light and Dark appearance presets', async () => {
    const editor = container.querySelector('[aria-label="VS Code editor"]');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const appearanceButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Appearance');
    await act(async () => appearanceButton.click());

    const lightButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Light');
    await act(async () => lightButton.click());
    expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    expect(editor).toHaveStyle({ backgroundColor: '#FFFFFF', color: '#1A1C1F' });

    const darkButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Dark');
    await act(async () => darkButton.click());
    expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    expect(editor).toHaveStyle({ backgroundColor: '#181818', color: '#FFFFFF' });
  });

  it('renders C++ preprocessor and keyword tokens in the editable surface', async () => {
    const language = container.querySelector('#code-language');
    const editor = container.querySelector('[aria-label="Code editor"]');
    await act(async () => {
      setNativeValue(language, 'cpp');
      setNativeValue(editor, '#include <iostream>\nint main() { return 0; }');
    });

    const highlightedCode = container.querySelector('[aria-label="VS Code editor"] code');
    expect(highlightedCode.querySelector('.hljs-meta')).toHaveTextContent('#include <iostream>');
    expect([...highlightedCode.querySelectorAll('.hljs-keyword')].map((token) => token.textContent))
      .toContain('return');
  });

  it('downloads source with a normalized extension', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:code');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const editor = container.querySelector('[aria-label="Code editor"]');
    await act(async () => setNativeValue(editor, 'const ready = true;'));

    const button = [...container.querySelectorAll('button')]
      .find((item) => item.textContent.trim() === 'Download Source');
    await act(async () => button.click());

    expect(click).toHaveBeenCalledOnce();
    expect(container).toHaveTextContent('Downloaded snippet.js.');
  });
});
