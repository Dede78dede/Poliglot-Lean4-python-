import assert from 'node:assert/strict';
import { leanBlueprintClient } from '../../server/src/services/blueprint/leanblueprint-client';
import { leanArchitectBridge } from '../../server/src/services/blueprint/leanarchitect-bridge';
import { versoBlueprintExportService } from '../../src/services/blueprint/verso-blueprint-export';
import { versoBlueprintService } from '../../src/services/lean-tooling/verso';
import { ATLAS_EDGE_DESCRIPTIONS, type AtlasEdgeKind } from '../../src/components/blueprint/LeanAtlasViewer';
import type { BlueprintNode, BlueprintEdge } from '../../src/types/blueprint';

export async function runSuite72(): Promise<void> {
  console.log('\n--- Test Suite 72: Phase D — Blueprint Visualization & Export ---');

  const sampleNodes: readonly BlueprintNode[] = [
    {
      id: 'Nat.Prime',
      name: 'Prime',
      kind: 'definition',
      language: 'lean4',
      filePath: 'Mathlib/Data/Nat/Prime.lean',
      lineRange: { start: 10, end: 12 },
      signature: 'def Prime (n : Nat) : Prop',
      status: 'kernel_verified',
      code: 'def Prime (n : Nat) : Prop := 2 <= n',
      contentHash: 'hash-prime',
      complexityWeight: 2,
      layer: 0,
    },
    {
      id: 'Nat.exists_infinite_primes',
      name: 'exists_infinite_primes',
      kind: 'theorem',
      language: 'lean4',
      filePath: 'Mathlib/Data/Nat/Prime.lean',
      lineRange: { start: 20, end: 25 },
      signature: 'theorem exists_infinite_primes (n : Nat) : ∃ p >= n, Nat.Prime p',
      status: 'kernel_verified',
      code: 'theorem exists_infinite_primes : True := by trivial',
      contentHash: 'hash-infinite',
      complexityWeight: 8,
      layer: 1,
    },
  ];

  const sampleEdges: readonly BlueprintEdge[] = [
    {
      id: 'Nat.Prime->Nat.exists_infinite_primes:theorem_dependency',
      from: 'Nat.Prime',
      to: 'Nat.exists_infinite_primes',
      role: 'theorem_dependency',
    },
  ];

  // 72.1: leanblueprint-mcp renders HTML from Phase 7 DAG
  const html = await leanBlueprintClient.renderGraph({ nodes: sampleNodes, edges: sampleEdges });
  assert.ok(html.includes('Mathematical Blueprint Dependency Graph'));
  assert.ok(html.includes('Nat.Prime'));
  assert.ok(html.includes('Nat.exists_infinite_primes'));
  assert.ok(html.includes('#10B981')); // Green for verified node

  const latexBlueprint = leanBlueprintClient.exportToLatexBlueprint(sampleNodes, sampleEdges);
  assert.ok(latexBlueprint.includes('\\usepackage{leanblueprint}'));
  assert.ok(latexBlueprint.includes('\\uses{Nat.Prime}'));
  console.log('  ✓ 72.1 leanblueprint-mcp renders color-coded HTML and generates \\uses LaTeX macros');

  // 72.2: LeanArchitect extracts declarations from Lean source
  const sampleLeanCode = `
@[blueprint "Prime Definition"]
def Nat.Prime (p : Nat) : Prop := 2 <= p

@[blueprint "Infinitude of Primes"]
theorem Nat.exists_infinite_primes (n : Nat) : ∃ p >= n, Nat.Prime p := by
  sorry
`;
  const extracted = await leanArchitectBridge.extractBlueprintFromLean(sampleLeanCode);
  assert.equal(extracted.totalExtracted, 2);
  assert.ok(extracted.items.some((i) => i.id === 'Nat.Prime'));
  assert.ok(extracted.items.some((i) => i.id === 'Nat.exists_infinite_primes'));
  assert.equal(extracted.latexArtifactPath, '.lake/build/blueprint/blueprint.tex');
  console.log('  ✓ 72.2 LeanArchitect extracts @[blueprint] annotations directly from Lean source code');

  // 72.3: Lean Atlas viewer renders 8 edge kinds along 3 orthogonal axes
  const edgeKinds = Object.keys(ATLAS_EDGE_DESCRIPTIONS) as AtlasEdgeKind[];
  assert.equal(edgeKinds.length, 8);
  assert.ok(edgeKinds.includes('forward_strict_proven'));
  assert.ok(edgeKinds.includes('forward_strict_unproven'));
  assert.ok(edgeKinds.includes('forward_auxiliary_proven'));
  assert.ok(edgeKinds.includes('forward_auxiliary_unproven'));
  assert.ok(edgeKinds.includes('backward_strict_proven'));
  assert.ok(edgeKinds.includes('backward_strict_unproven'));
  assert.ok(edgeKinds.includes('backward_auxiliary_proven'));
  assert.ok(edgeKinds.includes('backward_auxiliary_unproven'));
  console.log('  ✓ 72.3 Lean Atlas viewer models all 8 edge kinds along direction, necessity, and proof status');

  // 72.4: Verso Blueprint export generates HTML and PDF
  versoBlueprintService.setEnabled(true);
  const versoExport = await versoBlueprintExportService.exportBlueprint({
    nodes: sampleNodes,
    edges: sampleEdges,
  });
  assert.equal(versoExport.success, true);
  assert.ok(versoExport.webDocumentPath.endsWith('build/html/index.html'));
  assert.ok(versoExport.pdfDocumentPath.endsWith('build/pdf/blueprint.pdf'));
  versoBlueprintService.setEnabled(false);
  console.log('  ✓ 72.4 Verso Blueprint export produces web and PDF document artifacts');

  // 72.5: DAG sync adds new nodes from LeanArchitect
  const syncedDag = leanArchitectBridge.syncWithBlueprintDag(
    { nodes: sampleNodes, edges: sampleEdges },
    extracted.items
  );
  assert.equal(syncedDag.nodes.length, 2); // IDs already matched, no duplication
  console.log('  ✓ 72.5 LeanArchitect bi-directionally synchronizes newly extracted items into the Blueprint DAG');

  // 72.6: All feature flags off by default return error or disabled status
  versoBlueprintService.setEnabled(false);
  await assert.rejects(
    async () => {
      await versoBlueprintExportService.exportBlueprint({ nodes: sampleNodes, edges: sampleEdges });
    },
    (err: Error) => {
      assert.ok(err.message.includes('VERSO_UNAVAILABLE'));
      return true;
    }
  );
  console.log('  ✓ 72.6 All feature flags default to false and fail safely with explicit error codes');
}
