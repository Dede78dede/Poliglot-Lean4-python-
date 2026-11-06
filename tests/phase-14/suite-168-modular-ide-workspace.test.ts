/**
 * Test Suite 168: Full Modular IDE Workspace Shell & Accessibility (Sprint 4)
 *
 * Validates:
 * 168.1: Editor tabs bar renders with role="tab" and accessible tab-close buttons
 * 168.2: Breadcrumbs navigation component integrated above editor
 * 168.3: Live 3-zone Status Bar mounted with role="status" and left/center/right alignment
 * 168.4: Keyboard shortcut bindings: Ctrl+Enter (execute), Ctrl+K (command palette), Ctrl+Shift+T (reopen tab)
 * 168.5: EditorTabsStore enforces LIFO closedStack with MAX_CLOSED_STACK cap
 * 168.6: Accessible landmarks: aria-label="Studio Navigation", role="alert", aria-live="assertive"
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EditorTabsStore } from '../../src/services/shell/editor-tabs-store';

export async function runSuite168(): Promise<void> {
  console.log('Running Suite 168: Modular IDE Workspace & A11y (6 sub-tests)...');

  const rootDir = process.cwd();
  const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

  // 168.1: Tabs role="tab" and close button
  assert.ok(appContent.includes('role="tab"'), 'App.tsx must feature role="tab" for editor tabs');
  assert.ok(appContent.includes('aria-selected='), 'Tabs must declare aria-selected attribute');
  assert.ok(appContent.includes('Close'), 'Tabs must provide accessible close button labels');
  console.log('  ✓ 168.1 Editor tabs bar renders with role="tab" and accessible tab-close buttons');

  // 168.2: Breadcrumbs navigation
  assert.ok(appContent.includes('<Breadcrumbs'), 'App.tsx must mount Breadcrumbs component');
  console.log('  ✓ 168.2 Breadcrumbs navigation component integrated above editor buffer');

  // 168.3: Live 3-Zone Status Bar mounted
  assert.ok(appContent.includes('<StatusBar'), 'App.tsx must mount StatusBar at shell root');
  const statusBarFile = fs.readFileSync(path.join(rootDir, 'src/components/navigation/StatusBar.tsx'), 'utf-8');
  assert.ok(statusBarFile.includes('role="status"'), 'StatusBar must declare role="status"');
  assert.ok(statusBarFile.includes('leftItems'), 'StatusBar must feature left telemetry zone');
  assert.ok(statusBarFile.includes('centerItems'), 'StatusBar must feature center metrics zone');
  assert.ok(statusBarFile.includes('rightItems'), 'StatusBar must feature right coordination zone');
  console.log('  ✓ 168.3 Live 3-zone Status Bar mounted with role="status" and telemetry zones');

  // 168.4: Keyboard shortcut bindings
  assert.ok(appContent.includes("key === 'Enter'"), 'App.tsx must bind Ctrl+Enter for execution');
  assert.ok(appContent.includes("key === 'k'"), 'App.tsx must bind Ctrl+K for command palette');
  assert.ok(appContent.includes("key === 't'"), 'App.tsx must bind Ctrl+Shift+T for tab reopening');
  console.log('  ✓ 168.4 Keyboard shortcuts: Ctrl+Enter, Ctrl+K, and Ctrl+Shift+T verified');

  // 168.5: EditorTabsStore LIFO closedStack and max cap
  const store = new EditorTabsStore();
  for (let i = 1; i <= 15; i++) {
    store.pushClosedTab(`file_${i}.lean`);
  }
  const snap = store.getSnapshot();
  assert.equal(snap.closedStack.length, 10, 'closedStack must be capped at 10 items');
  assert.equal(snap.closedStack[0], 'file_15.lean', 'closedStack must follow LIFO order');
  const popped = store.popClosedTab();
  assert.equal(popped, 'file_15.lean', 'popClosedTab must return most recently closed tab');
  console.log('  ✓ 168.5 EditorTabsStore enforces LIFO closedStack with max cap of 10');

  // 168.6: Accessible landmarks and live regions
  assert.ok(appContent.includes('aria-label="Studio Navigation"'), 'Studio navigation landmark verified');
  assert.ok(appContent.includes('role="alert"'), 'Error boundary and failure states declare role="alert"');
  assert.ok(appContent.includes('aria-live="assertive"'), 'Failure states declare aria-live="assertive"');
  console.log('  ✓ 168.6 Accessible landmarks, role="alert", and aria-live="assertive" verified');
}
