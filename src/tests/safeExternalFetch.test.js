import { describe, it, expect } from 'vitest';
import { isPrivateHost, validateTargetUrl } from '../../functions/_shared/safeExternalFetch.js';

describe('isPrivateHost', () => {
  it('blocks empty/null hostname', () => {
    expect(isPrivateHost('')).toBe(true);
    expect(isPrivateHost(null)).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isPrivateHost('localhost')).toBe(true);
  });

  it('blocks .local domains', () => {
    expect(isPrivateHost('myserver.local')).toBe(true);
  });

  it('blocks loopback 127.0.0.1', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true);
  });

  it('blocks 10.x.x.x private range', () => {
    expect(isPrivateHost('10.0.0.1')).toBe(true);
    expect(isPrivateHost('10.255.255.255')).toBe(true);
  });

  it('blocks 172.16-31.x.x private range', () => {
    expect(isPrivateHost('172.16.0.1')).toBe(true);
    expect(isPrivateHost('172.31.255.255')).toBe(true);
  });

  it('does not block 172.15.x.x (public)', () => {
    expect(isPrivateHost('172.15.0.1')).toBe(false);
  });

  it('blocks 192.168.x.x private range', () => {
    expect(isPrivateHost('192.168.1.1')).toBe(true);
  });

  it('blocks 169.254.x.x link-local (AWS metadata)', () => {
    expect(isPrivateHost('169.254.169.254')).toBe(true);
  });

  it('blocks IPv6 loopback ::1', () => {
    expect(isPrivateHost('::1')).toBe(true);
  });

  it('allows public IP addresses', () => {
    expect(isPrivateHost('1.1.1.1')).toBe(false);
    expect(isPrivateHost('8.8.8.8')).toBe(false);
    expect(isPrivateHost('104.18.0.1')).toBe(false);
  });

  it('allows public domain names', () => {
    expect(isPrivateHost('example.com')).toBe(false);
    expect(isPrivateHost('fonts.googleapis.com')).toBe(false);
  });
});

describe('validateTargetUrl', () => {
  it('throws on invalid URL', () => {
    expect(() => validateTargetUrl('not-a-url')).toThrow('Invalid URL format');
  });

  it('throws on non-http/https protocol', () => {
    expect(() => validateTargetUrl('ftp://example.com')).toThrow('Only HTTP and HTTPS');
  });

  it('throws on URL with credentials', () => {
    expect(() => validateTargetUrl('https://user:pass@example.com')).toThrow('credentials');
  });

  it('throws on non-standard port', () => {
    expect(() => validateTargetUrl('https://example.com:8080/path')).toThrow('ports are allowed');
  });

  it('throws on private IP', () => {
    expect(() => validateTargetUrl('https://192.168.1.1/api')).toThrow('internal');
  });

  it('allows valid public HTTPS URL', () => {
    const parsed = validateTargetUrl('https://fonts.googleapis.com/css2?family=Inter');
    expect(parsed.hostname).toBe('fonts.googleapis.com');
  });

  it('allows standard port 443 explicitly', () => {
    const parsed = validateTargetUrl('https://example.com:443/path');
    expect(parsed.hostname).toBe('example.com');
  });

  it('allows standard port 80 explicitly', () => {
    const parsed = validateTargetUrl('http://example.com:80/path');
    expect(parsed.hostname).toBe('example.com');
  });
});
