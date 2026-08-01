import { describe, expect, it } from 'vitest';
import {
  convertCurrencyAmount,
  getConversionRate,
  parsePositiveRate,
  swapCurrencies,
} from '../lib/currency.js';

describe('swapCurrencies', () => {
  const initial = {
    from: 'USD',
    to: 'TWD',
    amount: '123.45',
    manualRate: '32',
    isManualRate: true,
  };

  it('swaps the pair and inverts a valid manual rate', () => {
    expect(swapCurrencies(initial)).toMatchObject({
      from: 'TWD',
      to: 'USD',
      amount: '123.45',
      manualRate: '0.03125',
      error: null,
    });
  });

  it('returns to the original values after two swaps', () => {
    const once = swapCurrencies(initial);
    const twice = swapCurrencies({ ...once, isManualRate: true });
    expect(twice.from).toBe(initial.from);
    expect(twice.to).toBe(initial.to);
    expect(Number(twice.manualRate)).toBeCloseTo(32, 12);
    expect(twice.amount).toBe(initial.amount);
  });

  it.each(['', '0', '-1', 'Infinity', 'not-a-number'])(
    'rejects invalid manual rate %s without changing the pair',
    (manualRate) => {
      const result = swapCurrencies({ ...initial, manualRate });
      expect(result.from).toBe('USD');
      expect(result.to).toBe('TWD');
      expect(result.error).toContain('greater than zero');
    },
  );

  it('uses the same result shape when manual mode is disabled', () => {
    expect(swapCurrencies({ ...initial, isManualRate: false })).toMatchObject({
      from: 'TWD',
      to: 'USD',
      amount: '123.45',
      manualRate: '32',
      error: null,
    });
  });
});

describe('currency rate validation', () => {
  it.each(['', '0', '-1', 'NaN', 'Infinity', Infinity, NaN, null, undefined])(
    'rejects invalid positive rate %s',
    (value) => expect(parsePositiveRate(value)).toBeNull(),
  );

  it('requires finite positive source and target live rates', () => {
    expect(getConversionRate({
      isManualRate: false,
      rates: { USD: 1, TWD: 32 },
      from: 'USD',
      to: 'TWD',
    })).toBe(32);
    expect(getConversionRate({
      isManualRate: false,
      rates: { USD: 1 },
      from: 'USD',
      to: 'TWD',
    })).toBeNull();
    expect(getConversionRate({
      isManualRate: false,
      rates: { USD: 0, TWD: 32 },
      from: 'USD',
      to: 'TWD',
    })).toBeNull();
  });

  it('never fabricates a conversion when amount or rate is invalid', () => {
    expect(convertCurrencyAmount('10', 32)).toBe(320);
    expect(convertCurrencyAmount('10', null)).toBeNull();
    expect(convertCurrencyAmount('10', 0)).toBeNull();
    expect(convertCurrencyAmount('Infinity', 32)).toBeNull();
  });
});
