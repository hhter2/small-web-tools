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
