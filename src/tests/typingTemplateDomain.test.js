import { describe, expect, it } from 'vitest';
import {
  detectCodeLanguage,
  detectLanguage,
  parseTemplate,
  repeatToTarget,
} from '../components/TypingSpeedTest/lib/templateDomain.js';

describe('typing template domain', () => {
  it('parses and classifies templates', () => {
    expect(detectLanguage('測試')).toBe('chinese');
    expect(detectCodeLanguage('const value = 1;')).toBe('JavaScript');
    expect(repeatToTarget('one two', 4, false, false)).toBe('one two one two');
    expect(parseTemplate('one two', false)).toHaveLength(2);
  });
});
