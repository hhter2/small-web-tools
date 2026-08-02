import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en-US/common.json';
import enNavigation from './locales/en-US/navigation.json';
import enTools from './locales/en-US/tools.json';
import enErrors from './locales/en-US/errors.json';
import zhCommon from './locales/zh-TW/common.json';
import zhNavigation from './locales/zh-TW/navigation.json';
import zhTools from './locales/zh-TW/tools.json';
import zhErrors from './locales/zh-TW/errors.json';

export const DEFAULT_LOCALE = 'en-US';
export const SUPPORTED_LOCALES = ['en-US', 'zh-TW'];
export const LOCALE_STORAGE_KEY = 'small-web-tools.locale';

export function normalizeLocale(locale) {
  if (typeof locale !== 'string') return null;
  const normalized = locale.trim().replace('_', '-').toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hant' || normalized.startsWith('zh-hant-')) {
    return 'zh-TW';
  }
  if (normalized === 'en-us' || normalized === 'en' || normalized.startsWith('en-')) {
    return 'en-US';
  }
  return null;
}

/**
 * @param {{ storage?: Pick<Storage, 'getItem'>, browserLanguages?: string[] }} [options]
 */
export function resolveInitialLocale({ storage, browserLanguages } = {}) {
  try {
    const persisted = normalizeLocale(storage?.getItem(LOCALE_STORAGE_KEY));
    if (persisted) return persisted;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  const candidates = browserLanguages ?? (typeof navigator !== 'undefined'
    ? navigator.languages?.length ? navigator.languages : [navigator.language]
    : []);
  for (const candidate of candidates ?? []) {
    const supported = normalizeLocale(candidate);
    if (supported) return supported;
  }
  return DEFAULT_LOCALE;
}

const initialLocale = resolveInitialLocale({
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
});

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { common: enCommon, navigation: enNavigation, tools: enTools, errors: enErrors },
      'zh-TW': { common: zhCommon, navigation: zhNavigation, tools: zhTools, errors: zhErrors },
    },
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'common',
    ns: ['common', 'navigation', 'tools', 'errors'],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    initAsync: false,
  });

document.documentElement.lang = i18n.resolvedLanguage ?? initialLocale;

i18n.on('languageChanged', (locale) => {
  const supported = normalizeLocale(locale) ?? DEFAULT_LOCALE;
  document.documentElement.lang = supported;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, supported);
  } catch {
    // The active in-memory locale remains valid when persistence is blocked.
  }
});

export function changeLocale(locale) {
  return i18n.changeLanguage(normalizeLocale(locale) ?? DEFAULT_LOCALE);
}

export default i18n;
