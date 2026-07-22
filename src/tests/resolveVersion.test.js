import { describe, expect, it } from 'vitest';
import {
  normalizeVersion,
  resolveVersion,
  selectLatestVersionTag,
} from '../../scripts/resolve-version.mjs';

describe('build version resolution', () => {
  it('uses the first version-sorted Git tag', () => {
    expect(selectLatestVersionTag('v0.6.0-beta\nv0.5.4-beta\n')).toBe('v0.6.0-beta');
  });

  it('ignores non-version tags', () => {
    expect(selectLatestVersionTag('release-candidate\n0.6.0\n')).toBe('v0.6.0');
  });

  it('prefers the repository tag over stale environment and package versions', () => {
    expect(resolveVersion({
      tagOutput: 'v0.6.0-beta\nv0.5.4-beta',
      environmentVersion: 'old-build',
      packageVersion: '0.5.4-beta',
    })).toBe('v0.6.0-beta');
  });

  it('falls back to the environment and then package metadata', () => {
    expect(resolveVersion({ tagOutput: '', environmentVersion: '1.2.3', packageVersion: '1.0.0' }))
      .toBe('v1.2.3');
    expect(resolveVersion({ tagOutput: '', environmentVersion: '', packageVersion: '1.0.0' }))
      .toBe('v1.0.0');
  });

  it('normalizes an unprefixed version', () => {
    expect(normalizeVersion('2.0.0-beta')).toBe('v2.0.0-beta');
  });
});
