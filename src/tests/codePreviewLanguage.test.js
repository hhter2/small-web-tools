import { describe, expect, it } from 'vitest';
import {
  highlightCode,
  normalizeCodeLanguage,
} from '../components/CodePreviewer/lib/codePreviewDomain.js';

describe('code preview language normalization', () => {
  it('normalizes common Markdown fence aliases', () => {
    expect(normalizeCodeLanguage('js')).toBe('javascript');
    expect(normalizeCodeLanguage('tsx')).toBe('typescript');
    expect(normalizeCodeLanguage('shell')).toBe('bash');
    expect(normalizeCodeLanguage('py')).toBe('python');
    expect(normalizeCodeLanguage('yml')).toBe('yaml');
    expect(normalizeCodeLanguage('text')).toBe('plaintext');
  });

  it('falls back to escaped plain text for unsupported languages', () => {
    expect(normalizeCodeLanguage('unsupported-language')).toBe('plaintext');
    const highlighted = highlightCode('<script>alert(1)</script>', 'unsupported-language');
    expect(highlighted).toContain('&lt;script&gt;');
    expect(highlighted).not.toContain('<script>');
  });

  it('returns token-level markup for supported languages', () => {
    const highlighted = highlightCode('const value = 42;', 'js');
    expect(highlighted).toContain('hljs-keyword');
    expect(highlighted).toContain('hljs-number');
  });
});
