import { describe, expect, it } from 'vitest';
import { createGitignoreMatcher, escapeXml } from '../lib/folderAnalyzerUtils';

describe('Folder Analyzer utilities', () => {
  it('escapes XML metacharacters in exported labels', () => {
    expect(escapeXml(`<svg onload="x">a&b's`)).toBe('&lt;svg onload=&quot;x&quot;&gt;a&amp;b&apos;s');
  });

  it('uses gitignore semantics for globstar, directories, negation, and escaped markers', () => {
    const matches = createGitignoreMatcher([
      'dist/',
      '**/*.log',
      '!keep.log',
      '\\#literal',
      '\\!important',
      'src/[ab]?.js',
    ].join('\n'));

    expect(matches('root/dist/app.js')).toBe(true);
    expect(matches('root/a/b/error.log')).toBe(true);
    expect(matches('root/keep.log')).toBe(false);
    expect(matches('root/#literal')).toBe(true);
    expect(matches('root/!important')).toBe(true);
    expect(matches('root/src/a1.js')).toBe(true);
    expect(matches('root/src/c1.js')).toBe(false);
  });

  it('normalizes Windows separators relative to the selected root', () => {
    const matches = createGitignoreMatcher('/build\n');
    expect(matches('root\\build\\output.js')).toBe(true);
    expect(matches('root\\nested\\build\\output.js')).toBe(false);
  });
});
