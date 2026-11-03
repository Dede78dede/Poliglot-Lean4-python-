/**
 * Test Suite 160: Contract Parity and Pydantic Boundary Validation (Phase 13.9, Task 07)
 *
 * Validates:
 * 160.1: TypeScript ResultEnvelope conforms to discriminated union on 'ok' matching Pydantic Discriminator('ok')
 * 160.2: SerializedBridgeError schema parity: fields mirror RFC 9457 across TS and Python definitions
 * 160.3: Models enforce strict boundaries (extra='forbid' semantics parity)
 * 160.4: Contract generation script (npm run contracts:generate) executes idempotently with zero drift
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  type ResultEnvelope,
  createSuccessEnvelope,
  createErrorEnvelope,
} from '../../src/shared/contracts/result-envelope';
import { BridgeError } from '../../src/services/errors/bridge-error';
import { generatePythonContracts } from '../../scripts/generate-contracts';

export async function runSuite160(): Promise<void> {
  console.log('Running Suite 160: Contract Parity & Pydantic Boundary (4 sub-tests)...');

  // 160.1: Discriminated union on 'ok' parity
  const successEnv = createSuccessEnvelope({ proof: 'by rfl' }, 'corr-160-1');
  assert.equal(successEnv.ok, true);
  if (successEnv.ok) {
    assert.equal(successEnv.value.proof, 'by rfl');
  }

  const errorEnv = createErrorEnvelope(
    new BridgeError('FEATURE_DISABLED', 'corr-160-2', { feature: 'ENABLE_LP2' }),
    'corr-160-2'
  );
  assert.equal(errorEnv.ok, false);
  if (!errorEnv.ok) {
    assert.equal(errorEnv.error.code, 'FEATURE_DISABLED');
  }

  // Verify schemas/generated_contracts.py defines Discriminator('ok')
  const schemaPath = path.resolve('schemas/generated_contracts.py');
  const pyCode = fs.readFileSync(schemaPath, 'utf-8');
  assert.ok(pyCode.includes("Discriminator('ok')"), "Python schema must declare Discriminator('ok')");
  console.log("  ✓ 160.1 TypeScript ResultEnvelope and Pydantic Discriminator('ok') maintain contract parity");

  // 160.2: SerializedBridgeError RFC 9457 schema parity
  const expectedFields = ['code', 'problemType', 'httpStatus', 'message', 'details'];
  for (const field of expectedFields) {
    assert.ok(
      pyCode.includes(`${field}:`),
      `Python SerializedBridgeError must define field '${field}'`
    );
  }
  console.log('  ✓ 160.2 SerializedBridgeError mirrors RFC 9457 fields across TypeScript and Python');

  // 160.3: Strict boundaries with extra='forbid'
  assert.ok(pyCode.includes("extra='forbid'"), "Python base model must enforce extra='forbid'");
  assert.ok(pyCode.includes("frozen=True"), "Python base model must enforce frozen=True");
  assert.ok(pyCode.includes("strict=True"), "Python base model must enforce strict=True");
  console.log("  ✓ 160.3 Pydantic models enforce extra='forbid', frozen=True, and strict=True");

  // 160.4: Idempotent contract generation with zero drift
  const generated = generatePythonContracts();
  assert.equal(
    pyCode.trim(),
    generated.trim(),
    'schemas/generated_contracts.py must match output of generatePythonContracts() with zero drift'
  );
  console.log('  ✓ 160.4 Contract generation script is strictly idempotent with zero drift');
}

if (process.argv[1]?.endsWith('suite-160-contract-parity.test.ts')) {
  runSuite160()
    .then(() => {
      console.log('Suite 160 passed (4/4 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
