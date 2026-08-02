import { describe, expect, it } from 'vitest';
import { calculateReadingMinutes } from '../components/WordCounter.jsx';

describe('locale-aware reading estimates', () => {
  it('uses word-based pacing for English text', () => {
    expect(calculateReadingMinutes(Array(201).fill('word').join(' '))).toBeCloseTo(201 / 200);
  });

  it('uses character-based pacing for Traditional Chinese text', () => {
    expect(calculateReadingMinutes('漢'.repeat(500))).toBe(1);
  });

  it('combines Chinese characters and Latin words without assuming one content language', () => {
    expect(calculateReadingMinutes(`${'漢'.repeat(250)} ${Array(101).fill('word').join(' ')}`))
      .toBeCloseTo((250 / 500) + (101 / 200));
  });
});
