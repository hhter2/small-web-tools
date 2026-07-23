import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const inventory = JSON.parse(await readFile('config/network-services.json', 'utf8'));
const declaredHosts = new Set(inventory.flatMap((service) => service.domains));
const roots = ['src', 'functions', 'public', 'index.html', 'vite.config.js'];
const ignoredSegments = new Set(['tests', 'LICENSES']);
const urlPattern = /https:\/\/[a-z0-9.-]+(?=[:/"'`)\s]|$)/giu;
const found = new Map();

async function collectFiles(target) {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => null);
  if (!entries) return [target];
  const files = [];
  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
}

for (const root of roots) {
  for (const file of await collectFiles(root)) {
    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(urlPattern)) {
      const host = new URL(match[0]).hostname;
      if (!found.has(host)) found.set(host, new Set());
      found.get(host).add(file);
    }
  }
}

const undeclared = [...found].filter(([host]) => !declaredHosts.has(host));
if (undeclared.length) {
  const details = undeclared
    .map(([host, files]) => `${host}: ${[...files].join(', ')}`)
    .join('\n');
  throw new Error(`External hosts missing from config/network-services.json:\n${details}`);
}

console.log(`External host inventory passed (${found.size} source hosts, ${declaredHosts.size} declared hosts).`);
