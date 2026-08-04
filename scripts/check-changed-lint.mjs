import { spawnSync } from 'node:child_process';

const SOURCE_PATTERN = /^(?:src|functions|workers|test|scripts|e2e)\/.*\.(?:[cm]?js|jsx)$/;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
}

function resolveBaseRef() {
  const explicitBase = process.env.LINT_BASE_REF?.trim();
  if (explicitBase) return explicitBase;

  const pullRequestBase = process.env.GITHUB_BASE_REF?.trim();
  if (pullRequestBase) return `origin/${pullRequestBase}`;

  const parent = run('git', ['rev-parse', '--verify', 'HEAD^'], { capture: true });
  return parent.status === 0 ? 'HEAD^' : null;
}

const baseRef = resolveBaseRef();
if (!baseRef) {
  console.log('Changed-file lint skipped: no comparison base is available.');
  process.exit(0);
}

const mergeBase = run('git', ['merge-base', 'HEAD', baseRef], { capture: true });
if (mergeBase.status !== 0) {
  console.log(`Changed-file lint skipped: ${baseRef} is unavailable.`);
  process.exit(0);
}

const changed = run('git', [
  'diff',
  '--name-only',
  '--diff-filter=ACMR',
  `${mergeBase.stdout.trim()}...HEAD`,
], { capture: true });

if (changed.status !== 0) {
  console.error(changed.stderr.trim());
  process.exit(changed.status || 1);
}

const files = changed.stdout
  .split('\n')
  .map((file) => file.trim())
  .filter((file) => SOURCE_PATTERN.test(file));

if (files.length === 0) {
  console.log(`Changed-file lint: no changed JavaScript files relative to ${baseRef}.`);
  process.exit(0);
}

console.log(`Changed-file lint: checking ${files.length} file(s) relative to ${baseRef} with zero warnings allowed.`);
const lint = run('npx', ['eslint', '--max-warnings', '0', ...files]);
process.exit(lint.status || 0);
