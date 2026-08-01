import { describe, expect, it } from 'vitest';
import { parseIpInput } from '../lib/ipValidation.js';

describe('parseIpInput', () => {
  it.each([
    ['192.0.2.1', 'ipv4'],
    ['2001:db8::1', 'ipv6'],
    ['::1', 'ipv6'],
    ['::ffff:192.0.2.1', 'ipv6'],
  ])('accepts %s', (input, kind) => {
    expect(parseIpInput(input)).toMatchObject({ kind, error: null });
  });

  it.each([
    '999.1.1.1',
    '2001:::1',
    '1.2.3.4/path',
    '1.2.3.4?x=1',
    'fe80::1%eth0',
    '1.2.3.4\nheader',
  ])('rejects unsafe or invalid input %s', (input) => {
    expect(parseIpInput(input).error).toBeTruthy();
  });

  it('allows empty input only when requested', () => {
    expect(parseIpInput('').error).toBeNull();
    expect(parseIpInput('', { allowEmpty: false }).error).toContain('required');
  });
});
