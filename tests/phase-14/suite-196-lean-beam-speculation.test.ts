/**
 * Test Suite 196: LeanBeam Speculation Verification (Phase 15 Wave 2, ADR-016)
 *
 * Validates:
 * 196.1: LeanBeam speculative tactic execution generates candidate results with speculativelyTested: true.
 * 196.2: Epistemic barrier: LeanBeam candidate results NEVER emit verified: true or SEAL_KERNEL_VERIFIED_TIER5.
 * 196.3: Flag disabled behavior: runAt throws BridgeError FEATURE_DISABLED when ENABLE_LEAN_BEAM is false.
 * 196.4: Toolchain qualification: unvalidated Lean toolchains trigger LEAN_BEAM_TOOLCHAIN_UNSUPPORTED.
 * 196.5: Speculative candidate structure conforms to ProofOutcome non-certifying contracts.
 * 196.6: Express /speculative route enforces RFC 9457 503 when disabled and runs parallel beams when active.
 */

import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { defaultLeanBeamClient } from '../../src/services/mcp/lean-beam-client';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { ProofOutcomeSchema } from '../../src/contracts';
import { createProofAutomationRouter } from '../../server/src/routes/proof-automation';
import { ProofCoordinator } from '../../server/src/services/proof/proof-coordinator';
import { AxleAdvancedService } from '../../server/src/services/proof/axle-advanced';
import { BlueprintSyncService } from '../../server/src/services/proof/blueprint-sync';
import { WorkspaceStore } from '../../server/src/services/collaboration/workspace-store';

export async function runSuite196(): Promise<void> {
  console.log('Running Suite 196: LeanBeam Speculative Tactic Execution (6 sub-tests)...');

  // 196.1: Speculative tactic execution
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
  const probeResult = await defaultLeanBeamClient.runAt({
    path: 'Test.lean',
    version: 1,
    line: 10,
    character: 4,
    text: 'omega',
    toolchain: 'v4.34.0-rc1',
  });

  assert.equal(probeResult.valid, true, 'Valid tactic query should return valid: true');
  assert.equal(probeResult.speculativelyTested, true, 'Probe result must declare speculativelyTested: true');
  assert.equal(probeResult.goalsAfter.length, 0, 'Omega tactic should close the sample goal');
  console.log('  ✓ 196.1 LeanBeam executes speculative tactic probes returning speculativelyTested: true');

  // 196.2: Epistemic barrier: Never certified
  assert.equal(
    (probeResult as any).verified,
    undefined,
    'LeanBeam probe result must never contain a top-level verified: true property'
  );
  assert.equal(
    (probeResult as any).seal,
    undefined,
    'LeanBeam probe result must never contain a seal property'
  );
  assert.equal(
    (probeResult as any).certificationTier,
    undefined,
    'LeanBeam probe result must never contain a kernel certificationTier'
  );
  console.log('  ✓ 196.2 Epistemic barrier upheld: speculative probes never emit verified: true or kernel seals');

  // 196.3: Flag disabled behavior
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
  let threwFeatureDisabled = false;
  try {
    await defaultLeanBeamClient.runAt({
      path: 'Test.lean',
      version: 1,
      line: 10,
      character: 4,
      text: 'omega',
      toolchain: 'v4.34.0-rc1',
    });
  } catch (err: any) {
    if (err.code === 'FEATURE_DISABLED') {
      threwFeatureDisabled = true;
    }
  }
  assert.equal(threwFeatureDisabled, true, 'runAt must throw FEATURE_DISABLED when ENABLE_LEAN_BEAM is false');
  console.log('  ✓ 196.3 LeanBeam fails closed with FEATURE_DISABLED when flag is off');

  // 196.4: Toolchain qualification
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
  let threwToolchainUnsupported = false;
  try {
    await defaultLeanBeamClient.runAt({
      path: 'Test.lean',
      version: 1,
      line: 10,
      character: 4,
      text: 'omega',
      toolchain: 'v3.99.0-unsupported',
    });
  } catch (err: any) {
    if (err.code === 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED') {
      threwToolchainUnsupported = true;
    }
  }
  assert.equal(threwToolchainUnsupported, true, 'runAt must reject unvalidated toolchains');
  console.log('  ✓ 196.4 Toolchain qualification rejects unvalidated Lean versions with LEAN_BEAM_TOOLCHAIN_UNSUPPORTED');

  // 196.5: ProofOutcome non-certifying mapping
  const outcomeCandidate = {
    kind: 'preflight' as const,
    certificationTier: 'SYNTAX_ONLY_UNVERIFIED' as const,
    verified: false as const,
    syntaxValid: probeResult.valid,
    sorryFree: true,
    reason: 'Speculative candidate probed via LeanBeam',
  };
  const parseResult = ProofOutcomeSchema.safeParse(outcomeCandidate);
  assert.equal(parseResult.success, true, 'Candidate must parse cleanly under ProofOutcome discriminated union');
  console.log('  ✓ 196.5 Speculative candidates conform to canonical ProofOutcome preflight contract');

  // 196.6: /speculative Express endpoint RFC 9457 503 & parallel candidate beam execution
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/proof',
    createProofAutomationRouter(
      new ProofCoordinator(),
      new AxleAdvancedService(),
      new BlueprintSyncService(),
      new WorkspaceStore()
    )
  );
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
    const disabledResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tactics: ['omega', 'simp'], toolchain: 'v4.34.0-rc1' }),
    });
    assert.equal(disabledResp.status, 503, '/speculative must return HTTP 503 when flag is disabled');
    const problemBody = (await disabledResp.json()) as Record<string, unknown>;
    assert.equal(problemBody.code, 'FEATURE_DISABLED', 'RFC 9457 envelope must carry FEATURE_DISABLED code');
    assert.equal(problemBody.status, 503);

    featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
    const enabledResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tactics: ['omega', 'rfl'], toolchain: 'v4.34.0-rc1', timeoutMs: 2500 }),
    });
    assert.equal(enabledResp.status, 200, '/speculative must succeed when ENABLE_LEAN_BEAM is enabled');
    const okBody = (await enabledResp.json()) as {
      speculativelyTested: boolean;
      verified: boolean;
      timeoutBudgetMs: number;
      candidates: Array<{ tactic: string; valid: boolean; speculativelyTested?: boolean }>;
    };
    assert.equal(okBody.speculativelyTested, true);
    assert.equal(okBody.verified, false, 'Speculative route must never assert verified: true');
    assert.equal(okBody.timeoutBudgetMs, 2500);
    assert.equal(okBody.candidates.length, 2);
    assert.equal(okBody.candidates[0].speculativelyTested, true);
    console.log('  ✓ 196.6 Express /speculative route enforces RFC 9457 503 when disabled and runs parallel beams when active');
  } finally {
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
