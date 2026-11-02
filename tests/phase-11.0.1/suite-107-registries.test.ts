/**
 * Test Suite 107: Registry Extensions (41 Flags, 46 Error Codes) (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY, createProblemDetails } from '../../src/services/errors/error-registry';

export async function runSuite107(): Promise<void> {
  console.log('\n--- Test Suite 107: Registry Extensions (41 Flags, 46 Error Codes) ---');

  // 107.1: FeatureFlagRegistry contains at least 41 flags (Sprint 11.0.1+)
  const flagCount = Object.keys(FEATURE_FLAGS).length;
  assert.ok(flagCount >= 41, `Expected at least 41 feature flags, got ${flagCount}`);
  assert.ok('ENABLE_ACTIVITY_BAR' in FEATURE_FLAGS);
  assert.ok('ENABLE_FILE_MANAGER' in FEATURE_FLAGS);
  assert.ok('ENABLE_DIFF_VIEWER' in FEATURE_FLAGS);
  assert.ok('ENABLE_CONTEXT_ENGINE' in FEATURE_FLAGS);
  assert.equal(FEATURE_FLAGS.ENABLE_ACTIVITY_BAR.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_FILE_MANAGER.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_DIFF_VIEWER.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_CONTEXT_ENGINE.default, false);
  console.log(`  ✓ 107.1 FeatureFlagRegistry contains ${flagCount} typed flags (>=41) with documented defaults`);

  // 107.2: ErrorRegistry contains at least 46 error codes (Sprint 11.0.1+)
  const errorCount = Object.keys(ERROR_REGISTRY).length;
  assert.ok(errorCount >= 46, `Expected at least 46 error codes, got ${errorCount}`);
  assert.ok('FILE_MANAGER_UNAVAILABLE' in ERROR_REGISTRY);
  assert.ok('ARCHIVE_OPERATION_FAILED' in ERROR_REGISTRY);
  assert.ok('TRASH_OPERATION_FAILED' in ERROR_REGISTRY);
  console.log(`  ✓ 107.2 ErrorRegistry contains ${errorCount} typed RFC 9457 error codes (>=46)`);

  // 107.3: RFC 9457 ProblemDetails generation for 3 new error codes
  const errCodes = ['FILE_MANAGER_UNAVAILABLE', 'ARCHIVE_OPERATION_FAILED', 'TRASH_OPERATION_FAILED'] as const;
  for (const code of errCodes) {
    const def = ERROR_REGISTRY[code];
    const problem = createProblemDetails(def, `corr-${code.toLowerCase()}`);
    assert.ok(problem.type.startsWith('https://polyglot.dev/errors/'));
    assert.ok(problem.status >= 400 && problem.status < 600);
    assert.equal(problem.code, code);
    assert.ok(problem.detail.length > 0);
  }
  console.log('  ✓ 107.3 RFC 9457 ProblemDetails generation confirmed for all 3 new error codes');
}
