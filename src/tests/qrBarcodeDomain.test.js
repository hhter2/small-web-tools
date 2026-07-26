import { describe, expect, it } from 'vitest';
import {
  escapeWifiString,
  estimateTextWidth,
  validateBarcode,
} from '../components/QrBarcodeGenerator/lib/encoding.js';

describe('QR and barcode domain', () => {
  it('encodes Wi-Fi values and validates barcode formats', () => {
    expect(escapeWifiString('a;b:c')).toBe('a\\;b\\:c');
    expect(estimateTextWidth('abcd', 10, 'bold')).toBeCloseTo(24.8);
    expect(validateBarcode('1234567', 'EAN8')).toBeNull();
    expect(validateBarcode('123', 'EAN13')).toMatch(/12 or 13/);
    expect(validateBarcode('123', 'ITF')).toMatch(/even/);
  });
});
