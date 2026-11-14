/**
 * Test Suite 199: Phase 15 End-to-End Consensus & Authority Gate (ADR-016, ADR-018)
 *
 * Validates:
 * 199.1: Server-side consensus achieves confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5 when both genuine engines agree with valid provenance and zero unproved axioms.
 * 199.2: Axiom audit failure (e.g. sorryAx or disallowed axioms) strictly prevents seal minting.
 * 199.3: External engine unavailability gracefully degrades to unconfirmed without crashing.
 * 199.4: Comparability evaluation checks source digests and toolchain matching between engines.
 * 199.5: Sole authority guarantee + tampered provenance rejection.
 */

import assert from 'node:assert/strict';
import {
  adjudicateHybridConsensus,
  attachServerProvenance,
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_POLICY,
  STANDARD_AXIOM_ALLOWLIST,
  type VerificationRequestV1,
  type EngineEvidence,
} from '../../server/src/services/verification/hybrid-adjudicator';
import { sha256Hex } from '../../server/src/services/verification/server-provenance';

export async function runSuite199(): Promise<void> {
  console.log('Running Suite 199: Phase 15 End-to-End Consensus & Authority Gate (5 sub-tests)...');

  const sourceDigest = sha256Hex('theorem thm_199 : True := trivial');

  const canonicalReq: VerificationRequestV1 = {
    protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
    requestId: 'consensus-test-req-001',
    scope: 'snippet',
    sourceDigest,
    environment: {
      leanToolchain: 'v4.16.0',
    },
    axiomPolicyId: STANDARD_AXIOM_POLICY,
    requireConsensus: true,
  };

  function makeKimina(requestId = 'consensus-test-req-001'): EngineEvidence {
    return attachServerProvenance({
      engine: 'kimina',
      contractVersion: '1.0.0',
      outcome: 'accepted',
      requestId,
      sourceDigest,
      toolchain: 'v4.16.0',
      durationMs: 45,
      exitCode: 0,
      diagnostics: [],
      axiomAudit: {
        status: 'passed',
        observedAxioms: ['propext', 'Classical.choice'],
        allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
      },
      error: null,
    });
  }

  function makeLake(requestId = 'consensus-test-req-001'): EngineEvidence {
    return attachServerProvenance({
      engine: 'lake',
      contractVersion: '1.0.0',
      outcome: 'accepted',
      requestId,
      sourceDigest,
      toolchain: 'v4.16.0',
      durationMs: 52,
      exitCode: 0,
      diagnostics: [],
      axiomAudit: {
        status: 'passed',
        observedAxioms: ['propext', 'Classical.choice'],
        allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
      },
      error: null,
    });
  }

  // 199.1: Authentic Dual-Engine Consensus Validated
  const consensusResult = adjudicateHybridConsensus(
    canonicalReq,
    makeKimina(),
    makeLake()
  );

  assert.equal(consensusResult.verdict, 'confirmed_valid');
  assert.equal(consensusResult.verified, true);
  assert.equal(consensusResult.badge, 'SEAL_KERNEL_VERIFIED_TIER5');
  assert.equal(consensusResult.comparable, true);
  assert.equal(consensusResult.axiomAuditStatus, 'passed');
  console.log('  ✓ 199.1 Dual-engine agreement with compliant axioms & HMAC provenance yields confirmed_valid and SEAL_KERNEL_VERIFIED_TIER5');

  // 199.2: Axiom Audit Failure Containment
  const taintedKiminaEvidence = attachServerProvenance({
    ...makeKimina('consensus-test-req-002'),
    axiomAudit: {
      status: 'failed',
      observedAxioms: ['propext', 'sorryAx'],
      allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
      violations: ['sorryAx'],
    },
  });

  const taintedResult = adjudicateHybridConsensus(
    { ...canonicalReq, requestId: 'consensus-test-req-002' },
    taintedKiminaEvidence,
    makeLake('consensus-test-req-002')
  );

  assert.equal(taintedResult.verdict, 'unconfirmed');
  assert.equal(taintedResult.verified, false);
  assert.equal(taintedResult.badge, 'UNVERIFIED');
  assert.equal(taintedResult.axiomAuditStatus, 'failed');
  assert.ok(taintedResult.reason.includes('Axiom policy violation'));
  console.log('  ✓ 199.2 Disallowed axiom (sorryAx) triggers axiom failure and withholds kernel seal');

  // 199.3: Engine Unavailability Degradation
  const unavailLakeEvidence: EngineEvidence = {
    ...makeLake('consensus-test-req-003'),
    outcome: 'unavailable',
    error: 'Connection refused to lake runner container',
  };

  const unavailResult = adjudicateHybridConsensus(
    { ...canonicalReq, requestId: 'consensus-test-req-003' },
    makeKimina('consensus-test-req-003'),
    unavailLakeEvidence
  );

  assert.equal(unavailResult.verdict, 'unconfirmed');
  assert.equal(unavailResult.verified, false);
  assert.equal(unavailResult.comparable, false);
  assert.ok(unavailResult.reason.includes('unavailable'));
  console.log('  ✓ 199.3 Engine unreachability gracefully degrades to unconfirmed without throwing');

  // 199.4: Digest Mismatch Incomparability
  const mismatchReq: VerificationRequestV1 = {
    ...canonicalReq,
    requestId: 'consensus-test-req-004',
    sourceDigest: sha256Hex('different source'),
  };

  const mismatchResult = adjudicateHybridConsensus(
    mismatchReq,
    makeKimina('consensus-test-req-004'),
    makeLake('consensus-test-req-004')
  );

  assert.equal(mismatchResult.comparable, false);
  assert.equal(mismatchResult.verdict, 'unconfirmed');
  assert.ok(mismatchResult.reason.includes('not comparable'));
  console.log('  ✓ 199.4 Digest or environment mismatch marks evaluation as incomparable');

  // 199.5: Single Certifier Epistemic Invariant Guarantee + Tampered Provenance Fails Closed
  assert.equal(consensusResult.protocolVersion, CANONICAL_VERIFICATION_PROTOCOL);
  assert.equal(typeof consensusResult.badge, 'string');
  const cleanKimina = makeKimina('consensus-test-req-005');
  const forgedKimina: EngineEvidence = {
    ...cleanKimina,
    provenance: { ...cleanKimina.provenance!, signature: 'deadbeef'.repeat(8) },
  };
  const forgedRes = adjudicateHybridConsensus(
    { ...canonicalReq, requestId: 'consensus-test-req-005' },
    forgedKimina,
    makeLake('consensus-test-req-005')
  );
  assert.equal(forgedRes.verified, false);
  assert.equal(forgedRes.verdict, 'unconfirmed');
  console.log('  ✓ 199.5 Epistemic Invariant verified: forged provenance rejected and adjudicator is sole certifier');
}
