import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const tempRoot = path.join(root, '.tmp-ssrf-runtime');
const token = randomBytes(32).toString('hex');
const rebindingHost = '7f000001.01010101.rbndr.us';
const privateDnsHost = '127.0.0.1.sslip.io';

function temporaryDeploy(config, vars = []) {
  const args = [
    wranglerBin,
    'deploy',
    '--temporary',
    '--config',
    config,
    ...vars.flatMap(([name, value]) => ['--var', `${name}:${value}`]),
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      XDG_CONFIG_HOME: path.join(tempRoot, 'config'),
      WRANGLER_LOG_PATH: path.join(tempRoot, 'logs'),
      WRANGLER_SEND_METRICS: 'false',
    },
    encoding: 'utf8',
    timeout: 120_000,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    const redacted = output
      .replace(/https:\/\/dash\.cloudflare\.com\/claim-preview\?\S+/giu, '[claim URL redacted]')
      .replaceAll(token, '[test token redacted]');
    throw new Error(`Temporary Worker deployment failed.\n${redacted}`);
  }
  const urls = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/giu) || [];
  const workerUrl = urls.at(-1);
  if (!workerUrl) throw new Error('Wrangler did not report a temporary workers.dev URL.');
  return workerUrl;
}

async function invoke(harnessUrl, target) {
  const response = await fetch(harnessUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target }),
    signal: AbortSignal.timeout(10_000),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

await mkdir(tempRoot, { recursive: true });
try {
  const targetUrl = temporaryDeploy(
    'test/integration/ssrf-target-worker/wrangler.jsonc',
  );
  const targetHost = new URL(targetUrl).hostname;
  const harnessUrl = temporaryDeploy(
    'test/integration/ssrf-worker/wrangler.jsonc',
    [
      ['SSRF_TEST_HOSTS', [targetHost, privateDnsHost, rebindingHost].join(',')],
      ['SSRF_TEST_TOKEN', token],
    ],
  );

  const publicResult = await invoke(harnessUrl, `${targetUrl}/public`);
  if (
    publicResult.status !== 200
    || publicResult.body?.ok !== true
    || publicResult.body?.bytes !== 24
  ) {
    throw new Error(`Public control failed: ${JSON.stringify(publicResult)}`);
  }

  const blockedTargets = {
    loopbackRedirect: `${targetUrl}/redirect-loopback`,
    metadataRedirect: `${targetUrl}/redirect-metadata`,
    privateDnsRedirect: `${targetUrl}/redirect-private-dns`,
    privateDnsResolution: `http://${privateDnsHost}/`,
  };
  const blockedResults = {};
  for (const [name, target] of Object.entries(blockedTargets)) {
    blockedResults[name] = await invoke(harnessUrl, target);
    if (blockedResults[name].body?.ok !== false) {
      throw new Error(`${name} unexpectedly reached its target.`);
    }
  }

  const rebindingAttempts = [];
  for (let index = 0; index < 20; index += 1) {
    rebindingAttempts.push(await invoke(harnessUrl, `http://${rebindingHost}/`));
  }
  if (rebindingAttempts.some(({ body }) => body?.ok === true)) {
    throw new Error('A DNS-rebinding attempt unexpectedly reached a target.');
  }

  const evidence = {
    runtime: 'Cloudflare temporary Workers account',
    executedAt: new Date().toISOString(),
    publicControl: {
      status: publicResult.status,
      ok: publicResult.body.ok,
      bytes: publicResult.body.bytes,
    },
    blocked: Object.fromEntries(
      Object.entries(blockedResults).map(([name, result]) => [
        name,
        { status: result.status, code: result.body?.code },
      ]),
    ),
    dnsRebinding: {
      hostPattern: 'rbndr.us: loopback/public alternating DNS',
      attempts: rebindingAttempts.length,
      successfulFetches: rebindingAttempts.filter(({ body }) => body?.ok === true).length,
      rejectionCodes: [...new Set(rebindingAttempts.map(({ body }) => body?.code))],
    },
    temporaryResources: 'Unclaimed; Cloudflare deletes the preview account automatically.',
  };

  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
