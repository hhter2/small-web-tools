import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import jsonValidator from 'json-dup-key-validator';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const LOCALES = ['en-US', 'zh-TW'];

function flatten(value, prefix = '', result = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, result));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      flatten(child, prefix ? `${prefix}.${key}` : key, result);
    });
  } else {
    result.set(prefix, value);
  }
  return result;
}

function interpolationVariables(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
}

export function validateNamespacePair(namespace, english, chinese) {
  const errors = [];
  const en = flatten(english);
  const zh = flatten(chinese);
  for (const key of en.keys()) if (!zh.has(key)) errors.push(`${namespace}: zh-TW is missing ${key}`);
  for (const key of zh.keys()) if (!en.has(key)) errors.push(`${namespace}: zh-TW has unexpected ${key}`);
  for (const [key, enValue] of en) {
    const zhValue = zh.get(key);
    if (typeof enValue === 'string' && !enValue.trim()) errors.push(`${namespace}: en-US ${key} is empty`);
    if (typeof zhValue === 'string' && !zhValue.trim()) errors.push(`${namespace}: zh-TW ${key} is empty`);
    if (zh.has(key) && JSON.stringify(interpolationVariables(enValue)) !== JSON.stringify(interpolationVariables(zhValue))) {
      errors.push(`${namespace}: interpolation variables differ at ${key}`);
    }
  }
  return errors;
}

function readJson(file) {
  const source = fs.readFileSync(file, 'utf8');
  const validationError = jsonValidator.validate(source, false);
  if (validationError) throw new Error(`${path.relative(ROOT, file)}: ${validationError.message ?? validationError}`);
  return jsonValidator.parse(source, false);
}

function getByPath(value, keyPath) {
  return keyPath.split('.').reduce((current, key) => current?.[key], value);
}

export function checkI18n() {
  const errors = [];
  const namespaceFiles = fs.readdirSync(path.join(LOCALES_DIR, LOCALES[0]))
    .filter((file) => file.endsWith('.json')).sort();
  const resources = Object.fromEntries(LOCALES.map((locale) => [locale, {}]));

  for (const locale of LOCALES) {
    const files = fs.readdirSync(path.join(LOCALES_DIR, locale)).filter((file) => file.endsWith('.json')).sort();
    if (JSON.stringify(files) !== JSON.stringify(namespaceFiles)) {
      errors.push(`${locale}: namespace files differ from en-US`);
    }
    for (const file of files) {
      const namespace = path.basename(file, '.json');
      resources[locale][namespace] = readJson(path.join(LOCALES_DIR, locale, file));
    }
  }

  for (const namespace of namespaceFiles.map((file) => path.basename(file, '.json'))) {
    errors.push(...validateNamespacePair(namespace, resources['en-US'][namespace], resources['zh-TW'][namespace]));
  }

  const sourceFiles = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.[jt]sx?$/.test(entry.name)) sourceFiles.push(target);
    }
  };
  visit(path.join(ROOT, 'src'));
  const explicitKeyPattern = /\bt\(\s*['"]([\w-]+):([\w.-]+)['"]/g;
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(explicitKeyPattern)) {
      const [, namespace, key] = match;
      if (!resources['en-US'][namespace] || getByPath(resources['en-US'][namespace], key) === undefined) {
        errors.push(`${path.relative(ROOT, file)}: unknown translation ${namespace}:${key}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = checkI18n();
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('i18n resources are valid and synchronized.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
