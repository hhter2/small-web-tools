import { describe, expect, it, vi } from 'vitest';
import { errorResponse } from '../../functions/_shared/errorResponse.js';
import {
  getPublicError,
  toPublicProcessingError,
} from '../lib/publicErrors.js';

describe('stable public errors', () => {
  it('returns a safe contract and correlates the server diagnostic', async () => {
    const logger = vi.fn();
    const internal = new Error(
      'C:\\private\\worker.js https://secret.example raw upstream body customer-file.pdf',
    );
    const response = errorResponse('PROVIDER_UNAVAILABLE', 502, {
      error: internal,
      logger,
      diagnostic: 'provider-fetch',
    });
    const bodyText = await response.clone().text();
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'PROVIDER_UNAVAILABLE',
      error: getPublicError('PROVIDER_UNAVAILABLE').message,
    });
    expect(body.correlationId).toMatch(/^[a-f0-9-]{16,}$/u);
    expect(bodyText).not.toMatch(/private|secret\.example|upstream body|customer-file|at /iu);
    expect(logger).toHaveBeenCalledWith(expect.objectContaining({
      correlationId: body.correlationId,
      code: 'PROVIDER_UNAVAILABLE',
      diagnostic: 'provider-fetch',
    }));
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('never exposes processing details outside explicit development mode', () => {
    const error = new Error('private-file.mov failed at C:\\worker\\engine.js:12');
    expect(toPublicProcessingError(error, false)).toEqual({
      code: 'PROCESSING_FAILED',
      message: 'Processing failed. Check the input and try again.',
      developmentDetail: null,
    });
    expect(toPublicProcessingError(error, true).developmentDetail).toContain('private-file.mov');
  });

  it('maps unknown codes to INTERNAL_ERROR', () => {
    expect(getPublicError('UNKNOWN')).toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
