import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_POLICIES,
  getRateLimitPolicy,
  validateRateLimitConfiguration,
} from '../../../config/rateLimitPolicies.js';

const productionBindings = [
  { name: 'EXPENSIVE_LIMITER', simple: { limit: 20, period: 60 } },
  { name: 'STANDARD_LIMITER', simple: { limit: 60, period: 60 } },
];

describe('canonical rate-limit policies', () => {
  it('enumerates every rate-limited route with one complete policy', () => {
    expect(Object.keys(RATE_LIMIT_POLICIES).sort()).toEqual([
      'exchange-rates',
      'extract-fonts',
      'iplookup',
    ]);
    for (const [route, policy] of Object.entries(RATE_LIMIT_POLICIES)) {
      expect(policy).toMatchObject({
        route,
        policyClass: expect.stringMatching(/^(expensive|standard)$/u),
        binding: expect.stringMatching(/_LIMITER$/u),
        limit: expect.any(Number),
        period: 60,
      });
      expect(getRateLimitPolicy(route)).toBe(policy);
    }
    expect(validateRateLimitConfiguration(productionBindings)).toBe(true);
  });

  it.each([
    ['numeric mismatch', [
      { name: 'EXPENSIVE_LIMITER', simple: { limit: 21, period: 60 } },
      productionBindings[1],
    ]],
    ['unknown binding', [...productionBindings, {
      name: 'ORPHAN_LIMITER', simple: { limit: 1, period: 60 },
    }]],
    ['missing binding', [productionBindings[0]]],
    ['duplicate binding', [...productionBindings, productionBindings[0]]],
  ])('rejects a %s', (_label, configuration) => {
    expect(() => validateRateLimitConfiguration(configuration)).toThrow();
  });
});
