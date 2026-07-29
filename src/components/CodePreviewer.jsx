import React, { useMemo, useRef, useState } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import ToolHeader from './ui/ToolHeader.jsx';
import {
  CODE_LANGUAGES,
  getDefaultFilename,
  getLineCount,
  getSyntaxTheme,
  highlightCode,
  inferLanguageFromFilename,
  normalizeCodeFilename,
} from './CodePreviewer/lib/codePreviewDomain.js';

const FONT_OPTIONS = [
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'System monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' },
];

function triggerDownload(href, filename) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function CodePreviewer() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [previewType, setPreviewType] = useState('editor');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [backgroundColor, setBackgroundColor] = useState('#111827');
  const [filename, setFilename] = useState(getDefaultFilename('javascript'));
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  const highlightedCode = useMemo(() => highlightCode(code, language), [code, language]);
  const lineCount = getLineCount(code);
  const syntaxTheme = getSyntaxTheme(backgroundColor);

  const handleLanguageChange = (nextLanguage) => {
    const previousDefault = getDefaultFilename(language);
    setLanguage(nextLanguage);
    if (filename === previousDefault) setFilename(getDefaultFilename(nextLanguage));
    setStatus('');
  };

  const handlePreviewTypeChange = (nextType) => {
    setPreviewType(nextType);
    if (nextType === 'terminal' && previewType !== 'terminal') {
      handleLanguageChange('bash');
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setCode(clipboardText);
      setStatus('Pasted code from the clipboard.');
      textareaRef.current?.focus();
    } catch {
      setStatus('Clipboard access was denied. Paste into the editor manually.');
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const nextLanguage = inferLanguageFromFilename(file.name);
      setCode(await file.text());
      setLanguage(nextLanguage);
      setFilename(file.name);
      setStatus(`Loaded ${file.name}.`);
    } catch {
      setStatus('The selected file could not be read.');
    }
  };

  const handleSourceDownload = () => {
    const downloadName = normalizeCodeFilename(filename, language);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, downloadName);
    URL.revokeObjectURL(url);
    setFilename(downloadName);
    setStatus(`Downloaded ${downloadName}.`);
  };

  const handlePngDownload = async () => {
    if (!previewRef.current || !code) return;
    setExporting(true);
    setStatus('Preparing PNG…');
    try {
      const { toPng } = await import('html-to-image');
      const node = previewRef.current;
      const width = Math.min(Math.max(node.scrollWidth, 720), 4096);
      const height = Math.min(Math.max(node.scrollHeight, 320), 16384);
      const dataUrl = await toPng(node, {
        backgroundColor,
        cacheBust: false,
        pixelRatio: 2,
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, maxHeight: 'none' },
        preferredFontFormat: 'woff2',
      });
      const sourceName = normalizeCodeFilename(filename, language);
      const imageName = `${sourceName.replace(/\.[^.]+$/, '') || 'code'}-${previewType}.png`;
      triggerDownload(dataUrl, imageName);
      setStatus(`Downloaded ${imageName}.`);
    } catch {
      setStatus('PNG export failed. Try a shorter code sample or another browser.');
    } finally {
      setExporting(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setStatus('Editor cleared.');
    textareaRef.current?.focus();
  };

  return (
    <Card id="tool-code-preview" variant="tool" size="wide" className="max-w-[1240px]">
      <ToolHeader title="Code Live Preview & Highlighter" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-app/60 p-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handlePaste}>Paste</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload Code
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="text/*,.js,.jsx,.ts,.tsx,.html,.css,.json,.md,.py,.java,.c,.h,.cpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.r,.sql,.yml,.yaml,.sh,.diff,.patch,.graphql,.gql,.lua,.pl"
            onChange={handleFile}
            className="hidden"
            aria-label="Upload code file"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="code-filename" className="sr-only">Download filename</label>
          <input
            id="code-filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            aria-label="Download filename"
          />
          <Button type="button" variant="primary" size="sm" onClick={handleSourceDownload} disabled={!code}>
            Download Source
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handlePngDownload} disabled={!code || exporting}>
            {exporting ? 'Exporting…' : 'Download PNG'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClear} disabled={!code}>Clear</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-app/45 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
          Language
          <select
            value={language}
            onChange={(event) => handleLanguageChange(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-normal text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
          >
            {CODE_LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
          Preview type
          <select
            value={previewType}
            onChange={(event) => handlePreviewTypeChange(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-normal text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
          >
            <option value="editor">Code editor</option>
            <option value="terminal">Terminal</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
          Font
          <select
            value={fontFamily}
            onChange={(event) => setFontFamily(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-normal text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
          >
            {FONT_OPTIONS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
          Background color
          <span className="flex h-[38px] items-center gap-2 rounded-md border border-border bg-card px-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
              className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Preview background color"
            />
            <span className="font-mono text-sm font-normal uppercase text-text-main">{backgroundColor}</span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card lg:h-[580px] lg:grid-cols-2">
        <section className="flex min-h-[420px] min-w-0 flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r" aria-labelledby="code-editor-title">
          <div className="flex min-h-12 items-center justify-between border-b border-border bg-app/70 px-4 py-2">
            <h3 id="code-editor-title" className="text-sm font-bold text-text-main">Code</h3>
            <span className="text-xs tabular-nums text-text-muted">
              {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setStatus('');
            }}
            spellCheck={false}
            wrap="off"
            aria-label="Code editor"
            placeholder="Type or paste code here…"
            className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-sm leading-6 text-text-main outline-none placeholder:text-text-muted/50 focus:ring-0"
          />
        </section>

        <section className="flex min-h-[420px] min-w-0 flex-col lg:min-h-0" aria-labelledby="code-preview-title">
          <div className="flex min-h-12 items-center justify-between border-b border-border bg-app/45 px-4 py-2">
            <h3 id="code-preview-title" className="text-sm font-bold text-text-main">Live preview</h3>
            <span className="text-xs text-text-muted">{previewType === 'terminal' ? 'Terminal' : 'Code editor'}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-slate-950/10 p-4">
            <div
              ref={previewRef}
              data-code-theme={syntaxTheme}
              data-preview-type={previewType}
              className="code-preview-syntax min-h-full min-w-[680px] overflow-hidden rounded-xl shadow-xl"
              style={{ backgroundColor, fontFamily }}
              aria-label="Highlighted code preview"
            >
              <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-black/20 px-4">
                {previewType === 'editor' ? (
                  <>
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
                    <span className="ml-2 truncate text-xs text-current opacity-70">{normalizeCodeFilename(filename, language)}</span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-current opacity-75">Terminal — {CODE_LANGUAGES.find((item) => item.id === language)?.label}</span>
                )}
              </div>
              <div className="flex min-h-[280px] p-5 text-sm leading-6">
                <div className="select-none border-r border-current/15 pr-4 text-right text-current opacity-45" aria-hidden="true">
                  {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
                </div>
                <pre className="m-0 min-w-0 flex-1 overflow-visible pl-4 [font-family:inherit] text-inherit [font-size:inherit] [line-height:inherit]"><code dangerouslySetInnerHTML={{ __html: highlightedCode || '&nbsp;' }} /></pre>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <p>Highlighting and exports stay in your browser. Code is never executed.</p>
        <p role="status" aria-live="polite">{status}</p>
      </div>
    </Card>
  );
}
