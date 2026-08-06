import { describe, expect, it, vi } from 'vitest';
import {
  downloadBlob,
  normalizeMermaidFilename,
  renderMermaidToSvg,
} from '../components/MermaidConverter/lib/mermaidDomain.js';

describe('Mermaid converter domain', () => {
  it('normalizes deterministic filenames', () => {
    expect(normalizeMermaidFilename(' My diagram.svg ', 'png')).toBe('My-diagram.png');
    expect(normalizeMermaidFilename('', 'mmd')).toBe('diagram.mmd');
  });

  it('renders a deterministic local SVG', () => {
    const source = `flowchart LR\nA[Start]\nB{Decision}\nA --> B`;
    const result = renderMermaidToSvg(source, { background: '#ffffff' });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Start');
    expect(result.svg).toContain('Decision');
    expect(result.svg).toContain('marker-end="url(#arrow)"');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('escapes user labels and rejects unsupported syntax', () => {
    const result = renderMermaidToSvg('flowchart TB\nA[<script>alert(1)</script>]');
    expect(result.svg).not.toContain('<script>');
    expect(result.svg).toContain('&lt;script&gt;');
    expect(() => renderMermaidToSvg('sequenceDiagram\nA->>B: hello')).toThrow('unsupportedDiagram');
  });

  it('revokes object URLs after downloads', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob('flowchart LR', 'text/plain', 'diagram.mmd');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });
});
