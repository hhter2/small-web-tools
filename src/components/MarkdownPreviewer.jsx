import React, { useMemo, useRef, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  MARKDOWN_FILE_LIMIT_BYTES,
  normalizeMarkdownFilename,
  parseMarkdown,
} from './MarkdownPreviewer/lib/markdownDomain';

function InlinePreview({ tokens }) {
  return tokens.map((token, index) => {
    const key = `${token.type}-${index}`;
    if (token.type === 'code') {
      return <code key={key} className="rounded bg-app px-1.5 py-0.5 font-mono text-[0.9em] text-accent">{token.value}</code>;
    }
    if (token.type === 'strong') return <strong key={key}>{token.value}</strong>;
    if (token.type === 'emphasis') return <em key={key}>{token.value}</em>;
    if (token.type === 'strike') return <del key={key}>{token.value}</del>;
    if (token.type === 'link') {
      return token.href ? (
        <a
          key={key}
          href={token.href}
          target={/^https?:/i.test(token.href) ? '_blank' : undefined}
          rel={/^https?:/i.test(token.href) ? 'noreferrer' : undefined}
          className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:text-accent-hover"
        >
          {token.value}
        </a>
      ) : <span key={key}>{token.value}</span>;
    }
    if (token.type === 'image') {
      return (
        <span key={key} className="inline-flex rounded border border-border bg-app px-2 py-1 text-xs text-text-muted">
          Image: {token.alt}
        </span>
      );
    }
    return <React.Fragment key={key}>{token.value}</React.Fragment>;
  });
}

