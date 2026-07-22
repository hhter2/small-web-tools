import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const VERSION_TAG_PATTERN = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

export function normalizeVersion(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

export function selectLatestVersionTag(tagOutput) {
  const tags = String(tagOutput || '')
    .split(/\r?\n/u)
    .map((tag) => tag.trim())
    .filter((tag) => VERSION_TAG_PATTERN.test(tag));
  return normalizeVersion(tags[0]);
}

export function resolveVersion({ tagOutput, environmentVersion, packageVersion }) {
  return selectLatestVersionTag(tagOutput)
    || normalizeVersion(environmentVersion)
    || normalizeVersion(packageVersion)
    || 'v0.0.0';
}

export function resolveRepositoryVersion({ cwd = process.cwd() } = {}) {
  let tagOutput = '';
  let packageVersion = '';

  try {
    tagOutput = execFileSync(
      'git',
      ['tag', '--sort=-version:refname'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // Deployment archives may not include Git metadata.
  }

  try {
    packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  } catch {
    // The final fallback remains available for incomplete build archives.
  }

  return resolveVersion({
    tagOutput,
    environmentVersion: process.env.VITE_APP_VERSION,
    packageVersion,
  });
}
