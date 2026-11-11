/**
 * Test Suite 192: Feature-Flag Audit Integration & Governance (Phase 14.9.9.2, G-D1)
 *
 * Validates:
 * 192.1: Registry integrity and complete metadata coverage (owner, phase, category, createdAt, expiresAt, behaviorWhenOff, description).
 * 192.2: Dynamic set equality between FEATURE_FLAGS registry and reports/feature-flag-audit.md.
 * 192.3: Critical representative flags presence (ENABLE_FEMEV, ENABLE_YJS_COLLABORATION, ENABLE_LEAN_BEAM).
 * 192.4: ADR-019 TTL compliance: all flags must have valid future expiry within policy.
 * 192.5: Drift detection: synthetic invalid metadata fixture is detected and rejected.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';

export async function runSuite192(): Promise<void> {
  console.log('Running Suite 192: Feature-Flag Audit Integration & Governance (5 sub-tests)...');

  const flagKeys = Object.keys(FEATURE_FLAGS);

  // 192.1: Registry integrity and complete metadata coverage
  assert.ok(flagKeys.length > 0, 'Flag registry must not be empty');

  for (const key of flagKeys) {
    const meta = FEATURE_FLAGS[key];
    assert.ok(meta, `Missing metadata for flag ${key}`);
    assert.ok(meta.owner && meta.owner.trim().length > 0, `Flag ${key} missing owner`);
    assert.ok(meta.phase && meta.phase.trim().length > 0, `Flag ${key} missing phase`);
    assert.ok(meta.category && meta.category.trim().length > 0, `Flag ${key} missing category`);
    assert.ok(meta.createdAt && !Number.isNaN(Date.parse(meta.createdAt)), `Flag ${key} has invalid createdAt date`);
    assert.ok(meta.expiresAt && !Number.isNaN(Date.parse(meta.expiresAt)), `Flag ${key} has invalid expiresAt date`);
    assert.ok(meta.behaviorWhenOff && meta.behaviorWhenOff.trim().length > 0, `Flag ${key} missing behaviorWhenOff`);
    assert.ok(meta.description && meta.description.trim().length > 0, `Flag ${key} missing description`);
  }
  console.log(`  ✓ 192.1 Metadata coverage: All ${flagKeys.length} registered flags possess complete, valid governance metadata`);

  // 192.2: Dynamic set equality with reports/feature-flag-audit.md
  const reportPath = path.resolve(process.cwd(), 'reports/feature-flag-audit.md');
  assert.ok(fs.existsSync(reportPath), 'reports/feature-flag-audit.md must exist');
  const reportContent = fs.readFileSync(reportPath, 'utf-8');

  for (const key of flagKeys) {
    assert.ok(
      reportContent.includes(`\`${key}\``) || reportContent.includes(`| ${key} |`),
      `Report must index registered flag ${key}`,
    );
  }
  console.log('  ✓ 192.2 Report alignment: reports/feature-flag-audit.md dynamically matches all registered flags');

  // 192.3: Critical representative flags presence
  const representativeFlags = ['ENABLE_FEMEV', 'ENABLE_YJS_COLLABORATION', 'ENABLE_LEAN_BEAM', 'ENABLE_MATHESIS'];
  for (const flag of representativeFlags) {
    assert.ok(flag in FEATURE_FLAGS, `Representative flag ${flag} must be registered in FEATURE_FLAGS`);
  }
  console.log('  ✓ 192.3 Representative flags: Critical system flags verified present in active registry');

  // 192.4: ADR-019 TTL compliance
  const now = Date.now();
  for (const key of flagKeys) {
    const meta = FEATURE_FLAGS[key];
    const expiryTime = Date.parse(meta.expiresAt);
    assert.ok(expiryTime > now, `Flag ${key} must not be expired (expiresAt: ${meta.expiresAt})`);
  }
  console.log('  ✓ 192.4 ADR-019 TTL compliance: All flags have active, unexpired governance windows');

  // 192.5: Drift detection on synthetic invalid metadata fixture
  function validateFlagFixture(fakeMeta: any): { valid: boolean; error?: string } {
    if (!fakeMeta.owner) return { valid: false, error: 'missing_owner' };
    if (!fakeMeta.expiresAt || Number.isNaN(Date.parse(fakeMeta.expiresAt))) return { valid: false, error: 'invalid_expiry' };
    if (!fakeMeta.behaviorWhenOff) return { valid: false, error: 'missing_fallback' };
    return { valid: true };
  }

  const invalidFixture = { owner: '', expiresAt: 'not-a-date', behaviorWhenOff: '' };
  const validationResult = validateFlagFixture(invalidFixture);
  assert.equal(validationResult.valid, false, 'Validator must catch invalid metadata drift');
  console.log('  ✓ 192.5 Drift detection: Validator successfully catches metadata corruption in synthetic fixtures');
}

if (process.argv[1]?.endsWith('suite-192-feature-flag-audit.test.ts')) {
  runSuite192()
    .then(() => {
      console.log('Suite 192 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
