/**
 * Test Suite 197: Advanced Reasoners Verification (Phase 15 Wave 3, ADR-016)
 *
 * Validates:
 * 197.1: Mathesis executes real HTTP POST requests, Zod-validates responses, enforces 0.8 threshold,
 *        and fails closed with MATHESIS_UNAVAILABLE on HTTP errors or malformed payloads.
 * 197.2: LP2 AST transpiler translates typed pure Python<->Lean subsets and reports explicit
 *        structured diagnostics on unsupported imperative/dynamic constructs.
 * 197.3: TreeThink executes genuine bounded search over HTTP/evaluator, hitting exhaustion or closing
 *        subgoals without hardcoded stubs, and failing closed when unconfigured/unreachable.
 * 197.4: RFC 9457 fail-closed behavior when flags are disabled.
 * 197.5: Zero epistemic breach: reasoners strictly omit top-level verified: true and kernel seals.
 */

import assert from 'node:assert/strict';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { LP2Adapter } from '../../src/services/translation/lp2-adapter';
import { TreeThinkProvider } from '../../src/services/proof/treethink/treethink-provider';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { BridgeError } from '../../src/services/errors/bridge-error';
import { startMathesisMockServer, startTreeThinkMockServer } from './mocks/reasoner-mocks';

export async function runSuite197(): Promise<void> {
  console.log('Running Suite 197: Advanced Reasoners (5 sub-tests)...');

  const lp2Adapter = new LP2Adapter();
  const treeThinkProvider = new TreeThinkProvider();

  try {
    // 197.1: Mathesis real HTTP + schema fail-closed + score threshold
    featureFlagRegistry.set('ENABLE_MATHESIS', true);
    const mathMock = await startMathesisMockServer({ score: 0.92 });
    const badSchemaMock = await startMathesisMockServer({ returnInvalidSchema: true });
    const errHttpMock = await startMathesisMockServer({ returnStatus: 503 });

    let formalizeResult;
    try {
      formalizeResult = await mathesisProvider.formalize({
        naturalLanguagePrompt: 'Every natural number plus zero equals itself',
        targetToolchain: 'v4.34.0-rc1',
        endpointOverride: mathMock.url,
      });

      assert.equal(formalizeResult.provider, 'mathesis');
      assert.equal(formalizeResult.accepted, true);
      assert.ok(formalizeResult.leanCode.includes('theorem mathesis_synthesized_theorem'));
      assert.ok(formalizeResult.confidenceScore >= 0.8);
      assert.equal(mathMock.requestCount(), 1);

      await assert.rejects(
        () =>
          mathesisProvider.formalize({
            naturalLanguagePrompt: 'bad schema',
            endpointOverride: badSchemaMock.url,
          }),
        (err: unknown) => err instanceof BridgeError && err.code === 'MATHESIS_UNAVAILABLE'
      );

      await assert.rejects(
        () =>
          mathesisProvider.formalize({
            naturalLanguagePrompt: 'server 503',
            endpointOverride: errHttpMock.url,
          }),
        (err: unknown) => err instanceof BridgeError && err.code === 'MATHESIS_UNAVAILABLE'
      );
    } finally {
      await mathMock.close();
      await badSchemaMock.close();
      await errHttpMock.close();
    }
    console.log('  ✓ 197.1 Mathesis formalizes over HTTP, rejects invalid schemas, and fails closed');

    // 197.2: LP2 AST Translation & Unsupported Construct Diagnostics
    featureFlagRegistry.set('ENABLE_LP2', true);
    const pythonSample = [
      'def clamped_double(a: int, b: int) -> int:',
      '    if a > 0 and b > 0:',
      '        return (a + b) * 2',
      '    else:',
      '        return 0',
    ].join('\n');
    const lp2Result = await lp2Adapter.pyToLean(pythonSample);

    assert.equal(lp2Result.source, 'lp2');
    assert.equal(lp2Result.requiresFidelityCheck, true);
    assert.ok(lp2Result.translated.includes('def clamped_double (a : Int) (b : Int) : Int :='));
    assert.ok(lp2Result.translated.includes('if a > 0 && b > 0 then a + b * 2 else 0'));
    assert.ok(lp2Result.warnings.length > 0);

    const leanRoundTrip = await lp2Adapter.leanToPy(lp2Result.translated);
    assert.equal(leanRoundTrip.source, 'lp2');
    assert.ok(leanRoundTrip.translated.includes('def clamped_double(a: int, b: int) -> int:'));
    assert.ok(leanRoundTrip.translated.includes('and'));

    const unsupportedPy = await lp2Adapter.pyToLean('def f(x: int) -> int:\n    for i in x:\n        return i');
    assert.ok(unsupportedPy.unsupportedConstructs.includes('for_loop'));
    assert.ok(unsupportedPy.diagnostics.some((d) => d.code === 'LP2_UNSUPPORTED_FOR'));
    console.log('  ✓ 197.2 LP2 AST transpiles typed Python<->Lean subsets with explicit unsupported diagnostics');

    // 197.3: TreeThink real bounded search + exhaustion + fail-closed
    featureFlagRegistry.set('ENABLE_TREETHINK', true);

    await assert.rejects(
      () => treeThinkProvider.treeSearch({ goal: '⊢ True', endpointOverride: '' }),
      (err: unknown) => err instanceof BridgeError && err.code === 'TREETHINK_UNAVAILABLE'
    );

    const treeSuccessMock = await startTreeThinkMockServer({ closeOnDepth: 2 });
    const treeExhaustMock = await startTreeThinkMockServer({ neverClose: true });
    let treeResult;
    try {
      treeResult = await treeThinkProvider.treeSearch({
        goal: '⊢ ∀ (n : Nat), n + 0 = n',
        method: 'mcts',
        maxDepth: 6,
        maxNodes: 20,
        endpointOverride: treeSuccessMock.url,
      });

      assert.equal(treeResult.method, 'mcts');
      assert.equal(treeResult.proved, true);
      assert.equal(treeResult.status, 'candidate_found');
      assert.equal(treeResult.requiresKernelVerification, true);
      assert.ok(treeResult.nodesExplored >= 3);
      assert.ok(treeResult.proof !== undefined);

      const exhausted = await treeThinkProvider.treeSearch({
        goal: '⊢ unprovable_goal',
        method: 'bfts',
        maxDepth: 4,
        maxNodes: 3,
        endpointOverride: treeExhaustMock.url,
      });
      assert.equal(exhausted.proved, false);
      assert.equal(exhausted.status, 'search_exhausted');
      assert.equal(exhausted.nodesExplored, 3);
      assert.equal(exhausted.proof, undefined);
    } finally {
      await treeSuccessMock.close();
      await treeExhaustMock.close();
    }
    console.log('  ✓ 197.3 TreeThink executes bounded search, handles node-budget exhaustion, and fails closed');

    // 197.4: Fail-closed on disabled flags
    featureFlagRegistry.set('ENABLE_MATHESIS', false);
    await assert.rejects(
      () =>
        mathesisProvider.formalize({
          naturalLanguagePrompt: 'test prompt',
          endpointOverride: 'http://localhost:8088/v1/mathesis',
        }),
      (err: unknown) => err instanceof BridgeError && err.code === 'FEATURE_DISABLED'
    );

    featureFlagRegistry.set('ENABLE_LP2', false);
    await assert.rejects(
      () => lp2Adapter.pyToLean('def x(): return 1'),
      (err: unknown) => err instanceof BridgeError && err.code === 'FEATURE_DISABLED'
    );

    featureFlagRegistry.set('ENABLE_TREETHINK', false);
    await assert.rejects(
      () => treeThinkProvider.treeSearch({ goal: '⊢ True' }),
      (err: unknown) => err instanceof BridgeError && err.code === 'FEATURE_DISABLED'
    );
    console.log('  ✓ 197.4 All advanced reasoners fail closed with FEATURE_DISABLED when flags are disabled');

    // 197.5: Zero epistemic breach
    assert.equal((formalizeResult as any).verified, undefined);
    assert.equal((formalizeResult as any).seal, undefined);
    assert.equal((lp2Result as any).verified, undefined);
    assert.equal((lp2Result as any).seal, undefined);
    assert.equal((treeResult as any).verified, undefined);
    assert.equal((treeResult as any).seal, undefined);
    console.log('  ✓ 197.5 Epistemic barrier upheld: reasoners strictly omit top-level verified flags and kernel seals');
  } finally {
    featureFlagRegistry.reset();
  }
}