function MarkdownPreview({ blocks, previewRef, onScroll }) {
  if (blocks.length === 0) {
    return (
      <div
        ref={previewRef}
        onScroll={onScroll}
        aria-label="Markdown preview"
        className="flex h-full min-h-0 items-center justify-center overflow-auto p-8 text-center text-sm text-text-muted"
      >
        The rendered preview will appear here.
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      onScroll={onScroll}
      aria-label="Markdown preview"
      className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-5 text-[0.95rem] leading-7 text-text-main"
    >
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const classes = {
            1: 'text-3xl',
            2: 'text-2xl',
            3: 'text-xl',
            4: 'text-lg',
            5: 'text-base',
            6: 'text-sm',
          };
          return React.createElement(
            `h${block.level}`,
            { key, className: `${classes[block.level]} font-extrabold leading-tight text-text-main` },
            <InlinePreview tokens={block.inline} />,
          );
        }
        if (block.type === 'paragraph') {
          return <p key={key} className="whitespace-pre-wrap"><InlinePreview tokens={block.inline} /></p>;
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={key} className="whitespace-pre-wrap border-l-4 border-accent bg-accent-light/40 px-4 py-2 text-text-muted">
              <InlinePreview tokens={block.inline} />
            </blockquote>
          );
        }
        if (block.type === 'rule') return <hr key={key} className="border-border" />;
        if (block.type === 'codeBlock') {
          return (
            <div key={key} className="overflow-hidden rounded-lg border border-border bg-app">
              {block.language && (
                <div className="border-b border-border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-text-muted">
                  {block.language}
                </div>
              )}
              <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{block.value}</code></pre>
            </div>
          );
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={key} className={`space-y-1 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className={item.task ? 'list-none' : ''}>
                  {item.task && (
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      aria-label={item.checked ? 'Completed task' : 'Incomplete task'}
                      className="mr-2 accent-accent"
                    />
                  )}
                  <InlinePreview tokens={item.inline} />
                </li>
              ))}
            </ListTag>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={key} className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead className="bg-app">
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th
                        key={`${key}-head-${cellIndex}`}
                        className="border-b border-border px-3 py-2 font-bold"
                        style={{ textAlign: block.alignments[cellIndex] || 'left' }}
                      >
                        <InlinePreview tokens={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${key}-row-${rowIndex}`} className="border-b border-border last:border-b-0">
                      {block.header.map((_, cellIndex) => (
                        <td
                          key={`${key}-cell-${rowIndex}-${cellIndex}`}
                          className="px-3 py-2 align-top"
                          style={{ textAlign: block.alignments[cellIndex] || 'left' }}
                        >
                          <InlinePreview tokens={row[cellIndex] || []} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

const FORMAT_ACTIONS = [
  { label: 'Heading', prefix: '## ', suffix: '', placeholder: 'Heading' },
  { label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { label: 'Italic', prefix: '*', suffix: '*', placeholder: 'italic text' },
  { label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
  { label: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
];

export default function MarkdownPreviewer() {
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('document.md');
  const [status, setStatus] = useState('');
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeScrollRef = useRef(null);
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  const syncScroll = (source, target, sourceName) => {
    if (!source || !target || activeScrollRef.current === sourceName) {
      activeScrollRef.current = null;
      return;
    }

    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    const progress = sourceRange > 0 ? source.scrollTop / sourceRange : 0;
    activeScrollRef.current = sourceName === 'editor' ? 'preview' : 'editor';
    target.scrollTop = progress * Math.max(targetRange, 0);
    requestAnimationFrame(() => {
      activeScrollRef.current = null;
    });
  };

  const insertFormat = ({ prefix, suffix, placeholder }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;
    setMarkdown(`${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`);
    setStatus('Formatting applied.');
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMarkdown(text);
      setStatus('Pasted Markdown from the clipboard.');
    } catch {
      setStatus('Clipboard access was denied. Paste directly into the editor instead.');
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(?:md|markdown)$/i.test(file.name)) {
      setStatus('Choose a .md or .markdown file.');
      return;
    }
    if (file.size > MARKDOWN_FILE_LIMIT_BYTES) {
      setStatus('The Markdown file must be 2 MiB or smaller.');
      return;
    }

    try {
      setMarkdown(await file.text());
      setFilename(normalizeMarkdownFilename(file.name));
      setStatus(`Loaded ${file.name}.`);
    } catch {
      setStatus('The Markdown file could not be read.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = normalizeMarkdownFilename(filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${anchor.download}.`);
  };

  const handleClear = () => {
    setMarkdown('');
    setFilename('document.md');
    setStatus('Editor cleared.');
    textareaRef.current?.focus();
  };

  return (
    <Card id="tool-markdown" variant="tool" size="wide" className="max-w-[1180px]">
      <ToolHeader title="Markdown Previewer" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-app/60 p-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handlePaste}>
            Paste
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload Markdown
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={handleFile}
            className="hidden"
            aria-label="Upload Markdown file"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="markdown-filename" className="sr-only">Download filename</label>
          <input
            id="markdown-filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            aria-label="Download filename"
          />
          <Button type="button" variant="primary" size="sm" onClick={handleDownload} disabled={!markdown}>
            Download .md
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClear} disabled={!markdown}>
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Markdown formatting">
        {FORMAT_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => insertFormat(action)}
            aria-label={`Format as ${action.label}`}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card lg:h-[560px] lg:grid-cols-2">
        <section className="flex min-h-[420px] min-w-0 flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r" aria-labelledby="markdown-editor-title">
          <div className="flex min-h-12 items-center justify-between border-b border-border bg-app/70 px-4 py-2">
            <h3 id="markdown-editor-title" className="text-sm font-bold text-text-main">Markdown</h3>
            <span className="text-xs tabular-nums text-text-muted">{markdown.length.toLocaleString()} characters</span>
          </div>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setStatus('');
            }}
            onScroll={(event) => syncScroll(event.currentTarget, previewRef.current, 'editor')}
            spellCheck={false}
            aria-label="Markdown editor"
            placeholder="Type or paste Markdown here..."
            className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-sm leading-6 text-text-main outline-none placeholder:text-text-muted/50 focus:ring-0"
          />
        </section>

        <section className="flex min-h-[420px] min-w-0 flex-col bg-accent-light/10 lg:min-h-0" aria-labelledby="markdown-preview-title">
          <div className="flex min-h-12 items-center border-b border-border bg-app/45 px-4 py-2">
            <h3 id="markdown-preview-title" className="text-sm font-bold text-text-main">Preview</h3>
          </div>
          <div className="min-h-0 flex-1">
            <MarkdownPreview
              blocks={blocks}
              previewRef={previewRef}
              onScroll={(event) => syncScroll(event.currentTarget, textareaRef.current, 'preview')}
            />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <p>Preview stays in your browser. Raw HTML and external images are not rendered.</p>
        <p role="status" aria-live="polite">{status}</p>
      </div>
    </Card>
  );
}
