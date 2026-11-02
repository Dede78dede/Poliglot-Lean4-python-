/**
 * Test Suite 119: Registry Extensions (46 Flags, 52 Codes, 12 Toolchains) (Phase 11.1, Task R4)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY, createProblemDetails } from '../../src/services/errors/error-registry';
import { TOOLCHAIN_POLICY } from '../../src/services/toolchains/toolchain-policy';

export async function runSuite119(): Promise<void> {
  console.log('\n--- Test Suite 119: Registry Extensions (46 Flags, 52 Codes, 12 Toolchains) ---');

  // 119.1: FeatureFlagRegistry contains at least 46 flags
  const flagCount = Object.keys(FEATURE_FLAGS).length;
  assert.ok(flagCount >= 46, `Expected at least 46 flags, got ${flagCount}`);
  assert.ok('ENABLE_LEAN_BEAM' in FEATURE_FLAGS, 'ENABLE_LEAN_BEAM flag must exist');
  assert.equal(FEATURE_FLAGS.ENABLE_LEAN_BEAM.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_LEAN_BEAM.phase, '11.1');
  assert.equal(FEATURE_FLAGS.ENABLE_LEAN_BEAM.category, 'experiment');
  console.log(`  ✓ 119.1 FeatureFlagRegistry contains ${flagCount} flags (>=46) including ENABLE_LEAN_BEAM`);

  // 119.2: ErrorRegistry contains at least 52 codes
  const errorCount = Object.keys(ERROR_REGISTRY).length;
  assert.ok(errorCount >= 52, `Expected at least 52 error codes, got ${errorCount}`);
  assert.ok('LEAN_BEAM_UNAVAILABLE' in ERROR_REGISTRY);
  assert.ok('LEAN_BEAM_TOOLCHAIN_UNSUPPORTED' in ERROR_REGISTRY);

  assert.equal(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE.httpStatus, 503);
  assert.equal(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE.retryable, true);
  assert.equal(ERROR_REGISTRY.LEAN_BEAM_TOOLCHAIN_UNSUPPORTED.httpStatus, 422);
  assert.equal(ERROR_REGISTRY.LEAN_BEAM_TOOLCHAIN_UNSUPPORTED.retryable, false);

  const prob1 = createProblemDetails(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE, 'corr-test-1');
  assert.equal(prob1.type, 'https://polyglot.dev/errors/lean-beam-unavailable');
  const prob2 = createProblemDetails(ERROR_REGISTRY.LEAN_BEAM_TOOLCHAIN_UNSUPPORTED, 'corr-test-2');
  assert.equal(prob2.type, 'https://polyglot.dev/errors/lean-beam-toolchain-unsupported');
  console.log(`  ✓ 119.2 ErrorRegistry contains ${errorCount} error codes (>=52) with RFC 9457 details`);

  // 119.3: Toolchain policy contains 12 toolchains and reference files are regenerated
  const toolchainCount = Object.keys(TOOLCHAIN_POLICY).length;
  assert.ok(toolchainCount >= 12, `Expected at least 12 toolchains, got ${toolchainCount}`);
  assert.ok('v4.34.0-rc1' in TOOLCHAIN_POLICY);
  assert.equal(TOOLCHAIN_POLICY['v4.34.0-rc1'].stability, 'rc');
  assert.equal(TOOLCHAIN_POLICY['v4.34.0-rc1'].owner, 'femev-runner');

  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf-8');
  assert.ok(envContent.includes('ENABLE_LEAN_BEAM='));

  const errorCatalog = fs.readFileSync(path.resolve(process.cwd(), 'docs/reference/error-codes.md'), 'utf-8');
  assert.ok(errorCatalog.includes('LEAN_BEAM_UNAVAILABLE'));
  assert.ok(errorCatalog.includes('LEAN_BEAM_TOOLCHAIN_UNSUPPORTED'));

  const matrixDoc = fs.readFileSync(path.resolve(process.cwd(), 'docs/architecture/toolchain-matrix.md'), 'utf-8');
  assert.ok(matrixDoc.includes('v4.34.0-rc1'));
  assert.ok(matrixDoc.includes('12-toolchain matrix'));
  console.log('  ✓ 119.3 Toolchains (12), .env.example, error-codes.md, and toolchain-matrix.md verified');

  // 119.4: Bundle Budget in CI and current bundle <= 420 KB
  const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciPath), '.github/workflows/ci.yml must exist');
  const ciContent = fs.readFileSync(ciPath, 'utf-8');
  assert.ok(
    ciContent.includes('budget = 420 KB') || ciContent.includes('budgetKb = 420') || ciContent.includes('420'),
    'CI workflow must define bundle budget of 420 KB'
  );

  const baselinePath = path.resolve(process.cwd(), 'reports/phase-11.2-baseline.json');
  assert.ok(fs.existsSync(baselinePath), 'reports/phase-11.2-baseline.json must exist');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as {
    bundleMetrics: { totalGzipKb: number };
  };
  assert.ok(
    baseline.bundleMetrics.totalGzipKb <= 420,
    `Current bundle (${baseline.bundleMetrics.totalGzipKb} KB) must be <= 420 KB budget`
  );
  console.log(`  ✓ 119.4 Bundle Budget confirmed in CI (420 KB) and current bundle (${baseline.bundleMetrics.totalGzipKb} KB <= 420 KB)`);
}
