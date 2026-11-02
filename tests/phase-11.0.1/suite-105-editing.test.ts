/**
 * Test Suite 105: Advanced Editing, Snippets & CodeLens (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import {
  PYTHON_SNIPPETS,
  LEAN4_SNIPPETS,
} from '../../src/services/editor/snippet-registry';
import {
  contextEngineService,
} from '../../src/services/editor/context-engine-service';
import { FEATURE_FLAGS } from '../../src/services/flags/feature-flag-registry';

export async function runSuite105(): Promise<void> {
  console.log('\n--- Test Suite 105: Advanced Editing, Snippets & CodeLens ---');

  // 105.1: Python snippets registry coverage
  assert.ok(PYTHON_SNIPPETS.length >= 7);
  const pyLabels = PYTHON_SNIPPETS.map((s) => s.label);
  assert.ok(pyLabels.includes('def'));
  assert.ok(pyLabels.includes('class'));
  assert.ok(pyLabels.includes('async_def'));
  assert.ok(pyLabels.includes('numpy_array'));
  assert.ok(pyLabels.includes('sympy_symbols'));
  assert.ok(pyLabels.includes('main'));
  assert.ok(pyLabels.includes('try_except'));
  console.log('  ✓ 105.1 Python snippets registry contains functions, classes, numpy, sympy, and boilerplate');

  // 105.2: Lean 4 snippets registry coverage
  assert.ok(LEAN4_SNIPPETS.length >= 8);
  const leanLabels = LEAN4_SNIPPETS.map((s) => s.label);
  assert.ok(leanLabels.includes('theorem'));
  assert.ok(leanLabels.includes('lemma'));
  assert.ok(leanLabels.includes('def'));
  assert.ok(leanLabels.includes('simp'));
  assert.ok(leanLabels.includes('rw'));
  assert.ok(leanLabels.includes('induction'));
  assert.ok(leanLabels.includes('calc'));
  assert.ok(leanLabels.includes('have'));
  console.log('  ✓ 105.2 Lean 4 snippets registry covers theorems, lemmas, tactics, induction, and calc blocks');

  // 105.3: Lean 4 CodeLens generation (exact?, simp?, omega?)
  const leanSample = `
theorem add_zero (n : Nat) : n + 0 = n := by
  sorry
`;
  const lenses = contextEngineService.generateLeanCodeLenses(leanSample);
  assert.ok(lenses.length >= 3);
  const titles = lenses.map((l) => l.command.title);
  assert.ok(titles.some((t) => t.includes('exact?')));
  assert.ok(titles.some((t) => t.includes('simp?')));
  assert.ok(titles.some((t) => t.includes('omega?')));
  console.log('  ✓ 105.3 Lean 4 CodeLens generates tactic suggestions (exact?, simp?, omega?) above sorry goals');

  // 105.4: Inlay hints generation for Python and Lean 4
  const pyCode = 'arr = [x for x in range(10)]';
  const pyHints = contextEngineService.generateInlayHints(pyCode, 'python');
  assert.ok(pyHints.length >= 1);
  assert.equal(pyHints[0]?.label, 'stop: ');

  const leanCode = 'def my_val := 42';
  const leanHints = contextEngineService.generateInlayHints(leanCode, 'lean4');
  assert.ok(leanHints.length >= 1);
  assert.equal(leanHints[0]?.label, ': Nat');
  console.log('  ✓ 105.4 Parameter and type inlay hints generated for Python and Lean 4 code');

  // 105.5: Context engine fallback behavior
  const status = await contextEngineService.getEngineStatus();
  assert.equal(status.enabled, false);
  assert.equal(status.activeProvider, 'monaco-vfs-fallback');
  console.log('  ✓ 105.5 Context engine gracefully falls back to monaco-vfs-fallback without crashing');

  // 105.6: Feature flag ENABLE_CONTEXT_ENGINE is registered with default false
  assert.ok('ENABLE_CONTEXT_ENGINE' in FEATURE_FLAGS);
  assert.equal(FEATURE_FLAGS.ENABLE_CONTEXT_ENGINE.default, false);
  console.log('  ✓ 105.6 Feature flag ENABLE_CONTEXT_ENGINE registered with safe default false');

  // 105.7: Snippet insertText contains valid Monaco snippet placeholders ($0, $1)
  const thmSnippet = LEAN4_SNIPPETS.find((s) => s.label === 'theorem');
  assert.ok(thmSnippet?.insertText.includes('${1:name}'));
  assert.ok(thmSnippet?.insertText.includes('${0:sorry}'));
  console.log('  ✓ 105.7 Monaco snippet tab-stop placeholders properly formatted in templates');
}
