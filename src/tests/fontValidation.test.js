import { describe, expect, it } from 'vitest';
import { detectFontContentType } from '../../functions/_shared/fontValidation.js';

describe('font magic-byte validation', () => {
  it.each([
    [[0x77, 0x4f, 0x46, 0x46], 'font/woff'],
    [[0x77, 0x4f, 0x46, 0x32], 'font/woff2'],
    [[0x4f, 0x54, 0x54, 0x4f], 'font/otf'],
    [[0x00, 0x01, 0x00, 0x00], 'font/ttf'],
  ])('recognizes supported signatures', (bytes, expected) => {
    expect(detectFontContentType(Uint8Array.from(bytes).buffer)).toBe(expected);
  });

  it('rejects HTML even if the upstream labels it as a font', () => {
    const html = new TextEncoder().encode('<html>not a font</html>');
    expect(() => detectFontContentType(html.buffer)).toThrow('not a supported font');
  });
});
