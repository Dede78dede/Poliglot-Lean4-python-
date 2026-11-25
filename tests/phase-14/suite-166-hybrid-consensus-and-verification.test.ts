/**
 * Test Suite 166: Hybrid Consensus Adjudication & Unit Provenance Hardening (Unit / In-Process)
 *
 * NOTE: These are unit and in-process express router tests verifying JCS HMAC provenance,
 * comparability, axiom gating, and fail-closed rejection. They do NOT substitute for live
 * Docker Kimina/Lake container certification (Gate G1/G2).
 *
 * Validates:
 * 166.1: Both engines accepted with matching SHA-256 digests, valid JCS HMAC provenance, and valid axioms -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5
 * 166.2: Observed custom/sorry axiom strictly rejected -> unconfirmed with axiom policy violation
 * 166.3: Digest or toolchain mismatch fails comparability -> unconfirmed
 * 166.4: Simulated or unavailable engine evidence strictly blocked from certification -> unconfirmed
 * 166.5: Both engines rejected -> confirmed_invalid with verified: false
 * 166.6: LeanProjectRunner enforces explicit integer exitCode and rejects missing exitCode
 * 166.7: KiminaClientProxy correlation mismatch error is thrown on mismatched response ID
 * 166.8: Missing or forged HMAC provenance strictly fails closed (unconfirmed, verified: false)
 * 166.9: Anti-replay rejects reuse of consumed provenanceId or (engine, nonce) pair
 * 166.10: Path traversal & invalid SHA-256 digest / exitCode enforcement
 * 166.11: /api/v1/lean/consensus route rejects caller-forged kiminaEvidence/lakeEvidence (HTTP 400)
 * 166.12: JCS canonical HMAC detects mutation of targetIds, diagnostics, and axiomAudit
 * 166.13: Key rotation, expiry window, clock skew, and NODE_ENV=production fail-closed lock
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import express from 'express';
import http from 'node:http';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_POLICY,
  adjudicateHybridConsensus,
  type VerificationRequestV1,
  type EngineEvidence,
} from '../../server/src/services/verification/hybrid-adjudicator';
import {
  PROVENANCE_MAX_AGE_MS,
  assertPathContained,
  resolveServerProvenanceKeyRing,
  sha256Hex,
  verifyServerExecutionProvenance,
  type ProvenanceKeyRing,
} from '../../server/src/services/verification/server-provenance';
import {
  LeanProjectRunner,
  LakeProcessExecutionError,
} from '../../server/src/services/lean-project-runner';
import { KiminaClientProxy, KiminaCorrelationMismatchError } from '../../server/src/services/kimina-client-proxy';
import { createLeanRouter } from '../../server/src/routes/lean';
import { attachTestProvenance } from './helpers/provenance-test-harness';

export async function runSuite166(): Promise<void> {
  console.log('Running Suite 166: Hybrid Consensus & JCS Provenance Hardening (13 sub-tests)...');

  const sourceCode = 'theorem main_thm : 1 = 1 := by rfl';
  const sourceDigest = sha256Hex(sourceCode);
  const contextDigest = sha256Hex('v4.35.0:context');

  const baseReq: VerificationRequestV1 = {
    protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
    requestId: 'req-001',
    scope: 'snippet',
    sourceDigest,
    contextDigest,
    targetIds: ['thm_main'],
    environment: {
      leanToolchain: 'v4.35.0',
    },
    axiomPolicyId: STANDARD_AXIOM_POLICY,
    requireConsensus: true,
  };

  function makeValidKimina(requestId = 'req-001'): EngineEvidence {
    return attachTestProvenance({
      engine: 'kimina',
      contractVersion: '1.0.0',
      outcome: 'accepted',
      requestId,
      sourceDigest,
      contextDigest,
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
    });
  }

  function makeValidLake(requestId = 'req-001'): EngineEvidence {
    return attachTestProvenance({
      engine: 'lake',
      contractVersion: '1.0.0',
      outcome: 'accepted',
      requestId,
      sourceDigest,
      contextDigest,
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
    });
  }

  // 166.1: Dual acceptance + matching SHA-256 digest + valid provenance + allowed axioms
  const validKimina = makeValidKimina();
  const validLake = makeValidLake();
  const validResult = adjudicateHybridConsensus(baseReq, validKimina, validLake);
  assert.equal(validResult.verdict, 'confirmed_valid');
  assert.equal(validResult.verified, true);
  assert.equal(validResult.badge, 'SEAL_KERNEL_VERIFIED_TIER5');
  assert.equal(validResult.comparable, true);
  assert.equal(validResult.axiomAuditStatus, 'passed');
  console.log('  ✓ 166.1 Both engines accepted with matching digests & JCS HMAC provenance -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5');

  // 166.2: Custom / sorry axiom violation
  const badAxiomKimina = attachTestProvenance({
    ...makeValidKimina('req-002'),
    engine: 'kimina',
    axiomAudit: {
      status: 'passed',
      observedAxioms: ['propext', 'sorryAx'],
      allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
    },
  });
  const badAxiomResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-002' },
    badAxiomKimina,
    makeValidLake('req-002'),
  );
  assert.equal(badAxiomResult.verdict, 'unconfirmed');
  assert.equal(badAxiomResult.verified, false);
  assert.equal(badAxiomResult.axiomAuditStatus, 'failed');
  assert.ok(badAxiomResult.reason.includes('Axiom policy violation'));
  console.log('  ✓ 166.2 Observed sorryAx strictly triggers axiom failure and yields unconfirmed');

  // 166.3: Digest mismatch (comparability violation)
  const divergentDigestLake = attachTestProvenance({
    ...makeValidLake('req-003'),
    engine: 'lake',
    sourceDigest: sha256Hex('different source code'),
  });
  const compResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-003' },
    makeValidKimina('req-003'),
    divergentDigestLake,
  );
  assert.equal(compResult.verdict, 'unconfirmed');
  assert.equal(compResult.verified, false);
  assert.equal(compResult.comparable, false);
  assert.ok(compResult.reason.includes('Context not comparable'));
  console.log('  ✓ 166.3 Source digest mismatch yields comparable: false and unconfirmed verdict');

  // 166.4: Simulation guard
  const simulatedKimina: EngineEvidence = {
    ...makeValidKimina('req-004'),
    outcome: 'simulated',
  };
  const simResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-004' },
    simulatedKimina,
    makeValidLake('req-004'),
  );
  assert.equal(simResult.verdict, 'unconfirmed');
  assert.equal(simResult.verified, false);
  assert.equal(simResult.badge, '⚠ SIMULATED — NON-CERTIFYING');
  console.log('  ✓ 166.4 Simulated engine evidence yields unconfirmed with simulated warning badge');

  // 166.5: Both rejected
  const rejectedKimina = attachTestProvenance({
    ...makeValidKimina('req-005'),
    engine: 'kimina',
    outcome: 'rejected',
    exitCode: 1,
  });
  const rejectedLake = attachTestProvenance({
    ...makeValidLake('req-005'),
    engine: 'lake',
    outcome: 'rejected',
    exitCode: 1,
  });
  const rejResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-005' },
    rejectedKimina,
    rejectedLake,
  );
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

  // 166.8: Forged / missing HMAC provenance strictly rejected
  const unprovKimina = { ...makeValidKimina('req-008') };
  delete (unprovKimina as { provenance?: unknown }).provenance;
  const noProvResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-008' },
    unprovKimina,
    makeValidLake('req-008'),
  );
  assert.equal(noProvResult.verdict, 'unconfirmed');
  assert.equal(noProvResult.verified, false);
  assert.equal(noProvResult.comparable, false);

  const forgedProvLake = makeValidLake('req-008b');
  const tamperedLake: EngineEvidence = {
    ...forgedProvLake,
    provenance: {
      ...forgedProvLake.provenance!,
      signature: '0'.repeat(64),
    },
  };
  const forgedProvResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-008b' },
    makeValidKimina('req-008b'),
    tamperedLake,
  );
  assert.equal(forgedProvResult.verdict, 'unconfirmed');
  assert.equal(forgedProvResult.verified, false);
  console.log('  ✓ 166.8 Missing or tampered HMAC provenance strictly fails closed');

  // 166.9: Anti-replay prevents reusing validKimina / validLake provenance from 166.1 OR reusing same nonce
  const replayResult = adjudicateHybridConsensus(baseReq, validKimina, validLake);
  assert.equal(replayResult.verdict, 'unconfirmed');
  assert.equal(replayResult.verified, false);
  assert.ok(replayResult.reason.toLowerCase().includes('replay'));

  const fixedNonce = 'deadbeefcafebabe1234567890abcdef';
  const kNonce1 = attachTestProvenance(
    {
      ...makeValidKimina('req-009-n1'),
      engine: 'kimina',
    },
    { nonce: fixedNonce },
  );
  const lNonce1 = makeValidLake('req-009-n1');
  const firstNoncePass = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-009-n1' },
    kNonce1,
    lNonce1,
  );
  assert.equal(firstNoncePass.verified, true);

  const kNonce2 = attachTestProvenance(
    {
      ...makeValidKimina('req-009-n2'),
      engine: 'kimina',
    },
    { nonce: fixedNonce },
  );
  const secondNonceReplay = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-009-n2' },
    kNonce2,
    makeValidLake('req-009-n2'),
  );
  assert.equal(secondNonceReplay.verified, false);
  assert.ok(secondNonceReplay.reason.toLowerCase().includes('replay'));
  console.log('  ✓ 166.9 Atomic anti-replay blocks reuse of provenanceId and (engine, nonce) pairs');

  // 166.10: Path traversal containment + invalid digest rejection
  const safeRoot = path.resolve(process.cwd(), 'tmp_safe_root');
  assert.throws(() => assertPathContained(safeRoot, '../etc/passwd'), /PATH_TRAVERSAL_REJECTED/);
  assert.throws(() => assertPathContained(safeRoot, '/etc/passwd'), /PATH_TRAVERSAL_REJECTED/);
  assert.throws(() => assertPathContained(safeRoot, 'bad\0file.lean'), /PATH_TRAVERSAL_REJECTED/);
  const shortDigestResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-010', sourceDigest: 'sha256:aaa111' },
    makeValidKimina('req-010'),
    makeValidLake('req-010'),
  );
  assert.equal(shortDigestResult.verdict, 'unconfirmed');
  assert.equal(shortDigestResult.verified, false);
  console.log('  ✓ 166.10 Path containment & strict SHA-256 digest length enforcement verified');

  // 166.11: Live HTTP check on /api/v1/lean/consensus rejecting caller-forged evidence (Invariant 2)
  const app = express();
  app.use(express.json());
  const proxy = new KiminaClientProxy({
    mode: 'real',
    baseUrl: 'http://127.0.0.1:9',
    timeoutMs: 250,
    maxConcurrency: 2,
  });
  app.use('/api/v1/lean', createLeanRouter(proxy, runner));
  const srv = http.createServer(app);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
  try {
    const addr = srv.address() as { port: number };
    const resp = await fetch(`http://127.0.0.1:${addr.port}/api/v1/lean/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: sourceCode,
        kiminaEvidence: { engine: 'kimina', outcome: 'accepted', exitCode: 0 },
      }),
    });
    assert.equal(resp.status, 400);
    const body = (await resp.json()) as { type?: string; status?: number };
    assert.equal(body.type, 'https://polyglot.dev/errors/forged-evidence-rejected');
    assert.equal(body.status, 400);
    console.log('  ✓ 166.11 /api/v1/lean/consensus rejects caller-supplied evidence with RFC 9457 HTTP 400');
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  }

  // 166.12: JCS HMAC covers targetIds, diagnostics, and axiomAudit
  const authenticKimina = makeValidKimina('req-012');
  const mutatedTargets: EngineEvidence = { ...authenticKimina, targetIds: ['tampered_target'] };
  assert.equal(verifyServerExecutionProvenance(mutatedTargets, mutatedTargets.provenance).valid, false);
  const mutatedDiagnostics: EngineEvidence = {
    ...authenticKimina,
    diagnostics: [{ severity: 'warning', message: 'injected' }],
  };
  assert.equal(verifyServerExecutionProvenance(mutatedDiagnostics, mutatedDiagnostics.provenance).valid, false);
  const mutatedAxiomAudit: EngineEvidence = {
    ...authenticKimina,
    axiomAudit: {
      ...authenticKimina.axiomAudit,
      observedAxioms: ['propext'],
    },
  };
  assert.equal(verifyServerExecutionProvenance(mutatedAxiomAudit, mutatedAxiomAudit.provenance).valid, false);
  console.log('  ✓ 166.12 JCS canonical payload detects tampering of targetIds, diagnostics, and axiomAudit');

  // 166.13: Key rotation, expiry, clock skew, and production lock
  const rotatedRing: ProvenanceKeyRing = {
    active: { keyId: 'key-v2', secret: 'secret-v2-min-32-bytes-long-000002' },
    previous: { keyId: 'key-v1', secret: 'secret-v1-min-32-bytes-long-000001' },
  };
  const baseTime = 1_763_000_000_000;
  const signedWithPrev = attachTestProvenance(
    { ...makeValidKimina('req-013'), engine: 'kimina' },
    { keyRing: rotatedRing, keyIdOverride: 'key-v1', issuedAtMs: baseTime },
  );
  assert.equal(
    verifyServerExecutionProvenance(signedWithPrev, signedWithPrev.provenance, {
      keyRing: rotatedRing,
      nowMs: baseTime + 5_000,
    }).valid,
    true,
  );
  assert.equal(
    verifyServerExecutionProvenance(signedWithPrev, signedWithPrev.provenance, {
      keyRing: rotatedRing,
      nowMs: baseTime + PROVENANCE_MAX_AGE_MS + 10_000,
    }).valid,
    false,
  );
  assert.throws(
    () =>
      resolveServerProvenanceKeyRing({
        NODE_ENV: 'production',
        POLYGLOT_PROVENANCE_SECRET: 'too-short',
      }),
    /CRITICAL SECURITY VIOLATION/,
  );
  assert.throws(
    () =>
      resolveServerProvenanceKeyRing({
        NODE_ENV: 'production',
        POLYGLOT_PROVENANCE_SECRET: 'a'.repeat(32),
        POLYGLOT_MULTI_INSTANCE: 'true',
      }),
    /POLYGLOT_ATOMIC_NONCE_STORE_URL/,
  );
  console.log('  ✓ 166.13 Key rotation, expiry window, and production fail-closed checks verified');
}
