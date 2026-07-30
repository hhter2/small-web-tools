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
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('HomeGrid audience presentation', () => {
  it('keeps the complete categorized homepage without workspace controls', async () => {
    await act(async () => root.render(
      <HomeGrid tools={tools} onSelectTool={vi.fn()} modeId="all" />,
    ));

    expect(container).toHaveTextContent('Welcome to Small Web Tools!');
    expect(container).toHaveTextContent('Text');
    expect(container).toHaveTextContent('Calculators');
    expect(container).not.toHaveTextContent('Choose your workspace');
    expect(container).not.toHaveTextContent('Shareable mode address');
    expect(container.querySelector('#tool-mode')).toBeNull();
  });

  it('renders an audience as a flat recommended-tool workspace', async () => {
    await act(async () => root.render(
      <HomeGrid tools={tools} onSelectTool={vi.fn()} modeId="daily" />,
    ));

    expect(container).toHaveTextContent('Everyday essentials');
    expect(container).toHaveTextContent('Recommended for daily users');
    expect(container).toHaveTextContent('2 tools');
    expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent))
      .toEqual(['Word Counter', 'Date & Time Counter']);
  });
});
