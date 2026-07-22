import { describe, expect, it } from 'vitest';
import { parseAmountLines, parseLocaleNumber } from '../lib/numberParsing.js';

describe('parseLocaleNumber', () => {
  it.each([
    ['12,50', 'auto', 12.5],
    ['1.234,56', 'auto', 1234.56],
    ['1,234.56', 'auto', 1234.56],
    ['-25.5', 'dot', -25.5],
    [' EUR 1.234,56 ', 'comma', 1234.56],
    ['$1,234.56', 'dot', 1234.56],
  ])('parses %s in %s mode', (input, mode, expected) => {
    expect(parseLocaleNumber(input, mode)).toEqual({ value: expected, error: null });
  });

  it('rejects ambiguous auto values and multiple numbers', () => {
    expect(parseLocaleNumber('1,234', 'auto').error).toContain('Ambiguous');
    expect(parseLocaleNumber('12 34', 'auto').error).toContain('one number');
    expect(parseLocaleNumber('USD 12 EUR', 'auto').error).toContain('one number');
  });
});

describe('parseAmountLines', () => {
  it('retains original source line numbers and explicit errors', () => {
    const result = parseAmountLines('10\n\ninvalid\n12,50', 'auto');
    expect(result.map((item) => item.lineNumber)).toEqual([1, 3, 4]);
    expect(result[1]).toMatchObject({
      originalLine: 'invalid',
      value: null,
    });
    expect(result[1].error).toContain('Line 3');
  });
});
