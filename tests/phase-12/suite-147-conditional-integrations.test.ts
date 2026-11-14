/**
 * Test Suite 147: Conditional Integrations (Mathesis & TreeThink) (Phase 12 & Phase 15 Wave 3)
 *
 * Validates:
 * 147.1: MathesisProvider.isAvailable() returns false when MATHESIS_ENDPOINT is empty
 * 147.2: Configured Mathesis formalize() enforces LeanScorer threshold (0.8) over real HTTP
 * 147.3: ENABLE_TREETHINK=false blocks TreeThink invocation with TREETHINK_UNAVAILABLE
 * 147.4: TreeThink results require re-verification via SEAL_KERNEL_VERIFIED_TIER5
 */

import assert from 'node:assert/strict';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { treeThinkProvider } from '../../src/services/proof/treethink/treethink-provider';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { startMathesisMockServer, startTreeThinkMockServer } from '../phase-14/mocks/reasoner-mocks';

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

  // 147.2: Configured Mathesis evaluates LeanScorer threshold (0.8) over real HTTP
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const highMock = await startMathesisMockServer({ score: 0.92 });
  const lowMock = await startMathesisMockServer({ score: 0.65 });
  try {
    const highScoringResult = await mathesisProvider.formalize({
      naturalLanguagePrompt: 'Prove that the sum of two even numbers is even',
      endpointOverride: highMock.url,
    });
    assert.equal(highScoringResult.accepted, true);
    assert.equal(highScoringResult.leanScorerScore, 0.92);

    const lowScoringResult = await mathesisProvider.formalize({
      naturalLanguagePrompt: 'Ambiguous prompt generating low confidence code',
      endpointOverride: lowMock.url,
    });
    assert.equal(lowScoringResult.accepted, false);
    assert.equal(lowScoringResult.candidates[0].passedThreshold, false);
    console.log('  ✓ 147.2 LeanScorer threshold 0.8 enforced over real HTTP; candidates below 0.8 rejected');
  } finally {
    await highMock.close();
    await lowMock.close();
    featureFlagRegistry.reset('ENABLE_MATHESIS');
  }

  // 147.3: ENABLE_TREETHINK=false blocks TreeThink with TREETHINK_UNAVAILABLE context
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
  const treeMock = await startTreeThinkMockServer({ closeOnDepth: 1 });
  featureFlagRegistry.set('ENABLE_TREETHINK', true);
  try {
    const treeResult = await treeThinkProvider.treeSearch({
      goal: 'theorem sum_n (n : Nat) : n + 0 = n',
      method: 'mcts',
      endpointOverride: treeMock.url,
    });

    assert.equal(treeResult.proved, true);
    assert.equal(treeResult.requiresKernelVerification, true);
    assert.ok(treeResult.proof !== undefined);
    assert.ok(treeMock.requestCount() >= 2);
    console.log('  ✓ 147.4 TreeThink bounded search result carries requiresKernelVerification: true');
  } finally {
    await treeMock.close();
    featureFlagRegistry.reset('ENABLE_TREETHINK');
  }
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_TREETHINK'), false);
}
