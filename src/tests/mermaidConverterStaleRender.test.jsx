import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n/index.js';

const domain = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  renderMermaidToSvg: vi.fn(),
  svgToPngBlob: vi.fn(),
}));

vi.mock('../components/MermaidConverter/lib/mermaidDomain.js', () => ({
  MERMAID_SOURCE_LIMIT: 100_000,
  PNG_SCALES: [1, 2, 3],
  downloadBlob: domain.downloadBlob,
  normalizeMermaidFilename: (value, extension) => `${String(value).replace(/\.(?:mmd|svg|png)$/i, '')}.${extension}`,
  renderMermaidToSvg: domain.renderMermaidToSvg,
  svgToPngBlob: domain.svgToPngBlob,
}));

import MermaidConverter from '../components/MermaidConverter.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let pendingRenders;

function setTextareaValue(element, value) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function setInputValue(element, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function findButton(label) {
  return [...container.querySelectorAll('button')]
    .find((button) => button.textContent.trim() === label);
}

async function runDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
}

async function resolveRender(index, label) {
  await act(async () => {
    const pending = pendingRenders[index];
    pending.resolve({
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><text>${label}</text></svg>`,
      width: 100,
      height: 50,
      background: pending.options.background,
    });
    await Promise.resolve();
  });
}

beforeEach(async () => {
  vi.useFakeTimers();
  pendingRenders = [];
  domain.downloadBlob.mockReset();
  domain.svgToPngBlob.mockReset();
  domain.renderMermaidToSvg.mockReset();
  domain.renderMermaidToSvg.mockImplementation((source, options) => new Promise((resolve, reject) => {
    pendingRenders.push({ source, options, resolve, reject });
  }));
  await i18n.changeLanguage('en-US');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MermaidConverter />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Mermaid converter stale render handling', () => {
  it('disables exports immediately and ignores superseded async renders', async () => {
    await runDebounce();
    expect(pendingRenders).toHaveLength(1);
    await resolveRender(0, 'initial-render');

    const downloadSvg = findButton('Download .svg');
    const editor = container.querySelector('textarea[aria-label="Mermaid source editor"]');
    expect(downloadSvg).toBeEnabled();
    expect(container).toHaveTextContent('initial-render');

    await act(async () => setTextareaValue(editor, 'flowchart LR\n  A --> B'));
    expect(downloadSvg).toBeDisabled();
    expect(container).not.toHaveTextContent('initial-render');

    await runDebounce();
    expect(pendingRenders).toHaveLength(2);
    await act(async () => setTextareaValue(editor, 'flowchart LR\n  B --> C'));
    await resolveRender(1, 'superseded-render');

    expect(downloadSvg).toBeDisabled();
    expect(container).not.toHaveTextContent('superseded-render');

    await runDebounce();
    expect(pendingRenders).toHaveLength(3);
    await resolveRender(2, 'current-render');

    expect(downloadSvg).toBeEnabled();
    expect(container).toHaveTextContent('current-render');
  });

  it('invalidates exports when the render background changes', async () => {
    await runDebounce();
    await resolveRender(0, 'solid-render');

    const downloadSvg = findButton('Download .svg');
    const background = container.querySelector('input[type="color"]');
    expect(downloadSvg).toBeEnabled();

    await act(async () => setInputValue(background, '#000000'));

    expect(downloadSvg).toBeDisabled();
    expect(container).not.toHaveTextContent('solid-render');
  });
});
