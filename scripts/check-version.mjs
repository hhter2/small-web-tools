import { resolveRepositoryVersionDetails } from './resolve-version.mjs';

const { version, source } = resolveRepositoryVersionDetails();

if (source === 'fallback') {
  throw new Error(
    'Version unavailable: add a version-formatted Git tag or set VITE_APP_VERSION '
    + 'for an archive that does not contain Git metadata.',
  );
}

const sourceLabel = source === 'git-tag' ? 'Git tag' : 'VITE_APP_VERSION';
console.log(`Version resolved from ${sourceLabel}: ${version}`);
