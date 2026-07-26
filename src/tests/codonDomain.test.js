import { describe, expect, it } from 'vitest';
import {
  isCodonDimmed,
  isCodonHighlighted,
  matchesCodonFilter,
  normalizeCodonInput,
  resolveCodonGroup,
} from '../components/CodonTable/lib/codonDomain.js';

describe('codon domain', () => {
  it('normalizes and filters codons', () => {
    expect(normalizeCodonInput('atg!')).toBe('AUG');
    expect(matchesCodonFilter({ type: 'start' }, 'start')).toBe(true);
    expect(matchesCodonFilter({ type: 'stop' }, 'start')).toBe(false);
  });

  it('resolves built-in and custom presentation groups', () => {
    const builtin = { polar: { aas: ['Ser'] } };
    const custom = [{ aas: ['Met'] }];
    expect(resolveCodonGroup('polar', custom, builtin)).toBe(builtin.polar);
    expect(resolveCodonGroup('custom-0', custom, builtin)).toBe(custom[0]);
    expect(resolveCodonGroup('custom-invalid', custom, builtin)).toBeNull();
    expect(resolveCodonGroup('all', custom, builtin)).toBeNull();
  });

  it('derives highlight and dim states from one domain policy', () => {
    const base = {
      codon: 'AUG',
      data: { aa: 'Met', type: 'start' },
      selectedCodon: null,
      typedCodon: 'AU',
      highlightedAA: null,
      activeGroup: null,
    };
    expect(isCodonHighlighted(base)).toBe(true);
    expect(isCodonDimmed({ ...base, filterMode: 'all' })).toBe(false);
    expect(isCodonDimmed({
      ...base,
      codon: 'UUU',
      filterMode: 'all',
    })).toBe(true);
    expect(isCodonDimmed({
      ...base,
      selectedCodon: 'AUG',
      typedCodon: 'AUG',
      highlightedAA: 'Phe',
      filterMode: 'all',
    })).toBe(true);
  });
});
