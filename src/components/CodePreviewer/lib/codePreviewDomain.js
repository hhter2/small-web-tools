import {
  CODE_LANGUAGE_SPECS,
  highlightCode,
  normalizeCodeLanguage,
} from '../../../lib/codeHighlighting.js';

export { highlightCode, normalizeCodeLanguage };

export const CODE_FILE_LIMIT_BYTES = 2 * 1024 * 1024;

const LANGUAGE_LABELS = {
  plaintext: 'Plain text',
  bash: 'Bash / Shell',
  javascript: 'JavaScript / JSX',
  typescript: 'TypeScript / TSX',
  html: 'HTML / XML',
  css: 'CSS',
  json: 'JSON',
  markdown: 'Markdown',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  r: 'R',
  sql: 'SQL',
  yaml: 'YAML',
  diff: 'Diff / Patch',
  graphql: 'GraphQL',
  lua: 'Lua',
  perl: 'Perl',
};

export const CODE_LANGUAGES = CODE_LANGUAGE_SPECS.map((language) => ({
  ...language,
  label: LANGUAGE_LABELS[language.id],
}));

const languageById = new Map(CODE_LANGUAGES.map((language) => [language.id, language]));

export function getLineCount(code) {
  return Math.max(1, code.split('\n').length);
}

export function getDefaultFilename(languageId) {
  const language = languageById.get(normalizeCodeLanguage(languageId)) ?? languageById.get('plaintext');
  return `snippet.${language.extension}`;
}

export function normalizeCodeFilename(filename, languageId) {
  const fallback = getDefaultFilename(languageId);
  const safeName = filename
    .trim()
    .split(/[\\/]/)
    .pop()
    ?.replace(/[<>:"|?*\u0000-\u001f]/g, '-')
    .replace(/^\.+$/, '');
  if (!safeName) return fallback;

  const language = languageById.get(normalizeCodeLanguage(languageId)) ?? languageById.get('plaintext');
  return safeName.includes('.') ? safeName : `${safeName}.${language.extension}`;
}

export function inferLanguageFromFilename(filename) {
  const basename = filename.trim().split(/[\\/]/).pop()?.toLowerCase() ?? '';
  const extension = basename.includes('.') ? basename.split('.').pop() : '';
  return normalizeCodeLanguage(extension);
}

export function getSyntaxTheme(backgroundColor) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(backgroundColor);
  if (!match) return 'dark';
  const [red, green, blue] = match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = [red, green, blue].map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  return luminance > 0.42 ? 'light' : 'dark';
}
