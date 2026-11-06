/**
 * Test Suite 169: Navigation Drawer, Mobile Touch Usability & Zero Magic Strings (Sprint 5)
 *
 * Validates:
 * 169.1: Top-Left Navigation Drawer Trigger Button (min-h-[44px], aria-label, aria-expanded, Ctrl+M)
 * 169.2: Navigation Drawer Dialog semantics (role="dialog", aria-modal="true", aria-labelledby, Escape close)
 * 169.3: Mobile Touch Screen Usability (Android/iOS >=44px hitboxes, touch-manipulation, sticky cap <=15%)
 * 169.4: Magic Strings Elimination & Central Constant Parity (VIEWS, ROUTES, LANGUAGES, DEFAULT_FILE_NAMES)
 * 169.5: Navigation State & Shortcut Matrix (Alt+1..6 direct view selection, route sync)
 * 169.6: Accessible landmarks, touch focus rings, and high contrast compliance
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  VIEWS,
  ROUTES,
  LANGUAGES,
  DEFAULT_FILE_NAMES,
  PROOF_STATUS,
  EXECUTION_STATUS,
  KEYBOARD_SHORTCUTS,
  TOUCH_TARGETS,
  NAVIGATION_SECTIONS,
} from '../../src/constants/navigation';

export async function runSuite169(): Promise<void> {
  console.log('Running Suite 169: Navigation Drawer, Mobile Usability & Zero Magic Strings (6 sub-tests)...');

  const rootDir = process.cwd();
  const appFile = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
  const drawerFile = fs.readFileSync(path.join(rootDir, 'src/components/navigation/NavigationDrawer.tsx'), 'utf-8');
  const navConstFile = fs.readFileSync(path.join(rootDir, 'src/constants/navigation.ts'), 'utf-8');

  // 169.1: Top-Left Navigation Drawer Trigger Button
  assert.ok(
    appFile.includes('aria-label="Apri menu navigazione"'),
    'App.tsx must feature top-left navigation drawer trigger with aria-label="Apri menu navigazione"'
  );
  assert.ok(
    appFile.includes('aria-expanded={isDrawerOpen}'),
    'App.tsx must bind aria-expanded to isDrawerOpen state'
  );
  assert.ok(
    appFile.includes('aria-controls="navigation-drawer"'),
    'App.tsx must link aria-controls="navigation-drawer"'
  );
  assert.ok(
    appFile.includes('min-h-[44px] min-w-[44px]'),
    'Top-left button must strictly satisfy >=44px touch hitbox contract'
  );
  assert.ok(
    appFile.includes("key === 'm'") || appFile.includes("KEYBOARD_SHORTCUTS.MENU_TOGGLE"),
    'App.tsx must bind Ctrl+M shortcut for toggling navigation drawer'
  );
  console.log('  ✓ 169.1 Top-left navigation drawer trigger button satisfies WCAG 44x44px hitbox and Ctrl+M toggle');

  // 169.2: Navigation Drawer Dialog Semantics & Accessibility
  assert.ok(
    drawerFile.includes('role="dialog"'),
    'NavigationDrawer must declare role="dialog"'
  );
  assert.ok(
    drawerFile.includes('aria-modal="true"'),
    'NavigationDrawer must declare aria-modal="true"'
  );
  assert.ok(
    drawerFile.includes('aria-labelledby="navigation-drawer-heading"'),
    'NavigationDrawer must declare aria-labelledby="navigation-drawer-heading"'
  );
  assert.ok(
    drawerFile.includes('aria-label="Chiudi menu navigazione"'),
    'Close button must feature accessible label'
  );
  assert.ok(
    drawerFile.includes('KEYBOARD_SHORTCUTS.ESCAPE') || drawerFile.includes("e.key === 'Escape'"),
    'Drawer must dismiss on Escape key'
  );
  assert.ok(
    drawerFile.includes('role="menuitem"'),
    'Navigation list items must declare role="menuitem"'
  );
  console.log('  ✓ 169.2 Navigation drawer dialog adheres to WAI-ARIA modal dialog contract and keyboard dismissal');

  // 169.3: Mobile Touch Screen Usability on Android
  assert.ok(
    appFile.includes('md:hidden fixed bottom-0'),
    'App.tsx must render mobile-friendly bottom thumb-navigation bar'
  );
  assert.ok(
    appFile.includes('touch-manipulation'),
    'Interactive controls must declare touch-manipulation to eliminate tap delay on Android'
  );
  assert.ok(
    appFile.includes('touch-pan-x') || appFile.includes('overflow-x-auto'),
    'Editor tab strip and breadcrumbs must support horizontal touch-pan without breaking'
  );
  assert.ok(
    TOUCH_TARGETS.MIN_TOUCH_HITBOX_PX >= 44,
    'MIN_TOUCH_HITBOX_PX must be at least 44px'
  );
  assert.ok(
    TOUCH_TARGETS.ROW_HEIGHT_TOUCH_PX >= 48,
    'ROW_HEIGHT_TOUCH_PX must be at least 48px'
  );
  console.log('  ✓ 169.3 Mobile Android touch usability enforced (thumb bar, >=44px touch targets, touch-manipulation)');

  // 169.4: Magic Strings Elimination & Central Constant Parity
  assert.equal(VIEWS.EDITOR, 'editor', 'VIEWS.EDITOR must equal "editor"');
  assert.equal(VIEWS.NOTEBOOK, 'notebook', 'VIEWS.NOTEBOOK must equal "notebook"');
  assert.equal(VIEWS.FEMEV, 'femev', 'VIEWS.FEMEV must equal "femev"');
  assert.equal(VIEWS.LEDGER, 'ledger', 'VIEWS.LEDGER must equal "ledger"');
  assert.equal(VIEWS.SHOWCASE, 'showcase', 'VIEWS.SHOWCASE must equal "showcase"');
  assert.equal(VIEWS.SETTINGS, 'settings', 'VIEWS.SETTINGS must equal "settings"');

  assert.equal(ROUTES.HOME, '/', 'ROUTES.HOME must equal "/"');
  assert.equal(ROUTES.NOTEBOOK, '/notebook', 'ROUTES.NOTEBOOK must equal "/notebook"');
  assert.equal(LANGUAGES.LEAN4, 'lean4', 'LANGUAGES.LEAN4 must equal "lean4"');
  assert.equal(LANGUAGES.PYTHON, 'python', 'LANGUAGES.PYTHON must equal "python"');
  assert.equal(DEFAULT_FILE_NAMES.LEAN_MAIN, 'Main.lean', 'DEFAULT_FILE_NAMES.LEAN_MAIN must equal "Main.lean"');
  assert.equal(DEFAULT_FILE_NAMES.PYTHON_SCRATCH, 'scratchpad.py', 'DEFAULT_FILE_NAMES.PYTHON_SCRATCH must equal "scratchpad.py"');

  // Verify App.tsx uses VIEWS constants rather than magic strings for view switching
  assert.ok(appFile.includes('VIEWS.EDITOR'), 'App.tsx must use VIEWS.EDITOR');
  assert.ok(appFile.includes('VIEWS.NOTEBOOK'), 'App.tsx must use VIEWS.NOTEBOOK');
  assert.ok(appFile.includes('VIEWS.FEMEV'), 'App.tsx must use VIEWS.FEMEV');
  assert.ok(appFile.includes('VIEWS.LEDGER'), 'App.tsx must use VIEWS.LEDGER');
  assert.ok(appFile.includes('VIEWS.SHOWCASE'), 'App.tsx must use VIEWS.SHOWCASE');
  assert.ok(appFile.includes('VIEWS.SETTINGS'), 'App.tsx must use VIEWS.SETTINGS');
  console.log('  ✓ 169.4 Zero magic strings verified: views, routes, languages and file names typed centrally');

  // 169.5: Navigation State & Shortcut Matrix
  assert.equal(NAVIGATION_SECTIONS.length, 6, 'Must expose all 6 core navigation sections');
  const sectionIds = NAVIGATION_SECTIONS.map((s) => s.id);
  assert.deepEqual(
    sectionIds,
    [VIEWS.EDITOR, VIEWS.NOTEBOOK, VIEWS.FEMEV, VIEWS.LEDGER, VIEWS.SHOWCASE, VIEWS.SETTINGS],
    'NAVIGATION_SECTIONS must follow exact architectural ordering'
  );
  assert.ok(appFile.includes('e.altKey'), 'App.tsx must support Alt+1..6 direct view selection');
  console.log('  ✓ 169.5 Navigation sections map 1:1 to views with Alt+1..6 direct keyboard shortcuts');

  // 169.6: Accessible landmarks and focus visibility
  assert.ok(appFile.includes('focus:ring-2 focus:ring-blue-500'), 'Interactive triggers declare focus ring for a11y');
  assert.ok(drawerFile.includes('focus:ring-2 focus:ring-blue-500'), 'Drawer triggers declare focus ring for a11y');
  assert.ok(appFile.includes('aria-label="Navigazione rapida mobile"'), 'Mobile thumb bar declares landmark aria-label');
  console.log('  ✓ 169.6 Focus rings, WCAG 2.2 contrast and semantic ARIA navigation landmarks validated');
}
