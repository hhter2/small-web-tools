import hljs from 'highlight.js/lib/common';

export const CODE_FILE_LIMIT_BYTES = 2 * 1024 * 1024;

export const CODE_LANGUAGES = [
  { id: 'plaintext', label: 'Plain text', extension: 'txt', aliases: ['txt', 'text'] },
  { id: 'bash', label: 'Bash / Shell', extension: 'sh', aliases: ['sh', 'shell', 'zsh'] },
  { id: 'javascript', label: 'JavaScript / JSX', extension: 'js', aliases: ['js', 'jsx', 'mjs', 'cjs'] },
  { id: 'typescript', label: 'TypeScript / TSX', extension: 'ts', aliases: ['ts', 'tsx'] },
  { id: 'html', label: 'HTML / XML', extension: 'html', aliases: ['html', 'htm', 'xml', 'svg'] },
  { id: 'css', label: 'CSS', extension: 'css', aliases: ['css'] },
  { id: 'json', label: 'JSON', extension: 'json', aliases: ['json', 'jsonc'] },
  { id: 'markdown', label: 'Markdown', extension: 'md', aliases: ['md', 'markdown'] },
  { id: 'python', label: 'Python', extension: 'py', aliases: ['py', 'pyw'] },
  { id: 'java', label: 'Java', extension: 'java', aliases: ['java'] },
  { id: 'c', label: 'C', extension: 'c', aliases: ['c', 'h'] },
  { id: 'cpp', label: 'C++', extension: 'cpp', aliases: ['cpp', 'cc', 'cxx', 'hpp'] },
  { id: 'csharp', label: 'C#', extension: 'cs', aliases: ['cs'] },
  { id: 'go', label: 'Go', extension: 'go', aliases: ['go'] },
  { id: 'rust', label: 'Rust', extension: 'rs', aliases: ['rs'] },
  { id: 'php', label: 'PHP', extension: 'php', aliases: ['php'] },
  { id: 'ruby', label: 'Ruby', extension: 'rb', aliases: ['rb'] },
  { id: 'swift', label: 'Swift', extension: 'swift', aliases: ['swift'] },
  { id: 'kotlin', label: 'Kotlin', extension: 'kt', aliases: ['kt', 'kts'] },
  { id: 'r', label: 'R', extension: 'r', aliases: ['r'] },
  { id: 'sql', label: 'SQL', extension: 'sql', aliases: ['sql'] },
  { id: 'yaml', label: 'YAML', extension: 'yml', aliases: ['yml', 'yaml'] },
  { id: 'diff', label: 'Diff / Patch', extension: 'diff', aliases: ['diff', 'patch'] },
  { id: 'graphql', label: 'GraphQL', extension: 'graphql', aliases: ['graphql', 'gql'] },
  { id: 'lua', label: 'Lua', extension: 'lua', aliases: ['lua'] },
  { id: 'perl', label: 'Perl', extension: 'pl', aliases: ['pl', 'pm'] },
];

const languageById = new Map(CODE_LANGUAGES.map((language) => [language.id, language]));

export function highlightCode(code, languageId) {
  const language = languageById.has(languageId) ? languageId : 'plaintext';
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}

export function getLineCount(code) {
  return Math.max(1, code.split('\n').length);
}

export function getDefaultFilename(languageId) {
  const language = languageById.get(languageId) ?? languageById.get('plaintext');
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

  const language = languageById.get(languageId) ?? languageById.get('plaintext');
  return safeName.includes('.') ? safeName : `${safeName}.${language.extension}`;
}

export function inferLanguageFromFilename(filename) {
  const basename = filename.trim().split(/[\\/]/).pop()?.toLowerCase() ?? '';
  const extension = basename.includes('.') ? basename.split('.').pop() : '';
  return CODE_LANGUAGES.find((language) => language.aliases.includes(extension))?.id ?? 'plaintext';
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
