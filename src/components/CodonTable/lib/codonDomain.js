export function normalizeCodonInput(value) {
  return value.toUpperCase()
    .replace(/T/g, 'U')
    .replace(/[^UCAG]/g, '')
    .slice(0, 3);
}

export function matchesCodonFilter(codonData, filterMode) {
  if (filterMode === 'start') return codonData?.type === 'start';
  if (filterMode === 'stop') return codonData?.type === 'stop';
  return true;
}
