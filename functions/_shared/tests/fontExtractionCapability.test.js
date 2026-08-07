import { describe, expect, it } from 'vitest';
import {
  evaluateFontExtractionCapability,
  FONT_EXTRACTION_EGRESS_POLICY,
} from '../fontExtractionCapability.js';

const NOW = Date.parse('2026-08-07T12:00:00.000Z');

function validMetadata(overrides = {}) {
  return JSON.stringify({
    schemaVersion: FONT_EXTRACTION_EGRESS_POLICY.schemaVersion,
    runtime: FONT_EXTRACTION_EGRESS_POLICY.runtime,
    outcome: 'pass',
    compatibilityDate: FONT_EXTRACTION_EGRESS_POLICY.compatibilityDate,
    implementationRevision: FONT_EXTRACTION_EGRESS_POLICY.implementationRevision,
    evidenceSha256: 'a'.repeat(64),
    verifiedAt: '2026-08-07T00:00:00.000Z',
    expiresAt: '2026-09-06T00:00:00.000Z',
    scenarios: [...FONT_EXTRACTION_EGRESS_POLICY.requiredScenarios],
    ...overrides,
  });
}

describe('font extraction egress capability', () => {
  it.each([
    ['missing metadata', undefined, 'verification-missing-or-malformed'],
    ['malformed metadata', '{', 'verification-missing-or-malformed'],
    ['wrong compatibility date', validMetadata({ compatibilityDate: '2026-07-22' }), 'verification-metadata-mismatch'],
    ['wrong implementation revision', validMetadata({ implementationRevision: 'old' }), 'verification-metadata-mismatch'],
    ['failed outcome', validMetadata({ outcome: 'fail' }), 'verification-metadata-mismatch'],
    ['expired evidence', validMetadata({ expiresAt: '2026-08-07T11:59:59.000Z' }), 'verification-stale'],
    ['overlong validity', validMetadata({ expiresAt: '2026-10-07T00:00:00.000Z' }), 'verification-stale'],
    ['incomplete scenarios', validMetadata({ scenarios: ['public-control'] }), 'verification-scenarios-incomplete'],
  ])('fails closed for %s', (_label, metadata, reason) => {
    expect(evaluateFontExtractionCapability({
      FONT_EXTRACTION_EGRESS_VERIFICATION: metadata,
    }, NOW)).toEqual({ enabled: false, reason });
  });

  it('enables extraction only for current complete evidence', () => {
    expect(evaluateFontExtractionCapability({
      FONT_EXTRACTION_EGRESS_VERIFICATION: validMetadata(),
    }, NOW)).toEqual({ enabled: true, reason: 'verified' });
  });
});
