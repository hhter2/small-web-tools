import { describe, expect, it } from 'vitest';
import {
  normalizeVersion,
  resolveVersion,
  resolveVersionDetails,
  selectLatestVersionTag,
} from '../../scripts/resolve-version.mjs';

describe('build version resolution', () => {
  it('uses the first version-sorted Git tag', () => {
    expect(selectLatestVersionTag('v0.6.0-beta\nv0.5.4-beta\n')).toBe('v0.6.0-beta');
  });

  it('sorts tags returned as remote Git references', () => {
    expect(selectLatestVersionTag(
      'abc123\trefs/tags/v0.5.4-beta\ndef456\trefs/tags/v0.7.1-beta\n',
    )).toBe('v0.7.1-beta');
  });

  it('ignores non-version tags', () => {
    expect(selectLatestVersionTag('release-candidate\n0.6.0\n')).toBe('v0.6.0');
  });

  it('prefers the repository tag over the archive environment fallback', () => {
    expect(resolveVersion({
      tagOutput: 'v0.6.0-beta\nv0.5.4-beta',
      environmentVersion: 'old-build',
    })).toBe('v0.6.0-beta');
  });

  it('falls back to the environment when Git metadata is unavailable', () => {
    expect(resolveVersion({ tagOutput: '', environmentVersion: '1.2.3' }))
      .toBe('v1.2.3');
  });

  it('reports the selected version source', () => {
    expect(resolveVersionDetails({ tagOutput: 'v2.0.0\n', environmentVersion: '1.0.0' }))
      .toEqual({ version: 'v2.0.0', source: 'git-tag' });
    expect(resolveVersionDetails({ tagOutput: '', environmentVersion: '1.0.0' }))
      .toEqual({ version: 'v1.0.0', source: 'environment' });
    expect(resolveVersionDetails({ tagOutput: '', environmentVersion: '' }))
      .toEqual({ version: 'v0.0.0', source: 'fallback' });
  });

  it('normalizes an unprefixed version', () => {
    expect(normalizeVersion('2.0.0-beta')).toBe('v2.0.0-beta');
  });

  it('rejects invalid version fallback values', () => {
    expect(normalizeVersion('old-build')).toBe('');
  });
});
