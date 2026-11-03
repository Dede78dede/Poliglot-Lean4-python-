/**
 * Test Suite 147: Conditional Integrations (Mathesis & TreeThink) (Phase 12, Sprint 12.4)
 *
 * Validates:
 * 147.1: MathesisProvider.isAvailable() returns false when MATHESIS_ENDPOINT is empty
 * 147.2: Configured Mathesis formalize() parses LeanScorer; candidates below 0.8 rejected
 * 147.3: ENABLE_TREETHINK=false blocks TreeThink invocation with TREETHINK_UNAVAILABLE
 * 147.4: TreeThink results require re-verification via SEAL_KERNEL_VERIFIED_TIER5
 */

import assert from 'node:assert/strict';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { treeThinkProvider } from '../../src/services/proof/treethink/treethink-provider';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite147(): Promise<void> {
  console.log('\n[Suite 147] Conditional Integrations (Mathesis & TreeThink) Tests:');

  // 147.1: MathesisProvider.isAvailable() returns false when endpoint is empty
  const isAvailableEmpty = mathesisProvider.isAvailable('');
  assert.equal(
    isAvailableEmpty,
    false,
    'MathesisProvider must be unavailable when endpoint is empty'
  );
  console.log('  ✓ 147.1 MathesisProvider.isAvailable() returns false when MATHESIS_ENDPOINT is empty');

  // 147.2: Configured Mathesis evaluates LeanScorer threshold (0.8)
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const highScoringResult = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'Prove that the sum of two even numbers is even',
    endpointOverride: 'http://localhost:8088/v1/mathesis',
    simulatedScore: 0.92,
  });
  assert.equal(highScoringResult.accepted, true);
  assert.equal(highScoringResult.leanScorerScore, 0.92);

  // Candidate below threshold 0.8 is rejected
  const lowScoringResult = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'Ambiguous prompt generating low confidence code',
    endpointOverride: 'http://localhost:8088/v1/mathesis',
    simulatedScore: 0.65,
  });
  assert.equal(lowScoringResult.accepted, false);
  assert.equal(lowScoringResult.candidates[0].passedThreshold, false);
  featureFlagRegistry.reset('ENABLE_MATHESIS');
  console.log('  ✓ 147.2 LeanScorer threshold 0.8 enforced; candidates below 0.8 rejected');

  // 147.3: ENABLE_TREETHINK=false blocks TreeThink with TREETHINK_UNAVAILABLE
  assert.equal(
    featureFlagRegistry.isEnabled('ENABLE_TREETHINK'),
    false,
    'ENABLE_TREETHINK must be disabled by default'
  );

  await assert.rejects(
    async () => {
      await treeThinkProvider.treeSearch({
        goal: 'theorem foo : True',
      });
    },
    (err: unknown) => {
      if (err instanceof Error) {
        const bridgeErr = err as { code?: string };
        return bridgeErr.code === 'TREETHINK_UNAVAILABLE' || /TREETHINK_UNAVAILABLE/.test(err.message);
      }
      return false;
    },
    'Calling TreeThink when flag is disabled must throw TREETHINK_UNAVAILABLE'
  );
  console.log('  ✓ 147.3 ENABLE_TREETHINK=false blocks invocation with TREETHINK_UNAVAILABLE');

  // 147.4: TreeThink result requires kernel re-verification
  featureFlagRegistry.set('ENABLE_TREETHINK', true);
  const treeResult = await treeThinkProvider.treeSearch({
    goal: 'theorem sum_n (n : Nat) : n + 0 = n',
    method: 'mcts',
  });

  assert.equal(treeResult.proved, true);
  assert.equal(treeResult.requiresKernelVerification, true);
  assert.ok(treeResult.proof !== undefined);
  console.log('  ✓ 147.4 TreeThink result carries requiresKernelVerification: true');

  // Reset flag
  featureFlagRegistry.reset('ENABLE_TREETHINK');
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_TREETHINK'), false);
}
