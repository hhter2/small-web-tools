import { describe, expect, it } from 'vitest';
import {
  convertRomanInput,
  decimalToRoman,
  romanToDecimal,
} from '../components/RomanNumeralConverter/lib/romanDomain.js';

describe('Roman numeral domain', () => {
  it('converts decimal values to canonical Roman numerals', () => {
    expect(decimalToRoman(4)).toBe('IV');
    expect(decimalToRoman(1994)).toBe('MCMXCIV');
    expect(decimalToRoman(3999)).toBe('MMMCMXCIX');
    expect(decimalToRoman(0)).toBeNull();
    expect(decimalToRoman(4000)).toBeNull();
  });

  it('accepts canonical Roman numerals and rejects malformed forms', () => {
    expect(romanToDecimal('mmxxvi')).toBe(2026);
    expect(romanToDecimal('MCMXCIV')).toBe(1994);
    expect(romanToDecimal('IIII')).toBeNull();
    expect(romanToDecimal('IC')).toBeNull();
  });

  it('auto-detects conversion direction', () => {
    expect(convertRomanInput('2026')).toMatchObject({
      outputLabel: 'Roman numeral',
      output: 'MMXXVI',
      error: null,
    });
    expect(convertRomanInput('MMXXVI')).toMatchObject({
      outputLabel: 'Decimal number',
      output: '2026',
      error: null,
    });
    expect(convertRomanInput('VX').error).toMatch(/canonical/);
  });
});
