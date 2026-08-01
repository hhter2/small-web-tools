import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SimpleHome from '../components/SimpleHome.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const essentialTools = [
  ['tool-wc', 'Word Counter'],
  ['tool-casing', 'Casing Switcher'],
  ['tool-url', 'URL Encoder & Decoder'],
  ['tool-date', 'Date & Time Counter'],
  ['tool-currency', 'Currency Converter'],
  ['tool-color', 'Color Converter'],
  ['tool-qrcode', 'QR Code Generator'],
  ['tool-password', 'Password Generator'],
].map(([id, name]) => ({
  id,
  name,
  desc: `${name} description`,
  category: 'utilities',
  icon: <svg aria-hidden="true" />,
}));

const tools = [
  ...essentialTools,
  {
    id: 'tool-code-preview',
    name: 'VS Code Preview',
    desc: 'Highlight source code.',
    category: 'developer',
    icon: <svg aria-hidden="true" />,
  },
];

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('SimpleHome', () => {
  it('shows exactly eight essential tools in a compact launcher', async () => {
    await act(async () => root.render(
      <SimpleHome tools={tools} onSelectTool={vi.fn()} />,
    ));

    expect(container).toHaveTextContent('Find a tool and get started');
    expect(container).toHaveTextContent('8 tools');
    expect(container.querySelectorAll('[aria-labelledby="simple-essentials-heading"] button'))
      .toHaveLength(8);
    expect(container).toHaveTextContent('Simple mode');
    expect(container).not.toHaveTextContent('Simple home');
    expect(container).not.toHaveTextContent('VS Code Preview');
    expect(container).not.toHaveTextContent('Choose your workspace');
  });

  it('searches every tool and opens advanced results in the simple workspace', async () => {
    const onSelectTool = vi.fn();
    await act(async () => root.render(
      <SimpleHome tools={tools} onSelectTool={onSelectTool} />,
    ));

    const search = container.querySelector('#simple-tool-search');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
        .set.call(search, 'code preview');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container).toHaveTextContent('VS Code Preview');
    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent.includes('VS Code Preview'))
        .click();
    });
    expect(onSelectTool).toHaveBeenCalledWith('tool-code-preview');
  });
});
