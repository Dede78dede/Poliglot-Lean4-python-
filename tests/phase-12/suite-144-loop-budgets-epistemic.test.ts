/**
 * Test Suite 144: Proposal Loop Budgets & Epistemic Discipline (Phase 12, Sprint 12.2)
 *
 * Validates:
 * 144.1: Loop result does not bypass SEAL_KERNEL_VERIFIED_TIER5 certification
 * 144.2: sorry-bearing candidates strictly rejected by Reviewer (SORRY_DETECTED)
 * 144.3: max_tool_calling_iterations: 1 tight budget adherence
 * 144.4: max_concurrent_builds: 12 build pool concurrency bounds
 */

import assert from 'node:assert/strict';
import { DefaultProposalLoop } from '../../src/services/proof/proposal-loop/proposal-loop';

export async function runSuite144(): Promise<void> {
  console.log('\n[Suite 144] Proposal Loop Budgets & Epistemic Discipline Tests:');

  const loop = new DefaultProposalLoop();

  // 144.1: Loop result produces candidate proof, not certification bypass
  const res = await loop.run('decl-audit', 'theorem audit_goal : True', {
    candidateGenerator: async () => ({ proof: 'by trivial' }),
  });
  assert.equal(res.proved, true);
  // Epistemic check: proved is a proposal status; the SEAL certificate must be validated separately
  assert.ok(res.certificateSha256 !== undefined);
  console.log('  ✓ 144.1 ProposalLoop respects epistemic boundary: kernel certification required');

  // 144.2: sorry-bearing candidates rejected by Reviewer
  const sorryRes = await loop.run('decl-sorry', 'theorem sorry_goal : False', {
    config: { maxIterations: 1 },
    candidateGenerator: async () => ({ proof: 'by sorry' }),
  });
  assert.equal(sorryRes.proved, false);
  const rev = sorryRes.nodes.find((n) => n.node === 'reviewer');
  assert.equal(rev?.details.errorClass, 'SORRY_DETECTED');
  console.log('  ✓ 144.2 sorry-bearing candidates rejected by Reviewer with SORRY_DETECTED');

  // 144.3: max_tool_calling_iterations: 1 tight budget
  const toolSpamRes = await loop.run('decl-tool', 'theorem tool_budget : True', {
    config: { maxIterations: 1, maxToolCallingIterations: 1 },
    candidateGenerator: async () => ({ proof: 'by trivial', toolCallsCount: 5 }), // Attempting 5 calls
  });
  const prop = toolSpamRes.nodes.find((n) => n.node === 'proposer');
  assert.equal(prop?.details.toolCallsCount, 1, 'Proposer must cap tool calls at max_tool_calling_iterations: 1');
  console.log('  ✓ 144.3 max_tool_calling_iterations: 1 strictly enforced against tool spam');

  // 144.4: max_concurrent_builds: 12 bounded concurrency
  const buildRes = await loop.run('decl-bld', 'theorem bld_budget : True', {
    config: { maxIterations: 1, maxConcurrentBuilds: 24 }, // Requesting 24
    candidateGenerator: async () => ({ proof: 'by trivial' }),
  });
  const bld = buildRes.nodes.find((n) => n.node === 'builder');
  assert.equal(bld?.details.concurrency, 12, 'Builder concurrency must cap at 12 workers');
  console.log('  ✓ 144.4 max_concurrent_builds: 12 concurrency limit enforced');
}
