import { describe, it, expect } from 'vitest';
import {
  evaluatePasswordStrength,
  calculateTheoreticalEntropy,
} from '../lib/passwordStrength.js';

describe('calculateTheoreticalEntropy', () => {
  it('returns 0 for empty password', () => {
    expect(calculateTheoreticalEntropy('', 95)).toBe(0);
  });

  it('returns 0 for pool size <= 0', () => {
    expect(calculateTheoreticalEntropy('abc', 0)).toBe(0);
    expect(calculateTheoreticalEntropy('abc', -1)).toBe(0);
  });

  it('calculates correct entropy bits', () => {
    // 16 chars, pool 95 => 16 * log2(95) ≈ 105
    const entropy = calculateTheoreticalEntropy('a'.repeat(16), 95);
    expect(entropy).toBeGreaterThan(100);
    expect(entropy).toBeLessThan(110);
  });
});

describe('evaluatePasswordStrength', () => {
  it('returns None for empty input', () => {
    const result = evaluatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('None');
  });

  it('flags common dictionary pattern "password"', () => {
    const result = evaluatePasswordStrength('Password1!');
    expect(result.feedback.some(f => f.includes('password'))).toBe(true);
    expect(result.score).toBeLessThan(4);
  });

  it('flags keyboard sequence "qwerty"', () => {
    const result = evaluatePasswordStrength('qwerty12345');
    expect(result.feedback.some(f => f.includes('keyboard'))).toBe(true);
  });

  it('flags repeating character sequences', () => {
    const result = evaluatePasswordStrength('aaabbbccc');
    expect(result.feedback.some(f => f.includes('repeating'))).toBe(true);
  });

  it('gives Very Weak score for short common password', () => {
    const result = evaluatePasswordStrength('abc123');
    expect(result.score).toBeLessThanOrEqual(2);
  });

  it('gives Strong score for long complex random-like password', () => {
    const result = evaluatePasswordStrength('X7$mK2@pLq9#nWv4');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('gives Very Strong score for very long complex passphrase', () => {
    const result = evaluatePasswordStrength('Tr0ub4dor&3!PurpleMonkey#Dishwasher42');
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it('returns all required fields', () => {
    const result = evaluatePasswordStrength('TestPassword1!');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('entropyBits');
    expect(result).toHaveProperty('crackTimeEstimate');
    expect(result).toHaveProperty('feedback');
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  it('never returns negative entropy', () => {
    const result = evaluatePasswordStrength('password'); // common + penalty
    expect(result.entropyBits).toBeGreaterThanOrEqual(0);
  });

  it('handles isRandomlyGenerated flag with poolSize', () => {
    const result = evaluatePasswordStrength('AbCdEfGh1!', true, 72);
    expect(result.entropyBits).toBeGreaterThan(0);
  });
});
