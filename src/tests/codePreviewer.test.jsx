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
    value: { readText: vi.fn().mockResolvedValue('echo "hello"') },
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
  it('pastes and highlights code with line numbers', async () => {
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');
    await act(async () => pasteButton.click());

    expect(container.querySelector('[aria-label="Code editor"]')).toHaveValue('echo "hello"');
    expect(container.querySelector('[aria-label="Highlighted code preview"] code')).toHaveTextContent('echo "hello"');
    expect(container).toHaveTextContent('1 line');
  });

  it('defaults the Terminal preview to Bash without restricting later language changes', async () => {
    const selects = container.querySelectorAll('select');
    await act(async () => setNativeValue(selects[1], 'terminal'));
    expect(selects[0]).toHaveValue('bash');
    expect(container.querySelector('[aria-label="Highlighted code preview"]')).toHaveAttribute('data-preview-type', 'terminal');

    await act(async () => setNativeValue(selects[0], 'python'));
    expect(selects[0]).toHaveValue('python');
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
