import { execFileSync } from 'node:child_process';

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const FALLBACK_VERSION = 'v0.0.0';

export function normalizeVersion(value) {
  const trimmed = String(value || '').trim();
  if (!VERSION_PATTERN.test(trimmed)) return '';
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

export function selectLatestVersionTag(tagOutput) {
  const tags = String(tagOutput || '')
    .split(/\r?\n/u)
    .map((tag) => tag.trim())
    .filter((tag) => VERSION_PATTERN.test(tag));
  return normalizeVersion(tags[0]);
}

export function resolveVersionDetails({ tagOutput, environmentVersion }) {
  const tagVersion = selectLatestVersionTag(tagOutput);
  if (tagVersion) return { version: tagVersion, source: 'git-tag' };

  const environmentFallback = normalizeVersion(environmentVersion);
  if (environmentFallback) {
    return { version: environmentFallback, source: 'environment' };
  }

  return { version: FALLBACK_VERSION, source: 'fallback' };
}

export function resolveVersion(options) {
  return resolveVersionDetails(options).version;
}

export function resolveRepositoryVersionDetails({
  cwd = process.cwd(),
  environmentVersion = process.env.VITE_APP_VERSION,
} = {}) {
  let tagOutput = '';

  try {
    tagOutput = execFileSync(
      'git',
      ['tag', '--sort=-version:refname'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // Deployment archives may not include Git metadata.
  }

  return resolveVersionDetails({
    tagOutput,
    environmentVersion,
  });
}

export function resolveRepositoryVersion(options) {
  return resolveRepositoryVersionDetails(options).version;
}
