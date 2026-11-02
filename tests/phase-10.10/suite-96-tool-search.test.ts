/**
 * Test Suite 96: Progressive Tool Discovery & Token Reduction (Phase 10.10, Task T1 & T2)
 */

import assert from 'node:assert/strict';
import { searchTools, estimateToolSearchSavings, TOOL_CARDS } from '../../src/services/mcp/tool-search';
import { VIRTUAL_TOOL_DEFINITIONS } from '../../src/services/mcp/virtual-tools';
import '../../src/services/mcp/mcp-server'; // ensure real tools are registered

export async function runSuite96(): Promise<void> {
  console.log('\n--- Test Suite 96: Progressive Tool Discovery & Token Reduction ---');

  // 96.1: searchTools returns ranked ToolCards with BM25 score
  const results = searchTools('tactic suggestion');
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => r.name === 'polyglot_suggest_tactic'));
  assert.ok((results[0]!.relevanceScore ?? 0) > 0);
  console.log('  ✓ 96.1 searchTools returns ranked ToolCards with BM25 relevance score');

  // 96.2: searchTools filters by category
  const filtered = searchTools('commands', 'navigation');
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((r) => r.category === 'navigation'));
  console.log('  ✓ 96.2 searchTools filters by category');

  // 96.3: Token reduction estimate is >= 75%
  const savings = estimateToolSearchSavings();
  assert.ok(savings.percentReduction >= 75, `Expected >= 75% reduction, got ${savings.percentReduction}%`);
  assert.equal(savings.virtualSchemaTokens, 820);
  console.log(`  ✓ 96.3 Token reduction estimate verified at ${savings.percentReduction}% (~${savings.fullSchemaTokens} -> ~${savings.virtualSchemaTokens} tokens)`);

  // 96.4: Virtual tools dispatch describe_tool returning complete tool schema
  const describeTool = VIRTUAL_TOOL_DEFINITIONS.find((t) => t.name === 'polyglot_describe_tool')!;
  assert.ok(describeTool);
  const descResult = await describeTool.handler({ name: 'polyglot_suggest_tactic' });
  assert.equal(descResult.success, true);
  const descData = descResult.data as { name: string; permission: string; inputSchema: unknown };
  assert.equal(descData.name, 'polyglot_suggest_tactic');
  assert.equal(descData.permission, 'safe');
  assert.ok(descData.inputSchema);
  console.log('  ✓ 96.4 polyglot_describe_tool returns complete tool schema on demand');

  // 96.5: Virtual tools dispatch invoke_tool requiring proposalToken for confirm tools
  const invokeTool = VIRTUAL_TOOL_DEFINITIONS.find((t) => t.name === 'polyglot_invoke_tool')!;
  assert.ok(invokeTool);

  // Invoking confirm tool without token must reject with PROPOSAL_TOKEN_REQUIRED
  const unconfirmed = await invokeTool.handler({
    name: 'polyglot_propose_proof',
    arguments: { theoremName: 'test', statement: '⊢ True' },
  });
  assert.equal(unconfirmed.success, false);
  const unconfirmedData = unconfirmed.data as { code: string };
  assert.equal(unconfirmedData.code, 'PROPOSAL_TOKEN_REQUIRED');
  console.log('  ✓ 96.5 polyglot_invoke_tool enforces PROPOSAL_TOKEN_REQUIRED on confirm-tier tools');
}
