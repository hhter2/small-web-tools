import { describe, expect, it } from 'vitest';
import { checkHardcodedUi } from '../../scripts/check-hardcoded-ui.mjs';

describe('hardcoded UI audit', () => {
  it('keeps user-facing JSX in translation resources', () => {
    expect(checkHardcodedUi()).toEqual([]);
  });
});
