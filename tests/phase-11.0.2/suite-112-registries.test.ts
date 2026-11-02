/**
 * Test Suite 112: Registry Extensions (45 Flags, 50 Error Codes) (Sprint 11.0.2, Task G1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY, createProblemDetails } from '../../src/services/errors/error-registry';

export async function runSuite112(): Promise<void> {
  console.log('\n--- Test Suite 112: Registry Extensions (45 Flags, 50 Codes) ---');

  // 112.1: FeatureFlagRegistry contains at least 45 flags
  const flagCount = Object.keys(FEATURE_FLAGS).length;
  assert.ok(flagCount >= 45, `Expected at least 45 feature flags, got ${flagCount}`);
  assert.ok('ENABLE_LLM_CHAT' in FEATURE_FLAGS);
  assert.ok('ENABLE_SETTINGS_UI' in FEATURE_FLAGS);
  assert.ok('ENABLE_AGENTIC_AUTOMATION' in FEATURE_FLAGS);
  assert.ok('ENABLE_PROJECT_SCAFFOLDING' in FEATURE_FLAGS);
  assert.equal(FEATURE_FLAGS.ENABLE_LLM_CHAT.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_SETTINGS_UI.default, true);
  assert.equal(FEATURE_FLAGS.ENABLE_AGENTIC_AUTOMATION.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_PROJECT_SCAFFOLDING.default, true);
  console.log(`  ✓ 112.1 FeatureFlagRegistry contains ${flagCount} flags (>=45) with Phase 11.0.2 flags`);

  // 112.2: ErrorRegistry contains at least 50 error codes
  const errorCount = Object.keys(ERROR_REGISTRY).length;
  assert.ok(errorCount >= 50, `Expected at least 50 error codes, got ${errorCount}`);
  assert.ok('CHAT_PROVIDER_UNAVAILABLE' in ERROR_REGISTRY);
  assert.ok('SETTINGS_VALIDATION_FAILED' in ERROR_REGISTRY);
  assert.ok('AUTONOMOUS_GUARDRAIL_EXCEEDED' in ERROR_REGISTRY);
  assert.ok('SCAFFOLD_TEMPLATE_NOT_FOUND' in ERROR_REGISTRY);
  console.log(`  ✓ 112.2 ErrorRegistry contains ${errorCount} error codes (>=50)`);

  // 112.3: .env.example and docs/reference/error-codes.md verified
  const envPath = path.resolve(process.cwd(), '.env.example');
  assert.ok(fs.existsSync(envPath), '.env.example must exist');
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.ok(envContent.includes('ENABLE_LLM_CHAT='));
  assert.ok(envContent.includes('ENABLE_SETTINGS_UI='));
  assert.ok(envContent.includes('ENABLE_AGENTIC_AUTOMATION='));
  assert.ok(envContent.includes('ENABLE_PROJECT_SCAFFOLDING='));

  const errorCatalogPath = path.resolve(process.cwd(), 'docs/reference/error-codes.md');
  assert.ok(fs.existsSync(errorCatalogPath), 'docs/reference/error-codes.md must exist');
  const catalogContent = fs.readFileSync(errorCatalogPath, 'utf8');
  assert.ok(catalogContent.includes('CHAT_PROVIDER_UNAVAILABLE'));
  assert.ok(catalogContent.includes('SETTINGS_VALIDATION_FAILED'));
  assert.ok(catalogContent.includes('AUTONOMOUS_GUARDRAIL_EXCEEDED'));
  assert.ok(catalogContent.includes('SCAFFOLD_TEMPLATE_NOT_FOUND'));

  // Test RFC 9457 generation for new error codes
  const newCodes = [
    'CHAT_PROVIDER_UNAVAILABLE',
    'SETTINGS_VALIDATION_FAILED',
    'AUTONOMOUS_GUARDRAIL_EXCEEDED',
    'SCAFFOLD_TEMPLATE_NOT_FOUND',
  ] as const;
  for (const code of newCodes) {
    const def = ERROR_REGISTRY[code];
    const problem = createProblemDetails(def, `corr-${code.toLowerCase()}`);
    assert.equal(problem.code, code);
    assert.ok(problem.type.startsWith('https://polyglot.dev/errors/'));
    assert.ok(problem.status >= 400 && problem.status < 600);
  }
  console.log('  ✓ 112.3 .env.example and docs/reference/error-codes.md regenerated and verified');
}
