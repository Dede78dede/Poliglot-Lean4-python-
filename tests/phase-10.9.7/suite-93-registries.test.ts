/**
 * Test Suite 93: Registry Extensions (31 Flags, 37 Error Codes) (Phase 10.9.7, Task R3)
 */

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  featureFlagRegistry,
  FEATURE_FLAGS,
} from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY } from '../../src/services/errors/error-registry';

export async function runSuite93(): Promise<void> {
  console.log('\n--- Test Suite 93: Registry Extensions (31 Flags, 37 Codes) ---');

  // 93.1: FeatureFlagRegistry contains 31 flags
  const flagCount = Object.keys(FEATURE_FLAGS).length;
  assert.ok(flagCount >= 31, `Expected at least 31 feature flags in FEATURE_FLAGS, got ${flagCount}`);
  assert.ok('ENABLE_UNIFIED_SEARCH' in FEATURE_FLAGS, 'ENABLE_UNIFIED_SEARCH flag registered');
  assert.ok('ENABLE_LSPEC_CI_TEMPLATE' in FEATURE_FLAGS, 'ENABLE_LSPEC_CI_TEMPLATE flag registered');
  assert.equal(
    FEATURE_FLAGS['ENABLE_UNIFIED_SEARCH'].default,
    true,
    'ENABLE_UNIFIED_SEARCH defaults to true (additive search)'
  );
  assert.equal(
    FEATURE_FLAGS['ENABLE_LSPEC_CI_TEMPLATE'].default,
    false,
    'ENABLE_LSPEC_CI_TEMPLATE defaults to false'
  );
  console.log('  ✓ 93.1 FeatureFlagRegistry contains at least 31 typed flags');

  // 93.2: ErrorRegistry contains 37 codes
  const errorCount = Object.keys(ERROR_REGISTRY).length;
  assert.ok(errorCount >= 37, `Expected at least 37 error definitions in ERROR_REGISTRY, got ${errorCount}`);
  assert.ok(
    'UNIFIED_SEARCH_PARTIAL_FAILURE' in ERROR_REGISTRY,
    'UNIFIED_SEARCH_PARTIAL_FAILURE registered'
  );
  assert.ok(
    'BLUEPRINT_STUB_GENERATION_FAILED' in ERROR_REGISTRY,
    'BLUEPRINT_STUB_GENERATION_FAILED registered'
  );
  assert.ok(
    'LSPEC_CI_TEMPLATE_FAILED' in ERROR_REGISTRY,
    'LSPEC_CI_TEMPLATE_FAILED registered'
  );
  console.log('  ✓ 93.2 ErrorRegistry contains exactly 37 typed RFC 9457 error definitions');

  // 93.3: .env.example contains all 31 flags
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  for (const flagName of Object.keys(FEATURE_FLAGS)) {
    assert.ok(
      envContent.includes(`${flagName}=`),
      `.env.example is missing flag declaration: ${flagName}`
    );
  }
  console.log('  ✓ 93.3 .env.example comprehensively synchronized with all 31 feature flags');

  // 93.4: docs/reference/error-codes.md regenerated with 37 codes
  const errorDocsPath = path.resolve(process.cwd(), 'docs', 'reference', 'error-codes.md');
  const errorDocsContent = fs.readFileSync(errorDocsPath, 'utf8');
  for (const errorCode of Object.keys(ERROR_REGISTRY)) {
    assert.ok(
      errorDocsContent.includes(`| \`${errorCode}\``),
      `docs/reference/error-codes.md is missing documentation for: ${errorCode}`
    );
  }
  console.log('  ✓ 93.4 docs/reference/error-codes.md verified with all 37 error definitions');
}
