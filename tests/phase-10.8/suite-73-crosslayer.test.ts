import assert from 'node:assert/strict';
import { femevEngine } from '../../src/services/femev/femev-engine';
import { cramfBridge } from '../../server/src/services/cramf/cramf-bridge';
import { defaultLeanLspClient } from '../../src/services/mcp/lean-lsp-client';
import { leanArchitectBridge } from '../../server/src/services/blueprint/leanarchitect-bridge';
import type { BlueprintNode, BlueprintEdge } from '../../src/types/blueprint';

export async function runSuite73(): Promise<void> {
  console.log('\n--- Test Suite 73: Cross-Layer Automation & Best Practices ---');

  // 73.1: LeanCert pre-check runs before FEMEV formalization for numeric claims
  // Valid numeric claim: passes pre-check and allows promotion
  const validCheck = await femevEngine.preCheckNumericClaim(
    'decl_sin_bound',
    'sin(x) < 1 for all x in [0, 2]'
  );
  assert.equal(validCheck.canPromote, true);
  assert.equal(validCheck.declaration.status, 'numerically_verified');
  assert.ok(validCheck.declaration.evidences.some((e) => e.kind === 'numeric-certificate'));

  // Invalid numeric claim: fails pre-check and blocks promotion
  const invalidCheck = await femevEngine.preCheckNumericClaim(
    'decl_sin_false',
    'sin(x) > 2 for all x in [0, 2]'
  );
  assert.equal(invalidCheck.canPromote, false);
  assert.equal(invalidCheck.declaration.status, 'rejected');
  console.log('  ✓ 73.1 LeanCert pre-check automatically gates FEMEV formalization on numerical claims');

  // 73.2: CRAMF is called by LeanFlow when enabled
  assert.equal(cramfBridge.isEnabled(), false);
  const cramfDisabled = await cramfBridge.augmentLeanFlow('Prime numbers');
  assert.equal(cramfDisabled.enabled, false);
  assert.equal(cramfDisabled.definitions.length, 0);

  cramfBridge.setEnabled(true);
  const cramfEnabled = await cramfBridge.augmentLeanFlow('Prime numbers');
  assert.equal(cramfEnabled.enabled, true);
  assert.ok(cramfEnabled.definitions.length >= 2);
  assert.equal(cramfEnabled.relativeGainPct, 29.9);
  assert.ok(cramfEnabled.augmentedQuery.includes('Nat.Prime'));
  cramfBridge.setEnabled(false);
  console.log('  ✓ 73.2 CRAMF query augmentation plugin enriches LeanFlow formalization context with Mathlib definitions');

  // 73.3: lean-lsp-mcp uses SemanticSearchProvider
  const mcpSearchRes = await defaultLeanLspClient.callTool({
    toolName: 'lean_leansearch',
    arguments: { query: 'Continuous' },
  });
  assert.equal(mcpSearchRes.success, true);
  const data = mcpSearchRes.data as { results?: readonly unknown[]; provider?: string };
  assert.ok(Array.isArray(data.results));
  assert.equal(data.provider, 'lean-finder');
  console.log('  ✓ 73.3 lean-lsp-mcp queries the unified SemanticSearchProvider registry with provider provenance');

  // 73.4: LeanArchitect sync adds nodes to the Blueprint DAG
  const initialNodes: readonly BlueprintNode[] = [
    {
      id: 'ExistingNode',
      name: 'ExistingNode',
      kind: 'definition',
      language: 'lean4',
      filePath: 'Mathlib/Core.lean',
      lineRange: { start: 1, end: 3 },
      signature: 'def ExistingNode : Nat := 0',
      status: 'kernel_verified',
      code: 'def ExistingNode : Nat := 0',
      contentHash: 'hash-0',
      complexityWeight: 1,
      layer: 0,
    },
  ];
  const initialEdges: readonly BlueprintEdge[] = [];

  const extractedNewItems = [
    {
      id: 'DiscoveredTheorem',
      name: 'DiscoveredTheorem',
      kind: 'theorem' as const,
      statement: 'theorem DiscoveredTheorem : ExistingNode = 0',
      dependencies: ['ExistingNode'],
      filePath: 'Mathlib/Theorem.lean',
      line: 25,
    },
  ];

  const updatedDag = leanArchitectBridge.syncWithBlueprintDag(
    { nodes: initialNodes, edges: initialEdges },
    extractedNewItems
  );

  assert.equal(updatedDag.nodes.length, 2);
  assert.ok(updatedDag.nodes.some((n) => n.id === 'DiscoveredTheorem'));
  assert.equal(updatedDag.edges.length, 1);
  assert.equal(updatedDag.edges[0]!.from, 'ExistingNode');
  assert.equal(updatedDag.edges[0]!.to, 'DiscoveredTheorem');
  console.log('  ✓ 73.4 LeanArchitect automatically inserts newly extracted @[blueprint] nodes and dependencies into DAG');
}
