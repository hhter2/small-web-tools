import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MarkdownPreviewer from '../components/MarkdownPreviewer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function setNativeValue(element, value) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: vi.fn().mockResolvedValue('```js\nconst answer = 42;\n```') },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MarkdownPreviewer />));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root.unmount());
  container.remove();
});

describe('Markdown Previewer issue 42', () => {
  it('renders highlighted fenced code with normalized language metadata', async () => {
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');
    await act(async () => pasteButton.click());

    const code = container.querySelector('pre code[data-language="javascript"]');
    expect(code).toHaveTextContent('const answer = 42;');
    expect(code.querySelector('.hljs-keyword')).toHaveTextContent('const');
  });

  it('opens an editable focused editor and preserves edits after closing', async () => {
    const openButtons = container.querySelectorAll('.fullscreen-preview-control');
    await act(async () => openButtons[0].click());

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    const focusedEditor = dialog.querySelector('textarea[aria-label="Markdown editor"]');
    expect(focusedEditor).toBeInTheDocument();

    await act(async () => setNativeValue(focusedEditor, '# Focused edit'));

    const closeButton = dialog.querySelector('button[aria-label="Close fullscreen preview"]');
    await act(async () => closeButton.click());
    expect(container.querySelector('textarea[aria-label="Markdown editor"]')).toHaveValue('# Focused edit');
  });

  it('opens the rendered preview in a modal and closes with Escape', async () => {
    const openButtons = container.querySelectorAll('.fullscreen-preview-control');
    await act(async () => openButtons[1].click());
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
