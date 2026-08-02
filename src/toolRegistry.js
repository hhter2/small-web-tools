import React from 'react';
import i18n from './i18n/index.js';

function route(id, category, loader, options = {}) {
  return {
    id, aliases: [], category, subGroupKey: null, iconKey: id,
    componentProps: {}, staticLayout: false, navigationVisible: true,
    ...options, loader,
  };
}

const definitions = [
  route('tool-home', 'home', () => import('./components/HomeGrid.jsx'), { navigationVisible: false }),
  route('tool-slash', 'developer', () => import('./components/SlashesConverter.jsx')),
  route('tool-wc', 'text', () => import('./components/WordCounter.jsx')),
  route('tool-casing', 'text', () => import('./components/CasingSwitcher.jsx'), { staticLayout: true }),
  route('tool-typing', 'text', () => import('./components/TypingSpeedTest.jsx')),
  route('tool-color', 'media', () => import('./components/ColorConverter.jsx'), { staticLayout: true }),
  route('tool-ascii', 'developer', () => import('./components/AsciiConverter.jsx'), { staticLayout: true }),
  route('tool-unicode', 'developer', () => import('./components/UnicodeConverter.jsx'), { staticLayout: true }),
  route('tool-url', 'developer', () => import('./components/UrlEncoderDecoder.jsx')),
  route('tool-markdown', 'developer', () => import('./components/MarkdownPreviewer.jsx')),
  route('tool-code-preview', 'developer', () => import('./components/CodePreviewer.jsx')),
  route('tool-fontextractor', 'developer', () => import('./components/WebsiteFontExtractor.jsx'), { staticLayout: true }),
  route('tool-base', 'developer', () => import('./components/BaseConverter.jsx'), { staticLayout: true }),
  route('tool-folder-analyzer', 'developer', () => import('./components/FolderAnalyzer.jsx')),
  route('tool-dna', 'bioinfo', () => import('./components/DnaConverter.jsx'), { staticLayout: true }),
  route('tool-codon', 'bioinfo', () => import('./components/CodonTable.jsx')),
  route('tool-phred', 'bioinfo', () => import('./components/PhredScaleConverter.jsx')),
  route('tool-iplookup', 'network', () => import('./components/IpLookup.jsx')),
  route('tool-speedtest', 'network', () => import('./components/NetworkSpeedTest.jsx'), { staticLayout: true }),
  route('tool-imgmeta', 'media', () => import('./components/ImgMeta.jsx')),
  route('tool-docmeta', 'media', () => import('./components/DocMeta.jsx'), { aliases: ['tool-officemeta'] }),
  route('tool-audiometa', 'media', () => import('./components/AudioMeta.jsx')),
  route('tool-videometa', 'media', () => import('./components/VideoMeta.jsx')),
  route('tool-mediasplit', 'media', () => import('./components/MediaSeparator.jsx')),
  route('tool-svg-png', 'media', () => import('./components/SvgToPngConverter.jsx')),
  route('tool-barcode', 'utilities', () => import('./components/QrBarcodeGenerator.jsx'), { subGroupKey: 'utilities', componentProps: { initialTab: 'barcode' }, staticLayout: true }),
  route('tool-currency', 'utilities', () => import('./components/CurrencyCounter.jsx'), { subGroupKey: 'calculation', staticLayout: true }),
  route('tool-date', 'utilities', () => import('./components/DateCounter.jsx'), { subGroupKey: 'calculation' }),
  route('tool-roman', 'utilities', () => import('./components/RomanNumeralConverter.jsx'), { subGroupKey: 'calculation' }),
  route('tool-password', 'utilities', () => import('./components/PasswordGenerator.jsx'), { subGroupKey: 'utilities', componentProps: { initialTab: 'generate' }, staticLayout: true }),
  route('tool-pwstrength', 'utilities', () => import('./components/PasswordGenerator.jsx'), { subGroupKey: 'utilities', componentProps: { initialTab: 'check' }, staticLayout: true }),
  route('tool-qrcode', 'utilities', () => import('./components/QrBarcodeGenerator.jsx'), { subGroupKey: 'utilities', componentProps: { initialTab: 'qr' }, staticLayout: true }),
  route('tool-qrbarcodescan', 'utilities', () => import('./components/QrBarcodeScanner.jsx'), { subGroupKey: 'utilities', staticLayout: true }),
  route('tool-wheel', 'utilities', () => import('./components/RandomWheel.jsx'), { subGroupKey: 'utilities', staticLayout: true }),
  route('privacy', 'policy', () => import('./components/PrivacyPolicy.jsx'), { navigationVisible: false, staticLayout: true }),
];

export const TOOL_ROUTES = definitions.map((definition) => ({
  ...definition,
  component: React.lazy(definition.loader),
}));

export const NAVIGATION_ROUTES = TOOL_ROUTES.filter((item) => item.navigationVisible);
export const PUBLIC_ROUTE_IDS = TOOL_ROUTES.flatMap((item) => [item.id, ...item.aliases]);
export const STATIC_LAYOUT_IDS = new Set(
  TOOL_ROUTES.flatMap((item) => item.staticLayout ? [item.id, ...item.aliases] : []),
);

const routesById = new Map(
  TOOL_ROUTES.flatMap((item) => [item.id, ...item.aliases].map((id) => [id, item])),
);

export function getToolRoute(id) {
  return routesById.get(id) || null;
}

export function localizeToolRoute(item, t, englishT = i18n.getFixedT('en-US')) {
  const prefix = `tools:${item.id}`;
  const currentSearch = t(`${prefix}.search`, { returnObjects: true });
  const englishSearch = englishT(`${prefix}.search`, { returnObjects: true });
  return {
    ...item,
    title: t(`${prefix}.title`),
    tooltip: t(`${prefix}.tooltip`),
    description: t(`${prefix}.description`),
    searchMetadata: [...new Set([
      t(`${prefix}.title`),
      ...(Array.isArray(currentSearch) ? currentSearch : []),
      englishT(`${prefix}.title`),
      ...(Array.isArray(englishSearch) ? englishSearch : []),
    ])],
    subGroup: item.subGroupKey ? t(`navigation:categories.${item.subGroupKey}`) : null,
  };
}

export function getLocalizedToolRoutes(t) {
  return TOOL_ROUTES.map((item) => localizeToolRoute(item, t));
}

export function sortLocalizedTools(items, locale) {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return [...items].sort((a, b) => collator.compare(a.title ?? a.name, b.title ?? b.name));
}
