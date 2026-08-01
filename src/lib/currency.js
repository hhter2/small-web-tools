export function swapCurrencies(state) {
  const result = {
    from: state.to,
    to: state.from,
    amount: state.amount,
    manualRate: state.manualRate,
    error: null,
  };

  if (!state.isManualRate) return result;
  const rate = Number(state.manualRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      ...state,
      error: 'Manual rate must be a finite number greater than zero before swapping.',
    };
  }

  result.manualRate = String(Number((1 / rate).toPrecision(15)));
  return result;
}

export function parsePositiveRate(value) {
  if (typeof value === 'string' && value.trim() === '') return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function getConversionRate({ isManualRate, manualRate, rates, from, to }) {
  if (isManualRate) return parsePositiveRate(manualRate);
  const sourceRate = parsePositiveRate(rates?.[from]);
  const targetRate = parsePositiveRate(rates?.[to]);
  if (sourceRate === null || targetRate === null) return null;
  const rate = targetRate / sourceRate;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function convertCurrencyAmount(amount, rate) {
  if (typeof amount === 'string' && amount.trim() === '') return null;
  const numericAmount = Number(amount);
  const validRate = parsePositiveRate(rate);
  if (!Number.isFinite(numericAmount) || validRate === null) return null;
  const result = numericAmount * validRate;
  return Number.isFinite(result) ? result : null;
}
