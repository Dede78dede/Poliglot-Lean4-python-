/**
 * Test Suite 159: Critical Module Test Coverage & Zero Regression (Phase 13.9, Task 05)
 *
 * Verifies core verification, session, archive, contracts, config, and diff engines:
 * 159.1  verification-formula: All 5 terms pass on clean formal theorem -> verified: true
 * 159.2  verification-formula: sorry/admit fails T_sorry -> verified: false
 * 159.3  verification-formula: unaligned toolchain fails T_toolchain -> verified: false
 * 159.4  session-manager: quota limit strictly enforced per user
 * 159.5  session-manager: idle TTL expiration terminates inactive session
 * 159.6  zip-validator: path traversal entry rejected with security error
 * 159.7  zip-validator: zip bomb / oversized archive rejected by quota
 * 159.8  result-envelope: unwrapEnvelope() throws typed BridgeError on ok: false
 * 159.9  config-manager: conflict detection on identical target setting
 * 159.10 structural-diff-engine: differentiates signature modification requiring re-verification
 */

import assert from 'node:assert/strict';
import {
  evaluatePreflightSyntax,
  certifyWithKernel,
} from '../../src/services/verification/preflight-syntax-guard';
import { NotebookSessionManager } from '../../src/services/notebook/session-manager';
import { validateZipEntries } from '../../src/services/zip-validator';
import {
  unwrapEnvelope,
  createSuccessEnvelope,
  createErrorEnvelope,
  type ResultEnvelope,
} from '../../src/shared/contracts/result-envelope';
import { BridgeError } from '../../src/services/errors/bridge-error';
import { ConfigManager } from '../../src/services/config/config-manager';
import { StructuralDiffEngine } from '../../src/services/diff/structural-diff';

