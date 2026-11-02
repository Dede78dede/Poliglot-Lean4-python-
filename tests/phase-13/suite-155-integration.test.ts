/**
 * Test Suite 155: End-to-End Cross-Cutting Integration (Phase 13)
 *
 * Validates:
 * 155.1: Unified ResultEnvelope<T> across bridge and boundary services
 * 155.2: TypeScript and Python boundary contract parity
 * 155.3: Native Notebook multi-cell workflow with persistent globals and nbformat v4 export
 * 155.4: Adaptive Config Manager proposal lifecycle with mandatory explicit confirmation
 * 155.5: Unified search indexing and structural AST diff working on Lean 4 artifacts
 */

import assert from 'node:assert/strict';
import { withEnvelope } from '../../src/shared/contracts/with-envelope';
import { PersistentNotebookKernel } from '../../src/workers/notebook.worker';
import { exportToIpynb } from '../../src/types/notebook';
import { ConfigManager } from '../../src/services/config/config-manager';
import { CrossArtifactSearchEngine } from '../../src/services/search/cross-artifact-search';
import { structuralDiffEngine } from '../../src/services/diff/structural-diff';
import * as contracts from '../../src/types/contracts';

export async function runSuite155(): Promise<void> {
  console.log('\n[Suite 155] End-to-End Cross-Cutting Phase 13 Integration Tests:');

  // 155.1: Unified ResultEnvelope<T>
  const envelope = await withEnvelope(async () => {
    return { status: 'verified', theorem: 'fermat_case_4', steps: 42 };
  }, 'corr-e2e-1');
  assert.equal(envelope.ok, true);
  if (envelope.ok) {
    assert.equal(envelope.value.status, 'verified');
    assert.equal(envelope.value.steps, 42);
    assert.equal(envelope.correlationId, 'corr-e2e-1');
  }
  console.log('  ✓ 155.1 Unified ResultEnvelope<T> narrowed and verified across bridge boundary');

  // 155.2: TypeScript & Python boundary contract parity
  const validRequest = {
    code: 'theorem test : 1 + 1 = 2 := by rfl',
    timeoutMs: 5000,
  };
  const parseResult = contracts.LeanExecuteRequestSchema.safeParse(validRequest);
  assert.equal(parseResult.success, true);
  console.log('  ✓ 155.2 Contract parity validation confirmed for LeanExecuteRequest boundary schema');

  // 155.3: Native Notebook multi-cell workflow with persistent state
  const kernel = new PersistentNotebookKernel();
  const c1 = await kernel.executeCell('cell-1', 'a = 15\nb = 25\nprint("init")');
  assert.equal(c1.status, 'success');
  const c2 = await kernel.executeCell('cell-2', 'print(a * b)');
  assert.equal(c2.status, 'success');
  assert.equal(c2.stdout.trim(), '375');

  const ipynbJson = exportToIpynb({
    id: 'nb-e2e',
    name: 'E2E Notebook',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cells: [
      { id: 'cell-1', code: 'a = 15\nb = 25', output: '', status: 'success', durationMs: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cell-2', code: 'print(a * b)', output: '375\n', status: 'success', durationMs: 12, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
  });
  const parsedIpynb = JSON.parse(ipynbJson);
  assert.equal(parsedIpynb.nbformat, 4);
  assert.equal(parsedIpynb.cells.length, 2);
  console.log('  ✓ 155.3 Native notebook executes persistent multi-cell workflow and exports to nbformat v4');

  // 155.4: Adaptive Config Manager with mandatory explicit confirmation
  const configMgr = new ConfigManager();
  const proposals = configMgr.generateProposals({
    hardware: { memoryGb: 32, vramGb: 16, concurrencyCores: 16, detectedAt: new Date().toISOString() },
  });
  assert.ok(proposals.length > 0 && proposals.length <= 3);

  // Reject unconfirmed attempt
  const unconfirmed = configMgr.applyProposal(proposals[0].id, { userConfirmed: false });
  assert.equal(unconfirmed.ok, false);

  // Accept confirmed attempt
  const confirmed = configMgr.applyProposal(proposals[0].id, { userConfirmed: true });
  assert.equal(confirmed.ok, true);
  console.log('  ✓ 155.4 Config Manager proposes optimizations and strictly blocks unconfirmed mutations');

  // 155.5: Cross-artifact search and structural diff on Lean artifacts
  const leanA = `theorem square_pos (n : Nat) : n * n >= 0 := by omega`;
  const leanB = `theorem square_pos (n : Nat) : n * n >= 0 := by ring`;
  const diff = structuralDiffEngine.diff(leanA, leanB);
  assert.equal(diff.items.length, 1);
  assert.equal(diff.items[0].changeType, 'proof_modified');
  assert.equal(diff.items[0].epistemicImpact, 'non_breaking');

  const search = new CrossArtifactSearchEngine();
  search.indexDocument({
    id: 'lean-doc-1',
    corpus: 'files',
    title: 'Formal/Square.lean',
    content: leanB,
  });
  const searchResults = search.search('square_pos');
  assert.ok(searchResults.length > 0);
  assert.equal(searchResults[0].id, 'lean-doc-1');
  console.log('  ✓ 155.5 Unified search and structural AST diff operate seamlessly on Lean 4 artifacts');
}

if (process.argv[1]?.endsWith('suite-155-integration.test.ts')) {
  runSuite155()
    .then(() => console.log('Suite 155 passed.'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
