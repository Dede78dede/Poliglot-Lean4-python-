/**
 * Test Suite 151: Native Notebook (Monaco + Pyodide, notebook.worker) (Phase 13, Sprint 13.3)
 *
 * Validates:
 * 151.1: Cell 1 defines x = 1; cell 2 prints x -> output 1 (persistent globals)
 * 151.2: Cell timeout does not restart the kernel; variables are preserved
 * 151.3: RESTART_KERNEL clears variables and returns variablesLost: true
 * 151.4: notebook.worker is a separate Worker (grep verifies no import of pyodide.worker)
 * 151.5: Export/import .polyglot-notebook round-trips cleanly
 * 151.6: Export/import .ipynb round-trips conforming to Jupyter nbformat v4
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PersistentNotebookKernel } from '../../src/workers/notebook.worker';
import {
  type Notebook,
  exportToIpynb,
  importFromIpynb,
  exportToPolyglotNotebook,
  importFromPolyglotNotebook,
} from '../../src/types/notebook';

export async function runSuite151(): Promise<void> {
  console.log('\n[Suite 151] Native Notebook (notebook.worker) Tests:');

  const kernel = new PersistentNotebookKernel();

  // 151.1: Persistent globals across cells
  const res1 = await kernel.executeCell('cell-1', 'x = 100\ny = 200\nprint("assigned")');
  assert.equal(res1.status, 'success');
  assert.ok(res1.stdout.includes('assigned'));

  const res2 = await kernel.executeCell('cell-2', 'print(x + y)');
  assert.equal(res2.status, 'success');
  assert.equal(res2.stdout.trim(), '300');
  console.log('  ✓ 151.1 Cell 1 defines x, y; Cell 2 accesses them with persistent globals (300)');

  // 151.2: Cell timeout does not restart the kernel; variables preserved
  const timeoutRes = await kernel.executeCell('cell-slow', 'while True:\n    pass', 50);
  assert.equal(timeoutRes.status, 'timeout');
  assert.ok(timeoutRes.message?.includes('variables preserved'));

  // Test that x is still preserved!
  const res3 = await kernel.executeCell('cell-3', 'print(x)');
  assert.equal(res3.status, 'success');
  assert.equal(res3.stdout.trim(), '100');
  console.log('  ✓ 151.2 Cell timeout aborts gracefully; variables remain preserved');

  // 151.3: Explicit RESTART_KERNEL clears variables
  const restartRes = kernel.restartKernel();
  assert.equal(restartRes.type, 'KERNEL_RESTARTED');
  assert.equal(restartRes.variablesLost, true);

  const stateAfterRestart = kernel.getState();
  assert.equal(stateAfterRestart.variableNames.length, 0);
  console.log('  ✓ 151.3 RESTART_KERNEL clears variables and confirms variablesLost: true');

  // 151.4: notebook.worker is completely isolated from pyodide.worker
  const workerPath = path.resolve('src/workers/notebook.worker.ts');
  const workerContent = fs.readFileSync(workerPath, 'utf-8');
  assert.equal(
    workerContent.includes('pyodide.worker'),
    false,
    'notebook.worker.ts must never import pyodide.worker.ts'
  );
  console.log('  ✓ 151.4 notebook.worker is isolated (0 references to pyodide.worker.ts)');

  // 151.5: Native .polyglot-notebook export/import round-trip
  const testNotebook: Notebook = {
    id: 'nb-test-1',
    name: 'Research Notebook',
    createdAt: '2026-11-02T00:00:00Z',
    updatedAt: '2026-11-02T00:00:00Z',
    cells: [
      {
        id: 'c-1',
        code: 'a = 1',
        output: '1',
        status: 'success',
        durationMs: 12,
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
    ],
  };

  const polyglotStr = exportToPolyglotNotebook(testNotebook);
  const reimportedPolyglot = importFromPolyglotNotebook(polyglotStr);
  assert.equal(reimportedPolyglot.id, testNotebook.id);
  assert.equal(reimportedPolyglot.cells.length, 1);
  assert.equal(reimportedPolyglot.cells[0].code, 'a = 1');
  console.log('  ✓ 151.5 Native .polyglot-notebook format serializes and round-trips cleanly');

  // 151.6: Jupyter .ipynb nbformat v4 export/import
  const ipynbStr = exportToIpynb(testNotebook);
  const parsedIpynb = JSON.parse(ipynbStr);
  assert.equal(parsedIpynb.nbformat, 4);
  assert.equal(parsedIpynb.cells[0].cell_type, 'code');
  assert.equal(parsedIpynb.cells[0].execution_count, 1);

  const reimportedIpynb = importFromIpynb(ipynbStr, 'Imported Research');
  assert.equal(reimportedIpynb.cells.length, 1);
  assert.equal(reimportedIpynb.cells[0].code, 'a = 1');
  console.log('  ✓ 151.6 Jupyter .ipynb nbformat v4 export and import verified');
}
