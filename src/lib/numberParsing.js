const CURRENCY_TOKEN = '(?:[A-Z]{3}|NT\\$|HK\\$|[A-Z]\\$|[$€£¥₩₹₱฿₫])';
const LEADING_CURRENCY = new RegExp('^' + CURRENCY_TOKEN + '\\s*', 'i');
const TRAILING_CURRENCY = new RegExp('\\s*' + CURRENCY_TOKEN + '$', 'i');

function removeSingleCurrencyToken(value) {
  const leading = LEADING_CURRENCY.test(value);
  const trailing = TRAILING_CURRENCY.test(value);
  if (leading && trailing) return null;
  if (leading) return value.replace(LEADING_CURRENCY, '');
  if (trailing) return value.replace(TRAILING_CURRENCY, '');
  return value;
}

function parseDotDecimal(value) {
  if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value)) return null;
  return Number(value.replace(/,/g, ''));
}

function parseCommaDecimal(value) {
  if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(value)) return null;
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

export function parseLocaleNumber(rawValue, mode = 'auto') {
  const trimmed = rawValue.trim();
  if (!trimmed) return { value: null, error: 'Empty line', errorCode: 'empty' };
  const numericText = removeSingleCurrencyToken(trimmed);
  if (numericText === null || !numericText || /\s/.test(numericText)) {
    return { value: null, error: 'Use one number with at most one currency symbol or code', errorCode: 'single-number' };
  }

  let value = null;
  if (mode === 'dot') value = parseDotDecimal(numericText);
  else if (mode === 'comma') value = parseCommaDecimal(numericText);
  else if (mode === 'auto') {
    const commaCount = (numericText.match(/,/g) || []).length;
    const dotCount = (numericText.match(/\./g) || []).length;

    if (commaCount && dotCount) {
      value = numericText.lastIndexOf('.') > numericText.lastIndexOf(',')
        ? parseDotDecimal(numericText)
        : parseCommaDecimal(numericText);
    } else if (commaCount === 1) {
      const fractionLength = numericText.length - numericText.lastIndexOf(',') - 1;
      if (fractionLength === 3) {
        return { value: null, error: 'Ambiguous separator; choose a number format', errorCode: 'ambiguous' };
      }
      value = parseCommaDecimal(numericText);
    } else if (dotCount === 1) {
      const fractionLength = numericText.length - numericText.lastIndexOf('.') - 1;
      if (fractionLength === 3) {
        return { value: null, error: 'Ambiguous separator; choose a number format', errorCode: 'ambiguous' };
      }
      value = parseDotDecimal(numericText);
    } else if (commaCount > 1) {
      value = parseDotDecimal(numericText);
    } else if (dotCount > 1) {
      value = parseCommaDecimal(numericText);
    } else if (/^[+-]?\d+$/.test(numericText)) {
      value = Number(numericText);
    }
  } else {
    throw new Error('Unknown number format mode');
  }

  if (value === null || !Number.isFinite(value)) {
    return { value: null, error: 'Invalid number for the selected format', errorCode: 'invalid' };
  }
  return { value, error: null };
}

export function parseAmountLines(text, mode = 'auto') {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const originalLine = line.trim();
    if (!originalLine) return [];
    const parsed = parseLocaleNumber(originalLine, mode);
    return [{
      lineNumber: index + 1,
      originalLine,
      value: parsed.value,
      error: parsed.error ? 'Line ' + (index + 1) + ': ' + parsed.error : null,
      ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {}),
    }];
  });
}
