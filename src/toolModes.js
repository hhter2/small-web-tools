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
];

export const TOOL_MODES = modeDefinitions.map((mode) => ({
  ...mode,
  toolIds: mode.toolIds ? [...mode.toolIds] : null,
}));

export const AUDIENCE_MODES = [...TOOL_MODES];

export const SIMPLE_WORKSPACE = {
  id: 'simple',
  label: 'Simple',
  heading: 'Quick tools',
  description: 'Search every tool or open an everyday essential.',
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
};

const modesById = new Map(TOOL_MODES.map((mode) => [mode.id, mode]));

export function getToolMode(modeId) {
  if (modeId === SIMPLE_WORKSPACE.id) {
    return SIMPLE_WORKSPACE;
  }
  return modesById.get(modeId) ?? modesById.get('all');
}

function getPathSegments(pathname) {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

export function isToolPath(pathname) {
  const rootSegment = getPathSegments(pathname)[0];
  return rootSegment === 'home' || rootSegment === 'simple';
}

export function getModeIdFromLocation(pathname, search = '') {
  const pathSegments = getPathSegments(pathname);
  if (pathSegments[0] === 'simple') {
    return 'simple';
  }
  if (pathSegments[0] === 'home') {
    const pathModeId = pathSegments[1];
    if (pathModeId === 'simple') {
      return 'simple';
    }
    return pathModeId && pathModeId !== 'all' && modesById.has(pathModeId)
      ? pathModeId
      : 'all';
  }

  // Read old query-based links once so the app can redirect them to the
  // canonical path without breaking existing bookmarks.
  const legacyModeId = new URLSearchParams(search).get('mode');
  return getToolMode(legacyModeId).id;
}

export function getRouteIdFromLocation(pathname, hash = '') {
  const legacyRouteId = decodeURIComponent(hash.replace(/^#/, '').trim());
  if (legacyRouteId) {
    return legacyRouteId;
  }

  const pathSegments = getPathSegments(pathname);
  if (pathSegments[0] === 'simple') {
    const routeSlug = pathSegments[1];
    if (!routeSlug || routeSlug === 'home') {
      return 'tool-home';
    }
    if (routeSlug === 'privacy' || routeSlug.startsWith('tool-')) {
      return routeSlug;
    }
    return `tool-${routeSlug}`;
  }
  if (pathSegments[0] !== 'home') {
    return null;
  }

  const firstPathId = pathSegments[1];
  const hasModeSegment = firstPathId === 'simple'
    || (firstPathId && firstPathId !== 'all' && modesById.has(firstPathId));
  const routeSlug = hasModeSegment ? pathSegments[2] : firstPathId;
  if (!routeSlug || routeSlug === 'home') {
    return 'tool-home';
  }
  if (routeSlug === 'privacy' || routeSlug.startsWith('tool-')) {
    return routeSlug;
  }
  return `tool-${routeSlug}`;
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
  const pathSegments = profile.id === 'simple' ? ['simple'] : ['home'];
  if (profile.id !== 'all' && profile.id !== 'simple') {
    pathSegments.push(profile.id);
  }
  if (routeId !== 'tool-home') {
    pathSegments.push(routeId.replace(/^tool-/, ''));
  }
  url.pathname = `/${pathSegments.map(encodeURIComponent).join('/')}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
