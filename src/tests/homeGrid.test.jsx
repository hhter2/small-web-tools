import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeGrid from '../components/HomeGrid.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const tools = [
  {
    id: 'tool-wc',
    name: 'Word Counter',
    desc: 'Count words.',
    category: 'text',
    icon: <svg aria-hidden="true" />,
    subGroup: null,
  },
  {
    id: 'tool-date',
    name: 'Date & Time Counter',
    desc: 'Compare dates and times.',
    category: 'utilities',
    icon: <svg aria-hidden="true" />,
    subGroup: 'Calculators',
  },
];

let container;
let root;

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root.unmount());
  container.remove();
});

describe('HomeGrid workspace modes', () => {
  it('renders Simple mode as a flat essential-tool workspace', async () => {
    await act(async () => root.render(
      <HomeGrid
        tools={tools}
        onSelectTool={vi.fn()}
        modeId="simple"
        modeAddress="https://tools.example/home/simple"
        onSelectMode={vi.fn()}
      />,
    ));

    expect(container).toHaveTextContent('Essential tools');
    expect(container).toHaveTextContent('Frequently used tools');
    expect(container).toHaveTextContent('2 tools');
    expect(container.querySelector('#tool-mode')).toHaveValue('simple');
    expect(container.querySelector('#tool-mode-address'))
      .toHaveValue('https://tools.example/home/simple');
    expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent))
      .toEqual(['Word Counter', 'Date & Time Counter']);
  });

  it('redirects mode selection and copies the complete address', async () => {
    const onSelectMode = vi.fn();
    await act(async () => root.render(
      <HomeGrid
        tools={tools}
        onSelectTool={vi.fn()}
        modeId="daily"
        modeAddress="https://tools.example/home/daily"
        onSelectMode={onSelectMode}
      />,
    ));

    const selector = container.querySelector('#tool-mode');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(selector, 'developer');
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onSelectMode).toHaveBeenCalledWith('developer');

    const copyButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Copy address');
    await act(async () => copyButton.click());
    expect(navigator.clipboard.writeText)
      .toHaveBeenCalledWith('https://tools.example/home/daily');
    expect(container).toHaveTextContent('Mode address copied.');
  });
});
