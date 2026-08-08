export const RATE_LIMIT_POLICIES = Object.freeze({
  'extract-fonts': Object.freeze({
    route: 'extract-fonts',
    policyClass: 'expensive',
    binding: 'EXPENSIVE_LIMITER',
    limit: 20,
    period: 60,
  }),
  'exchange-rates': Object.freeze({
    route: 'exchange-rates',
    policyClass: 'standard',
    binding: 'STANDARD_LIMITER',
    limit: 60,
    period: 60,
  }),
  iplookup: Object.freeze({
    route: 'iplookup',
    policyClass: 'standard',
    binding: 'STANDARD_LIMITER',
    limit: 60,
    period: 60,
  }),
});

export function getRateLimitPolicy(route) {
  return Object.hasOwn(RATE_LIMIT_POLICIES, route) ? RATE_LIMIT_POLICIES[route] : null;
}

export function validateRateLimitConfiguration(entries) {
  const configured = new Map((entries || []).map((entry) => [entry.name, entry.simple]));
  if (configured.size !== (entries || []).length) throw new Error('Duplicate rate-limit binding.');
  const expectedBindings = new Map();
  for (const policy of Object.values(RATE_LIMIT_POLICIES)) {
    const previous = expectedBindings.get(policy.binding);
    if (previous && (previous.limit !== policy.limit || previous.period !== policy.period)) {
      throw new Error(`Routes sharing ${policy.binding} must use the same numeric policy.`);
    }
    expectedBindings.set(policy.binding, { limit: policy.limit, period: policy.period });
  }

  for (const binding of configured.keys()) {
    if (!expectedBindings.has(binding)) throw new Error(`Unknown rate-limit binding: ${binding}`);
  }
  for (const [binding, expected] of expectedBindings) {
    const actual = configured.get(binding);
    if (!actual) throw new Error(`Missing rate-limit binding: ${binding}`);
    if (actual.limit !== expected.limit || actual.period !== expected.period) {
      throw new Error(`${binding} must use ${expected.limit} requests per ${expected.period} seconds.`);
    }
  }
  return true;
}
