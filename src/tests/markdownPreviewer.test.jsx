import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MarkdownPreviewer from '../components/MarkdownPreviewer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: vi.fn().mockResolvedValue('# Clipboard title') },
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

describe('Markdown Previewer', () => {
  it('pastes Markdown and renders a live preview', async () => {
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');

    await act(async () => pasteButton.click());

    expect(container.querySelector('[aria-label="Markdown editor"]')).toHaveValue('# Clipboard title');
    expect(container.querySelector('h1')).toHaveTextContent('Clipboard title');
    expect(container).toHaveTextContent('Pasted Markdown from the clipboard.');
  });

  it('applies simple formatting to the selected editor text', async () => {
    navigator.clipboard.readText.mockResolvedValue('selected');
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');
    await act(async () => pasteButton.click());

    const editor = container.querySelector('[aria-label="Markdown editor"]');
    editor.setSelectionRange(0, 8);

    const boldButton = container.querySelector('[aria-label="Format as Bold"]');
    await act(async () => boldButton.click());

    expect(editor).toHaveValue('**selected**');
    expect(container.querySelector('strong')).toHaveTextContent('selected');
  });

  it('loads a local Markdown file into the editor and preview', async () => {
    const file = new File(['# Uploaded title'], 'notes.markdown', { type: 'text/markdown' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: vi.fn().mockResolvedValue('# Uploaded title'),
    });
    const input = container.querySelector('[aria-label="Upload Markdown file"]');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));

    expect(container.querySelector('[aria-label="Markdown editor"]')).toHaveValue('# Uploaded title');
    expect(container.querySelector('h1')).toHaveTextContent('Uploaded title');
    expect(container.querySelector('[aria-label="Download filename"]')).toHaveValue('notes.md');
  });

  it('downloads the current Markdown using a normalized filename', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:markdown');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    navigator.clipboard.readText.mockResolvedValue('# Saved');
    const pasteButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Paste');
    await act(async () => pasteButton.click());
    const filename = container.querySelector('[aria-label="Download filename"]');
    await act(async () => {
      setNativeValue(filename, 'draft.markdown');
    });

    const downloadButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Download .md');
    await act(async () => downloadButton.click());

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(container).toHaveTextContent('Downloaded draft.md.');
  });
});
