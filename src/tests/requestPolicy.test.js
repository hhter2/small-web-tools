import { describe, expect, it } from 'vitest';
import {
  FONT_EXTRACTION_LIMITS,
  readLimitedJson,
  validateSameSiteJsonRequest,
} from '../../functions/_shared/requestPolicy.js';

describe('same-site request policy', () => {
  it('keeps all extraction limits in one exported object', () => {
    expect(FONT_EXTRACTION_LIMITS).toEqual({
      requestBytes: 4096,
      htmlBytes: 2 * 1024 * 1024,
      cssBytes: 1024 * 1024,
      totalUpstreamBytes: 6 * 1024 * 1024,
      stylesheets: 12,
      importDepth: 3,
      fontFaces: 100,
      concurrency: 4,
      deadlineMs: 10_000,
    });
    expect(Object.isFrozen(FONT_EXTRACTION_LIMITS)).toBe(true);
  });

  it('allows an explicit no-Origin exception only on localhost', () => {
    const localRequest = new Request('http://localhost:8788/api/extract-fonts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(validateSameSiteJsonRequest(localRequest, {
      ALLOW_LOCAL_DEVELOPMENT: 'true',
    })).toBeNull();

    const deployedRequest = new Request('https://tools.example.com/api/extract-fonts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(validateSameSiteJsonRequest(deployedRequest, {
      ALLOW_LOCAL_DEVELOPMENT: 'true',
    })).toMatchObject({ status: 403 });
  });

  it('cancels streamed request bodies once the byte cap is exceeded', async () => {
    const request = new Request('https://tools.example.com/api/extract-fonts', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"value":"12345"}'));
          controller.close();
        },
      }),
      duplex: 'half',
    });
    await expect(readLimitedJson(request, 8)).rejects.toThrow('too large');
  });
});
