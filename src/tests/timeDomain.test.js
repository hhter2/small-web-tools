import { describe, expect, it } from 'vitest';
import {
  calculateTimeDifference,
  formatTimeDifference,
  parseTimeToSeconds,
} from '../components/DateCounter/lib/timeDomain.js';

describe('time counter domain', () => {
  it('parses time values with optional seconds', () => {
    expect(parseTimeToSeconds('01:02')).toBe(3720);
    expect(parseTimeToSeconds('23:59:58')).toBe(86398);
    expect(parseTimeToSeconds('24:00')).toBeNull();
    expect(parseTimeToSeconds('bad')).toBeNull();
  });

  it('calculates same-day, signed, and overnight differences', () => {
    expect(calculateTimeDifference('09:15', '11:45')).toBe(9000);
    expect(calculateTimeDifference('23:30', '01:00')).toBe(-81000);
    expect(calculateTimeDifference('23:30', '01:00', true)).toBe(5400);
    expect(calculateTimeDifference('', '01:00')).toBeNull();
  });

  it('formats duration and next-day context', () => {
    expect(formatTimeDifference(9000)).toBe('2h 30m 0s (end - start)');
    expect(formatTimeDifference(-90)).toBe('-0h 1m 30s (end - start)');
    expect(formatTimeDifference(5400, true)).toBe('1h 30m 0s (end - start, next day)');
  });
});
