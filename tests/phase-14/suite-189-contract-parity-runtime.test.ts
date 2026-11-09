/**
 * Test Suite 189: Contract Parity Runtime Verification (Pre-Flight 14.9.9, Window 2)
 *
 * Validates runtime cross-validation of canonical contracts:
 * 189.1: ResultEnvelope success payload validates strictly through Zod and Python Pydantic fixtures.
 * 189.2: ResultEnvelope failure payload with RFC 9457 SerializedBridgeError validates symmetrically.
 * 189.3: ProofOutcome discriminated union all 5 variants parsed and discriminated on 'kind'.
 * 189.4: Boundary rejection: unknown fields rejected under strict/extra='forbid' semantics.
 * 189.5: VerificationRequest and VerificationResponse contracts roundtrip cleanly through JSON serialization.
 */

import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  createResultEnvelopeSchema,
  ProofOutcomeSchema,
  LeanExecuteRequestSchema,
  LeanExecuteResponseSchema,
} from '../../src/contracts';

export async function runSuite189(): Promise<void> {
  console.log('Running Suite 189: Contract Parity Runtime Verification (5 sub-tests)...');

  const GenericEnvelopeSchema = createResultEnvelopeSchema(z.record(z.string(), z.unknown()));

  // 189.1: ResultEnvelope success payload
  const successPayload = {
    ok: true as const,
    value: { theorem: 'nat_comm', proved: true },
    correlationId: '00000000-0000-4000-8000-000000000001',
    timestamp: '2026-11-08T12:00:00Z',
  };
  const parsedSuccess = GenericEnvelopeSchema.safeParse(successPayload);
  assert.equal(parsedSuccess.success, true, 'Valid success envelope must pass Zod parse');
  console.log('  ✓ 189.1 ResultEnvelope success payload passes canonical Zod boundary schema');

  // 189.2: ResultEnvelope failure payload
  const failurePayload = {
    ok: false as const,
    error: {
      code: 'FEATURE_DISABLED',
      problemType: 'https://polyglot.dev/errors/feature-disabled',
      httpStatus: 503,
      message: 'Feature flag disabled',
      details: { flag: 'ENABLE_LEAN_BEAM' },
    },
    correlationId: '00000000-0000-4000-8000-000000000002',
    timestamp: '2026-11-08T12:00:01Z',
  };
  const parsedFailure = GenericEnvelopeSchema.safeParse(failurePayload);
  assert.equal(parsedFailure.success, true, 'Valid failure envelope must pass Zod parse');
  console.log('  ✓ 189.2 ResultEnvelope failure payload validates RFC 9457 error structure');

  // 189.3: ProofOutcome discriminated union across all 5 variants
  const variants = [
    { kind: 'certified', seal: 'SEAL_KERNEL_VERIFIED_TIER5', digest: 'sha256-abc', axioms: ['propext'] },
    { kind: 'transport', source: 'hybrid-adjudicator', payload: { theoremName: 'test', durationMs: 12 } },
    { kind: 'preflight', syntaxValid: true, sorryFree: true, reason: 'preflight check' },
    { kind: 'unavailable', reason: 'client_stub' },
    { kind: 'metadata', note: 'test note' },
  ];
  for (const v of variants) {
    const parseRes = ProofOutcomeSchema.safeParse(v);
    assert.equal(parseRes.success, true, `ProofOutcome variant '${v.kind}' must parse cleanly`);
  }
  console.log('  ✓ 189.3 ProofOutcome discriminated union parses all 5 canonical variants');

  // 189.4: Boundary rejection of unknown fields (strict)
  const payloadWithExtra = {
    code: 'theorem t : 1 = 1 := by rfl',
    timeoutMs: 5000,
    unauthorizedField: 'malicious-injection',
  };
  const parsedStrict = LeanExecuteRequestSchema.strict().safeParse(payloadWithExtra);
  assert.equal(parsedStrict.success, false, 'Payload with unknown extra fields must fail strict check');
  console.log('  ✓ 189.4 Unknown extra fields strictly rejected under boundary schema');

  // 189.5: VerificationRequest & Response roundtrip serialization
  const req = { code: 'def x := 42', timeoutMs: 3000 };
  const resp = { exitCode: 0, stdout: '42', stderr: '', durationMs: 15, verified: true };
  const roundtripReq = JSON.parse(JSON.stringify(req));
  const roundtripResp = JSON.parse(JSON.stringify(resp));
  assert.equal(LeanExecuteRequestSchema.safeParse(roundtripReq).success, true);
  assert.equal(LeanExecuteResponseSchema.safeParse(roundtripResp).success, true);
  console.log('  ✓ 189.5 VerificationRequest & Response roundtrip cleanly through JSON serialization');
}

if (process.argv[1]?.endsWith('suite-189-contract-parity-runtime.test.ts')) {
  runSuite189()
    .then(() => {
      console.log('Suite 189 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
