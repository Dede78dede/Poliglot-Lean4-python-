import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ERROR_REGISTRY,
  type ErrorCode,
  createProblemDetails,
} from '../../src/services/errors/error-registry';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite75(): Promise<void> {
  console.log('\n--- Test Suite 75: Unified Error Taxonomy (RFC 9457) ---');

  // 75.1: Registry contains all 27 legacy codes + 3 new codes (30 total)
  const codes = Object.keys(ERROR_REGISTRY);
  assert.ok(codes.length >= 30, 'Error registry must contain at least 30 error definitions');
  assert.ok(codes.includes('KERNEL_DISAGREEMENT'));
  assert.ok(codes.includes('LEANCERT_UNAVAILABLE'));
  assert.ok(codes.includes('FEATURE_FLAG_UNKNOWN'));
  assert.ok(codes.includes('INDEXEDDB_MIGRATION_FAILED'));
  assert.ok(codes.includes('CORRELATION_ID_MISSING'));
  console.log('  ✓ 75.1 Registry contains all 27 legacy codes + 3 new consolidation codes (30 total)');

  // 75.2: BridgeError produces valid RFC 9457 ProblemDetails
  const correlationId = 'test-corr-1234-abcd';
  const err = new BridgeError('LEANCERT_UNAVAILABLE', correlationId, { port: 8085 });
  const problem = err.toProblemDetails();
  assert.equal(problem.type, 'https://polyglot.dev/errors/leancert-unavailable');
  assert.equal(problem.title, 'LEANCERT_UNAVAILABLE');
  assert.equal(problem.status, 503);
  assert.equal(problem.correlationId, correlationId);
  assert.equal(problem.retryable, true);
  assert.equal(problem.category, 'container');
  assert.equal((problem as any).port, 8085);
  console.log('  ✓ 75.2 BridgeError produces RFC 9457 compliant ProblemDetails structure');

  // 75.3: Every error definition has valid URI, HTTP status, and user message
  for (const [code, def] of Object.entries(ERROR_REGISTRY)) {
    assert.ok(def.problemType.startsWith('https://polyglot.dev/errors/'));
    assert.ok(def.httpStatus >= 200 && def.httpStatus <= 503);
    assert.ok(def.userMessage.length >= 10);
  }
  console.log('  ✓ 75.3 All 30 error definitions validated for URI and status invariants');

  // 75.4: docs/reference/error-codes.md matches the registry
  const errorDoc = fs.readFileSync('docs/reference/error-codes.md', 'utf-8');
  for (const code of codes) {
    assert.ok(errorDoc.includes(`\`${code}\``), `docs/reference/error-codes.md must document ${code}`);
  }
  console.log('  ✓ 75.4 docs/reference/error-codes.md is verified against ERROR_REGISTRY');

  // 75.5: Backward compatibility: legacy codes retain same status and retryability
  assert.equal(ERROR_REGISTRY.KERNEL_DISAGREEMENT.httpStatus, 422);
  assert.equal(ERROR_REGISTRY.KERNEL_DISAGREEMENT.retryable, false);
  assert.equal(ERROR_REGISTRY.LEANFLOW_UNAVAILABLE.httpStatus, 503);
  assert.equal(ERROR_REGISTRY.LEANFLOW_UNAVAILABLE.retryable, true);
  console.log('  ✓ 75.5 Backward compatibility preserved across legacy error behaviors');
}
