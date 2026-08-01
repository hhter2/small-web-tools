import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const FALLBACK_VERSION = 'v0.0.0';
const TAG_REF_PREFIX = 'refs/tags/';

function parseVersion(value) {
  const normalized = normalizeVersion(value);
  const match = normalized.match(/^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/u);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareVersions(left, right) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) return 0;

  for (const part of ['major', 'minor', 'patch']) {
    if (leftVersion[part] !== rightVersion[part]) {
      return leftVersion[part] - rightVersion[part];
    }
  }

  const leftPrerelease = leftVersion.prerelease;
  const rightPrerelease = rightVersion.prerelease;
  if (leftPrerelease.length === 0 || rightPrerelease.length === 0) {
    if (leftPrerelease.length === rightPrerelease.length) return 0;
    return leftPrerelease.length === 0 ? 1 : -1;
  }

  const length = Math.max(leftPrerelease.length, rightPrerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = leftPrerelease[index];
    const rightIdentifier = rightPrerelease[index];
    if (leftIdentifier === undefined || rightIdentifier === undefined) {
      return leftIdentifier === undefined ? -1 : 1;
    }
    if (leftIdentifier === rightIdentifier) continue;

    const leftIsNumeric = /^\d+$/u.test(leftIdentifier);
    const rightIsNumeric = /^\d+$/u.test(rightIdentifier);
    if (leftIsNumeric && rightIsNumeric) {
      return Number(leftIdentifier) - Number(rightIdentifier);
    }
    if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }

  return 0;
}

function extractTagName(value) {
  const trimmed = String(value || '').trim();
  const refIndex = trimmed.lastIndexOf(TAG_REF_PREFIX);
  return refIndex >= 0 ? trimmed.slice(refIndex + TAG_REF_PREFIX.length) : trimmed;
}

function runGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

function readRepositoryUrl() {
  const configuredRepository = process.env.VITE_VERSION_REPOSITORY;
  if (configuredRepository) return configuredRepository;

  try {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    );
    const repository = packageJson.repository;
    return typeof repository === 'string' ? repository : repository?.url || '';
  } catch {
    return '';
  }
}

export function normalizeVersion(value) {
  const trimmed = String(value || '').trim();
  if (!VERSION_PATTERN.test(trimmed)) return '';
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

export function selectLatestVersionTag(tagOutput) {
  const tags = String(tagOutput || '')
    .split(/\r?\n/u)
    .map((tag) => tag.trim())
    .map(extractTagName)
    .filter((tag) => VERSION_PATTERN.test(tag));
  tags.sort((left, right) => compareVersions(right, left));
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
  const localTagOutput = runGit(['tag', '--sort=-version:refname'], cwd);
  if (selectLatestVersionTag(localTagOutput)) {
    return resolveVersionDetails({
      tagOutput: localTagOutput,
      environmentVersion,
    });
  }

  const repositoryUrl = runGit(['remote', 'get-url', 'origin'], cwd).trim() || readRepositoryUrl();
  if (repositoryUrl) {
    const remoteTagOutput = runGit(
      ['ls-remote', '--tags', '--refs', repositoryUrl],
      cwd,
    );
    if (selectLatestVersionTag(remoteTagOutput)) {
      return resolveVersionDetails({
        tagOutput: remoteTagOutput,
        environmentVersion,
      });
    }
  }

  return resolveVersionDetails({
    tagOutput: localTagOutput,
    environmentVersion,
  });
}

export function resolveRepositoryVersion(options) {
  return resolveRepositoryVersionDetails(options).version;
}
