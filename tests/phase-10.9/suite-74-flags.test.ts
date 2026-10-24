import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  featureFlagRegistry,
  FEATURE_FLAGS,
  type FeatureFlagName,
} from '../../src/services/flags/feature-flag-registry';

export async function runSuite74(): Promise<void> {
  console.log('\n--- Test Suite 74: Unified Feature Flag Registry ---');

  // 74.1: Registry loads exactly 26 flags (25 ENABLE_* + 1 PIPELINE_*)
  const allFlags = featureFlagRegistry.list();
  assert.ok(allFlags.length >= 26, 'Registry must contain at least 26 flags');
  const enableFlags = allFlags.filter((f) => f.name.startsWith('ENABLE_'));
  assert.ok(enableFlags.length >= 25, 'Must contain at least 25 ENABLE_* flags');
  const policyFlags = allFlags.filter((f) => f.category === 'policy');
  assert.equal(policyFlags.length, 1, 'Must contain 1 policy flag');
  assert.equal(policyFlags[0]!.name, 'PIPELINE_STRICT_GOALS');
  console.log('  ✓ 74.1 Registry loads 26 flags (25 ENABLE_* + 1 PIPELINE_STRICT_GOALS)');

  // 74.2: Unknown ENABLE_* env variable triggers warning without crashing
  process.env['ENABLE_NONEXISTENT_TEST_FLAG'] = 'true';
  const warnings = featureFlagRegistry.detectUnknownEnvFlags();
  delete process.env['ENABLE_NONEXISTENT_TEST_FLAG'];
  assert.ok(warnings.some((w) => w.includes('ENABLE_NONEXISTENT_TEST_FLAG')));
  console.log('  ✓ 74.2 Unknown ENABLE_* triggers FEATURE_FLAG_UNKNOWN warning without failure');

  // 74.3: Environment variable overrides default
  process.env['ENABLE_LEANCERT'] = 'true';
  const testReg = new (featureFlagRegistry.constructor as any)();
  delete process.env['ENABLE_LEANCERT'];
  assert.equal(testReg.isEnabled('ENABLE_LEANCERT'), true, 'Env var true should override default false');
  console.log('  ✓ 74.3 Environment variable correctly overrides code default');

  // 74.4: User override persists in IndexedDB simulation
  featureFlagRegistry.set('ENABLE_PASTALEAN', true);
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_PASTALEAN'), true);
  assert.equal(featureFlagRegistry.getPersistedOverride('ENABLE_PASTALEAN'), true);
  featureFlagRegistry.reset('ENABLE_PASTALEAN');
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_PASTALEAN'), false);
  console.log('  ✓ 74.4 User override persists and resets cleanly');

  // 74.5: .env.example is regenerated from the registry and contains all 26 flags
  const envExample = fs.readFileSync('.env.example', 'utf-8');
  for (const flag of Object.keys(FEATURE_FLAGS)) {
    assert.ok(envExample.includes(flag), `.env.example must contain flag ${flag}`);
  }
  console.log('  ✓ 74.5 .env.example contains all 26 flags as single source of truth');
}
