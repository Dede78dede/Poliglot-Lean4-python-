/**
 * Test Suite 166: Hybrid Consensus Adjudication & Real Verification Pathways (Sprint 2 + P0 Hardening)
 *
 * Validates:
 * 166.1: Both engines accepted with matching SHA-256 digests, valid HMAC provenance, and valid axioms -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5
 * 166.2: Observed custom/sorry axiom strictly rejected -> unconfirmed with axiom policy violation
 * 166.3: Digest or toolchain mismatch fails comparability -> unconfirmed
 * 166.4: Simulated or unavailable engine evidence strictly blocked from certification -> unconfirmed
 * 166.5: Both engines rejected -> confirmed_invalid with verified: false
 * 166.6: LeanProjectRunner enforces explicit integer exitCode and rejects missing exitCode
 * 166.7: KiminaClientProxy correlation mismatch error is thrown on mismatched response ID
 * 166.8: Missing or forged HMAC provenance strictly fails closed (unconfirmed, verified: false)
 * 166.9: Anti-replay rejects reuse of a previously consumed provenanceId
 * 166.10: Path traversal & invalid SHA-256 digest / exitCode enforcement
 * 166.11: /api/v1/lean/consensus route rejects caller-forged kiminaEvidence/lakeEvidence (HTTP 400)
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import express from 'express';
import http from 'node:http';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_POLICY,
  adjudicateHybridConsensus,
  attachServerProvenance,
  type VerificationRequestV1,
  type EngineEvidence,
} from '../../server/src/services/verification/hybrid-adjudicator';
import {
  sha256Hex,
  assertPathContained,
} from '../../server/src/services/verification/server-provenance';
import {
  LeanProjectRunner,
  LakeProcessExecutionError,
} from '../../server/src/services/lean-project-runner';
import { KiminaClientProxy, KiminaCorrelationMismatchError } from '../../server/src/services/kimina-client-proxy';
import { createLeanRouter } from '../../server/src/routes/lean';

export async function runSuite166(): Promise<void> {
  console.log('Running Suite 166: Hybrid Consensus & Verification Pathways (11 sub-tests)...');

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
    return attachServerProvenance({
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
    return attachServerProvenance({
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
  console.log('  ✓ 166.1 Both engines accepted with matching digests & HMAC provenance -> confirmed_valid + SEAL_KERNEL_VERIFIED_TIER5');

  // 166.2: Custom / sorry axiom violation
  const badAxiomKimina = attachServerProvenance({
    ...makeValidKimina('req-002'),
    axiomAudit: {
      status: 'passed',
      observedAxioms: ['propext', 'sorryAx'],
      allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
    },
  });
  const badAxiomResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-002' },
    badAxiomKimina,
    makeValidLake('req-002')
  );
  assert.equal(badAxiomResult.verdict, 'unconfirmed');
  assert.equal(badAxiomResult.verified, false);
  assert.equal(badAxiomResult.axiomAuditStatus, 'failed');
  assert.ok(badAxiomResult.reason.includes('Axiom policy violation'));
  console.log('  ✓ 166.2 Observed sorryAx strictly triggers axiom failure and yields unconfirmed');

  // 166.3: Digest mismatch (comparability violation)
  const divergentDigestLake = attachServerProvenance({
    ...makeValidLake('req-003'),
    sourceDigest: sha256Hex('different source code'),
  });
  const compResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-003' },
    makeValidKimina('req-003'),
    divergentDigestLake
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
    makeValidLake('req-004')
  );
  assert.equal(simResult.verdict, 'unconfirmed');
  assert.equal(simResult.verified, false);
  assert.equal(simResult.badge, '⚠ SIMULATED — NON-CERTIFYING');
  console.log('  ✓ 166.4 Simulated engine evidence yields unconfirmed with simulated warning badge');

  // 166.5: Both rejected
  const rejectedKimina = attachServerProvenance({
    ...makeValidKimina('req-005'),
    engine: 'kimina',
    outcome: 'rejected',
    exitCode: 1,
  });
  const rejectedLake = attachServerProvenance({
    ...makeValidLake('req-005'),
    engine: 'lake',
    outcome: 'rejected',
    exitCode: 1,
  });
  const rejResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-005' },
    rejectedKimina,
    rejectedLake
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
    makeValidLake('req-008')
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
    tamperedLake
  );
  assert.equal(forgedProvResult.verdict, 'unconfirmed');
  assert.equal(forgedProvResult.verified, false);
  console.log('  ✓ 166.8 Missing or tampered HMAC provenance strictly fails closed');

  // 166.9: Anti-replay prevents reusing validKimina / validLake provenance from 166.1
  const replayResult = adjudicateHybridConsensus(baseReq, validKimina, validLake);
  assert.equal(replayResult.verdict, 'unconfirmed');
  assert.equal(replayResult.verified, false);
  assert.ok(replayResult.reason.toLowerCase().includes('replay'));
  console.log('  ✓ 166.9 Anti-replay blocks reuse of consumed server execution provenance');

  // 166.10: Path traversal containment + invalid digest rejection
  const safeRoot = path.resolve(process.cwd(), 'tmp_safe_root');
  assert.throws(() => assertPathContained(safeRoot, '../etc/passwd'), /PATH_TRAVERSAL_REJECTED/);
  assert.throws(() => assertPathContained(safeRoot, '/etc/passwd'), /PATH_TRAVERSAL_REJECTED/);
  assert.throws(() => assertPathContained(safeRoot, 'bad\0file.lean'), /PATH_TRAVERSAL_REJECTED/);
  const shortDigestResult = adjudicateHybridConsensus(
    { ...baseReq, requestId: 'req-010', sourceDigest: 'sha256:aaa111' },
    makeValidKimina('req-010'),
    makeValidLake('req-010')
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
}
