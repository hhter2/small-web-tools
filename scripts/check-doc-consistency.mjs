import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const docs = {
  README: read('README.md'),
  CODEBASE: read('CODEBASE.md'),
  CONTRIBUTING: read('CONTRIBUTING.md'),
};

const failures = [];
const requireText = (documentName, text, description = text) => {
  if (!docs[documentName].includes(text)) {
    failures.push(`${documentName}.md is missing ${description}`);
  }
};

requireText('CODEBASE', `Version | \`${pkg.version}\``, `package version ${pkg.version}`);
for (const major of ['22', '24']) {
  requireText('README', `Node.js ${major}`, `supported Node.js ${major}`);
  requireText('CODEBASE', major, `supported Node.js ${major}`);
}

for (const command of ['npm run dev', 'npm run build', 'npm run verify', 'npm run test:e2e']) {
  requireText('CONTRIBUTING', command, `command ${command}`);
}

const apiFiles = fs.readdirSync(path.join(root, 'functions', 'api'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => `/api/${file.slice(0, -3)}`);
for (const endpoint of apiFiles) {
  requireText('CODEBASE', endpoint, `API endpoint ${endpoint}`);
}

const viteConfig = read('vite.config.js');
const mirroredEndpoints = [...viteConfig.matchAll(/startsWith\(['"]([^'"]*\/api\/[^'"]+)['"]\)/g)]
  .map((match) => match[1]);
const documentedMirror = /mirrors only (?:the )?IP lookup/i.test(docs.CODEBASE)
  && /mirrors only (?:the )?IP lookup/i.test(docs.README);
if (mirroredEndpoints.join(',') !== '/api/iplookup' || !documentedMirror) {
  failures.push('local API mirrors must be exactly /api/iplookup and documented in README.md and CODEBASE.md');
}

requireText('CONTRIBUTING', 'Cloudflare Pages', 'Cloudflare Pages local-runtime guidance');
requireText('CONTRIBUTING', 'rate-limiter Worker', 'rate-limiter Worker guidance');

if (failures.length > 0) {
  console.error(`Documentation consistency check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Documentation consistency check passed (${pkg.version}, Node ${pkg.engines.node}).`);
