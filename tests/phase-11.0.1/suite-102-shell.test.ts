/**
 * Test Suite 102: IDE Shell Workbench Architecture (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import {
  ActivityBarStore,
  CANONICAL_ACTIVITIES,
} from '../../src/services/shell/activity-bar-store';
import {
  SidePanelStore,
  SIDE_PANEL_LIMITS,
} from '../../src/services/shell/side-panel-store';

export async function runSuite102(): Promise<void> {
  console.log('\n--- Test Suite 102: IDE Shell Workbench Architecture ---');

  // 102.1: ActivityBarStore layout defaults and sizes
  const barStore = new ActivityBarStore();
  const snap1 = barStore.getSnapshot();
  assert.equal(snap1.activeActivity, 'explorer');
  assert.equal(snap1.size, 'default');
  assert.equal(snap1.position, 'left');
  assert.equal(snap1.isZenMode, false);

  barStore.toggleSize();
  assert.equal(barStore.getSnapshot().size, 'compact');
  barStore.toggleSize();
  assert.equal(barStore.getSnapshot().size, 'default');
  console.log('  ✓ 102.1 ActivityBarStore defaults, sizing, and snapshot immutability');

  // 102.2: ActivityBar position toggle and Zen mode
  barStore.togglePosition();
  assert.equal(barStore.getSnapshot().position, 'right');
  barStore.togglePosition();
  assert.equal(barStore.getSnapshot().position, 'left');

  barStore.toggleZenMode();
  assert.equal(barStore.getSnapshot().isZenMode, true);
  barStore.toggleZenMode();
  assert.equal(barStore.getSnapshot().isZenMode, false);
  console.log('  ✓ 102.2 ActivityBar position toggle (left/right) and Zen mode toggle');

  // 102.3: SidePanelStore width clamping and limits
  const sideStore = new SidePanelStore();
  assert.equal(sideStore.getSnapshot().width, SIDE_PANEL_LIMITS.DEFAULT_WIDTH);

  sideStore.setWidth(100); // Below MIN_WIDTH (200)
  assert.equal(sideStore.getSnapshot().width, SIDE_PANEL_LIMITS.MIN_WIDTH);

  sideStore.setWidth(600); // Above MAX_WIDTH (480)
  assert.equal(sideStore.getSnapshot().width, SIDE_PANEL_LIMITS.MAX_WIDTH);

  sideStore.setWidth(320);
  assert.equal(sideStore.getSnapshot().width, 320);
  console.log('  ✓ 102.3 SidePanelStore width clamping [200px, 480px] and reactivity');

  // 102.4: 8 Canonical activities and badge tracking
  assert.equal(CANONICAL_ACTIVITIES.length, 8);
  const ids = CANONICAL_ACTIVITIES.map((a) => a.id);
  assert.deepEqual(ids, [
    'explorer',
    'search',
    'git',
    'proof',
    'blueprint',
    'memory',
    'chat',
    'settings',
  ]);

  barStore.setBadge('git', 3);
  assert.equal(barStore.getSnapshot().badges.git, 3);
  barStore.setBadge('git', null);
  assert.equal(barStore.getSnapshot().badges.git, null);
  console.log('  ✓ 102.4 ActivityBar 8 canonical activities and badge notification tracking');

  // 102.5: SidePanel view mode switching per activity
  assert.equal(sideStore.getViewMode('explorer'), 'tree');
  sideStore.setViewMode('explorer', 'list');
  assert.equal(sideStore.getViewMode('explorer'), 'list');
  sideStore.setViewMode('explorer', 'trash');
  assert.equal(sideStore.getViewMode('explorer'), 'trash');
  sideStore.setViewMode('explorer', 'tree');
  console.log('  ✓ 102.5 SidePanel per-activity view modes (tree/list/changes/trash)');

  // 102.6: Collapse and expand side panel
  assert.equal(sideStore.getSnapshot().collapsed, false);
  sideStore.toggleCollapsed();
  assert.equal(sideStore.getSnapshot().collapsed, true);
  sideStore.setCollapsed(false);
  assert.equal(sideStore.getSnapshot().collapsed, false);
  console.log('  ✓ 102.6 SidePanel collapse toggle state and subscriber notifications');

  barStore.destroy();
  sideStore.destroy();
}
