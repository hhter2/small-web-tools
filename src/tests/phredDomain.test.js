import { describe, expect, it } from 'vitest';
import {
  calculatePhredMetrics,
  decodeFastqQualityString,
  errorProbabilityToPhred,
  FASTQ_PHRED_OFFSETS,
  formatFastqQualityScores,
  formatProbability,
  phredToErrorProbability,
} from '../components/PhredScaleConverter/lib/phredDomain.js';

describe('Phred scale domain', () => {
  it('decodes FASTQ quality strings with Phred+33 and Phred+64 offsets', () => {
    expect(decodeFastqQualityString('!"#', FASTQ_PHRED_OFFSETS.phred33)).toEqual([0, 1, 2]);
    expect(decodeFastqQualityString('@AB', FASTQ_PHRED_OFFSETS.phred64)).toEqual([0, 1, 2]);
    expect(decodeFastqQualityString('IIII', FASTQ_PHRED_OFFSETS.phred33)).toEqual([40, 40, 40, 40]);
    expect(decodeFastqQualityString('IIII', FASTQ_PHRED_OFFSETS.phred64)).toEqual([9, 9, 9, 9]);
  });

  it('validates the selected FASTQ offset and formats numeric Q scores', () => {
    expect(decodeFastqQualityString('?', FASTQ_PHRED_OFFSETS.phred64)).toBeNull();
    expect(decodeFastqQualityString('~', FASTQ_PHRED_OFFSETS.phred33)).toEqual([93]);
    expect(decodeFastqQualityString('~', FASTQ_PHRED_OFFSETS.phred64)).toEqual([62]);
    expect(decodeFastqQualityString('é', FASTQ_PHRED_OFFSETS.phred33)).toBeNull();
    expect(decodeFastqQualityString('', FASTQ_PHRED_OFFSETS.phred33)).toBeNull();
    expect(decodeFastqQualityString('I', 42)).toBeNull();
    expect(formatFastqQualityScores([40, 39, 38])).toBe('40 39 38');
  });

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
