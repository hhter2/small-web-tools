import { describe, expect, it } from 'vitest';
import {
  calculateLockedDimension,
  inspectAndSanitizeSvg,
  validateExportSize,
} from '../components/SvgToPngConverter/lib/svgDomain.js';

describe('SVG to PNG domain', () => {
  it('reads dimensions from explicit sizes and viewBox fallbacks', () => {
    expect(inspectAndSanitizeSvg('<svg width="320" height="180"></svg>')).toMatchObject({
      width: 320,
      height: 180,
    });
    expect(inspectAndSanitizeSvg('<svg viewBox="0 0 48 24"></svg>')).toMatchObject({
      width: 48,
      height: 24,
    });
  });

  it('removes active content, event handlers, and remote resources', () => {
    const result = inspectAndSanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" onclick="alert(1)">
        <script>alert(1)</script>
        <foreignObject><div>HTML</div></foreignObject>
        <image href="https://example.com/private.png" />
        <rect style="fill:url(https://example.com/pattern.svg)" />
      </svg>
    `);

    expect(result.error).toBeUndefined();
    expect(result.removedItems).toBe(5);
    expect(result.markup).not.toContain('<script');
    expect(result.markup).not.toContain('foreignObject');
    expect(result.markup).not.toContain('onclick');
    expect(result.markup).not.toContain('https://');
  });

  it('rejects malformed documents and unsafe export sizes', () => {
    expect(inspectAndSanitizeSvg('<svg><path></svg>').error).toMatch(/valid XML/);
    expect(inspectAndSanitizeSvg('<html></html>').error).toMatch(/<svg>/);
    expect(validateExportSize(8192, 8192)).toMatch(/40 megapixels/);
    expect(validateExportSize(9000, 100)).toMatch(/8,192/);
    expect(validateExportSize(512, 512)).toBe('');
  });

  it('calculates aspect-locked dimensions', () => {
    expect(calculateLockedDimension('width', 640, 2)).toBe(320);
    expect(calculateLockedDimension('height', 180, 2)).toBe(360);
    expect(calculateLockedDimension('width', 0, 2)).toBeNull();
  });
});
