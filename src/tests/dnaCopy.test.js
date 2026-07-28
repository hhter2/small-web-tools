import { describe, expect, it } from 'vitest';
import { stripDirectionLabels } from '../components/DnaConverter.jsx';

describe('DNA/RNA copy formatting', () => {
  it('removes only terminal direction labels and their separators', () => {
    expect(stripDirectionLabels("5'-ACGT-3'")).toBe('ACGT');
    expect(stripDirectionLabels("3'-T-G-C-A-5'")).toBe('T-G-C-A');
    expect(stripDirectionLabels("5’-Met-Arg-3’")).toBe('Met-Arg');
  });

  it('leaves unlabelled output unchanged', () => {
    expect(stripDirectionLabels('ACGT')).toBe('ACGT');
  });
});
