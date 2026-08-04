import hljs from 'highlight.js/lib/common';

export const CODE_LANGUAGE_SPECS = [
  { id: 'plaintext', extension: 'txt', aliases: ['txt', 'text', 'plain', 'plaintext'] },
  { id: 'bash', extension: 'sh', aliases: ['sh', 'shell', 'zsh', 'bash'] },
  { id: 'javascript', extension: 'js', aliases: ['js', 'jsx', 'mjs', 'cjs', 'javascript'] },
  { id: 'typescript', extension: 'ts', aliases: ['ts', 'tsx', 'typescript'] },
  { id: 'html', extension: 'html', aliases: ['html', 'htm', 'xml', 'svg'] },
  { id: 'css', extension: 'css', aliases: ['css'] },
  { id: 'json', extension: 'json', aliases: ['json', 'jsonc'] },
  { id: 'markdown', extension: 'md', aliases: ['md', 'markdown'] },
  { id: 'python', extension: 'py', aliases: ['py', 'pyw', 'python'] },
  { id: 'java', extension: 'java', aliases: ['java'] },
  { id: 'c', extension: 'c', aliases: ['c', 'h'] },
  { id: 'cpp', extension: 'cpp', aliases: ['cpp', 'cc', 'cxx', 'hpp'] },
  { id: 'csharp', extension: 'cs', aliases: ['cs', 'csharp'] },
  { id: 'go', extension: 'go', aliases: ['go'] },
  { id: 'rust', extension: 'rs', aliases: ['rs', 'rust'] },
  { id: 'php', extension: 'php', aliases: ['php'] },
  { id: 'ruby', extension: 'rb', aliases: ['rb', 'ruby'] },
  { id: 'swift', extension: 'swift', aliases: ['swift'] },
  { id: 'kotlin', extension: 'kt', aliases: ['kt', 'kts', 'kotlin'] },
  { id: 'r', extension: 'r', aliases: ['r'] },
  { id: 'sql', extension: 'sql', aliases: ['sql'] },
  { id: 'yaml', extension: 'yml', aliases: ['yml', 'yaml'] },
  { id: 'diff', extension: 'diff', aliases: ['diff', 'patch'] },
  { id: 'graphql', extension: 'graphql', aliases: ['graphql', 'gql'] },
  { id: 'lua', extension: 'lua', aliases: ['lua'] },
  { id: 'perl', extension: 'pl', aliases: ['pl', 'pm', 'perl'] },
];

const languageIds = new Set(CODE_LANGUAGE_SPECS.map(({ id }) => id));
const languageByAlias = new Map(CODE_LANGUAGE_SPECS.flatMap(({ id, aliases }) => (
  aliases.map((alias) => [alias, id])
)));

export function normalizeCodeLanguage(languageId) {
  const candidate = String(languageId || '').trim().toLowerCase();
  if (!candidate) return 'plaintext';
  return languageIds.has(candidate) ? candidate : languageByAlias.get(candidate) ?? 'plaintext';
}

export function highlightCode(code, languageId) {
  return hljs.highlight(code, {
    language: normalizeCodeLanguage(languageId),
    ignoreIllegals: true,
  }).value;
}
