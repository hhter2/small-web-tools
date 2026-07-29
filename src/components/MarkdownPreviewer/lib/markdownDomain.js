const TABLE_DELIMITER_PATTERN = /^:?-{3,}:?$/;

export const MARKDOWN_FILE_LIMIT_BYTES = 2 * 1024 * 1024;

export function sanitizeMarkdownLink(value) {
  const href = value.trim();
  if (!href || href.startsWith('//') || /[\u0000-\u001f\s]/.test(href)) return null;
  const scheme = href.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !['http', 'https', 'mailto'].includes(scheme)) return null;
  return href;
}

export function normalizeMarkdownFilename(value) {
  const withoutExtension = value.trim().replace(/\.(?:md|markdown)$/i, '');
  const safeBase = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.\s-]+$/g, '')
    .slice(0, 120);
  return `${safeBase || 'document'}.md`;
}

export function tokenizeInlineMarkdown(value) {
  const tokens = [];
  const pattern = /(`[^`\n]+`|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: 'text', value: value.slice(cursor, index) });

    const raw = match[0];
    if (raw.startsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('![')) {
      tokens.push({
        type: 'image',
        alt: match[2] || 'Image',
        href: sanitizeMarkdownLink(match[3] || ''),
      });
    } else if (raw.startsWith('[')) {
      tokens.push({
        type: 'link',
        value: match[4] || '',
        href: sanitizeMarkdownLink(match[5] || ''),
      });
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      tokens.push({ type: 'strong', value: match[6] || match[7] || '' });
    } else if (raw.startsWith('~~')) {
      tokens.push({ type: 'strike', value: match[8] || '' });
    } else {
      tokens.push({ type: 'emphasis', value: match[9] || match[10] || '' });
    }
    cursor = index + raw.length;
  }

  if (cursor < value.length) tokens.push({ type: 'text', value: value.slice(cursor) });
  return tokens;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDelimiter(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_DELIMITER_PATTERN.test(cell));
}

function parseListItem(line) {
  const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
  const content = unordered?.[1] || ordered?.[1];
  if (!content) return null;

  const task = content.match(/^\[([ xX])\]\s+(.+)$/);
  return {
    ordered: Boolean(ordered),
    task: Boolean(task),
    checked: task ? task[1].toLowerCase() === 'x' : false,
    inline: tokenizeInlineMarkdown(task ? task[2] : content),
  };
}

export function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'codeBlock', language: fence[1] || '', value: code.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        inline: tokenizeInlineMarkdown(heading[2].replace(/\s+#+\s*$/, '')),
      });
      index += 1;
      continue;
    }

    if (/^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && isTableDelimiter(lines[index + 1])) {
      const header = splitTableRow(line).map(tokenizeInlineMarkdown);
      const alignments = splitTableRow(lines[index + 1]).map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]).map(tokenizeInlineMarkdown));
        index += 1;
      }
      blocks.push({ type: 'table', header, alignments, rows });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', inline: tokenizeInlineMarkdown(quote.join('\n')) });
      continue;
    }

    const firstListItem = parseListItem(line);
    if (firstListItem) {
      const items = [firstListItem];
      index += 1;
      while (index < lines.length) {
        const nextItem = parseListItem(lines[index]);
        if (!nextItem || nextItem.ordered !== firstListItem.ordered) break;
        items.push(nextItem);
        index += 1;
      }
      blocks.push({ type: 'list', ordered: firstListItem.ordered, items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(?:#{1,6}\s+|\s*```|\s*>|\s*[-+*]\s+|\s*\d+[.)]\s+)/.test(lines[index])
      && !(lines[index].includes('|') && index + 1 < lines.length && isTableDelimiter(lines[index + 1]))
    ) {
      const previous = paragraph[paragraph.length - 1];
      paragraph[paragraph.length - 1] = previous.endsWith('  ') ? `${previous.trimEnd()}\n` : `${previous} `;
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', inline: tokenizeInlineMarkdown(paragraph.join('').trim()) });
  }

  return blocks;
}
