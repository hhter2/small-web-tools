import { describe, expect, it } from 'vitest';
import {
  CODE_LANGUAGES,
  getLineCount,
  getSyntaxTheme,
  highlightCode,
  inferLanguageFromFilename,
  normalizeCodeFilename,
} from '../components/CodePreviewer/lib/codePreviewDomain.js';

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

  it('normalizes downloads and infers languages from files', () => {
    expect(normalizeCodeFilename('../demo', 'python')).toBe('demo.py');
    expect(normalizeCodeFilename('query.sql', 'sql')).toBe('query.sql');
    expect(inferLanguageFromFilename('component.tsx')).toBe('typescript');
    expect(inferLanguageFromFilename('unknown.custom')).toBe('plaintext');
  });

  it('keeps line numbering and syntax contrast deterministic', () => {
    expect(getLineCount('')).toBe(1);
    expect(getLineCount('one\ntwo\n')).toBe(3);
    expect(getSyntaxTheme('#ffffff')).toBe('light');
    expect(getSyntaxTheme('#111827')).toBe('dark');
  });
});
