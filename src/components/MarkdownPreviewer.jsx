import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  MARKDOWN_FILE_LIMIT_BYTES,
  normalizeMarkdownFilename,
  parseMarkdown,
} from './MarkdownPreviewer/lib/markdownDomain';

function InlinePreview({ tokens }) {
  const { t } = useTranslation('tools');
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
          {t('tool-markdown.ui.imagePlaceholder', { alt: token.alt })}
        </span>
      );
    }
    return <React.Fragment key={key}>{token.value}</React.Fragment>;
  });
}

function MarkdownPreview({ blocks, previewRef, onScroll }) {
  const { t } = useTranslation('tools');
  if (blocks.length === 0) {
    return (
      <div
        ref={previewRef}
        onScroll={onScroll}
        aria-label={t('tool-markdown.ui.previewAria')}
        className="flex h-full min-h-0 items-center justify-center overflow-auto p-8 text-center text-sm text-text-muted"
      >
        {t('tool-markdown.ui.emptyPreview')}
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      onScroll={onScroll}
      aria-label={t('tool-markdown.ui.previewAria')}
      className="relative h-full min-h-0 space-y-4 overflow-auto p-5 text-[0.95rem] leading-7 text-text-main"
    >
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        const sourceProps = {
          'data-source-start-line': block.startLine,
          'data-source-end-line': block.endLine,
        };
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
            {
              key,
              ...sourceProps,
              className: `${classes[block.level]} font-extrabold leading-tight text-text-main`,
            },
            <InlinePreview tokens={block.inline} />,
          );
        }
        if (block.type === 'paragraph') {
          return <p key={key} {...sourceProps} className="whitespace-pre-wrap"><InlinePreview tokens={block.inline} /></p>;
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={key} {...sourceProps} className="whitespace-pre-wrap border-l-4 border-accent bg-accent-light/40 px-4 py-2 text-text-muted">
              <InlinePreview tokens={block.inline} />
            </blockquote>
          );
        }
        if (block.type === 'rule') return <hr key={key} {...sourceProps} className="border-border" />;
        if (block.type === 'codeBlock') {
          return (
            <div key={key} {...sourceProps} className="overflow-hidden rounded-lg border border-border bg-app">
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
            <ListTag key={key} {...sourceProps} className={`space-y-1 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className={item.task ? 'list-none' : ''}>
                  {item.task && (
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      aria-label={t(item.checked
                        ? 'tool-markdown.ui.completedTask'
                        : 'tool-markdown.ui.incompleteTask')}
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
            <div key={key} {...sourceProps} className="overflow-x-auto rounded-lg border border-border">
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
  { key: 'heading', prefix: '## ', suffix: '' },
  { key: 'bold', prefix: '**', suffix: '**' },
  { key: 'italic', prefix: '*', suffix: '*' },
  { key: 'link', prefix: '[', suffix: '](url)' },
  { key: 'code', prefix: '`', suffix: '`' },
];

export default function MarkdownPreviewer() {
  const { t, i18n } = useTranslation('tools');
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('document.md');
  const [status, setStatus] = useState('');
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeScrollRef = useRef(null);
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  const syncEditorToPreview = (editor, preview) => {
    if (!editor || !preview || activeScrollRef.current === 'editor') {
      activeScrollRef.current = null;
      return;
    }

    const line = editor.scrollTop / 24;
    const elements = [...preview.querySelectorAll('[data-source-start-line]')];
    const element = elements.find((candidate) => (
      line >= Number(candidate.dataset.sourceStartLine)
      && line <= Number(candidate.dataset.sourceEndLine)
    )) || elements.findLast((candidate) => line >= Number(candidate.dataset.sourceStartLine));

    if (!element) return;
    const startLine = Number(element.dataset.sourceStartLine);
    const endLine = Number(element.dataset.sourceEndLine);
    const lineSpan = Math.max(endLine - startLine, 1);
    const progress = Math.min(Math.max((line - startLine) / lineSpan, 0), 1);
    const targetRange = preview.scrollHeight - preview.clientHeight;
    activeScrollRef.current = 'preview';
    preview.scrollTop = Math.min(element.offsetTop + (progress * element.offsetHeight), targetRange);
    requestAnimationFrame(() => {
      activeScrollRef.current = null;
    });
  };

  const syncPreviewToEditor = (preview, editor) => {
    if (!preview || !editor || activeScrollRef.current === 'preview') {
      activeScrollRef.current = null;
      return;
    }

    const elements = [...preview.querySelectorAll('[data-source-start-line]')];
    const element = elements.findLast((candidate) => candidate.offsetTop <= preview.scrollTop)
      || elements[0];
    if (!element) return;

    const startLine = Number(element.dataset.sourceStartLine);
    const endLine = Number(element.dataset.sourceEndLine);
    const progress = element.offsetHeight > 0
      ? Math.min(Math.max((preview.scrollTop - element.offsetTop) / element.offsetHeight, 0), 1)
      : 0;
    const line = startLine + (progress * Math.max(endLine - startLine, 0));
    const targetRange = editor.scrollHeight - editor.clientHeight;
    activeScrollRef.current = 'editor';
    editor.scrollTop = Math.min(line * 24, targetRange);
    requestAnimationFrame(() => {
      activeScrollRef.current = null;
    });
  };

  const insertFormat = ({ key, prefix, suffix }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.slice(start, end) || t(`tool-markdown.ui.format.${key}.placeholder`);
    const replacement = `${prefix}${selected}${suffix}`;
    setMarkdown(`${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`);
    setStatus(t('tool-markdown.ui.status.formatApplied'));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMarkdown(text);
      setStatus(t('tool-markdown.ui.status.pasted'));
    } catch {
      setStatus(t('tool-markdown.ui.status.clipboardDenied'));
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(?:md|markdown)$/i.test(file.name)) {
      setStatus(t('tool-markdown.ui.status.invalidFile'));
      return;
    }
    if (file.size > MARKDOWN_FILE_LIMIT_BYTES) {
      setStatus(t('tool-markdown.ui.status.fileTooLarge'));
      return;
    }

    try {
      setMarkdown(await file.text());
      setFilename(normalizeMarkdownFilename(file.name));
      setStatus(t('tool-markdown.ui.status.loaded', { filename: file.name }));
    } catch {
      setStatus(t('tool-markdown.ui.status.readFailed'));
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
    setStatus(t('tool-markdown.ui.status.downloaded', { filename: anchor.download }));
  };

  const handleClear = () => {
    setMarkdown('');
    setFilename('document.md');
    setStatus(t('tool-markdown.ui.status.cleared'));
    textareaRef.current?.focus();
  };

  return (
    <Card id="tool-markdown" variant="tool" size="wide" className="max-w-[1180px]">
      <ToolHeader title={t('tool-markdown.title')} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-app/60 p-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handlePaste}>
            {t('tool-markdown.ui.paste')}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t('tool-markdown.ui.upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={handleFile}
            className="hidden"
            aria-label={t('tool-markdown.ui.uploadAria')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="markdown-filename" className="sr-only">{t('tool-markdown.ui.downloadFilename')}</label>
          <input
            id="markdown-filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            aria-label={t('tool-markdown.ui.downloadFilename')}
          />
          <Button type="button" variant="primary" size="sm" onClick={handleDownload} disabled={!markdown}>
            {t('tool-markdown.ui.download')}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClear} disabled={!markdown}>
            {t('tool-markdown.ui.clear')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="toolbar" aria-label={t('tool-markdown.ui.formattingAria')}>
        {FORMAT_ACTIONS.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => insertFormat(action)}
            aria-label={t('tool-markdown.ui.formatAs', {
              format: t(`tool-markdown.ui.format.${action.key}.label`),
            })}
          >
            {t(`tool-markdown.ui.format.${action.key}.label`)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card lg:h-[560px] lg:grid-cols-2">
        <section className="flex min-h-[420px] min-w-0 flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r" aria-labelledby="markdown-editor-title">
          <div className="flex min-h-12 items-center justify-between border-b border-border bg-app/70 px-4 py-2">
            <h3 id="markdown-editor-title" className="text-sm font-bold text-text-main">{t('tool-markdown.ui.editorTitle')}</h3>
            <span className="text-xs tabular-nums text-text-muted">{t('tool-markdown.ui.characterCount', {
              count: markdown.length.toLocaleString(i18n.language),
            })}</span>
          </div>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setStatus('');
            }}
            onScroll={(event) => syncEditorToPreview(event.currentTarget, previewRef.current)}
            spellCheck={false}
            wrap="off"
            aria-label={t('tool-markdown.ui.editorAria')}
            placeholder={t('tool-markdown.ui.editorPlaceholder')}
            className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-sm leading-6 text-text-main outline-none placeholder:text-text-muted/50 focus:ring-0"
          />
        </section>

        <section className="flex min-h-[420px] min-w-0 flex-col bg-accent-light/10 lg:min-h-0" aria-labelledby="markdown-preview-title">
          <div className="flex min-h-12 items-center border-b border-border bg-app/45 px-4 py-2">
            <h3 id="markdown-preview-title" className="text-sm font-bold text-text-main">{t('tool-markdown.ui.previewTitle')}</h3>
          </div>
          <div className="min-h-0 flex-1">
            <MarkdownPreview
              blocks={blocks}
              previewRef={previewRef}
              onScroll={(event) => syncPreviewToEditor(event.currentTarget, textareaRef.current)}
            />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <p>{t('tool-markdown.ui.privacyNote')}</p>
        <p role="status" aria-live="polite">{status}</p>
      </div>
    </Card>
  );
}
