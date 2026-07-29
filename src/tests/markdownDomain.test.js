import { describe, expect, it } from 'vitest';
import {
  normalizeMarkdownFilename,
  parseMarkdown,
  sanitizeMarkdownLink,
  tokenizeInlineMarkdown,
} from '../components/MarkdownPreviewer/lib/markdownDomain.js';

describe('Markdown preview domain', () => {
  it('parses headings, paragraphs, quotes, rules, lists, and fenced code', () => {
    const blocks = parseMarkdown([
      '# Title',
      '',
      'A **bold** paragraph.',
      '',
      '> Quoted text',
      '',
      '- [x] Complete',
      '- Pending',
      '',
      '---',
      '',
      '```js',
      'const value = 1;',
      '```',
    ].join('\n'));

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'quote',
      'list',
      'rule',
      'codeBlock',
    ]);
    expect(blocks[3].items).toMatchObject([
      { task: true, checked: true },
      { task: false, checked: false },
    ]);
    expect(blocks[5]).toMatchObject({ language: 'js', value: 'const value = 1;' });
    expect(blocks[5]).toMatchObject({ startLine: 11, endLine: 13 });
  });

  it('parses tables with column alignment', () => {
    const [table] = parseMarkdown([
      '| Name | Score |',
      '| :--- | ---: |',
      '| Alice | 10 |',
    ].join('\n'));

    expect(table.type).toBe('table');
    expect(table.alignments).toEqual(['left', 'right']);
    expect(table.rows).toHaveLength(1);
  });

  it('tokenizes inline Markdown while rejecting unsafe links', () => {
    const tokens = tokenizeInlineMarkdown(
      '**bold** *italic* `code` [safe](https://example.com) [unsafe](javascript:alert(1))',
    );

    expect(tokens.map((token) => token.type)).toEqual([
      'strong',
      'text',
      'emphasis',
      'text',
      'code',
      'text',
      'link',
      'text',
      'link',
      'text',
    ]);
    expect(tokens.filter((token) => token.type === 'link').map((token) => token.href))
      .toEqual(['https://example.com', null]);
    expect(sanitizeMarkdownLink('data:text/html,unsafe')).toBeNull();
    expect(sanitizeMarkdownLink('docs/guide.md')).toBe('docs/guide.md');
    expect(sanitizeMarkdownLink('//tracking.example')).toBeNull();
  });

  it('normalizes downloaded Markdown filenames', () => {
    expect(normalizeMarkdownFilename('notes.markdown')).toBe('notes.md');
    expect(normalizeMarkdownFilename('../draft:*?.md')).toBe('..-draft.md');
    expect(normalizeMarkdownFilename('   ')).toBe('document.md');
  });
});
