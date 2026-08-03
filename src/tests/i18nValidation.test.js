import { describe, expect, it } from 'vitest';
import { checkI18n, validateNamespacePair } from '../../scripts/check-i18n.mjs';

describe('translation resource validation', () => {
  it('keeps checked-in namespaces synchronized', () => {
    expect(checkI18n()).toEqual([]);
  });

  it('rejects incompatible interpolation variables', () => {
    expect(validateNamespacePair('example', { message: 'Hello {{name}}' }, { message: '您好 {{user}}' }))
      .toContain('example: interpolation variables differ at message');
  });
});
