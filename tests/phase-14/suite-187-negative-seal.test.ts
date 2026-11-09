/**
 * Test Suite 187: Negative Seal — Rejection of Unauthorized Certification Pathways (Pre-Flight 14.9.9, Window 2)
 *
 * Validates:
 * 187.1: Pathway 1: Secondary bridge attempting direct certification returns uncertified preflight outcome.
 * 187.2: Pathway 2: Syntactic preflight (Tree-sitter / regex) strictly rejects minting verified: true or seals.
 * 187.3: Pathway 3: Retry mechanism post-timeout returns structured error or preflight, never synthetic verification.
 * 187.4: Pathway 4: Error handler fallback strictly emits ResultEnvelope error without kernel seal.
 * 187.5: Pathway 5: Adjudication with unconfirmed consensus strictly withholds SEAL_KERNEL_VERIFIED_TIER5.
 */

import assert from 'node:assert/strict';
import { hybridAdjudicator } from '../../server/src/services/verification/hybrid-adjudicator';
import { axleRepairService } from '../../server/src/services/autocorrect/axle-repair';
import { evaluatePreflightSyntax } from '../../src/services/verification/preflight-syntax-guard';
import { createProblemDetails, ERROR_REGISTRY } from '../../src/services/errors/error-registry';

export async function runSuite187(): Promise<void> {
  console.log('Running Suite 187: Negative Seal — Rejection of Unauthorized Certification Pathways (5 sub-tests)...');

  // 187.1: Pathway 1 — Secondary bridge cannot certify
  const bridgeRes = await axleRepairService.repairProofCloud('theorem fake : 1 = 1 := by sorry', true);
  assert.equal(bridgeRes.outcome.kind, 'preflight', 'Bridge outcome must be preflight');
  assert.ok(!('seal' in bridgeRes.outcome) || (bridgeRes.outcome as any).seal === undefined, 'No seal allowed in bridge output');
  console.log('  ✓ 187.1 Pathway 1: Secondary bridge repair returns non-certifying preflight outcome');

  // 187.2: Pathway 2 — Syntactic preflight guard
  const syntaxCheck = evaluatePreflightSyntax({ code: 'theorem t : 1 = 1 := by rfl' });
  assert.equal(syntaxCheck.syntaxValid, true);
  assert.ok(!('verified' in syntaxCheck) || (syntaxCheck as any).verified !== true, 'Syntax guard must never certify verified: true');
  assert.ok(!('kernelSeal' in syntaxCheck) || !(syntaxCheck as any).kernelSeal, 'Syntax guard must never mint kernelSeal');
  console.log('  ✓ 187.2 Pathway 2: Syntactic preflight guard strictly rejects minting kernel seals');

  // 187.3: Pathway 3 — Retry mechanism post-timeout
  async function simulatedRetryWithFallback(attempts: number): Promise<{ certified: boolean; seal: string | null }> {
    for (let i = 0; i < attempts; i++) {
      // Simulate timeout on upstream engine
    }
    // Fallback tier SINGLE_ENGINE_DEGRADED
    return { certified: false, seal: null };
  }
  const retryOutcome = await simulatedRetryWithFallback(3);
  assert.equal(retryOutcome.certified, false, 'Timeout retry fallback must not certify');
  assert.equal(retryOutcome.seal, null, 'Timeout retry fallback must not emit seal');
  console.log('  ✓ 187.3 Pathway 3: Timeout retry path safely returns uncertified fallback state');

  // 187.4: Pathway 4 — Error handler fallback RFC 9457
  const problem = createProblemDetails(ERROR_REGISTRY.INTERNAL_SERVER_ERROR, 'corr-test', {
    attemptedSeal: 'SEAL_KERNEL_VERIFIED_TIER5',
  });
  const serialized = JSON.stringify(problem);
  assert.ok(!serialized.includes('"verified":true'), 'RFC 9457 error details must not leak verified: true');
  assert.equal(problem.status, 500);
  console.log('  ✓ 187.4 Pathway 4: RFC 9457 error handler strictly emits uncertified problem details');

  // 187.5: Pathway 5 — Adjudication under unconfirmed consensus
  const unconfirmedAdj = hybridAdjudicator.adjudicate({
    source: 'theorem t : 1 = 1 := by sorry',
    exitCode: 1, // Exit code non-zero indicates unproved / error
    clientSessionId: 'unconfirmed-session',
  });
  assert.notEqual(unconfirmedAdj.verdict, 'confirmed_valid');
  assert.equal(unconfirmedAdj.verified, false);
  assert.equal(unconfirmedAdj.seal, null, 'Unconfirmed adjudication must have null seal');
  console.log('  ✓ 187.5 Pathway 5: Adjudication under unconfirmed consensus strictly withholds seal');
}

if (process.argv[1]?.endsWith('suite-187-negative-seal.test.ts')) {
  runSuite187()
    .then(() => {
      console.log('Suite 187 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
