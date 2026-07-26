import { describe, expect, it } from 'vitest';
import {
  matchesCodonFilter,
  normalizeCodonInput,
} from '../components/CodonTable/lib/codonDomain.js';

describe('codon domain', () => {
  it('normalizes and filters codons', () => {
    expect(normalizeCodonInput('atg!')).toBe('AUG');
    expect(matchesCodonFilter({ type: 'start' }, 'start')).toBe(true);
    expect(matchesCodonFilter({ type: 'stop' }, 'start')).toBe(false);
  });
});
