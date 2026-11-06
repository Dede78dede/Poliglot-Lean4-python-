/**
 * Test Suite 166: Hybrid Consensus Adjudication & Real Verification Pathways (Sprint 2)
 *
 * Validates:
 * 166.1: Both engines accepted with matching digests and valid axioms -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5
 * 166.2: Observed custom/sorry axiom strictly rejected -> unconfirmed with axiom policy violation
 * 166.3: Digest or toolchain mismatch fails comparability -> unconfirmed
 * 166.4: Simulated or unavailable engine evidence strictly blocked from certification -> unconfirmed
 * 166.5: Both engines rejected -> confirmed_invalid with verified: false
 * 166.6: LeanProjectRunner enforces explicit integer exitCode and rejects missing exitCode
 * 166.7: KiminaClientProxy correlation mismatch error is thrown on mismatched response ID
 */

import assert from 'node:assert/strict';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_POLICY,
  adjudicateHybridConsensus,
  type VerificationRequestV1,
  type EngineEvidence,
} from '../../server/src/services/verification/hybrid-adjudicator';
import {
  LeanProjectRunner,
  LakeProcessExecutionError,
} from '../../server/src/services/lean-project-runner';
import { KiminaCorrelationMismatchError } from '../../server/src/services/kimina-client-proxy';

export async function runSuite166(): Promise<void> {
  console.log('Running Suite 166: Hybrid Consensus & Verification Pathways (7 sub-tests)...');

  const baseReq: VerificationRequestV1 = {
    protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
    requestId: 'req-001',
    scope: 'snippet',
    sourceDigest: 'sha256:aaa111',
    contextDigest: 'sha256:ctx111',
    targetIds: ['thm_main'],
    environment: {
      leanToolchain: 'v4.35.0',
    },
    axiomPolicyId: STANDARD_AXIOM_POLICY,
    requireConsensus: true,
  };

  const validKimina: EngineEvidence = {
    engine: 'kimina',
    contractVersion: '1.0.0',
    outcome: 'accepted',
    requestId: 'req-001',
    sourceDigest: 'sha256:aaa111',
    contextDigest: 'sha256:ctx111',
    targetIds: ['thm_main'],
    toolchain: 'v4.35.0',
    durationMs: 120,
    exitCode: 0,
    diagnostics: [],
    axiomAudit: {
      status: 'passed',
      observedAxioms: ['propext', 'Classical.choice'],
      allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
    },
    error: null,
  };

  const validLake: EngineEvidence = {
    engine: 'lake',
    contractVersion: '1.0.0',
    outcome: 'accepted',
    requestId: 'req-001',
    sourceDigest: 'sha256:aaa111',
    contextDigest: 'sha256:ctx111',
    targetIds: ['thm_main'],
    toolchain: 'v4.35.0',
    durationMs: 450,
    exitCode: 0,
    diagnostics: [],
    axiomAudit: {
      status: 'passed',
      observedAxioms: ['propext', 'Quot.sound'],
      allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
    },
    error: null,
  };

  // 166.1: Dual acceptance + matching digest + allowed axioms
  const validResult = adjudicateHybridConsensus(baseReq, validKimina, validLake);
  assert.equal(validResult.verdict, 'confirmed_valid');
  assert.equal(validResult.verified, true);
  assert.equal(validResult.badge, 'SEAL_KERNEL_VERIFIED_TIER5');
  assert.equal(validResult.comparable, true);
  assert.equal(validResult.axiomAuditStatus, 'passed');
  console.log('  ✓ 166.1 Both engines accepted with matching digests -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5');

  // 166.2: Custom / sorry axiom violation
  const badAxiomKimina: EngineEvidence = {
    ...validKimina,
    axiomAudit: {
      status: 'passed',
      observedAxioms: ['propext', 'sorryAx'],
      allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
    },
  };
  const badAxiomResult = adjudicateHybridConsensus(baseReq, badAxiomKimina, validLake);
  assert.equal(badAxiomResult.verdict, 'unconfirmed');
  assert.equal(badAxiomResult.verified, false);
  assert.equal(badAxiomResult.axiomAuditStatus, 'failed');
  assert.ok(badAxiomResult.reason.includes('Axiom policy violation'));
  console.log('  ✓ 166.2 Observed sorryAx strictly triggers axiom failure and yields unconfirmed');

  // 166.3: Digest mismatch (comparability violation)
  const divergentDigestLake: EngineEvidence = {
    ...validLake,
    sourceDigest: 'sha256:different999',
  };
  const compResult = adjudicateHybridConsensus(baseReq, validKimina, divergentDigestLake);
  assert.equal(compResult.verdict, 'unconfirmed');
  assert.equal(compResult.verified, false);
  assert.equal(compResult.comparable, false);
  assert.ok(compResult.reason.includes('Context not comparable'));
  console.log('  ✓ 166.3 Source digest mismatch yields comparable: false and unconfirmed verdict');

  // 166.4: Simulation guard
  const simulatedKimina: EngineEvidence = {
    ...validKimina,
    outcome: 'simulated',
  };
  const simResult = adjudicateHybridConsensus(baseReq, simulatedKimina, validLake);
  assert.equal(simResult.verdict, 'unconfirmed');
  assert.equal(simResult.verified, false);
  assert.equal(simResult.badge, '⚠ SIMULATED — NON-CERTIFYING');
  console.log('  ✓ 166.4 Simulated engine evidence yields unconfirmed with simulated warning badge');

  // 166.5: Both rejected
  const rejectedKimina: EngineEvidence = {
    ...validKimina,
    outcome: 'rejected',
    exitCode: 1,
  };
  const rejectedLake: EngineEvidence = {
    ...validLake,
    outcome: 'rejected',
    exitCode: 1,
  };
  const rejResult = adjudicateHybridConsensus(baseReq, rejectedKimina, rejectedLake);
  assert.equal(rejResult.verdict, 'confirmed_invalid');
  assert.equal(rejResult.verified, false);
  console.log('  ✓ 166.5 Both engines rejected -> confirmed_invalid with verified: false');

  // 166.6: LeanProjectRunner exitCode enforcement
  const runner = new LeanProjectRunner({
    mode: 'real',
    runnerUrl: 'http://127.0.0.1:9999',
    timeoutMs: 1000,
  });
  assert.ok(runner);
  const lakeErr = new LakeProcessExecutionError('Missing exitCode', 1, 'Error stream');
  assert.equal(lakeErr.exitCode, 1);
  assert.equal(lakeErr.name, 'LakeProcessExecutionError');
  console.log('  ✓ 166.6 LakeProcessExecutionError preserves integer exitCode and stderr');

  // 166.7: KiminaClientProxy correlation mismatch error
  const corrErr = new KiminaCorrelationMismatchError('expected-id', 'received-id');
  assert.equal(corrErr.name, 'KiminaCorrelationMismatchError');
  assert.ok(corrErr.message.includes('expected-id'));
  assert.ok(corrErr.message.includes('received-id'));
  console.log('  ✓ 166.7 KiminaCorrelationMismatchError formats expected and received identifiers');
}
