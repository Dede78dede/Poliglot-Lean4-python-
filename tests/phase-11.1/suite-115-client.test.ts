/**
 * Test Suite 115: LeanBeamClient MCP (Phase 11.1, Task LB4)
 */

import assert from 'node:assert/strict';
import {
  DefaultLeanBeamClient,
  ALL_LEAN_BEAM_TOOLS,
} from '../../src/services/mcp/lean-beam-client';
import { mcpClientRegistry } from '../../src/services/mcp/mcp-client-registry';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { startLeanBeamMockServer } from '../phase-14/mocks/lean-beam-mock';

export async function runSuite115(): Promise<void> {
  console.log('\n--- Test Suite 115: LeanBeamClient MCP ---');

  const mock = await startLeanBeamMockServer();
  const client = new DefaultLeanBeamClient({ available: true, endpoint: mock.url });
  const prevFlag = featureFlagRegistry.isEnabled('ENABLE_LEAN_BEAM');
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);

  try {
    // 115.1: isAvailable() returns true when endpoint configured & flag enabled, false when unconfigured
    const unconfiguredClient = new DefaultLeanBeamClient({ available: true, endpoint: '' });
    assert.equal(await unconfiguredClient.isAvailable(), false);
    const available = await client.isAvailable();
    assert.equal(available, true);
    console.log('  ✓ 115.1 isAvailable() checks ENABLE_LEAN_BEAM and configured endpoint');

    // 115.2: runAt() on valid tactic returns valid: true, goalsAfter empty
    const validRes = await client.runAt({
      path: 'Proof.lean',
      version: 1,
      line: 10,
      character: 4,
      text: 'rfl',
    });
    assert.equal(validRes.valid, true);
    assert.equal(validRes.goalsAfter.length, 0);
    assert.ok(validRes.goalsBefore.length > 0);
    assert.ok(validRes.durationMs >= 0);
    console.log('  ✓ 115.2 runAt() on valid closing tactic returns valid: true and empty goalsAfter over JSON-RPC');

    // 115.3: runAt() on invalid tactic returns valid: false, errors populated
    const invalidRes = await client.runAt({
      path: 'Proof.lean',
      version: 1,
      line: 10,
      character: 4,
      text: 'unknown_tactic_broken',
    });
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.errors.length > 0);
    assert.ok(invalidRes.errors[0]?.includes('Unknown tactic'));
    console.log('  ✓ 115.3 runAt() on invalid tactic returns valid: false with errors populated');

    // 115.4: runAtHandle() returns a handle; runWith(handle, tactic) continues
    const handleRes = await client.runAtHandle({
      path: 'Proof.lean',
      version: 1,
      line: 10,
      character: 4,
      text: 'intro n',
    });
    assert.equal(handleRes.valid, true);
    assert.ok(handleRes.handle && handleRes.handle.startsWith('beam-handle-'));

    const continueRes = await client.runWith({
      path: 'Proof.lean',
      handle: handleRes.handle,
      text: 'rfl',
    });
    assert.equal(continueRes.valid, true);
    assert.equal(continueRes.goalsAfter.length, 0);
    console.log('  ✓ 115.4 runAtHandle() mints handle and runWith() continues exploration branch');

    // 115.5: runWithLinear(handle, tactic) works
    const linearRes = await client.runWithLinear({
      path: 'Proof.lean',
      handle: handleRes.handle,
      text: 'omega',
    });
    assert.equal(linearRes.valid, true);
    console.log('  ✓ 115.5 runWithLinear() extends branch linearly');

    // 115.6: listMcpTools() returns 5 curated safe tools, 79 total; workspace cap enforced
    const tools = await client.listMcpTools();
    assert.equal(tools.length, 79, `Expected 79 tools total (5 curated + 74 projected), got ${tools.length}`);

    const curated = tools.filter((t) =>
      ['lean_run_at', 'lean_run_at_handle', 'lean_run_with', 'lean_run_with_linear', 'lean_todo'].includes(t.name)
    );
    assert.equal(curated.length, 5);
    for (const tool of curated) {
      assert.equal(tool.permission, 'safe');
    }

    const ctxTools = tools.filter((t) => t.name.startsWith('ctx_'));
    assert.ok(ctxTools.length >= 11, 'Must contain at least 11 ctx_* tools');

    await client.runAt({ path: 'A.lean', version: 1, line: 1, character: 0, text: 'rfl', workspace: 'ws1' });
    await client.runAt({ path: 'B.lean', version: 1, line: 1, character: 0, text: 'rfl', workspace: 'ws2' });
    await client.runAt({ path: 'C.lean', version: 1, line: 1, character: 0, text: 'rfl', workspace: 'ws3' });
    assert.deepEqual(client.getActiveWorkspaces(), ['ws1', 'ws2', 'ws3']);

    await client.runAt({ path: 'D.lean', version: 1, line: 1, character: 0, text: 'rfl', workspace: 'ws4' });
    assert.deepEqual(client.getActiveWorkspaces(), ['ws2', 'ws3', 'ws4']);
    console.log('  ✓ 115.6 listTools() reports 5 curated safe tools, 79 total, and 3-workspace LRU cap');

    const registered = mcpClientRegistry.getById('lean-beam');
    assert.ok(registered, 'lean-beam must be registered in McpClientRegistry');
    assert.equal(registered?.id, 'lean-beam');
  } finally {
    featureFlagRegistry.set('ENABLE_LEAN_BEAM', prevFlag);
    await mock.close();
  }
}
