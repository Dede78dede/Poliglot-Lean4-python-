/**
 * Test Suite 90: Blueprint to Lean Generation (Phase 10.9.7, Task BG4)
 */

import assert from 'node:assert/strict';
import {
  blueprintStubGenerator,
  type BlueprintDag,
} from '../../src/services/blueprint/blueprint-stub-generator';

export async function runSuite90(): Promise<void> {
  console.log('\n--- Test Suite 90: Blueprint → Lean Generation ---');

  const testDag: BlueprintDag = {
    nodes: [
      {
        id: 'Nat_Prime_inf',
        name: 'Prime.infinite',
        statement: 'There are infinitely many prime numbers.',
        signature: 'theorem Nat_Prime_inf : ∀ n : ℕ, ∃ p > n, Nat.Prime p',
        status: 'unproven',
        proofStatus: 'unformalized',
        dependencies: ['Nat_Prime_factor'],
      },
      {
        id: 'Nat_Prime_factor',
        name: 'Prime.factor',
        statement: 'Every integer greater than 1 has a prime factor.',
        signature: 'theorem Nat_Prime_factor (n : ℕ) (hn : n > 1) : ∃ p, Nat.Prime p ∧ p ∣ n',
        status: 'unproven',
        proofStatus: 'sorry',
        dependencies: [],
      },
      {
        id: 'Nat_Prime_def',
        name: 'Prime.def',
        statement: 'Definition of primality in natural numbers.',
        signature: 'def Nat_Prime_def (p : ℕ) : Prop',
        status: 'kernel_verified',
        proofStatus: 'verified',
        dependencies: [],
      },
      {
        id: 'Decl_No_Statement',
        name: 'No.statement',
        statement: '',
        signature: 'theorem Decl_No_Statement : True',
        status: 'unproven',
        proofStatus: 'unformalized',
        dependencies: [],
      },
      {
        id: 'Decl_Broken_Dep',
        name: 'Broken.dep',
        statement: 'Claim depending on a non-existent node.',
        signature: 'theorem Decl_Broken_Dep : True',
        status: 'unproven',
        proofStatus: 'unformalized',
        dependencies: ['NonExistent_Node_XYZ'],
      },
      {
        id: 'Decl_Self_Loop',
        name: 'Self.loop',
        statement: 'Claim that references itself in dependencies.',
        signature: 'theorem Decl_Self_Loop : True',
        status: 'unproven',
        proofStatus: 'unformalized',
        dependencies: ['Decl_Self_Loop', 'Nat_Prime_factor'],
      },
    ],
  };

  const result = await blueprintStubGenerator.generateStub(testDag, {
    moduleName: 'MyMath.Blueprint.NumberTheory',
    namespace: 'MyMath.NumberTheory',
    imports: ['Mathlib.Data.Nat.Prime.Basic'],
  });

  // 90.1: generateStub() produces a valid .lean file with @[blueprint (statement := /-- ... -/)]
  assert.ok(result.content.includes('import Mathlib.Data.Nat.Prime.Basic'), 'Imports generated');
  assert.ok(result.content.includes('namespace MyMath.NumberTheory'), 'Namespace generated');
  assert.ok(
    result.content.includes('@[blueprint (statement := /-- There are infinitely many prime numbers. -/)]'),
    'Blueprint attribute with informal statement rendered'
  );
  assert.ok(
    !result.content.includes('\\leanok'),
    '\\leanok marker is omitted (stubs are sorry-bearing by definition)'
  );
  console.log('  ✓ 90.1 generateStub() emits @[blueprint (statement := /-- ... -/)] and omits \\leanok');

  // 90.2: sorry_using [...] correctly references all dependencies from the DAG
  assert.ok(
    result.content.includes('sorry_using [Nat_Prime_factor]'),
    'sorry_using tactic references resolved dependencies'
  );
  console.log('  ✓ 90.2 sorry_using [...] accurately populates declaration dependency DAG references');

  // 90.3: Nodes with proofStatus: 'verified' are skipped
  const verifiedSkipped = result.skippedNodes.find((s) => s.nodeId === 'Nat_Prime_def');
  assert.ok(verifiedSkipped, 'Nat_Prime_def is skipped');
  assert.equal(verifiedSkipped?.reason, 'already-formalized');
  console.log('  ✓ 90.3 Verified/formalized declarations are skipped with reason: already-formalized');

  // 90.4: Nodes without informalStatement are skipped with reason: 'missing-statement'
  const noStmtSkipped = result.skippedNodes.find((s) => s.nodeId === 'Decl_No_Statement');
  assert.ok(noStmtSkipped, 'Decl_No_Statement is skipped');
  assert.equal(noStmtSkipped?.reason, 'missing-statement');
  console.log('  ✓ 90.4 Nodes lacking informal statements are skipped with reason: missing-statement');

  // 90.5: Missing dependencies are skipped with reason: 'missing-dependencies'
  const brokenDepSkipped = result.skippedNodes.find((s) => s.nodeId === 'Decl_Broken_Dep');
  assert.ok(brokenDepSkipped, 'Decl_Broken_Dep is skipped');
  assert.equal(brokenDepSkipped?.reason, 'missing-dependencies');
  console.log('  ✓ 90.5 Declarations referencing non-existent DAG nodes are skipped with reason: missing-dependencies');

  // 90.6: No self-loops or forward references in sorry_using [...]
  const selfLoopDecl = result.generatedNodes.find((id) => id === 'Decl_Self_Loop');
  assert.ok(selfLoopDecl, 'Self loop node handled gracefully');
  // Decl_Self_Loop must NOT have Decl_Self_Loop inside sorry_using
  assert.ok(
    !result.content.includes('sorry_using [Decl_Self_Loop'),
    'Self-loop references are excluded from sorry_using'
  );

  // Check topological ordering: Nat_Prime_factor must appear before Nat_Prime_inf
  const idxFactor = result.content.indexOf('Nat_Prime_factor');
  const idxInf = result.content.indexOf('Nat_Prime_inf');
  assert.ok(idxFactor < idxInf, 'Topological sort ensures dependencies precede theorems');
  console.log('  ✓ 90.6 Self-loops eliminated and topological order eliminates forward references');
}
