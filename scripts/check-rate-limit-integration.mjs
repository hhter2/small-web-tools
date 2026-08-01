import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const tempRoot = path.join(root, '.tmp-rate-limit-integration');
const secret = 'local-integration-secret-32-characters';
const host = '127.0.0.1';

function terminateProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    return;
  }
  child.kill('SIGTERM');
}

async function waitForRuntime(baseUrl, child, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Wrangler exited before becoming ready.\n${output.join('')}`);
    }
    try {
      await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for Wrangler.\n${output.join('')}`);
}

async function withPagesRuntime({ port, includeWorker }, check) {
  const persistPath = path.join(tempRoot, String(port));
  await mkdir(persistPath, { recursive: true });
  const args = [
    wranglerBin,
    'pages',
    'dev',
  ];
  if (includeWorker) {
    args.push(
      '-c',
      'wrangler.jsonc',
      '-c',
      'workers/rate-limiter/wrangler.jsonc',
    );
  }
  args.push(
    '--ip',
    host,
    '--port',
    String(port),
    '--persist-to',
    persistPath,
    '--binding',
    `RATE_LIMIT_HMAC_SECRET=${secret}`,
    '--binding',
    'ALLOW_LOCAL_DEVELOPMENT=true',
    '--log-level',
    'error',
  );

  const output = [];
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      CI: 'true',
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: path.join(persistPath, 'logs'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));

  const baseUrl = `http://${host}:${port}`;
  try {
    await waitForRuntime(baseUrl, child, output);
    await check(baseUrl);
  } finally {
    terminateProcessTree(child);
  }
}

async function postInvalidExtraction(baseUrl) {
  const response = await fetch(`${baseUrl}/api/extract-fonts`, {
    method: 'POST',
    headers: {
      Origin: baseUrl,
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  return {
    status: response.status,
    retryAfter: response.headers.get('Retry-After'),
    body: await response.json(),
  };
}

try {
  await withPagesRuntime({ port: 8976, includeWorker: true }, async (baseUrl) => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => postInvalidExtraction(baseUrl)),
    );
    const validationFailures = results.filter(({ status }) => status === 400);
    const limited = results.filter(({ status }) => status === 429);
    if (validationFailures.length !== 20 || limited.length !== 10) {
      throw new Error(
        `Expected 20 validation responses and 10 rate limits; received `
        + `${validationFailures.length} and ${limited.length}.`,
      );
    }
    if (limited.some(({ retryAfter, body }) => (
      retryAfter !== '60' || body?.code !== 'RATE_LIMITED'
    ))) {
      throw new Error('Rate-limited responses must expose Retry-After and RATE_LIMITED.');
    }
  });

  await withPagesRuntime({ port: 8977, includeWorker: false }, async (baseUrl) => {
    const result = await postInvalidExtraction(baseUrl);
    if (result.status !== 503 || result.body?.code !== 'RATE_LIMIT_UNAVAILABLE') {
      throw new Error(
        `Missing service binding must fail closed with RATE_LIMIT_UNAVAILABLE; `
        + `received ${result.status} ${result.body?.code || 'without a code'}.`,
      );
    }
  });

  console.log(
    'Pages → Service Binding → Rate Limiting Worker concurrency and fail-closed checks passed.',
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
