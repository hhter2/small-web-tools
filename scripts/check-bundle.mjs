import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const assetsDirectory = resolve('dist/assets');
const maximumJavaScriptBytes = 500 * 1024;
const maximumEntryBytes = 100 * 1024;
const files = await readdir(assetsDirectory);
const JavaScriptFiles = files.filter((file) => file.endsWith('.js'));

if (JavaScriptFiles.length === 0) {
  throw new Error('No production JavaScript assets were found. Run the build first.');
}

const failures = [];
for (const file of JavaScriptFiles) {
  const { size } = await stat(resolve(assetsDirectory, file));
  const limit = file.startsWith('index-') ? maximumEntryBytes : maximumJavaScriptBytes;
  if (size > limit) {
    failures.push(`${file}: ${size} bytes exceeds ${limit} bytes`);
  }
}

if (failures.length > 0) {
  throw new Error(`Bundle budget exceeded:\n${failures.join('\n')}`);
}

console.log(`Bundle budget passed for ${JavaScriptFiles.length} JavaScript assets.`);
