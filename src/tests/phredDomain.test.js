import { describe, expect, it } from 'vitest';
import {
  calculatePhredMetrics,
  errorProbabilityToPhred,
  formatProbability,
  phredToErrorProbability,
} from '../components/PhredScaleConverter/lib/phredDomain.js';

describe('Phred scale domain', () => {
  it('converts scores and error probabilities in both directions', () => {
    expect(phredToErrorProbability(20)).toBeCloseTo(0.01);
    expect(phredToErrorProbability(30)).toBeCloseTo(0.001);
    expect(errorProbabilityToPhred(0.0001)).toBeCloseTo(40);
  });

  it('derives accuracy and expected frequency', () => {
    expect(calculatePhredMetrics('score', '30')).toMatchObject({
      score: 30,
      errorProbability: 0.001,
      accuracy: 0.999,
      oneIn: 1000,
    });
    expect(calculatePhredMetrics('probability', '0.01')?.score).toBeCloseTo(20);
  });

  it('rejects out-of-range values and formats small probabilities', () => {
    expect(phredToErrorProbability(-1)).toBeNull();
    expect(errorProbabilityToPhred(0)).toBeNull();
    expect(errorProbabilityToPhred(1.1)).toBeNull();
    expect(formatProbability(0.000001)).toBe('1.000e-6');
  });
});
