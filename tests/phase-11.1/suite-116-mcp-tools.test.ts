/**
 * Test Suite 116: Polyglot MCP Tools (probe + propose) (Phase 11.1, Task M3)
 */

import assert from 'node:assert/strict';
import { mcpServerRegistry } from '../../src/services/mcp/mcp-server-registry';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { defaultLeanBeamClient } from '../../src/services/mcp/lean-beam-client';
import { startLeanBeamMockServer } from '../phase-14/mocks/lean-beam-mock';
import '../../src/services/mcp/mcp-server'; // ensure registration

export async function runSuite116(): Promise<void> {
  console.log('\n--- Test Suite 116: Polyglot MCP Tools (probe + propose) ---');

  const probeTool = mcpServerRegistry.getByName('polyglot_probe_tactic');
  assert.ok(probeTool, 'polyglot_probe_tactic must be registered in mcpServerRegistry');
  assert.equal(probeTool.permission, 'safe');

  const proposeTool = mcpServerRegistry.getByName('polyglot_propose_proof');
  assert.ok(proposeTool, 'polyglot_propose_proof must be registered');

  // 116.2: ENABLE_LEAN_BEAM=false returns FEATURE_DISABLED error
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
  const disabledRes = await probeTool.handler({
    path: 'Main.lean',
    version: 1,
    line: 5,
    character: 2,
    text: 'rfl',
  });
  assert.equal(disabledRes.success, false);
  assert.ok(disabledRes.error?.includes('FEATURE_DISABLED'));
  console.log('  ✓ 116.2 ENABLE_LEAN_BEAM=false returns FEATURE_DISABLED error');

  const mock = await startLeanBeamMockServer();
  defaultLeanBeamClient.setEndpoint(mock.url);

  try {
    // 116.1: polyglot_probe_tactic returns valid probe when ENABLE_LEAN_BEAM=true
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
    const probeRes = await probeTool.handler({
      path: 'Main.lean',
      version: 1,
      line: 5,
      character: 2,
      text: 'rfl',
    });
    assert.equal(probeRes.success, true);
    const data = probeRes.data as any;
    assert.equal(data.valid, true);
    assert.equal(data.goalsAfter.length, 0);
    console.log('  ✓ 116.1 polyglot_probe_tactic returns valid speculative probe result');

    // 116.3: polyglot_propose_proof validates each candidate when ENABLE_LEAN_BEAM=true
    const proposeRes = await proposeTool.handler({
      theoremName: 'sum_comm',
      goal: 'a + b = b + a',
    });
    assert.equal(proposeRes.success, true);
    assert.equal(proposeRes.requiresConfirmation, true);
    assert.ok(proposeRes.proposalToken);
    const proposeData = proposeRes.data as any;
    assert.equal(proposeData.speculativelyTested, true);
    assert.ok(proposeData.goalsBefore);
    console.log('  ✓ 116.3 polyglot_propose_proof speculatively validates candidates via lean-beam');

    // 116.4: Invalid candidates discarded
    assert.ok(!proposeData.synthesizedProof.includes('unknown_tactic_fail'));
    console.log('  ✓ 116.4 Failing candidates automatically pruned during pre-screening');

    // 116.5: Speculative validation never promotes to formally-proven
    assert.ok(!proposeData.kernelSeal, 'Proposals must not contain kernelSeal before commit');
    const commitRes = await proposeTool.handler({
      confirmationToken: proposeRes.proposalToken,
    });
    assert.equal(commitRes.success, true);
    const commitData = commitRes.data as any;
    assert.equal(commitData.committed, true);
    assert.equal(commitData.kernelSeal, null, 'Unconfirmed commit must withhold SEAL_KERNEL_VERIFIED_TIER5');
    assert.equal(commitData.status, 'awaiting_adjudication');
    console.log('  ✓ 116.5 Epistemic discipline invariant preserved (probes & local commits withhold Tier-5 seal)');
  } finally {
    defaultLeanBeamClient.setEndpoint(undefined);
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
    await mock.close();
  }
}
