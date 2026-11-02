/**
 * Test Suite 128: Mathesis Provider & LeanScorer (Phase 11.2, Sprint 11.2.4)
 */

import assert from 'node:assert/strict';
import {
  MathesisProvider,
  mathesisProvider,
  MATHESIS_SCORE_THRESHOLD,
} from '../../src/services/formalization/mathesis-provider';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite128(): Promise<void> {
  console.log('\n--- Test Suite 128: Mathesis Provider & LeanScorer ---');

  // 128.1: Missing endpoint or disabled flag fails fast with MATHESIS_UNAVAILABLE and setup instructions
  let caught = false;
  try {
    // When endpoint is unconfigured or flag disabled:
    const provider = new MathesisProvider();
    await provider.formalize({
      naturalLanguagePrompt: 'For all natural numbers n, 0 <= n',
      endpointOverride: '', // explicitly unconfigured
    });
  } catch (err: any) {
    caught = true;
    assert.equal(err.code, 'MATHESIS_UNAVAILABLE');
    assert.ok(err.details?.instructions?.includes('MATHESIS_ENDPOINT'), 'Must contain configuration instructions');
  }
  assert.equal(caught, true, 'Must fail fast when MATHESIS_ENDPOINT is unconfigured');
  console.log('  ✓ 128.1 Missing endpoint fail-fast: returned MATHESIS_UNAVAILABLE with instructions');

  // 128.2: Candidate generation with valid endpoint override
  // Temporarily enable flag in registry for test
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const result = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'For all natural numbers n, 0 <= n',
    endpointOverride: 'http://localhost:8088/v1/mathesis',
  });
  assert.equal(result.provider, 'mathesis');
  assert.ok(result.leanCode.includes('theorem mathesis_synthesized_theorem'));
  assert.ok(result.declarations.includes('mathesis_synthesized_theorem'));
  assert.equal(result.candidates.length, 1);
  console.log('  ✓ 128.2 Candidate generation: synthesized Lean 4 theorem declaration');

  // 128.3: LeanScorer evaluation in [0, 1] with threshold >= 0.5
  assert.equal(MATHESIS_SCORE_THRESHOLD, 0.5);
  const score = mathesisProvider.evaluateCandidateWithLeanScorer(
    result.leanCode,
    'For all natural numbers n, 0 <= n'
  );
  assert.ok(score >= 0.0 && score <= 1.0, `Score ${score} must be within [0, 1]`);
  assert.ok(score >= MATHESIS_SCORE_THRESHOLD, `Score ${score} should pass threshold 0.5`);
  assert.equal(result.accepted, true);
  console.log(`  ✓ 128.3 LeanScorer evaluation: score ${score} in [0, 1] meets >= 0.5 threshold`);

  // 128.4: Fallback compilation score evaluation
  const candidate = result.candidates[0];
  assert.ok(candidate.fallbackCompilationScore !== undefined);
  assert.ok(candidate.fallbackCompilationScore >= 0.9);
  console.log('  ✓ 128.4 Fallback compilation scoring: verified compilation confidence fallback');

  // 128.5: Epistemic barrier: formalization candidate does not emit SEAL_KERNEL_VERIFIED_TIER5
  assert.equal('SEAL_KERNEL_VERIFIED_TIER5' in result, false);
  assert.equal('SEAL_KERNEL_VERIFIED_TIER5' in candidate, false);
  console.log('  ✓ 128.5 Epistemic barrier: candidates never carry kernel verification seals');

  // Reset flag
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
}
