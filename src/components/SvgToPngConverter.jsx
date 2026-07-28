import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import {
  calculateLockedDimension,
  inspectAndSanitizeSvg,
  validateExportSize,
} from './SvgToPngConverter/lib/svgDomain';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function SvgToPngConverter() {
  const fileInputRef = useRef(null);
  const [markup, setMarkup] = useState('');
  const [filename, setFilename] = useState('converted');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [lockRatio, setLockRatio] = useState(true);
  const [background, setBackground] = useState('transparent');
  const [status, setStatus] = useState('');

  const parsed = useMemo(() => inspectAndSanitizeSvg(markup), [markup]);
  const previewUrl = useMemo(() => {
    if (!parsed.markup) return '';
    return URL.createObjectURL(new Blob([parsed.markup], { type: 'image/svg+xml' }));
  }, [parsed.markup]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!parsed.markup) return;
    setWidth(Math.max(1, Math.round(parsed.width)));
    setHeight(Math.max(1, Math.round(parsed.height)));
  }, [parsed.markup, parsed.width, parsed.height]);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus('Choose an SVG file no larger than 2 MB.');
      return;
    }
    const text = await file.text();
    setMarkup(text);
    setFilename(file.name.replace(/\.svg$/i, '') || 'converted');
    setStatus('');
  };

  const updateDimension = (axis, rawValue) => {
    const nextValue = Number(rawValue);
    if (axis === 'width') setWidth(nextValue);
    else setHeight(nextValue);
    if (!lockRatio || !parsed.markup) return;

    const ratio = parsed.width / parsed.height;
    const lockedValue = calculateLockedDimension(axis, rawValue, ratio);
    if (lockedValue === null) return;
    if (axis === 'width') setHeight(lockedValue);
    else setWidth(lockedValue);
  };

  const exportPng = () => {
    const exportError = validateExportSize(width, height);
    if (!parsed.markup || exportError) {
      setStatus(exportError || parsed.error);
      return;
    }

    const svgUrl = URL.createObjectURL(new Blob([parsed.markup], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (background === 'white') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(svgUrl);
        if (!blob) {
          setStatus('This browser could not create the PNG.');
          return;
        }
        downloadBlob(blob, `${filename.trim() || 'converted'}.png`);
        setStatus(`Downloaded ${width} × ${height} PNG.`);
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      setStatus('The sanitized SVG could not be rendered.');
    };
    image.src = svgUrl;
  };

  const sizeError = validateExportSize(width, height);
  const ready = Boolean(parsed.markup) && !sizeError;

  return (
    <Card id="tool-svg-png" variant="tool" size="wide" className="max-w-[980px]">
      <ToolHeader title="SVG to PNG Converter" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="svg-source-title">
          <div>
            <h3 id="svg-source-title" className="text-sm font-bold text-text-main">SVG source</h3>
            <p className="text-xs text-text-muted">Files and generated images stay in this browser.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose SVG file
          </Button>

          <label htmlFor="svg-markup" className="text-sm font-semibold text-text-main">
            Or paste SVG markup
          </label>
          <textarea
            id="svg-markup"
            value={markup}
            onChange={(event) => {
              setMarkup(event.target.value);
              setStatus('');
            }}
            spellCheck="false"
            placeholder="<svg …>…</svg>"
            className="min-h-56 w-full resize-y rounded-xl border border-border bg-app p-3 font-mono text-sm text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
          />
          {markup && parsed.error && <p role="alert" className="text-sm text-red-500">{parsed.error}</p>}
          {parsed.removedItems > 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-text-main">
              Removed {parsed.removedItems} unsafe or remote SVG item{parsed.removedItems === 1 ? '' : 's'} before preview.
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="svg-output-title">
          <h3 id="svg-output-title" className="text-sm font-bold text-text-main">PNG output</h3>
          <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Sanitized SVG preview" className="max-h-72 max-w-full object-contain" />
            ) : (
              <span className="text-sm text-text-muted">Your SVG preview appears here.</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
              Width (px)
              <input
                type="number"
                min="1"
                max="8192"
                step="1"
                value={width}
                onChange={(event) => updateDimension('width', event.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-base text-text-main outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
              Height (px)
              <input
                type="number"
                min="1"
                max="8192"
                step="1"
                value={height}
                onChange={(event) => updateDimension('height', event.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-base text-text-main outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-main">
            <input type="checkbox" checked={lockRatio} onChange={(event) => setLockRatio(event.target.checked)} />
            Lock original aspect ratio
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
            Background
            <select
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-main outline-none focus:border-accent"
            >
              <option value="transparent">Transparent</option>
              <option value="white">White</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
            Download filename
            <input
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-main outline-none focus:border-accent"
            />
          </label>

          {sizeError && <p role="alert" className="text-sm text-red-500">{sizeError}</p>}
          <Button variant="primary" disabled={!ready} onClick={exportPng}>Download PNG</Button>
          {status && <p role="status" className="text-xs text-text-muted">{status}</p>}
        </section>
      </div>
    </Card>
  );
}
