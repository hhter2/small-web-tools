import { readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pagesConfig = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
const workerConfig = JSON.parse(await readFile(
  path.join(root, 'workers/rate-limiter/wrangler.jsonc'),
  'utf8',
));

const service = pagesConfig.services?.find((item) => item.binding === 'RATE_LIMITER_SERVICE');
if (service?.service !== workerConfig.name) {
  throw new Error('RATE_LIMITER_SERVICE must target the version-controlled limiter Worker.');
}
if (pagesConfig.vars?.RATE_LIMIT_DEVELOPMENT_MODE !== 'false') {
  throw new Error('Production Pages configuration must fail closed.');
}
const policies = Object.fromEntries(
  workerConfig.ratelimits?.map((entry) => [entry.name, entry.simple]) || [],
);
if (policies.EXPENSIVE_LIMITER?.limit !== 20 || policies.EXPENSIVE_LIMITER?.period !== 60) {
  throw new Error('EXPENSIVE_LIMITER must be configured for 20 requests per minute.');
}
if (policies.STANDARD_LIMITER?.limit !== 60 || policies.STANDARD_LIMITER?.period !== 60) {
  throw new Error('STANDARD_LIMITER must be configured for 60 requests per minute.');
}

const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const tempOutput = path.join(root, '.tmp-cloudflare-check');
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_LOG_PATH: path.join(tempOutput, 'logs'),
};

function run(args) {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`.trim());
  }
}

try {
  run(['deploy', '--dry-run', '--config', 'workers/rate-limiter/wrangler.jsonc']);
  run(['pages', 'functions', 'build', '--outdir', tempOutput]);
} finally {
  await rm(tempOutput, { recursive: true, force: true });
}

console.log('Cloudflare Pages service binding and Rate Limiting Worker configuration are valid.');
