import { beforeEach, describe, expect, it } from 'vitest';
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  changeLocale,
  normalizeLocale,
  resolveInitialLocale,
} from '../i18n/index.js';
import { getToolRoute, localizeToolRoute, sortLocalizedTools } from '../toolRegistry.js';
import { createInstance } from 'i18next';

describe('locale runtime', () => {
  beforeEach(async () => {
    localStorage.clear();
    await changeLocale(DEFAULT_LOCALE);
  });

  it('normalizes supported locale variants and rejects unsupported locales', () => {
    expect(normalizeLocale('zh-Hant-TW')).toBe('zh-TW');
    expect(normalizeLocale('en-GB')).toBe('en-US');
    expect(normalizeLocale('fr-FR')).toBeNull();
  });

  it('prefers persistence, then browser language, then English', () => {
    const storage = { getItem: () => 'zh-TW' };
    expect(resolveInitialLocale({ storage, browserLanguages: ['en-US'] })).toBe('zh-TW');
    expect(resolveInitialLocale({ storage: { getItem: () => null }, browserLanguages: ['zh-Hant'] })).toBe('zh-TW');
    expect(resolveInitialLocale({ storage: { getItem: () => null }, browserLanguages: ['fr-FR'] })).toBe('en-US');
  });

  it('persists explicit changes and updates the document language', async () => {
    await changeLocale('zh-TW');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-TW');
    expect(document.documentElement.lang).toBe('zh-TW');
  });

  it('keeps English aliases searchable while Chinese is active', async () => {
    await changeLocale('zh-TW');
    const route = localizeToolRoute(getToolRoute('tool-wc'), i18n.t.bind(i18n));
    expect(route.title).toBe('字數統計');
    expect(route.searchMetadata).toContain('Word Counter');
  });

  it('sorts deterministically with the active locale', () => {
    const items = [{ name: '10' }, { name: '2' }, { name: 'A' }];
    expect(sortLocalizedTools(items, 'en-US').map((item) => item.name)).toEqual(['2', '10', 'A']);
  });

  it('falls back to English for a deliberately absent optional translation', async () => {
    const isolated = createInstance();
    await isolated.init({
      lng: 'zh-TW',
      fallbackLng: 'en-US',
      resources: {
        'en-US': { translation: { optional: 'English fallback' } },
        'zh-TW': { translation: {} },
      },
    });
    expect(isolated.t('optional')).toBe('English fallback');
  });
});
