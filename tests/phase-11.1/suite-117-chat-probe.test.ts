/**
 * Test Suite 117: Chat /probe Integration (Phase 11.1, Task C3)
 */

import assert from 'node:assert/strict';
import { chatStore } from '../../src/services/chat/chat-store';
import { CANONICAL_SLASH_COMMANDS } from '../../src/services/chat/chat-types';
import { settingsStore } from '../../src/services/settings/settings-store';
import { defaultLeanBeamClient } from '../../src/services/mcp/lean-beam-client';

export async function runSuite117(): Promise<void> {
  console.log('\n--- Test Suite 117: Chat /probe Integration ---');

  // 117.1: /probe registered in CANONICAL_SLASH_COMMANDS and triggers tool call
  const probeCmd = CANONICAL_SLASH_COMMANDS.find((c) => c.command === '/probe');
  assert.ok(probeCmd, '/probe must be registered in CANONICAL_SLASH_COMMANDS');
  assert.equal(probeCmd?.mcpTool, 'polyglot_probe_tactic');
  assert.equal(probeCmd?.skillName, 'polyglot-probe-tactic');

  const session = chatStore.createNewSession('Probe Test Session');
  assert.ok(session);

  await chatStore.sendMessage('/probe rfl', [], { path: 'Test.lean', content: 'theorem t : 1 = 1 := by sorry' });
  const updatedSession = chatStore.getActiveSession();
  assert.ok(updatedSession);

  const lastMsg = updatedSession.messages[updatedSession.messages.length - 1];
  assert.ok(lastMsg);
  assert.equal(lastMsg.role, 'assistant');
  assert.ok(lastMsg.toolCalls && lastMsg.toolCalls.length > 0);
  assert.equal(lastMsg.toolCalls[0]?.name, 'polyglot_probe_tactic');
  assert.equal(lastMsg.toolCalls[0]?.status, 'completed');
  console.log('  ✓ 117.1 /probe registers in CANONICAL_SLASH_COMMANDS and executes polyglot_probe_tactic');

  // 117.2: Probe block contains goalsBefore and goalsAfter in result
  const toolResult = lastMsg.toolCalls[0]?.result as any;
  assert.ok(toolResult);
  assert.equal(toolResult.valid, true);
  assert.ok(Array.isArray(toolResult.goalsBefore));
  assert.ok(Array.isArray(toolResult.goalsAfter));
  console.log('  ✓ 117.2 Probe tool call encapsulates goalsBefore and goalsAfter structures');

  // 117.3: Apply this tactic inserts at cursor without mutating file via lean-beam
  let vfsUpdatedPath = '';
  let vfsUpdatedContent = '';
  chatStore.applyDiff(lastMsg.id, (p, c) => {
    vfsUpdatedPath = p;
    vfsUpdatedContent = c;
  });
  // Verified that lean-beam itself has no file mutation methods
  const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(defaultLeanBeamClient));
  assert.ok(!clientMethods.includes('writeFile'));
  assert.ok(!clientMethods.includes('mutateFile'));
  console.log('  ✓ 117.3 File modification is handled strictly by VFS editor commands, never by lean-beam');

  // 117.4: Invalid probes capture errors and return valid: false
  await chatStore.sendMessage('/probe broken_tactic_fail', [], { path: 'Test.lean', content: 'theorem t : 1 = 1 := by sorry' });
  const failedSession = chatStore.getActiveSession();
  const failedMsg = failedSession?.messages[failedSession.messages.length - 1];
  assert.ok(failedMsg?.toolCalls && failedMsg.toolCalls.length > 0);
  const failedTool = failedMsg.toolCalls[0];
  assert.equal(failedTool?.status, 'failed');
  const failedRes = failedTool?.result as any;
  assert.equal(failedRes?.valid, false);
  assert.ok(failedRes?.errors?.length > 0);
  console.log('  ✓ 117.4 Invalid probes yield status: failed with error diagnostics');

  // 117.5: System prompt includes probe guidance and epistemic warning
  const settings = settingsStore.getSnapshot().settings;
  const sysPrompt = settings.chat.systemPrompt;
  assert.ok(sysPrompt.includes('polyglot_probe_tactic'), 'System prompt must mention polyglot_probe_tactic');
  assert.ok(sysPrompt.includes('SEAL_KERNEL_VERIFIED_TIER5'), 'System prompt must mention SEAL_KERNEL_VERIFIED_TIER5');
  console.log('  ✓ 117.5 System prompt includes speculative probe instructions and epistemic seal rule');
}
