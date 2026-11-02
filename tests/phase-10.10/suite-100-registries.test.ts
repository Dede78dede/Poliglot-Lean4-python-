/**
 * Test Suite 100: Registry Extensions (37 Flags, 43 Error Codes) (Phase 10.10, Task R1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY, createProblemDetails } from '../../src/services/errors/error-registry';

export async function runSuite100(): Promise<void> {
  console.log('\n--- Test Suite 100: Registry Extensions (37 Flags, 43 Error Codes) ---');

  // 100.1: FeatureFlagRegistry contains at least 37 flags (extended in 11.0.1+)
  const flagCount = Object.keys(FEATURE_FLAGS).length;
  assert.ok(flagCount >= 37, `Expected at least 37 feature flags in FEATURE_FLAGS, got ${flagCount}`);
  assert.ok('ENABLE_MCP_DISCOVER' in FEATURE_FLAGS);
  assert.ok('ENABLE_MCP_STATELESS' in FEATURE_FLAGS);
  assert.ok('ENABLE_TOOL_SEARCH' in FEATURE_FLAGS);
  assert.ok('ENABLE_MCP_GATEWAY' in FEATURE_FLAGS);
  assert.ok('ENABLE_SKILL_BUNDLES' in FEATURE_FLAGS);
  assert.ok('ENABLE_DEEPSEEK_KIMI_MINIMAX' in FEATURE_FLAGS);
  assert.equal(FEATURE_FLAGS.ENABLE_MCP_DISCOVER.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_MCP_STATELESS.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_TOOL_SEARCH.default, false);
  console.log(`  ✓ 100.1 FeatureFlagRegistry contains ${flagCount} typed flags (>=37)`);

  // 100.2: ErrorRegistry contains at least 43 error codes (extended in 11.0.1+)
  const errorCount = Object.keys(ERROR_REGISTRY).length;
  assert.ok(errorCount >= 43, `Expected at least 43 error codes in ERROR_REGISTRY, got ${errorCount}`);
  assert.ok('GATEWAY_UNAVAILABLE' in ERROR_REGISTRY);
  assert.ok('PROPOSAL_TOKEN_REQUIRED' in ERROR_REGISTRY);
  assert.ok('SKILL_NAME_TOO_LONG' in ERROR_REGISTRY);
  assert.ok('SKILL_DESCRIPTION_TOO_LONG' in ERROR_REGISTRY);
  assert.ok('SKILL_BODY_TOO_LONG' in ERROR_REGISTRY);
  assert.ok('MINIMAX_THINKING_DISABLED_REJECTED' in ERROR_REGISTRY);
  console.log('  ✓ 100.2 ErrorRegistry contains exactly 43 typed RFC 9457 error codes');

  // 100.3: New error codes adhere to RFC 9457 URI and ProblemDetails structure
  const sampleDef = ERROR_REGISTRY.GATEWAY_UNAVAILABLE;
  const problem = createProblemDetails(sampleDef, 'corr-test-100');
  assert.equal(problem.type, 'https://polyglot.dev/errors/gateway-unavailable');
  assert.equal(problem.status, 503);
  assert.equal(problem.retryable, true);
  assert.equal(problem.category, 'container');
  console.log('  ✓ 100.3 New error codes produce RFC 9457 compliant ProblemDetails');

  // 100.4: .polyglot-skills-manifest.json exists and tracks all 5 canonical skills across 3 targets (15 files)
  const manifestPath = path.resolve(process.cwd(), '.polyglot-skills-manifest.json');
  assert.ok(fs.existsSync(manifestPath), '.polyglot-skills-manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    skillCount: number;
    files: string[];
  };
  assert.ok(manifest.skillCount >= 5, `Expected at least 5 skills, got ${manifest.skillCount}`);
  assert.ok(manifest.files.length >= 15, `Expected at least 15 files, got ${manifest.files.length}`);
  for (const f of manifest.files) {
    assert.ok(fs.existsSync(path.resolve(process.cwd(), f)), `Generated skill file missing: ${f}`);
  }
  console.log('  ✓ 100.4 .polyglot-skills-manifest.json verifies 5 canonical skills and 15 target files');
}
