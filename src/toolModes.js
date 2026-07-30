const modeDefinitions = [
  {
    id: 'all',
    label: 'All tools',
    heading: 'Welcome to Small Web Tools!',
    description: 'Browse the complete toolkit by category.',
    toolIds: null,
    simplified: false,
  },
  {
    id: 'daily',
    label: 'Daily users',
    heading: 'Everyday essentials',
    description: 'Common writing, date, conversion, security, and sharing tools.',
    toolIds: [
      'tool-wc',
      'tool-casing',
      'tool-url',
      'tool-date',
      'tool-currency',
      'tool-qrcode',
      'tool-qrbarcodescan',
      'tool-password',
      'tool-pwstrength',
      'tool-wheel',
    ],
    simplified: false,
  },
  {
    id: 'developer',
    label: 'Developers',
    heading: 'Developer workspace',
    description: 'Code, text, URL, network, and project inspection tools.',
    toolIds: [
      'tool-slash',
      'tool-ascii',
      'tool-unicode',
      'tool-url',
      'tool-markdown',
      'tool-code-preview',
      'tool-fontextractor',
      'tool-base',
      'tool-folder-analyzer',
      'tool-iplookup',
    ],
    simplified: false,
  },
  {
    id: 'bioinformatics',
    label: 'Bioinformatics researchers',
    heading: 'Bioinformatics workspace',
    description: 'Sequence, codon, quality-score, writing, and analysis helpers.',
    toolIds: [
      'tool-dna',
      'tool-codon',
      'tool-phred',
      'tool-wc',
      'tool-markdown',
      'tool-code-preview',
      'tool-base',
    ],
    simplified: false,
  },
  {
    id: 'designer',
    label: 'Designers',
    heading: 'Designer workspace',
    description: 'Color, image, vector, font, code-preview, and sharing tools.',
    toolIds: [
      'tool-color',
      'tool-svg-png',
      'tool-imgmeta',
      'tool-fontextractor',
      'tool-qrcode',
      'tool-barcode',
      'tool-markdown',
      'tool-code-preview',
    ],
    simplified: false,
  },
  {
    id: 'student',
    label: 'Students',
    heading: 'Student workspace',
    description: 'Writing, study, coding, date, number, and science helpers.',
    toolIds: [
      'tool-wc',
      'tool-casing',
      'tool-typing',
      'tool-markdown',
      'tool-code-preview',
      'tool-base',
      'tool-date',
      'tool-roman',
      'tool-dna',
      'tool-codon',
    ],
    simplified: false,
  },
  {
    id: 'simple',
    label: 'Simple mode',
    heading: 'Essential tools',
    description: 'A reduced workspace containing only frequently used tools.',
    toolIds: [
      'tool-wc',
      'tool-casing',
      'tool-url',
      'tool-date',
      'tool-currency',
      'tool-color',
      'tool-qrcode',
      'tool-password',
    ],
    simplified: true,
  },
];

export const TOOL_MODES = modeDefinitions.map((mode) => ({
  ...mode,
  toolIds: mode.toolIds ? [...mode.toolIds] : null,
}));

const modesById = new Map(TOOL_MODES.map((mode) => [mode.id, mode]));

export function getToolMode(modeId) {
  return modesById.get(modeId) ?? modesById.get('all');
}

export function isToolModePath(pathname) {
  return /^\/home(?:\/[^/]+)?\/?$/.test(pathname);
}

export function getModeIdFromLocation(pathname, search = '') {
  const pathMatch = pathname.match(/^\/home(?:\/([^/]+))?\/?$/);
  if (pathMatch) {
    return getToolMode(pathMatch[1] || 'all').id;
  }

  // Read old query-based links once so the app can redirect them to the
  // canonical path without breaking existing bookmarks.
  const legacyModeId = new URLSearchParams(search).get('mode');
  return getToolMode(legacyModeId).id;
}

export function filterToolsForMode(tools, modeId) {
  const profile = getToolMode(modeId);
  if (!profile.toolIds) return tools;
  const allowedIds = new Set(profile.toolIds);
  return tools.filter((tool) => allowedIds.has(tool.id));
}

export function buildModeUrl(currentHref, modeId, routeId = 'tool-home') {
  const profile = getToolMode(modeId);
  const url = new URL(currentHref);
  url.pathname = profile.id === 'all' ? '/home' : `/home/${profile.id}`;
  url.search = '';
  url.hash = routeId === 'tool-home' ? '' : routeId;
  return url.toString();
}
