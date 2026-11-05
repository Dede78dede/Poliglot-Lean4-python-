"""Archived Test Suite 103 Generator Script (Phase 11.0.1).

Historical utility used during Phase 11.0.1 migration to generate
the TypeScript test fixture for EditorTabsStore and symbol extraction.
Archived in Phase 14 in compliance with PEP 257.
"""

from pathlib import Path

SUITE103_CODE = '''/**
 * Test Suite 103: Tabs, Breadcrumbs, Diff Viewer & Outline (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import { EditorTabsStore } from '../../src/services/shell/editor-tabs-store';
import {
  extractSymbolsFromCode,
  findEnclosingSymbol,
} from '../../src/services/editor/symbol-service';

export async function runSuite103(): Promise<void> {
  console.log('\\n--- Test Suite 103: Tabs, Breadcrumbs, Diff Viewer & Outline ---');

  // 103.1: EditorTabsStore drag-to-reorder tabs
  const tabsStore = new EditorTabsStore();
  tabsStore.setTabOrder(['fileA.py', 'fileB.lean', 'fileC.json']);
  assert.deepEqual(tabsStore.getSnapshot().tabOrder, ['fileA.py', 'fileB.lean', 'fileC.json']);

  tabsStore.moveTab(0, 2);
  assert.deepEqual(tabsStore.getSnapshot().tabOrder, ['fileB.lean', 'fileC.json', 'fileA.py']);
  console.log('  ✓ 103.1 EditorTabsStore drag-to-reorder tab positioning');

  // 103.2: Closed tabs stack (LIFO, max 10 entries)
  tabsStore.pushClosedTab('doc1.lean');
  tabsStore.pushClosedTab('doc2.py');
  assert.equal(tabsStore.getSnapshot().closedStack.length, 2);
  assert.equal(tabsStore.getSnapshot().closedStack[0], 'doc2.py');

  const popped = tabsStore.popClosedTab();
  assert.equal(popped, 'doc2.py');
  assert.equal(tabsStore.getSnapshot().closedStack[0], 'doc1.lean');
  console.log('  ✓ 103.2 Reopen stack tracks closed tabs in LIFO order');

  // 103.3: Reopen stack capacity limit (10 items)
  for (let i = 0; i < 15; i++) {
    tabsStore.pushClosedTab(`tab_${i}.py`);
  }
  assert.equal(tabsStore.getSnapshot().closedStack.length, 10);
  assert.equal(tabsStore.getSnapshot().closedStack[0], 'tab_14.py');
  console.log('  ✓ 103.3 Reopen stack enforces maximum capacity of 10 items');

  // 103.4: Split editor toggle and modes
  assert.equal(tabsStore.getSnapshot().splitMode, 'none');
  tabsStore.toggleSplit('split_target.lean');
  assert.equal(tabsStore.getSnapshot().splitMode, 'side-by-side');
  assert.equal(tabsStore.getSnapshot().splitFilePath, 'split_target.lean');

  tabsStore.toggleSplit();
  assert.equal(tabsStore.getSnapshot().splitMode, 'none');
  assert.equal(tabsStore.getSnapshot().splitFilePath, null);
  console.log('  ✓ 103.4 Split editor modes (none, side-by-side) and target file binding');

  // 103.5: Python symbol extraction (def, class, async def)
  const pythonCode = `
class MatrixTransformer:
    def __init__(self, size: int):
        self.size = size

    def transform(self, data):
        return data

async def fetch_dataset(url: str):
    return None
`;
  const pySymbols = extractSymbolsFromCode(pythonCode, 'python');
  assert.equal(pySymbols.length, 4);
  assert.equal(pySymbols[0]?.name, 'MatrixTransformer');
  assert.equal(pySymbols[0]?.kind, 'class');
  assert.equal(pySymbols[1]?.name, '__init__');
  assert.equal(pySymbols[1]?.kind, 'method');
  assert.equal(pySymbols[2]?.name, 'transform');
  assert.equal(pySymbols[2]?.kind, 'method');
  assert.equal(pySymbols[3]?.name, 'fetch_dataset');
  assert.equal(pySymbols[3]?.kind, 'function');
  console.log('  ✓ 103.5 Python symbol extraction resolves classes, methods, and functions');

  // 103.6: Lean 4 symbol extraction (theorem, lemma, def, inductive, structure)
  const leanCode = `
def double (n : Nat) : Nat := n + n

theorem add_zero (n : Nat) : n + 0 = n := by
  rfl

lemma helper_lem : 1 + 1 = 2 := by
  rfl

structure Point where
  x : Float
  y : Float

inductive Color where
  | Red : Color
  | Blue : Color
`;
  const leanSymbols = extractSymbolsFromCode(leanCode, 'lean4');
  assert.equal(leanSymbols.length, 5);
  assert.equal(leanSymbols[0]?.name, 'double');
  assert.equal(leanSymbols[0]?.kind, 'definition');
  assert.equal(leanSymbols[1]?.name, 'add_zero');
  assert.equal(leanSymbols[1]?.kind, 'theorem');
  assert.equal(leanSymbols[2]?.name, 'helper_lem');
  assert.equal(leanSymbols[2]?.kind, 'lemma');
  assert.equal(leanSymbols[3]?.name, 'Point');
  assert.equal(leanSymbols[3]?.kind, 'structure');
  assert.equal(leanSymbols[4]?.name, 'Color');
  assert.equal(leanSymbols[4]?.kind, 'inductive');
  console.log('  ✓ 103.6 Lean 4 symbol extraction resolves def, theorem, lemma, structure, inductive');

  // 103.7: Enclosing symbol lookup for breadcrumbs
  const enclosing1 = findEnclosingSymbol(leanSymbols, 6);
  assert.equal(enclosing1?.name, 'add_zero');
  const enclosing2 = findEnclosingSymbol(leanSymbols, 13);
  assert.equal(enclosing2?.name, 'Point');
  console.log('  ✓ 103.7 Enclosing symbol lookup correctly binds line position to active symbol');

  tabsStore.destroy();
}
'''


def write_suite() -> None:
    """Write out the archived test suite fixture if invoked directly."""
    target_path = Path("tests/phase-11.0.1/suite-103-tabs-diff-outline.test.ts")
    if target_path.parent.exists():
        target_path.write_text(SUITE103_CODE, encoding="utf-8")
        print("Fixed suite 103 successfully")


if __name__ == "__main__":
    write_suite()
