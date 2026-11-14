/**
 * Test Suite 146: LP² Adapter & Gated Translation (Phase 12 & Phase 15 Wave 3)
 *
 * Validates:
 * 146.1: ENABLE_LP2=false flag gating (disabled by default)
 * 146.2: LP² outputs include lossy warnings in translation results
 * 146.3: LP² results carry source: 'lp2' and requiresFidelityCheck: true
 * 146.4: Pure typed subset AST translates multi-param arithmetic/conditionals & emits diagnostics on unsupported constructs
 */

import assert from 'node:assert/strict';
import { lp2Adapter } from '../../src/services/translation/lp2-adapter';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite146(): Promise<void> {
  console.log('\n[Suite 146] LP² Adapter & Gated Translation Tests:');

  // 146.1: ENABLE_LP2=false by default -> execution blocked
  assert.equal(
    featureFlagRegistry.isEnabled('ENABLE_LP2'),
    false,
    'ENABLE_LP2 must be disabled by default'
  );

  await assert.rejects(
    async () => {
      await lp2Adapter.pyToLean('def foo(x): return x');
    },
    /LP2_DISABLED/,
    'Calling LP2 when flag is disabled must throw LP2_DISABLED'
  );
  console.log('  ✓ 146.1 ENABLE_LP2=false gating strictly enforced');

  featureFlagRegistry.set('ENABLE_LP2', true);

  try {
    // 146.2: Translation output carries lossy warnings
    const pyResult = await lp2Adapter.pyToLean('def compute(n):\n    return n + 1');
    assert.ok(pyResult.warnings.length >= 3);
    assert.ok(pyResult.warnings.some((w) => w.includes('lossy')));
    assert.ok(pyResult.warnings.some((w) => w.includes('list mutation') || w.includes('In-place')));
    console.log('  ✓ 146.2 LP² results carry explicit lossy conversion warnings');

    // 146.3: Epistemic tag source: 'lp2' and requiresFidelityCheck: true
    assert.equal(pyResult.source, 'lp2');
    assert.equal(pyResult.requiresFidelityCheck, true);

    const leanResult = await lp2Adapter.leanToPy('def compute (n : Int) : Int :=\n  n + 1');
    assert.equal(leanResult.source, 'lp2');
    assert.equal(leanResult.requiresFidelityCheck, true);
    assert.ok(leanResult.translated.includes('def compute(n: int) -> int:'));
    assert.ok(leanResult.translated.includes('return n + 1'));
    console.log('  ✓ 146.3 LP² translation marked with source: lp2 and requiresFidelityCheck: true');

    // 146.4: Pure AST subset + structured unsupported diagnostics
    const richPy = [
      'def max_val(a: int, b: int) -> int:',
      '    if a >= b:',
      '        return a',
      '    else:',
      '        return b',
    ].join('\n');
    const richRes = await lp2Adapter.pyToLean(richPy);
    assert.ok(richRes.translated.includes('def max_val (a : Int) (b : Int) : Int :='));
    assert.ok(richRes.translated.includes('if a >= b then a else b'));

    const impurePy = [
      'def bad_fn(xs: list[int]) -> int:',
      '    xs.append(1)',
      '    while True:',
      '        yield 1',
    ].join('\n');
    const impureRes = await lp2Adapter.pyToLean(impurePy);
    assert.ok(impureRes.unsupportedConstructs.includes('in_place_mutation'));
    assert.ok(impureRes.unsupportedConstructs.includes('while_loop'));
    assert.ok(impureRes.unsupportedConstructs.includes('generator_yield'));
    assert.ok(impureRes.diagnostics.some((d) => d.code === 'LP2_UNSUPPORTED_WHILE'));
    console.log('  ✓ 146.4 LP² pure AST lowers typed conditionals and emits diagnostics on unsupported constructs');
  } finally {
    featureFlagRegistry.reset('ENABLE_LP2');
  }
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_LP2'), false);
}
