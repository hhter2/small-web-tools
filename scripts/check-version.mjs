import { readFileSync } from 'node:fs';
import { normalizeVersion, resolveRepositoryVersion } from './resolve-version.mjs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageVersion = normalizeVersion(packageJson.version);
const repositoryVersion = resolveRepositoryVersion();

if (packageVersion !== repositoryVersion) {
  throw new Error(
    `Version mismatch: package.json is ${packageVersion}, latest Git tag is ${repositoryVersion}. `
    + 'Update package.json and package-lock.json when creating a release tag.',
  );
}

console.log(`Version metadata matches latest Git tag: ${repositoryVersion}`);
