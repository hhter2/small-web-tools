export const FONT_EXTRACTION_EGRESS_POLICY = Object.freeze({
  schemaVersion: 1,
  runtime: 'cloudflare-workers',
  compatibilityDate: '2026-07-23',
  implementationRevision: 'safe-external-fetch-v2',
  requiredScenarios: Object.freeze([
    'public-control',
    'public-to-private-dns-change',
    'mixed-public-private-addresses',
    'ipv4-mapped-ipv6',
    'redirect-hop-validation',
    'same-zone-routing',
    'cancellation-timeout',
  ]),
});

function parseMetadata(value) {
  if (typeof value !== 'string' || value.length > 8192) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function evaluateFontExtractionCapability(env = {}, now = Date.now()) {
  const metadata = parseMetadata(env.FONT_EXTRACTION_EGRESS_VERIFICATION);
  if (!metadata) return { enabled: false, reason: 'verification-missing-or-malformed' };

  const policy = FONT_EXTRACTION_EGRESS_POLICY;
  if (
    metadata.schemaVersion !== policy.schemaVersion
    || metadata.runtime !== policy.runtime
    || metadata.outcome !== 'pass'
    || metadata.compatibilityDate !== policy.compatibilityDate
    || metadata.implementationRevision !== policy.implementationRevision
    || !/^[a-f0-9]{64}$/u.test(metadata.evidenceSha256 || '')
  ) {
    return { enabled: false, reason: 'verification-metadata-mismatch' };
  }

  const verifiedAt = Date.parse(metadata.verifiedAt);
  const expiresAt = Date.parse(metadata.expiresAt);
  if (
    !Number.isFinite(verifiedAt)
    || !Number.isFinite(expiresAt)
    || verifiedAt > now
    || expiresAt <= now
    || expiresAt - verifiedAt > 31 * 24 * 60 * 60 * 1000
  ) {
    return { enabled: false, reason: 'verification-stale' };
  }

  const scenarios = new Set(Array.isArray(metadata.scenarios) ? metadata.scenarios : []);
  if (policy.requiredScenarios.some((scenario) => !scenarios.has(scenario))) {
    return { enabled: false, reason: 'verification-scenarios-incomplete' };
  }

  return { enabled: true, reason: 'verified' };
}
