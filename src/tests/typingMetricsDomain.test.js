import { describe, expect, it } from 'vitest';
import { calculateTypingMetrics } from '../components/TypingSpeedTest/lib/metricsDomain.js';

const base = {
  typedText: 'hello',
  templateText: 'hello',
  mode: 'template',
  activeLang: 'english',
  elapsedSeconds: 60,
  correctKeystrokes: 5,
  totalKeystrokes: 5,
  backspacesPressed: 0,
};

describe('typing metrics domain', () => {
  it('calculates template metrics from correct characters', () => {
    expect(calculateTypingMetrics(base)).toEqual({
      wpm: 1,
      cpm: 5,
      accuracy: 100,
      correctionRate: 0,
    });
    expect(calculateTypingMetrics({
      ...base,
      typedText: 'hezlo',
      correctKeystrokes: 4,
      backspacesPressed: 1,
    })).toEqual({
      wpm: 1,
      cpm: 5,
      accuracy: 80,
      correctionRate: 17,
    });
  });

  it('handles free-mode mixed CJK text without fabricating accuracy', () => {
    expect(calculateTypingMetrics({
      ...base,
      typedText: '你好 test',
      mode: 'free',
      activeLang: 'chinese',
    })).toMatchObject({
      wpm: 3,
      cpm: null,
      accuracy: null,
    });
  });

  it('uses a non-zero time floor for an initial state', () => {
    expect(calculateTypingMetrics({
      ...base,
      typedText: '',
      elapsedSeconds: 0,
      correctKeystrokes: 0,
      totalKeystrokes: 0,
    })).toEqual({
      wpm: 0,
      cpm: 0,
      accuracy: 100,
      correctionRate: 0,
    });
  });
});
