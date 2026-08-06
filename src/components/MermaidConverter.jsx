import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import Card from './ui/Card';
import FullscreenPreview, { FullscreenPreviewButton } from './ui/FullscreenPreview';
import ToolHeader from './ui/ToolHeader';
import {
  PNG_SCALES,
  downloadBlob,
  normalizeMermaidFilename,
  renderMermaidToSvg,
  svgToPngBlob,
} from './MermaidConverter/lib/mermaidDomain.js';

const SAMPLE = `flowchart LR
Start[Write Mermaid]
Preview[Preview locally]
Export{Export}
SVG[SVG]
PNG[PNG]
Start --> Preview
Preview --> Export
Export --> SVG
Export --> PNG`;

function SvgPreview({ render, label, className = '', previewRef }) {
  if (!render) {
    return <div ref={previewRef} className={`flex h-full min-h-0 items-center justify-center p-8 text-center text-sm text-text-muted ${className}`}>{label}</div>;
  }
  return <div ref={previewRef} className={`h-full min-h-0 overflow-auto p-5 ${className}`} aria-label={label}><div className="mx-auto w-fit max-w-full" dangerouslySetInnerHTML={{ __html: render.svg }} /></div>;
}

export default function MermaidConverter() {
  const { t, i18n } = useTranslation('tools');
  const [source, setSource] = useState(SAMPLE);
  const [filename, setFilename] = useState('diagram.mmd');
  const [background, setBackground] = useState('#ffffff');
  const [pngScale, setPngScale] = useState(2);
  const [render, setRender] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [focusedPanel, setFocusedPanel] = useState(null);
  const renderSequence = useRef(0);
  const previewRef = useRef(null);
  const fullscreenPreviewRef = useRef(null);
  const textareaRef = useRef(null);
  const fullscreenTextareaRef = useRef(null);

  const characterCount = useMemo(() => source.length.toLocaleString(i18n.language), [i18n.language, source.length]);

  const performRender = useCallback(() => {
    const sequence = ++renderSequence.current;
    setError('');
    setStatus(t('tool-mermaid.ui.status.rendering'));
    requestAnimationFrame(() => {
      try {
        const next = renderMermaidToSvg(source, { background });
        if (sequence !== renderSequence.current) return;
        setRender(next);
        setStatus(t('tool-mermaid.ui.status.rendered'));
      } catch (cause) {
        if (sequence !== renderSequence.current) return;
        setRender(null);
        setStatus('');
        setError(t(`tool-mermaid.ui.errors.${cause instanceof Error ? cause.message : 'parseError'}`));
      }
    });
  }, [background, source, t]);

  useEffect(() => {
    const timeout = window.setTimeout(performRender, 350);
    return () => window.clearTimeout(timeout);
  }, [performRender]);

  const downloadMmd = () => {
    const name = normalizeMermaidFilename(filename, 'mmd');
    downloadBlob(source, 'text/plain;charset=utf-8', name);
    setStatus(t('tool-mermaid.ui.status.downloaded', { filename: name }));
  };

  const downloadSvg = () => {
    if (!render) return;
    const name = normalizeMermaidFilename(filename, 'svg');
    downloadBlob(render.svg, 'image/svg+xml;charset=utf-8', name);
    setStatus(t('tool-mermaid.ui.status.downloaded', { filename: name }));
  };

  const downloadPng = async () => {
    if (!render) return;
    try {
      const blob = await svgToPngBlob(render, pngScale);
      const name = normalizeMermaidFilename(filename, 'png');
      downloadBlob(blob, 'image/png', name);
      setStatus(t('tool-mermaid.ui.status.downloaded', { filename: name }));
    } catch {
      setError(t('tool-mermaid.ui.errors.pngFailed'));
    }
  };

  const clear = () => {
    renderSequence.current += 1;
    setSource('');
    setRender(null);
    setError('');
    setStatus(t('tool-mermaid.ui.status.cleared'));
    textareaRef.current?.focus();
  };

  return (
    <Card id="tool-mermaid" variant="tool" size="wide" className="max-w-[1180px]">
      <ToolHeader title={t('tool-mermaid.title')} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-app/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" size="sm" onClick={performRender} disabled={!source.trim()}>{t('tool-mermaid.ui.render')}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={clear} disabled={!source}>{t('tool-mermaid.ui.clear')}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="mermaid-filename" className="sr-only">{t('tool-mermaid.ui.filename')}</label>
          <input id="mermaid-filename" value={filename} onChange={(event) => setFilename(event.target.value)} className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus" />
          <Button type="button" variant="secondary" size="sm" onClick={downloadMmd} disabled={!source}>{t('tool-mermaid.ui.downloadMmd')}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={downloadSvg} disabled={!render}>{t('tool-mermaid.ui.downloadSvg')}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={downloadPng} disabled={!render}>{t('tool-mermaid.ui.downloadPng')}</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-app/40 p-3">
        <label className="grid gap-1 text-xs font-semibold text-text-muted">{t('tool-mermaid.ui.background')}<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-9 w-16 rounded border border-border bg-card" /></label>
        <label className="grid gap-1 text-xs font-semibold text-text-muted">{t('tool-mermaid.ui.pngScale')}<select value={pngScale} onChange={(event) => setPngScale(Number(event.target.value))} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-text-main">{PNG_SCALES.map((scale) => <option key={scale} value={scale}>{scale}×</option>)}</select></label>
        <p className="text-xs text-text-muted">{t('tool-mermaid.ui.localOnly')}</p>
      </div>
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card lg:h-[560px] lg:grid-cols-2">
        <section className="flex min-h-[420px] min-w-0 flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r" aria-labelledby="mermaid-editor-title">
          <div className="relative flex min-h-12 items-center justify-between border-b border-border bg-app/70 px-4 py-2 pr-14"><h3 id="mermaid-editor-title" className="text-sm font-bold text-text-main">{t('tool-mermaid.ui.editorTitle')}</h3><span className="text-xs tabular-nums text-text-muted">{t('tool-mermaid.ui.characterCount', { count: characterCount })}</span><FullscreenPreviewButton label={t('tool-mermaid.ui.expandEditor')} onClick={() => setFocusedPanel('editor')} /></div>
          <textarea ref={textareaRef} value={source} onChange={(event) => { setSource(event.target.value); setStatus(''); }} spellCheck="false" aria-label={t('tool-mermaid.ui.editorAria')} className="min-h-[370px] flex-1 resize-none bg-card p-5 font-mono text-sm leading-6 text-text-main outline-none focus:ring-2 focus:ring-inset focus:ring-focus lg:min-h-0" />
        </section>
        <section className="flex min-h-[420px] min-w-0 flex-col lg:min-h-0" aria-labelledby="mermaid-preview-title">
          <div className="relative flex min-h-12 items-center justify-between border-b border-border bg-app/70 px-4 py-2 pr-14"><h3 id="mermaid-preview-title" className="text-sm font-bold text-text-main">{t('tool-mermaid.ui.previewTitle')}</h3><FullscreenPreviewButton label={t('tool-mermaid.ui.expandPreview')} onClick={() => setFocusedPanel('preview')} /></div>
          <SvgPreview render={render} previewRef={previewRef} label={render ? t('tool-mermaid.ui.previewAria') : t('tool-mermaid.ui.emptyPreview')} />
        </section>
      </div>
      {(status || error) && <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-danger' : 'text-text-muted'}`}>{error || status}</p>}
      <FullscreenPreview open={focusedPanel !== null} title={focusedPanel === 'editor' ? t('tool-mermaid.ui.editorTitle') : t('tool-mermaid.ui.previewTitle')} onClose={() => setFocusedPanel(null)}>
        {focusedPanel === 'editor' ? <textarea ref={fullscreenTextareaRef} value={source} onChange={(event) => setSource(event.target.value)} spellCheck="false" className="h-full w-full resize-none bg-card p-5 font-mono text-sm leading-6 text-text-main outline-none" aria-label={t('tool-mermaid.ui.editorAria')} /> : <SvgPreview render={render} previewRef={fullscreenPreviewRef} label={render ? t('tool-mermaid.ui.previewAria') : t('tool-mermaid.ui.emptyPreview')} className="bg-card" />}
      </FullscreenPreview>
    </Card>
  );
}
