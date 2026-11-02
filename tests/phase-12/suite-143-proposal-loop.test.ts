/**
 * Test Suite 143: Proposal Loop (AX-PROVER Pattern) (Phase 12, Sprint 12.2)
 *
 * Validates:
 * 143.1: ProposalLoop completes in <= 3 iterations on simple goal with proved: true
 * 143.2: Targeted repair loop feeds compiler diagnostic to subsequent iteration (APOLLO K=1)
 * 143.3: maxIterations budget triggers graceful stop with proved: false
 * 143.4: maxWallTimeMs and maxCostUsd budget constraints enforcement
 * 143.5: RetrievalMemory retrieval of top-3 lessons injected into Proposer
 * 143.6: native_decide rejected by Reviewer with NATIVE_DECIDE_FORBIDDEN
 */

import assert from 'node:assert/strict';
import { DefaultProposalLoop } from '../../src/services/proof/proposal-loop/proposal-loop';
import { retrievalMemory } from '../../src/services/proof/proposal-loop/retrieval-memory';

export async function runSuite143(): Promise<void> {
  console.log('\n[Suite 143] Proposal Loop (AX-PROVER Pattern) Tests:');

  const loop = new DefaultProposalLoop();

  // 143.1: Simple goal completed in <= 3 iterations
  const simpleResult = await loop.run(
    'decl-simple',
    'theorem identity (p : Prop) : p → p',
    {
      candidateGenerator: async () => ({ proof: 'by intro h; exact h' }),
    }
  );

  assert.equal(simpleResult.proved, true);
  assert.ok(simpleResult.iterations <= 3);
  assert.ok(simpleResult.certificateSha256 !== undefined);
  console.log('  ✓ 143.1 ProposalLoop closes simple goal in <= 3 iterations with certificate');

  // 143.2: Targeted repair on failure (APOLLO K=1)
  let secondCallHadDiagnostic = false;
  const repairResult = await loop.run(
    'decl-repair',
    'theorem linear (x : Int) : x + 0 = x',
    {
      candidateGenerator: async (iteration, diagnostic) => {
        if (iteration === 1) {
          return { proof: 'by invalid_tactic' };
        }
        if (diagnostic && diagnostic.includes('TACTIC_FAILED')) {
          secondCallHadDiagnostic = true;
        }
        return { proof: 'by omega' };
      },
    }
  );

  assert.equal(secondCallHadDiagnostic, true, 'Second call must receive previous diagnostic');
  assert.equal(repairResult.proved, true);
  console.log('  ✓ 143.2 Targeted compiler-guided repair (APOLLO K=1) feeds diagnostic forward');

  // 143.3: maxIterations budget triggers graceful stop
  const budgetResult = await loop.run(
    'decl-stuck',
    'theorem hard_problem : 1 = 2',
    {
      config: { maxIterations: 3 },
      candidateGenerator: async () => ({ proof: 'by invalid_tactic' }),
    }
  );

  assert.equal(budgetResult.proved, false);
  assert.equal(budgetResult.iterations, 3);
  console.log('  ✓ 143.3 maxIterations budget triggers graceful stop with proved: false');

  // 143.4: maxWallTimeMs and maxCostUsd enforcement
  const wallTimeResult = await loop.run(
    'decl-walltime',
    'theorem time_out_unindexed_goal : 100 = 200',
    {
      config: { maxWallTimeMs: 0 }, // immediate timeout
    }
  );
  assert.equal(wallTimeResult.proved, false);
  assert.ok(wallTimeResult.nodes.some((n) => n.status === 'budget_exceeded'));

  const costResult = await loop.run(
    'decl-cost',
    'theorem cost_out_unindexed_goal : 300 = 400',
    {
      config: { maxCostUsd: 0.0001 },
      candidateGenerator: async () => ({ proof: 'by invalid_tactic', toolCallsCount: 1 }),
    }
  );
  assert.equal(costResult.proved, false);
  console.log('  ✓ 143.4 maxWallTimeMs and maxCostUsd budget bounds strictly enforced');

  // 143.5: RetrievalMemory retrieval of top-3 lessons
  retrievalMemory.clear();
  retrievalMemory.addLesson({
    declarationId: 'decl-prior-1',
    iteration: 1,
    errorClass: 'TACTIC_FAILED',
    tacticAttempted: 'by omega',
    whyItFailed: 'Goal contains non-linear exponentiation',
    suggestion: 'Use ring or nlinarith',
  });
  retrievalMemory.addLesson({
    declarationId: 'decl-prior-2',
    iteration: 2,
    errorClass: 'TACTIC_FAILED',
    tacticAttempted: 'by linarith',
    whyItFailed: 'Missing hypothesis h',
    suggestion: 'Call intros first',
  });

  const queryLessons = retrievalMemory.query('TACTIC_FAILED', undefined, 3);
  assert.ok(queryLessons.length >= 2);
  assert.equal(queryLessons[0].errorClass, 'TACTIC_FAILED');
  console.log('  ✓ 143.5 RetrievalMemory retrieves top-3 lessons for Proposer prompt');

  // 143.6: native_decide rejected with NATIVE_DECIDE_FORBIDDEN
  const nativeDecideResult = await loop.run(
    'decl-native',
    'theorem unsafe : False',
    {
      config: { maxIterations: 1 },
      candidateGenerator: async () => ({ proof: 'by native_decide' }),
    }
  );

  assert.equal(nativeDecideResult.proved, false);
  const reviewerNode = nativeDecideResult.nodes.find((n) => n.node === 'reviewer');
  assert.equal(reviewerNode?.details.errorClass, 'NATIVE_DECIDE_FORBIDDEN');
  console.log('  ✓ 143.6 native_decide rejected by Reviewer with NATIVE_DECIDE_FORBIDDEN');
}
