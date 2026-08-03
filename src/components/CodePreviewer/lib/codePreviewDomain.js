import hljs from 'highlight.js/lib/common';

export const CODE_FILE_LIMIT_BYTES = 2 * 1024 * 1024;

export const CODE_LANGUAGES = [
  { id: 'plaintext', label: 'Plain text', extension: 'txt', aliases: ['txt', 'text', 'plain', 'plaintext'] },
  { id: 'bash', label: 'Bash / Shell', extension: 'sh', aliases: ['sh', 'shell', 'zsh', 'bash'] },
  { id: 'javascript', label: 'JavaScript / JSX', extension: 'js', aliases: ['js', 'jsx', 'mjs', 'cjs', 'javascript'] },
  { id: 'typescript', label: 'TypeScript / TSX', extension: 'ts', aliases: ['ts', 'tsx', 'typescript'] },
  { id: 'html', label: 'HTML / XML', extension: 'html', aliases: ['html', 'htm', 'xml', 'svg'] },
  { id: 'css', label: 'CSS', extension: 'css', aliases: ['css'] },
  { id: 'json', label: 'JSON', extension: 'json', aliases: ['json', 'jsonc'] },
  { id: 'markdown', label: 'Markdown', extension: 'md', aliases: ['md', 'markdown'] },
  { id: 'python', label: 'Python', extension: 'py', aliases: ['py', 'pyw', 'python'] },
  { id: 'java', label: 'Java', extension: 'java', aliases: ['java'] },
  { id: 'c', label: 'C', extension: 'c', aliases: ['c', 'h'] },
  { id: 'cpp', label: 'C++', extension: 'cpp', aliases: ['cpp', 'cc', 'cxx', 'hpp'] },
  { id: 'csharp', label: 'C#', extension: 'cs', aliases: ['cs', 'csharp'] },
  { id: 'go', label: 'Go', extension: 'go', aliases: ['go'] },
  { id: 'rust', label: 'Rust', extension: 'rs', aliases: ['rs', 'rust'] },
  { id: 'php', label: 'PHP', extension: 'php', aliases: ['php'] },
  { id: 'ruby', label: 'Ruby', extension: 'rb', aliases: ['rb', 'ruby'] },
  { id: 'swift', label: 'Swift', extension: 'swift', aliases: ['swift'] },
  { id: 'kotlin', label: 'Kotlin', extension: 'kt', aliases: ['kt', 'kts', 'kotlin'] },
  { id: 'r', label: 'R', extension: 'r', aliases: ['r'] },
  { id: 'sql', label: 'SQL', extension: 'sql', aliases: ['sql'] },
  { id: 'yaml', label: 'YAML', extension: 'yml', aliases: ['yml', 'yaml'] },
  { id: 'diff', label: 'Diff / Patch', extension: 'diff', aliases: ['diff', 'patch'] },
  { id: 'graphql', label: 'GraphQL', extension: 'graphql', aliases: ['graphql', 'gql'] },
  { id: 'lua', label: 'Lua', extension: 'lua', aliases: ['lua'] },
  { id: 'perl', label: 'Perl', extension: 'pl', aliases: ['pl', 'pm', 'perl'] },
];

const languageById = new Map(CODE_LANGUAGES.map((language) => [language.id, language]));
const languageByAlias = new Map(CODE_LANGUAGES.flatMap((language) => (
  language.aliases.map((alias) => [alias, language.id])
)));

export function normalizeCodeLanguage(languageId) {
  const candidate = String(languageId || '').trim().toLowerCase();
  if (!candidate) return 'plaintext';
  return languageById.has(candidate) ? candidate : languageByAlias.get(candidate) ?? 'plaintext';
}

export function highlightCode(code, languageId) {
  return hljs.highlight(code, {
    language: normalizeCodeLanguage(languageId),
    ignoreIllegals: true,
  }).value;
}

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
