/**
 * Test Suite 197: Advanced Reasoners Verification (Phase 15 Wave 3, ADR-016)
 *
 * Validates:
 * 197.1: Mathesis autoformalization translates natural language into Lean 4 theorem signatures.
 * 197.2: LP2 bidirectional adapter translates Python contracts to Lean functional definitions with lossy warning headers.
 * 197.3: TreeThink MCTS searches proof tree paths without asserting unproven claims as kernel verified.
 * 197.4: RFC 9457 fail-closed behavior: all reasoners throw FEATURE_DISABLED when their respective flags are disabled.
 * 197.5: Zero epistemic breach: all reasoners output heuristic or unverified candidates and never emit SEAL_KERNEL_VERIFIED_TIER5.
 */

import assert from 'node:assert/strict';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { LP2Adapter } from '../../src/services/translation/lp2-adapter';
import { TreeThinkProvider } from '../../src/services/proof/treethink/treethink-provider';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite197(): Promise<void> {
  console.log('Running Suite 197: Advanced Reasoners (5 sub-tests)...');

  const lp2Adapter = new LP2Adapter();
  const treeThinkProvider = new TreeThinkProvider();

  // 197.1: Mathesis autoformalization
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const formalizeResult = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'Every natural number plus zero equals itself',
    targetToolchain: 'v4.16.0',
    endpointOverride: 'http://localhost:8088/v1/mathesis',
    simulatedScore: 0.92,
  });

  assert.equal(formalizeResult.provider, 'mathesis');
  assert.equal(formalizeResult.accepted, true);
  assert.ok(formalizeResult.leanCode.includes('theorem mathesis_synthesized_theorem'));
  assert.ok(formalizeResult.confidenceScore >= 0.8);
  console.log('  ✓ 197.1 Mathesis formalizes natural language mathematics into Lean 4 declarations');

  // 197.2: LP2 Translation
  featureFlagRegistry.set('ENABLE_LP2', true);
  const pythonSample = 'def double(n):\n    return n + n';
  const lp2Result = await lp2Adapter.pyToLean(pythonSample);

  assert.equal(lp2Result.source, 'lp2');
  assert.equal(lp2Result.requiresFidelityCheck, true);
  assert.ok(lp2Result.translated.includes('def double (n : Int) : Int :='));
  assert.ok(lp2Result.warnings.length > 0);
  console.log('  ✓ 197.2 LP2 transpiles Python contracts to Lean 4 with mandatory fidelity warnings');

  // 197.3: TreeThink MCTS Proof Search
  featureFlagRegistry.set('ENABLE_TREETHINK', true);
  const treeResult = await treeThinkProvider.treeSearch({
    goal: '⊢ ∀ (n : Nat), n + 0 = n',
    method: 'mcts',
    maxDepth: 6,
  });

  assert.equal(treeResult.method, 'mcts');
  assert.equal(treeResult.requiresKernelVerification, true);
  assert.ok(treeResult.nodesExplored > 0);
  assert.ok(treeResult.proof !== undefined);
  console.log('  ✓ 197.3 TreeThink explores proof search trees tagging output for kernel verification');

  // 197.4: Fail-closed on disabled flags
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
  let threwMathesis = false;
  try {
    await mathesisProvider.formalize({
      naturalLanguagePrompt: 'test prompt',
      endpointOverride: 'http://localhost:8088/v1/mathesis',
    });
  } catch (err: any) {
    if (err.code === 'FEATURE_DISABLED') threwMathesis = true;
  }
  assert.equal(threwMathesis, true, 'Mathesis must throw FEATURE_DISABLED when flag is off');

  featureFlagRegistry.set('ENABLE_LP2', false);
  let threwLP2 = false;
  try {
    await lp2Adapter.pyToLean('def x(): return 1');
  } catch (err: any) {
    if (err.code === 'FEATURE_DISABLED') threwLP2 = true;
  }
  assert.equal(threwLP2, true, 'LP2 must throw FEATURE_DISABLED when flag is off');

  featureFlagRegistry.set('ENABLE_TREETHINK', false);
  let threwTreeThink = false;
  try {
    await treeThinkProvider.treeSearch({ goal: '⊢ True' });
  } catch (err: any) {
    if (err.code === 'FEATURE_DISABLED') threwTreeThink = true;
  }
  assert.equal(threwTreeThink, true, 'TreeThink must throw FEATURE_DISABLED when flag is off');
  console.log('  ✓ 197.4 All advanced reasoners fail closed with FEATURE_DISABLED when flags are disabled');

  // 197.5: Zero epistemic breach
  assert.equal((formalizeResult as any).verified, undefined);
  assert.equal((formalizeResult as any).seal, undefined);
  assert.equal((lp2Result as any).verified, undefined);
  assert.equal((lp2Result as any).seal, undefined);
  assert.equal((treeResult as any).verified, undefined);
  assert.equal((treeResult as any).seal, undefined);
  console.log('  ✓ 197.5 Epistemic barrier upheld: reasoners strictly omit top-level verified flags and kernel seals');
}
