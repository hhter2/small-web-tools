import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QrBarcodeGenerator from '../components/QrBarcodeGenerator.jsx';
import SvgToPngConverter from '../components/SvgToPngConverter.jsx';

vi.mock('jsbarcode', () => ({ default: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let originalCreateObjectURL;
let originalRevokeObjectURL;

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn().mockReturnValue('blob:preview'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root.unmount());
  container.remove();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: originalCreateObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: originalRevokeObjectURL,
  });
});

describe('downloadable image previews', () => {
  it('matches the SVG preview surface to the selected background and opens fullscreen', async () => {
    await act(async () => root.render(<SvgToPngConverter />));

    const markup = container.querySelector('#svg-markup');
    await act(async () => setNativeValue(
      markup,
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40"/></svg>',
    ));

    const previewFrame = container.querySelector('[data-preview-background]');
    expect(previewFrame).toHaveAttribute('data-preview-background', 'transparent');
    expect(previewFrame.className).toContain('bg-[linear-gradient');

    const backgroundSelect = [...container.querySelectorAll('select')]
      .find((select) => select.value === 'transparent');
    await act(async () => setNativeValue(backgroundSelect, 'white'));

    expect(previewFrame).toHaveAttribute('data-preview-background', 'white');
    expect(previewFrame).toHaveClass('bg-white');
    expect(previewFrame.className).not.toContain('bg-[linear-gradient');

    const expandButton = container.querySelector('[aria-label="Open fullscreen SVG preview"]');
    await act(async () => expandButton.click());

    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('SVG fullscreen preview');
    expect(document.querySelector('img[alt="Sanitized SVG fullscreen preview"]')).toHaveAttribute('src', 'blob:preview');

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the generated QR canvas in the shared fullscreen frame', async () => {
    const canvasContext = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,preview');

    await act(async () => root.render(<QrBarcodeGenerator />));
    await act(async () => setNativeValue(container.querySelector('#qr-text'), 'fullscreen QR'));

    const expandButton = container.querySelector('[aria-label="Open full-screen QR Code preview"]');
    expect(expandButton).toBeEnabled();
    await act(async () => expandButton.click());

    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('QR Code full-screen preview');
    expect(document.querySelector('img[alt="QR Code full-screen preview"]'))
      .toHaveAttribute('src', 'data:image/png;base64,preview');
  });

  it('opens the generated barcode canvas in the shared fullscreen frame', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,barcode');

    await act(async () => root.render(<QrBarcodeGenerator initialTab="barcode" />));
    await act(async () => setNativeValue(container.querySelector('#barcode-val'), 'ABC-123'));

    const expandButton = container.querySelector('[aria-label="Open full-screen barcode preview"]');
    expect(expandButton).toBeEnabled();
    await act(async () => expandButton.click());

    expect(document.querySelector('[role="dialog"]')).toHaveAccessibleName('Barcode full-screen preview');
    expect(document.querySelector('img[alt="Barcode full-screen preview"]'))
      .toHaveAttribute('src', 'data:image/png;base64,barcode');
  });
});
