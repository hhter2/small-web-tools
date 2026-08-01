import { describe, expect, it } from 'vitest';
import {
  CODE_FILE_LIMIT_BYTES,
  CODE_LANGUAGES,
  getLineCount,
  getSyntaxTheme,
  highlightCode,
  inferLanguageFromFilename,
  normalizeCodeFilename,
} from '../components/CodePreviewer/lib/codePreviewDomain.js';

const HIGHLIGHT_FIXTURES = {
  plaintext: 'plain text <remains safe>',
  bash: '#!/usr/bin/env bash\nname="world"\necho "$name"',
  javascript: 'const message = "hello";\nconsole.log(message);',
  typescript: 'interface User { id: number }\nconst user: User = { id: 1 };',
  html: '<main class="content">Hello</main>',
  css: '.content { color: rebeccapurple; }',
  json: '{"enabled": true, "count": 2}',
  markdown: '# Heading\n\n**bold text**',
  python: 'def greet(name):\n    return f"Hello {name}"',
  java: 'public class Main { public static void main(String[] args) {} }',
  c: '#include <stdio.h>\nint main(void) { return 0; }',
  cpp: '#include <iostream>\nint main() { return 0; }',
  csharp: 'public class Program { static void Main() { var value = true; } }',
  go: 'package main\nfunc main() { value := true }',
  rust: 'fn main() { let value: bool = true; }',
  php: '<?php $message = "hello"; echo $message; ?>',
  ruby: 'def greet(name)\n  puts "Hello #{name}"\nend',
  swift: 'let message: String = "hello"\nprint(message)',
  kotlin: 'fun main() { val message: String = "hello" }',
  r: 'greet <- function(name) { paste("Hello", name) }',
  sql: 'SELECT id, name FROM users WHERE active = TRUE;',
  yaml: 'service:\n  enabled: true\n  ports:\n    - 8080',
  diff: '@@ -1 +1 @@\n-old value\n+new value',
  graphql: 'query User($id: ID!) { user(id: $id) { name } }',
  lua: 'local function greet(name)\n  return "Hello " .. name\nend',
  perl: 'my $message = "hello";\nprint $message;',
};

const EXPECTED_TOKEN_CLASSES = {
  bash: 'meta',
  javascript: 'keyword',
  typescript: 'keyword',
  html: 'name',
  css: 'selector-class',
  json: 'attr',
  markdown: 'section',
  python: 'keyword',
  java: 'keyword',
  c: 'meta',
  cpp: 'meta',
  csharp: 'keyword',
  go: 'keyword',
  rust: 'keyword',
  php: 'meta',
  ruby: 'keyword',
  swift: 'keyword',
  kotlin: 'keyword',
  r: 'keyword',
  sql: 'keyword',
  yaml: 'attr',
  diff: 'addition',
  graphql: 'keyword',
  lua: 'keyword',
  perl: 'keyword',
};

describe('code preview domain', () => {
  it('registers a broad language set including terminal syntaxes', () => {
    expect(CODE_LANGUAGES.length).toBeGreaterThanOrEqual(25);
    expect(CODE_LANGUAGES.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'bash',
      'javascript',
      'python',
      'sql',
    ]));
  });

  it('highlights code while escaping source HTML', () => {
    const result = highlightCode('const value = "<script>";', 'javascript');
    expect(result).toContain('hljs-keyword');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });

  it('highlights C++ preprocessor directives and keywords', () => {
    const result = highlightCode('#include <iostream>\nint main() { return 0; }', 'cpp');
    expect(result).toContain('hljs-meta');
    expect(result).toContain('hljs-keyword');
    expect(result).toContain('&lt;iostream&gt;');
  });

  it('has a working representative highlight fixture for every selectable language', () => {
    expect(Object.keys(HIGHLIGHT_FIXTURES).sort())
      .toEqual(CODE_LANGUAGES.map(({ id }) => id).sort());
    expect(Object.keys(EXPECTED_TOKEN_CLASSES).sort())
      .toEqual(CODE_LANGUAGES.filter(({ id }) => id !== 'plaintext').map(({ id }) => id).sort());

    for (const { id, label } of CODE_LANGUAGES) {
      const result = highlightCode(HIGHLIGHT_FIXTURES[id], id);
      expect(result, label).toBeTruthy();
      if (id === 'plaintext') {
        expect(result, label).toContain('&lt;remains safe&gt;');
      } else {
        expect(result, label).toContain(`hljs-${EXPECTED_TOKEN_CLASSES[id]}`);
      }
    }
  });

  it('normalizes downloads and infers languages from files', () => {
    expect(normalizeCodeFilename('../demo', 'python')).toBe('demo.py');
    expect(normalizeCodeFilename('query.sql', 'sql')).toBe('query.sql');
    expect(inferLanguageFromFilename('component.tsx')).toBe('typescript');
    expect(inferLanguageFromFilename('unknown.custom')).toBe('plaintext');
  });

  it('keeps the code upload limit bounded', () => {
    expect(CODE_FILE_LIMIT_BYTES).toBe(2 * 1024 * 1024);
  });

  it('keeps line numbering and syntax contrast deterministic', () => {
    expect(getLineCount('')).toBe(1);
    expect(getLineCount('one\ntwo\n')).toBe(3);
    expect(getSyntaxTheme('#ffffff')).toBe('light');
    expect(getSyntaxTheme('#111827')).toBe('dark');
  });
});
