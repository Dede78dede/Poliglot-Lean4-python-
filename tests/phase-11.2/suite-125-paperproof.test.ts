/**
 * Test Suite 125: Paperproof Playback MCP Client (Phase 11.2, Sprint 11.2.2)
 */

import assert from 'node:assert/strict';
import {
  PaperproofClient,
  defaultPaperproofClient,
  PAPERPROOF_TOOLS,
} from '../../src/services/mcp/paperproof-client';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { PaperproofClient as FemevPaperproofClient } from '../../src/services/femev/paperproof-client';

export async function runSuite125(): Promise<void> {
  console.log('\n--- Test Suite 125: Paperproof Playback MCP Client ---');

  // 125.1: stdio transport initialization to uvx paperproof-mcp
  assert.equal(defaultPaperproofClient.id, 'paperproof-mcp');
  assert.equal(defaultPaperproofClient.transport, 'stdio');
  await defaultPaperproofClient.connect();
  assert.equal(defaultPaperproofClient.isConnected(), true);
  const snapshot = defaultPaperproofClient.getSnapshot();
  assert.equal(snapshot.isConnected, true);
  assert.equal(snapshot.transport, 'stdio');
  assert.equal(snapshot.toolsCount, 2);
  console.log('  ✓ 125.1 stdio transport initialization: uvx paperproof-mcp client connected');

  // 125.2: lean_proof_structure tool execution
  const structureTool = defaultPaperproofClient.getTool('lean_proof_structure');
  assert.ok(structureTool, 'lean_proof_structure tool must be declared');
  assert.equal(structureTool.category, 'widgets-profiling');

  const structRes = await defaultPaperproofClient.callTool({
    toolName: 'lean_proof_structure',
    arguments: {
      path: 'Math/Nat.lean',
      theoremName: 'nat_zero_le',
    },
  });
  assert.equal(structRes.success, true);
  const tree = structRes.data as any;
  assert.ok(tree.rootNodeId);
  assert.ok(Array.isArray(tree.steps));
  assert.equal(tree.steps.length, 2);
  assert.equal(tree.theoremName, 'nat_zero_le');
  console.log('  ✓ 125.2 lean_proof_structure: returned proof tree with goals and tactic nodes');

  // 125.3: lean_proof_steps playback execution
  const stepsRes = await defaultPaperproofClient.callTool({
    toolName: 'lean_proof_steps',
    arguments: {
      path: 'Math/Nat.lean',
      theoremName: 'nat_zero_le',
    },
  });
  assert.equal(stepsRes.success, true);
  const steps = stepsRes.data as any[];
  assert.equal(steps.length, 2);
  assert.equal(steps[0].tactic, 'intro n');
  assert.deepEqual(steps[0].goalsBefore, ['⊢ ∀ (n : Nat), 0 ≤ n']);
  assert.deepEqual(steps[1].goalsAfter, []);
  assert.equal(steps[1].isSolved, true);
  console.log('  ✓ 125.3 lean_proof_steps: playback forward/backward stepping states retrieved');

  // 125.4: Epistemic barrier check: paperproof does not certify kernel proof or emit SEAL_KERNEL_VERIFIED_TIER5
  assert.equal('SEAL_KERNEL_VERIFIED_TIER5' in structRes, false);
  assert.equal('SEAL_KERNEL_VERIFIED_TIER5' in (tree || {}), false);
  assert.equal(tree.verified, undefined, 'Paperproof tree must not masquerade as kernel verified seal');
  console.log('  ✓ 125.4 Epistemic barrier: paperproof tree remains strictly diagnostic/pedagogical');

  // 125.5: Feature flag gate & fallback
  featureFlagRegistry.set('ENABLE_PAPERPROOF_PLAYBACK', false);
  featureFlagRegistry.set('ENABLE_PAPERPROOF', false);
  const femevClient = new FemevPaperproofClient();
  assert.equal(femevClient.isAvailable(), false);

  // Attempting to generate proof tree with flag off throws BridgeError
  let caught = false;
  try {
    await femevClient.generateProofTree('theorem foo : True := trivial');
  } catch (err: any) {
    caught = true;
    assert.equal(err.code, 'PAPERPROOF_UNAVAILABLE');
  }
  assert.equal(caught, true, 'Should throw PAPERPROOF_UNAVAILABLE when flag is false');
  featureFlagRegistry.reset('ENABLE_PAPERPROOF');
  featureFlagRegistry.reset('ENABLE_PAPERPROOF_PLAYBACK');
  console.log('  ✓ 125.5 Feature flag gate: throws PAPERPROOF_UNAVAILABLE when disabled');
}
