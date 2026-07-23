import { describe, expect, it, vi } from 'vitest';
import { createExchangeRatesHandler } from '../../functions/api/exchange-rates.js';

describe('production endpoint rate-limit boundary', () => {
  it('fails closed before upstream work when the service binding is missing', async () => {
    const fetchImpl = vi.fn();
    const handler = createExchangeRatesHandler({ fetchImpl });
    const response = await handler({
      request: new Request('https://tools.example/api/exchange-rates', {
        headers: { 'CF-Connecting-IP': '198.51.100.10' },
      }),
      env: { RATE_LIMIT_HMAC_SECRET: 'test-secret-with-at-least-32-characters' },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'RATE_LIMIT_UNAVAILABLE' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
