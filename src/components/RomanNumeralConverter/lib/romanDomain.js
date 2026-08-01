/** @type {Array<[number, string]>} */
const ROMAN_VALUES = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function decimalToRoman(value) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return null;

  let remaining = value;
  let result = '';
  for (const [decimal, roman] of ROMAN_VALUES) {
    while (remaining >= decimal) {
      result += roman;
      remaining -= decimal;
    }
  }
  return result;
}

export function romanToDecimal(value) {
  const roman = value.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return null;

  let total = 0;
  for (let index = 0; index < roman.length; index++) {
    const current = ROMAN_VALUES.find(([, symbol]) => symbol === roman[index])?.[0];
    const next = ROMAN_VALUES.find(([, symbol]) => symbol === roman[index + 1])?.[0] || 0;
    total += current < next ? -current : current;
  }

  return decimalToRoman(total) === roman ? total : null;
}

export function convertRomanInput(value) {
  const input = value.trim();
  if (!input) {
    return {
      inputLabel: 'Decimal or Roman numeral',
      outputLabel: 'Converted value',
      output: '',
      error: null,
    };
  }

  if (/^\d+$/.test(input)) {
    const roman = decimalToRoman(Number(input));
    return {
      inputLabel: 'Decimal number',
      outputLabel: 'Roman numeral',
      output: roman || '',
      error: roman ? null : 'Enter a whole number from 1 to 3999.',
    };
  }

  const decimal = romanToDecimal(input);
  return {
    inputLabel: 'Roman numeral',
    outputLabel: 'Decimal number',
    output: decimal === null ? '' : String(decimal),
    error: decimal === null
      ? 'Enter a canonical Roman numeral using I, V, X, L, C, D, and M.'
      : null,
  };
}
