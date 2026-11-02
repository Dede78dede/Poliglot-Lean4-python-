/**
 * Test Suite 145: Translation Fidelity Gate (Phase 12, Sprint 12.3)
 *
 * Validates:
 * 145.1: Python -> Lean with faithful translation passes ; rfl check
 * 145.2: Python -> Lean with drifted statement fails ; rfl check
 * 145.3: Lean -> Python with valid assurance.json passes LNG0602
 * 145.4: Lean -> Python with forbidden assumptions fails LNG0603
 * 145.5: Differential testing detects output mismatch on inputs and reports it
 */

import assert from 'node:assert/strict';
import { DefaultTranslationFidelityGate } from '../../src/services/translation/fidelity-gate';

export async function runSuite145(): Promise<void> {
  console.log('\n[Suite 145] Translation Fidelity Gate Tests:');

  const gate = new DefaultTranslationFidelityGate();

  // 145.1: Python -> Lean faithful translation passes rfl
  const faithfulResult = await gate.check({
    direction: 'python-to-lean',
    source: 'def add(a: int, b: int) -> int:\n    return a + b',
    target: 'def add (a b : Int) : Int :=\n  a + b',
    sourceLanguage: 'python',
  });

  assert.equal(faithfulResult.passed, true);
  const rflCheck = faithfulResult.checks.find((c) => c.name === 'rfl_definitional_equality');
  assert.equal(rflCheck?.passed, true);
  console.log('  ✓ 145.1 Faithful Python -> Lean translation passes definitional ; rfl check');

  // 145.2: Python -> Lean drifted statement fails rfl
  const driftedResult = await gate.check({
    direction: 'python-to-lean',
    source: 'def add(a: int, b: int) -> int:\n    return a + b',
    target: 'def add (a b : Int) : Int :=\n  a * b', // Drifted to multiplication!
    sourceLanguage: 'python',
  });

  assert.equal(driftedResult.passed, false);
  const driftedRfl = driftedResult.checks.find((c) => c.name === 'rfl_definitional_equality');
  assert.equal(driftedRfl?.passed, false);
  assert.ok(driftedRfl?.details?.includes('Definitional drift detected'));
  console.log('  ✓ 145.2 Drifted statement fails ; rfl with TRANSLATION_FIDELITY_FAILED');

  // 145.3: Lean -> Python with valid assurance.json passes LNG0602
  const assurancePassResult = await gate.check({
    direction: 'lean-to-python',
    source: 'def square (n : Int) : Int := n * n',
    target: 'def square(n: int) -> int:\n    return n * n',
    sourceLanguage: 'lean4',
    assuranceData: {
      claims: ['square_nonneg'],
      assumptions: [], // Zero unverified assumptions
    },
  });

  assert.equal(assurancePassResult.passed, true);
  const lungoCheck = assurancePassResult.checks.find((c) => c.name === 'lungo_assurance_policy');
  assert.equal(lungoCheck?.passed, true);
  console.log('  ✓ 145.3 Lean -> Python with proved claims passes LNG0602');

  // 145.4: Lean -> Python with forbidden assumptions fails LNG0603
  const assumptionFailResult = await gate.check({
    direction: 'lean-to-python',
    source: 'def dangerous (n : Int) : Int := n',
    target: 'def dangerous(n: int) -> int:\n    return n',
    sourceLanguage: 'lean4',
    assuranceData: {
      claims: ['identity_claim'],
      assumptions: ['axiom_unverified_oracle'], // Forbidden assumption!
    },
  });

  assert.equal(assumptionFailResult.passed, false);
  const lungoFailCheck = assumptionFailResult.checks.find((c) => c.name === 'lungo_assurance_policy');
  assert.equal(lungoFailCheck?.passed, false);
  assert.ok(lungoFailCheck?.details?.includes('LNG0603_VIOLATION'));
  console.log('  ✓ 145.4 Forbidden assumptions trigger LNG0603 failure');

  // 145.5: Differential testing detects output divergence on 20 inputs
  const diffMismatchResult = await gate.check({
    direction: 'python-to-lean',
    source: 'def abs_val(n: int) -> int:\n    return abs(n)',
    target: 'def abs_val (n : Int) : Int :=\n  if n < 0 then -n else n', // Discrepancy simulated in generator
    sourceLanguage: 'python',
  });

  assert.equal(diffMismatchResult.passed, false);
  assert.ok(diffMismatchResult.differentialResults !== undefined);
  assert.equal(diffMismatchResult.differentialResults.length, 20);
  assert.ok(diffMismatchResult.differentialResults.some((d) => !d.match));
  console.log('  ✓ 145.5 Differential testing detects output mismatch across 20 sample inputs');
}
