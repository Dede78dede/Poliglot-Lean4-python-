/**
 * Test Suite 196: LeanBeam Speculation Verification (Phase 15 Wave 2, ADR-016)
 *
 * Validates:
 * 196.1: LeanBeam speculative tactic execution over real HTTP JSON-RPC generates candidate results with speculativelyTested: true.
 * 196.2: Epistemic barrier: LeanBeam candidate results NEVER emit verified: true or SEAL_KERNEL_VERIFIED_TIER5.
 * 196.3: Flag disabled & unconfigured fail-closed behavior: FEATURE_DISABLED and LEAN_BEAM_UNAVAILABLE (HTTP 503).
 * 196.4: Toolchain qualification: unvalidated Lean toolchains trigger LEAN_BEAM_TOOLCHAIN_UNSUPPORTED.
 * 196.5: Speculative candidate structure conforms to ProofOutcome non-certifying contracts; malformed JSON-RPC rejected.
 * 196.6: Express /speculative route enforces RFC 9457 503 when disabled/unavailable, caps batches >8, and cancels slow tactics via AbortController.
 */

import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { defaultLeanBeamClient, toLeanBeamProofOutcome } from '../../src/services/mcp/lean-beam-client';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { ProofOutcomeSchema } from '../../src/contracts';
import { createProofAutomationRouter } from '../../server/src/routes/proof-automation';
import { ProofCoordinator } from '../../server/src/services/proof/proof-coordinator';
import { AxleAdvancedService } from '../../server/src/services/proof/axle-advanced';
import { BlueprintSyncService } from '../../server/src/services/proof/blueprint-sync';
import { WorkspaceStore } from '../../server/src/services/collaboration/workspace-store';
import { startLeanBeamMockServer } from './mocks/lean-beam-mock';

