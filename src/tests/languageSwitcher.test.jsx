import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import LanguageSwitcherProvider from '../components/LanguageSwitcherProvider.jsx';
import { changeLocale } from '../i18n/index.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function pressKey(element, key) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

beforeEach(async () => {
  await changeLocale('en-US');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await changeLocale('en-US');
});

describe('LanguageSwitcher', () => {
  it('moves focus into the menu and supports roving keyboard navigation', async () => {
    await act(async () => root.render(<LanguageSwitcher />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => trigger.click());
    const items = [...container.querySelectorAll('[role="menuitemradio"]')];

    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]);

    await act(async () => pressKey(items[0], 'ArrowDown'));
    expect(document.activeElement).toBe(items[1]);

    await act(async () => pressKey(items[1], 'Home'));
    expect(document.activeElement).toBe(items[0]);

    await act(async () => pressKey(items[0], 'End'));
    expect(document.activeElement).toBe(items[1]);

    await act(async () => pressKey(items[1], 'Escape'));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('selects a locale from the mobile control and restores trigger focus', async () => {
    await act(async () => root.render(<LanguageSwitcher variant="mobile" />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => pressKey(trigger, 'ArrowDown'));
    const traditionalChinese = [...container.querySelectorAll('[role="menuitemradio"]')][1];

    await act(async () => traditionalChinese.click());

    expect(document.documentElement.lang).toBe('zh-TW');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside pointer interaction', async () => {
    await act(async () => root.render(<LanguageSwitcher />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => trigger.click());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('LanguageSwitcherProvider', () => {
  it('owns both responsive controls and retires the legacy desktop control', async () => {
    await act(async () => root.render(
      <LanguageSwitcherProvider>
        <div>
          <header id="mobile-header">
            <button type="button">Menu</button>
            <span>Small Web Tools</span>
            <button type="button" data-simple-mode>Simple</button>
          </header>
          <header>
            <div className="controls">
              <div className="relative">
                <input className="header-search-input" />
              </div>
              <div data-legacy-language>
                <button type="button" aria-haspopup="menu">Legacy language</button>
              </div>
              <button type="button">Theme</button>
            </div>
          </header>
        </div>
      </LanguageSwitcherProvider>,
    ));

    expect(container.querySelectorAll('[data-language-switcher]')).toHaveLength(2);
    expect(container.querySelector('[data-language-switcher="mobile"]'))
      .toBe(document.querySelector('[data-language-switcher-mount="mobile"]')?.firstElementChild);
    expect(container.querySelector('[data-legacy-language]')).toHaveStyle({ display: 'none' });
  });
});
