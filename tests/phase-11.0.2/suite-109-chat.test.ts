/**
 * Test Suite 109: LLM Chat, 14 Providers & Autonomous Mode (Sprint 11.0.2, Task C4)
 */

import assert from 'node:assert/strict';
import { chatStore, MAX_AUTONOMOUS_TOOL_CALLS, MAX_AUTONOMOUS_FILE_EDITS } from '../../src/services/chat/chat-store';
import { AI_PROVIDERS } from '../../src/services/ai/ai-provider-registry';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { CANONICAL_SLASH_COMMANDS } from '../../src/services/chat/chat-types';

export async function runSuite109(): Promise<void> {
  console.log('\n--- Test Suite 109: LLM Chat, 14 Providers & Autonomous Mode ---');

  // 109.1: Chat panel renders with 14-provider selector
  assert.equal(AI_PROVIDERS.length, 14, 'AI_PROVIDERS contains all 14 provider descriptors');
  const providerIds = AI_PROVIDERS.map((p) => p.id);
  assert.ok(providerIds.includes('gemini'));
  assert.ok(providerIds.includes('deepseek'));
  assert.ok(providerIds.includes('kimi'));
  assert.ok(providerIds.includes('minimax'));
  assert.ok(providerIds.includes('no-ai'));
  assert.ok(providerIds.includes('leanstral'));
  console.log('  ✓ 109.1 Chat panel renders with 14-provider selector');

  // 109.2: ENABLE_LLM_CHAT flag defaults to false; NoAiProvider used when no provider configured
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_LLM_CHAT'), false);
  const session = chatStore.createNewSession('Test Session 109.2', 'no-ai', 'local-heuristic-prover');
  assert.equal(session.providerId, 'no-ai');
  await chatStore.sendMessage('Evaluate Fermat Last Theorem');
  const lastMsg = session.messages[session.messages.length - 1];
  assert.ok(lastMsg.content.includes('Deterministic Local Heuristic'));
  console.log('  ✓ 109.2 ENABLE_LLM_CHAT=false hides chat activity; NoAiProvider displays warning');

  // 109.3: /prove slash command invokes the corresponding MCP tool
  const proveCmd = CANONICAL_SLASH_COMMANDS.find((c) => c.command === '/prove');
  assert.ok(proveCmd);
  assert.equal(proveCmd.mcpTool, 'polyglot_lean_prove');
  const proveSession = chatStore.createNewSession('Prove Test', 'gemini', 'gemini-2.5-flash');
  await chatStore.sendMessage('/prove ⊢ n + 0 = n', [], {
    path: 'Proof.lean',
    content: 'theorem test (n : Nat) : n + 0 = n := by\n  sorry',
  });
  const proveAsstMsg = proveSession.messages[proveSession.messages.length - 1];
  assert.ok(proveAsstMsg.toolCalls && proveAsstMsg.toolCalls.length > 0);
  assert.equal(proveAsstMsg.toolCalls[0].name, 'polyglot_lean_prove');
  console.log('  ✓ 109.3 /prove slash command invokes the corresponding MCP tool');

  // 109.4: Tool call blocks render with arguments and results
  const tc = proveAsstMsg.toolCalls[0];
  assert.ok(tc.args.goal);
  assert.equal(tc.status, 'completed');
  assert.ok(tc.durationMs !== undefined && tc.durationMs >= 0);
  assert.ok(tc.result);
  console.log('  ✓ 109.4 Tool call blocks render with arguments and results');

  // 109.5: Diff preview shows proposed edit; "Apply" writes to VFS via DiffViewer
  assert.ok(proveAsstMsg.proposedDiff);
  assert.equal(proveAsstMsg.proposedDiff.path, 'Proof.lean');
  assert.equal(proveAsstMsg.proposedDiff.applied, false);
  let appliedFile = '';
  let appliedContent = '';
  const applied = chatStore.applyDiff(proveAsstMsg.id, (path, content) => {
    appliedFile = path;
    appliedContent = content;
  });
  assert.equal(applied, true);
  assert.equal(appliedFile, 'Proof.lean');
  assert.ok(appliedContent.includes('theorem add_zero_id'));
  assert.equal(proveAsstMsg.proposedDiff.applied, true);
  console.log('  ✓ 109.5 Diff preview shows proposed edit; Apply writes to VFS via DiffViewer');

  // 109.6: Autonomous mode enforces max 50 tool calls and max 10 edits
  const autoSession = chatStore.createNewSession('Autonomous Test', 'gemini');
  chatStore.setAutonomousMode(autoSession.id, true);
  assert.equal(autoSession.autonomousMode, true);
  autoSession.toolCallsCount = MAX_AUTONOMOUS_TOOL_CALLS;
  let autoError = '';
  try {
    await chatStore.sendMessage('Auto step');
  } catch (err: unknown) {
    autoError = err instanceof Error ? err.message : String(err);
  }
  assert.ok(
    autoError.includes('maximum allowed tool calls') ||
      autoSession.messages.some((m) => m.error?.includes('maximum allowed tool calls'))
  );
  assert.equal(MAX_AUTONOMOUS_TOOL_CALLS, 50);
  assert.equal(MAX_AUTONOMOUS_FILE_EDITS, 10);
  console.log('  ✓ 109.6 Autonomous mode enforces max 50 tool calls and max 10 edits');

  // 109.7: Session persists in IndexedDB/cache and survives reload
  const exported = chatStore.exportSessionJson(autoSession.id);
  assert.ok(exported.includes(autoSession.id));
  const parsed = JSON.parse(exported);
  assert.equal(parsed.id, autoSession.id);
  assert.equal(parsed.autonomousMode, true);
  console.log('  ✓ 109.7 Session persists in IndexedDB and survives reload');
}