export async function runSuite196(): Promise<void> {
  console.log('Running Suite 196: LeanBeam Speculative Tactic Execution (6 sub-tests)...');

  const abortedTactics: string[] = [];
  const mock = await startLeanBeamMockServer({
    slowTactic: 'slow_hang',
    slowDelayMs: 2500,
    malformedForTactic: 'malformed_rpc',
    onAborted: (tactic) => abortedTactics.push(tactic),
  });

  try {
    // 196.1: Real HTTP JSON-RPC speculative tactic execution
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
    defaultLeanBeamClient.setEndpoint(mock.url);

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
    console.log('  ✓ 196.1 LeanBeam executes speculative tactic probes over real HTTP JSON-RPC');

    // 196.2: Epistemic barrier: Never certified
    assert.equal((probeResult as unknown as { verified?: boolean }).verified, undefined);
    assert.equal((probeResult as unknown as { seal?: string }).seal, undefined);
    assert.equal((probeResult as unknown as { certificationTier?: string }).certificationTier, undefined);
    console.log('  ✓ 196.2 Epistemic barrier upheld: speculative probes never emit verified: true or kernel seals');

    // 196.3: Flag disabled & unconfigured fail-closed behavior
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
    await assert.rejects(
      () =>
        defaultLeanBeamClient.runAt({
          path: 'Test.lean',
          version: 1,
          line: 10,
          character: 4,
          text: 'omega',
          toolchain: 'v4.34.0-rc1',
        }),
      (err: { code?: string }) => err.code === 'FEATURE_DISABLED',
      'runAt must throw FEATURE_DISABLED when ENABLE_LEAN_BEAM is false'
    );

    featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
    defaultLeanBeamClient.setEndpoint('');
    await assert.rejects(
      () =>
        defaultLeanBeamClient.runAt({
          path: 'Test.lean',
          version: 1,
          line: 10,
          character: 4,
          text: 'omega',
          toolchain: 'v4.34.0-rc1',
        }),
      (err: { code?: string }) => err.code === 'LEAN_BEAM_UNAVAILABLE',
      'runAt must fail closed with LEAN_BEAM_UNAVAILABLE when endpoint is empty'
    );
    defaultLeanBeamClient.setEndpoint(mock.url);
    console.log('  ✓ 196.3 LeanBeam fails closed with FEATURE_DISABLED and LEAN_BEAM_UNAVAILABLE');

    // 196.4: Toolchain qualification
    await assert.rejects(
      () =>
        defaultLeanBeamClient.runAt({
          path: 'Test.lean',
          version: 1,
          line: 10,
          character: 4,
          text: 'omega',
          toolchain: 'v3.99.0-unsupported',
        }),
      (err: { code?: string }) => err.code === 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED',
      'runAt must reject unvalidated toolchains'
    );
    console.log('  ✓ 196.4 Toolchain qualification rejects unvalidated Lean versions with LEAN_BEAM_TOOLCHAIN_UNSUPPORTED');

    // 196.5: ProofOutcome non-certifying mapping + malformed JSON-RPC rejection
    const outcomeCandidate = toLeanBeamProofOutcome(probeResult);
    assert.equal(ProofOutcomeSchema.safeParse(outcomeCandidate).success, true);
    assert.equal(outcomeCandidate.verified, false);
    await assert.rejects(
      () =>
        defaultLeanBeamClient.runAt({
          path: 'Test.lean',
          version: 1,
          line: 10,
          character: 4,
          text: 'malformed_rpc',
          toolchain: 'v4.34.0-rc1',
        }),
      (err: { code?: string }) => err.code === 'LEAN_BEAM_UNAVAILABLE',
      'Malformed upstream JSON-RPC response must fail closed with LEAN_BEAM_UNAVAILABLE'
    );
    console.log('  ✓ 196.5 ProofOutcome non-certifying contract & malformed RPC fail-closed check passed');

    // 196.6: Express /speculative & /probe RFC 9457 503, cap >8, and real AbortController socket cancellation
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
    const port = (server.address() as { port: number }).port;

    try {
      featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
      const disabledResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tactics: ['omega', 'simp'], toolchain: 'v4.34.0-rc1' }),
      });
      assert.equal(disabledResp.status, 503, '/speculative must return HTTP 503 when flag is disabled');
      const problemBody = (await disabledResp.json()) as Record<string, unknown>;
      assert.equal(problemBody.code, 'FEATURE_DISABLED');

      featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
      // Unconfigured endpoint returns 503 LEAN_BEAM_UNAVAILABLE
      defaultLeanBeamClient.setEndpoint('');
      const unavailResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tactics: ['omega'], toolchain: 'v4.34.0-rc1' }),
      });
      assert.equal(unavailResp.status, 503);

      // Configured endpoint + >8 tactics cap check
      defaultLeanBeamClient.setEndpoint(mock.url);
      const capResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tactics: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], toolchain: 'v4.34.0-rc1' }),
      });
      assert.equal(capResp.status, 400);

      // Real timeout budget cancellation
      const timeoutResp = await fetch(`http://127.0.0.1:${port}/api/v1/proof/speculative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tactics: ['omega', 'slow_hang'], toolchain: 'v4.34.0-rc1', timeoutMs: 80 }),
      });
      assert.equal(timeoutResp.status, 200);
      const timeoutBody = (await timeoutResp.json()) as {
        speculativelyTested: boolean;
        verified: boolean;
        timeoutBudgetMs: number;
        candidates: Array<{ tactic: string; valid: boolean; timedOut: boolean; speculativelyTested?: boolean }>;
      };
      assert.equal(timeoutBody.speculativelyTested, true);
      assert.equal(timeoutBody.verified, false);
      assert.equal(timeoutBody.timeoutBudgetMs, 80);
      assert.equal(timeoutBody.candidates[0]?.valid, true);
      assert.equal(timeoutBody.candidates[1]?.timedOut, true);
      assert.equal(timeoutBody.candidates[1]?.valid, false);
      await new Promise((r) => setTimeout(r, 40));
      assert.ok(abortedTactics.includes('slow_hang'), 'Upstream HTTP request must be aborted on timeout');
      console.log('  ✓ 196.6 Express /speculative enforces 503 fail-closed, cap <= 8, and AbortController timeout cancellation');
    } finally {
      defaultLeanBeamClient.setEndpoint(undefined);
      featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  } finally {
    await mock.close();
  }
}
