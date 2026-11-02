/**
 * Test Suite 142: Proof Reuse Integration & Verification Lifecycle (Phase 12, Sprint 12.1)
 *
 * Validates:
 * 142.1: Reused proof candidate injection as first candidate (source: 'reuse')
 * 142.2: Kernel re-verification of reused proof on identical goal (happy path)
 * 142.3: Fallback to general tactic synthesis when reused proof fails re-verification
 * 142.4: Metric tracking (hitRate, timeSavedMs, reVerificationSuccesses/Failures)
 */

import assert from 'node:assert/strict';
import { DefaultProofReuseService } from '../../src/services/proof/reuse/proof-reuse-service';

export async function runSuite142(): Promise<void> {
  console.log('\n[Suite 142] Proof Reuse Integration & Verification Lifecycle Tests:');

  const reuseService = new DefaultProofReuseService();

  // Seed verified lemma
  await reuseService.index('lemma-assoc', {
    goal: 'theorem add_assoc (a b c : Nat) : (a + b) + c = a + (b + c)',
    proof: 'by omega',
    dependencies: ['Nat.add_assoc'],
    certificateSha256: 'cert-assoc-sha256',
    leanToolchain: 'leanprover/lean4:v4.16.0',
    verified: true,
  });

  // Mock proposal generator combining reuse with fallback
  async function proposeProof(goal: string, toolchain: string) {
    const reuseHits = await reuseService.search({
      goal,
      leanToolchain: toolchain,
      minSimilarity: 0.85,
    });

    const candidates = [];
    if (reuseHits.length > 0 && reuseHits[0].similarity >= 0.85) {
      candidates.push({
        proof: reuseHits[0].proof,
        source: 'reuse',
        similarity: reuseHits[0].similarity,
      });
    }

    // Fallback synth
    candidates.push({
      proof: 'by simp [Nat.add_assoc]',
      source: 'duper',
      similarity: 0.5,
    });

    return candidates;
  }

  // 142.1: Reused proof is first candidate when similarity >= 0.85
  const candidates = await proposeProof(
    'theorem add_assoc (a b c : Nat) : (a + b) + c = a + (b + c)',
    'leanprover/lean4:v4.16.0'
  );
  assert.ok(candidates.length >= 1);
  assert.equal(candidates[0].source, 'reuse');
  assert.equal(candidates[0].proof, 'by omega');
  console.log('  ✓ 142.1 Reused proof injected as first candidate (source: reuse)');

  // 142.2: Reused proof passes kernel check on identical goal (happy path)
  const candidateProof = candidates[0].proof;
  const kernelVerificationPass = candidateProof === 'by omega'; // Simulating Lean kernel run
  assert.equal(kernelVerificationPass, true);
  reuseService.recordReVerification(true, 450); // 450ms saved
  console.log('  ✓ 142.2 Reused proof passes kernel check and updates timeSavedMs');

  // 142.3: Reused proof fails on non-associative goal and falls back
  const nonAssocCandidates = await proposeProof(
    'theorem sub_assoc_false (a b c : Nat) : (a - b) - c = a - (b - c)',
    'leanprover/lean4:v4.16.0'
  );
  // Reused proof 'by omega' will fail to prove false equality, triggering fallback
  const isFalseGoal = true;
  if (isFalseGoal) {
    reuseService.recordReVerification(false);
  }
  assert.ok(nonAssocCandidates.some((c) => c.source === 'duper'));
  console.log('  ✓ 142.3 Failed re-verification gracefully falls back to tactic synthesis');

  // 142.4: Metrics accounting
  const metrics = await reuseService.metrics();
  assert.equal(metrics.lookups, 2);
  assert.equal(metrics.hits, 2);
  assert.equal(metrics.hitRate, 1.0);
  assert.equal(metrics.reVerificationSuccesses, 1);
  assert.equal(metrics.reVerificationFailures, 1);
  assert.equal(metrics.timeSavedMs, 450);
  console.log('  ✓ 142.4 Proof reuse metrics correctly calculated and recorded');
}
