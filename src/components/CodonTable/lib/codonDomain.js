export function normalizeCodonInput(value) {
  return value.toUpperCase()
    .replace(/T/g, 'U')
    .replace(/[^UCAG]/g, '')
    .slice(0, 3);
}

export function resolveCodonGroup(selectedGroup, customGroups, builtinGroups) {
  if (selectedGroup === 'all') return null;
  if (selectedGroup.startsWith('custom-')) {
    const index = Number.parseInt(selectedGroup.slice('custom-'.length), 10);
    return Number.isInteger(index) ? customGroups[index] || null : null;
  }
  return builtinGroups[selectedGroup] || null;
}

export function isCodonHighlighted({
  codon,
  data,
  selectedCodon,
  typedCodon,
  highlightedAA,
  activeGroup,
}) {
  if (selectedCodon === null && typedCodon.length > 0) {
    return codon.startsWith(typedCodon);
  }
  if (!data) return false;
  if (highlightedAA !== null) return data.aa === highlightedAA;
  return Boolean(activeGroup?.aas.includes(data.aa));
}

export function isCodonDimmed({
  codon,
  data,
  selectedCodon,
  typedCodon,
  highlightedAA,
  activeGroup,
}) {
  if (!data) return false;
  if (selectedCodon === null && typedCodon.length > 0) {
    return !codon.startsWith(typedCodon);
  }
  if (highlightedAA !== null) return data.aa !== highlightedAA;
  return Boolean(activeGroup && !activeGroup.aas.includes(data.aa));
}