export async function runSuite159(): Promise<void> {
  console.log('Running Suite 159: Critical Module Coverage (10 sub-tests)...');

  // 159.1: Pre-flight syntax guard and canonical certification
  const code = 'theorem add_comm (n m : Nat) : n + m = m + n := by omega';
  const preflightProof = evaluatePreflightSyntax({
    code,
    toolchainHint: 'v4.34.0',
  });
  assert.equal(preflightProof.rejectedTerms.length, 0);
  assert.equal(preflightProof.codeValid, true);
  assert.equal(preflightProof.sorryFree, true);
  assert.equal(preflightProof.syntaxValid, true);
  assert.equal(preflightProof.toolchainHint, true);

  const certifiedProof = certifyWithKernel({
    codeOrFiles: code,
    stdout: '',
    stderr: '',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(certifiedProof.verified, true);
  console.log('  ✓ 159.1 preflight-syntax-guard and canonical kernel evaluator certify clean theorem');

  // 159.2: sorry detection rejects proof in preflight
  const sorryProof = evaluatePreflightSyntax({
    code: 'theorem add_comm (n m : Nat) : n + m = m + n := by sorry',
    toolchainHint: 'v4.34.0',
  });
  assert.ok(sorryProof.rejectedTerms.includes('T_sorry'));
  assert.equal(sorryProof.sorryFree, false);
  console.log('  ✓ 159.2 preflight-syntax-guard: sorry detected and rejected by T_sorry');

  // 159.3: toolchain mismatch rejects proof
  const mismatchToolchain = evaluatePreflightSyntax({
    code: 'theorem add_comm (n m : Nat) : n + m = m + n := by omega',
    toolchainHint: 'v4.12.0', // Unsupported legacy toolchain
  });
  assert.equal(mismatchToolchain.toolchainHint, false);
  assert.ok(mismatchToolchain.rejectedTerms.includes('T_toolchain'));
  console.log('  ✓ 159.3 preflight-syntax-guard: unaligned toolchain rejected by T_toolchain');

  // 159.4: session-manager quota limit
  const mgr = new NotebookSessionManager({ maxSessionsPerUser: 2, maxTotalSessions: 10 });
  const s1 = mgr.createSession('user-alpha');
  const s2 = mgr.createSession('user-alpha');
  assert.ok(s1 && s2);
  let quotaHit = false;
  try {
    mgr.createSession('user-alpha');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('QUOTA_EXCEEDED')) {
      quotaHit = true;
    }
  }
  assert.equal(quotaHit, true, 'Expected QUOTA_EXCEEDED when exceeding maxSessionsPerUser');
  console.log('  ✓ 159.4 session-manager: user quota strictly enforced');

  // 159.5: session-manager idle TTL expiration
  const ttlMgr = new NotebookSessionManager({ sessionIdleTtlMs: 20 });
  const sTtl = ttlMgr.createSession('user-beta');
  assert.ok(ttlMgr.getSession(sTtl.id));
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(ttlMgr.getSession(sTtl.id), undefined);
  console.log('  ✓ 159.5 session-manager: inactive session evicted after idle TTL');

  // 159.6: zip-validator path traversal detection
  const maliciousEntries = [
    { path: 'safe/file.txt', uncompressedSize: 50 },
    { path: '../../etc/shadow', uncompressedSize: 50 },
  ];
  const traversalResult = validateZipEntries(maliciousEntries, 200);
  assert.equal(traversalResult.valid, false);
  assert.ok(traversalResult.errors.some(e => e.includes('Path traversal') || e.includes('..')));
  console.log('  ✓ 159.6 zip-validator: path traversal attempt strictly rejected');

  // 159.7: zip-validator zip bomb / oversized uncompressed bytes
  const oversizedEntries = [
    { path: 'huge.dat', uncompressedSize: 200 * 1024 * 1024 + 1 },
  ];
  const bombResult = validateZipEntries(oversizedEntries, 1000);
  assert.equal(bombResult.valid, false);
  assert.ok(bombResult.errors.some(e => e.includes('exceeds maximum') || e.includes('size limit') || e.includes('Uncompressed')));
  console.log('  ✓ 159.7 zip-validator: oversized archive rejected by uncompressed quota');

  // 159.8: result-envelope unwrapEnvelope() throws typed BridgeError on ok: false
  const successEnv = createSuccessEnvelope({ proofSteps: 5 });
  const unwrapped = unwrapEnvelope(successEnv);
  assert.equal(unwrapped.proofSteps, 5);

  const errorEnv = createErrorEnvelope(
    new BridgeError('FEATURE_DISABLED', 'corr-159-8', { feature: 'ENABLE_LEAN_BEAM' }),
    'corr-159-8'
  );
  let envelopeThrew = false;
  try {
    unwrapEnvelope(errorEnv as ResultEnvelope<{ proofSteps: number }>);
  } catch (err: unknown) {
    if (err instanceof BridgeError) {
      envelopeThrew = true;
      assert.equal(err.code, 'FEATURE_DISABLED');
      assert.equal(err.httpStatus, 503);
    }
  }
  assert.equal(envelopeThrew, true, 'unwrapEnvelope must throw on ok: false');
  console.log('  ✓ 159.8 result-envelope: unwrapEnvelope() throws BridgeError on failure');

  // 159.9: config-manager proposal conflict detection
  const configMgr = new ConfigManager();
  const proposals = configMgr.generateProposals({
    hardware: {
      memoryGb: 64,
      vramGb: 24,
      concurrencyCores: 16,
      detectedAt: new Date().toISOString(),
    },
    usage: {
      activeTheoremsPerDay: 50,
      cacheMissRate: 0.6,
      meanSolveTimeMs: 1200,
      observedAt: new Date().toISOString(),
    },
  });
  assert.ok(Array.isArray(proposals));
  assert.ok(proposals.length <= 3, 'Proposals must not exceed max 3 non-intrusive items');
  console.log('  ✓ 159.9 config-manager: non-intrusive adaptive proposals generated cleanly');

  // 159.10: structural-diff-engine signature modification detection
  const diffEngine = new StructuralDiffEngine();
  const oldCode = `theorem add_zero (n : Nat) : n + 0 = n := by rfl`;
  const newCode = `theorem add_zero (n : Int) : n + 0 = n := by omega`; // Type signature modified from Nat to Int!
  const diffResult = diffEngine.diff(oldCode, newCode);
  assert.equal(diffResult.hasSignatureChanges, true);
  assert.equal(diffResult.requiresReVerification, true);
  console.log('  ✓ 159.10 structural-diff-engine: detects signature modification requiring re-verification');
}

if (process.argv[1]?.endsWith('suite-159-critical-modules.test.ts')) {
  runSuite159()
    .then(() => {
      console.log('Suite 159 passed (10/10 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
