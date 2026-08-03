import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');
const USER_FACING_ATTRIBUTES = new Set(['alt', 'aria-label', 'placeholder', 'title']);
const TECHNICAL_TERMS = new Set([
  '⬇ JSON', '⁺NH₃', 'H₂N', '⁺NH₂', 'COO⁻', '&times;', '&nbsp;',
  '#4F46E5 or rgb(79, 70, 229) or hsl(244, 76%, 59%)',
  "[]&#123;&#125;|;:',.&lt;&gt;?/~", 'Q = −10 × log₁₀(P), and P = 10^(−Q/10).',
  '256 x 256 px', '512 x 512 px', '1024 x 1024 px', '2048 x 2048 px',
  'Arial', 'Georgia', 'Impact', 'Courier New', 'Trebuchet MS', 'Verdana',
  'QR Code', 'Data Matrix', 'Aztec', 'PDF 417', 'Code 128', 'Code 39', 'Code 93',
  'Codabar', 'RSS 14', '2026 or MMXXVI', '<svg …>…</svg>', 's', 'Ctrl+↵',
  'Codec:', 'Res:', 'FPS:', 'Audio:', 'Subs:',
]);

// Reviewed protocol, format, unit, and keyboard notation that should remain language-neutral.
const TECHNICAL_ALLOWLIST = [
  /^(?:JSON|SVG|URL|URI|DNS|HEX|RGB|RGBA|HSL|HSLA|CMYK|WPA|WEP|WPM|CPM|FPS|Hz|Mbps)$/i,
  /^(?:Ctrl|Cmd|Alt|Shift)(?:\s*\+\s*(?:Ctrl|Cmd|Alt|Shift|[A-Z0-9]))+$/,
  /^(?:[A-Z0-9][A-Z0-9+./_-]*)(?:\s*\([^)]*\))?$/,
  /^[×÷+−=<>%#0-9.,:;()[\]{}\s/-]+$/,
];

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isAllowed(value) {
  return TECHNICAL_TERMS.has(value) || !/[A-Za-z]/.test(value)
    || TECHNICAL_ALLOWLIST.some((pattern) => pattern.test(value));
}

function visitFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visitFiles(target, files);
    else if (/\.[jt]sx$/.test(entry.name)) files.push(target);
  }
  return files;
}

export function checkHardcodedUi() {
  const findings = [];
  for (const file of visitFiles(COMPONENTS_DIR)) {
    const sourceText = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const record = (node, raw) => {
      const value = normalizeText(raw);
      if (!value || isAllowed(value)) return;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      findings.push(`${path.relative(ROOT, file)}:${line}: ${JSON.stringify(value)}`);
    };
    const visit = (node) => {
      if (ts.isJsxText(node)) record(node, node.getText(source));
      if (ts.isJsxAttribute(node) && USER_FACING_ATTRIBUTES.has(node.name.text)
          && node.initializer && ts.isStringLiteral(node.initializer)) {
        record(node, node.initializer.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return findings.sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = checkHardcodedUi();
  if (findings.length) {
    console.error('Hardcoded user-facing strings found outside the reviewed technical allowlist:');
    console.error(findings.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('No unreviewed hardcoded user-facing strings found.');
  }
}
