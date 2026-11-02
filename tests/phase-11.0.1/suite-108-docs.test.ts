/**
 * Test Suite 108: Diátaxis Documentation & Architectural Integrity (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite108(): Promise<void> {
  console.log('\n--- Test Suite 108: Diátaxis Documentation & Architectural Integrity ---');

  // 108.1: docs/how-to/use-ide-shell.md exists and covers shell components
  const shellDocPath = path.resolve(process.cwd(), 'docs/how-to/use-ide-shell.md');
  assert.ok(fs.existsSync(shellDocPath), 'docs/how-to/use-ide-shell.md must exist');
  const shellDoc = fs.readFileSync(shellDocPath, 'utf8');
  assert.ok(shellDoc.includes('Activity Bar'));
  assert.ok(shellDoc.includes('Side Panel'));
  assert.ok(shellDoc.includes('Breadcrumbs'));
  assert.ok(shellDoc.includes('Diff Viewer'));
  assert.ok(shellDoc.includes('Ctrl+B'));
  assert.ok(shellDoc.includes('Zen Mode'));
  console.log('  ✓ 108.1 docs/how-to/use-ide-shell.md documents navigation, breadcrumbs, diff, and shortcuts');

  // 108.2: docs/how-to/use-file-manager.md exists and covers Windows-style file manager
  const fmDocPath = path.resolve(process.cwd(), 'docs/how-to/use-file-manager.md');
  assert.ok(fs.existsSync(fmDocPath), 'docs/how-to/use-file-manager.md must exist');
  const fmDoc = fs.readFileSync(fmDocPath, 'utf8');
  assert.ok(fmDoc.includes('Multi-Select'));
  assert.ok(fmDoc.includes('Inline Renaming'));
  assert.ok(fmDoc.includes('Drag-and-Drop'));
  assert.ok(fmDoc.includes('ZIP Archive Creation'));
  assert.ok(fmDoc.includes('Trash'));
  console.log('  ✓ 108.2 docs/how-to/use-file-manager.md documents multi-select, drag-drop, ZIP, and trash');

  // 108.3: docs/architecture/ide-shell.md and limitations.md update verification
  const archDocPath = path.resolve(process.cwd(), 'docs/architecture/ide-shell.md');
  assert.ok(fs.existsSync(archDocPath), 'docs/architecture/ide-shell.md must exist');
  const archDoc = fs.readFileSync(archDocPath, 'utf8');
  assert.ok(archDoc.includes('ExternalStoreBase'));
  assert.ok(archDoc.includes('ActivityBarStore'));
  assert.ok(archDoc.includes('SidePanelStore'));
  assert.ok(archDoc.includes('WCAG 2.2 AA'));

  const limitsDocPath = path.resolve(process.cwd(), 'docs/limitations.md');
  assert.ok(fs.existsSync(limitsDocPath), 'docs/limitations.md must exist');
  const limitsDoc = fs.readFileSync(limitsDocPath, 'utf8');
  assert.ok(limitsDoc.includes('Shell & File Manager Quotas'));
  assert.ok(limitsDoc.includes('50 MiB'));
  console.log('  ✓ 108.3 docs/architecture/ide-shell.md and limitations.md verified');
}
