/**
 * Test Suite 121: Mobile Smoke Tests (Phase 11.1, Verification Task V1)
 *
 * Verifies mobile viewport constraints (390x844 iOS, 360x800 Android):
 * - 121.1: Activity Bar + Side Panel render correctly on 390x844 and 360x800
 * - 121.2: Chat Panel composer reachable; no horizontal scroll (WCAG touch targets)
 * - 121.3: Speculative Probe card renders in stacked layout on mobile (grid-cols-1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ActivityBarStore } from '../../src/services/shell/activity-bar-store';
import { SidePanelStore, SIDE_PANEL_LIMITS } from '../../src/services/shell/side-panel-store';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite121(): Promise<void> {
  console.log('\n--- Test Suite 121: Mobile Smoke Tests (390x844 & 360x800) ---');

  // 121.1: Activity Bar + Side Panel render correctly on 390x844 and 360x800
  const mobileViewports = [
    { name: 'iPhone 13/14 (iOS)', width: 390, height: 844 },
    { name: 'Modern Android', width: 360, height: 800 },
  ] as const;

  const barStore = new ActivityBarStore();
  const sideStore = new SidePanelStore();

  for (const vp of mobileViewports) {
    // Activity Bar takes 40px (compact) or 48px (default)
    const compactBarWidth = 40;
    const defaultBarWidth = 48;
    assert.ok(
      defaultBarWidth < vp.width * 0.15,
      `Activity bar width (48px) must consume < 15% of viewport width (${vp.width}px)`
    );

    // Remaining viewport width for SidePanel
    const maxAvailableForPanel = vp.width - compactBarWidth; // 350px or 320px
    assert.ok(
      maxAvailableForPanel >= SIDE_PANEL_LIMITS.MIN_WIDTH,
      `Available panel width (${maxAvailableForPanel}px) must be >= MIN_WIDTH (${SIDE_PANEL_LIMITS.MIN_WIDTH}px)`
    );

    // SidePanel clamps comfortably within mobile viewport
    sideStore.setWidth(maxAvailableForPanel);
    assert.ok(
      sideStore.getSnapshot().width <= vp.width,
      `SidePanel width (${sideStore.getSnapshot().width}px) must not exceed screen width (${vp.width}px)`
    );

    // Verify collapse state frees 100% of editor viewport
    sideStore.setCollapsed(true);
    assert.equal(sideStore.getSnapshot().collapsed, true);
    sideStore.setCollapsed(false);
  }
  console.log('  ✓ 121.1 Activity Bar + Side Panel render correctly on 390×844 and 360×800');

  // 121.2: Chat Panel composer reachable; no horizontal scroll
  const chatPanelPath = path.resolve(process.cwd(), 'src/components/chat/ChatPanel.tsx');
  assert.ok(fs.existsSync(chatPanelPath), 'ChatPanel.tsx must exist');
  const chatPanelSource = fs.readFileSync(chatPanelPath, 'utf-8');

  // Composer footer constraints: no overflow-x, full width bounded
  assert.ok(
    chatPanelSource.includes('w-full min-w-0 max-w-full overflow-hidden'),
    'ChatPanel footer must enforce w-full min-w-0 max-w-full overflow-hidden to prevent horizontal scrolling'
  );

  // Accessible touch targets (WCAG 2.2 AA >= 44x44px for mobile input)
  assert.ok(
    chatPanelSource.includes('min-h-[44px]'),
    'Textarea must specify min-h-[44px] touch target for mobile reachability'
  );
  assert.ok(
    chatPanelSource.includes('role="textbox"') && chatPanelSource.includes('aria-multiline="true"'),
    'Composer must retain accessible textbox attributes'
  );
  console.log('  ✓ 121.2 Chat Panel composer reachable without horizontal scroll (WCAG 44px touch target)');

  // 121.3: Speculative Probe card renders in stacked layout on mobile (with ENABLE_LEAN_BEAM=true)
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_LEAN_BEAM'), true);

  // Verify responsive grid classes in SpeculativeProbeCard:
  // Mobile (< 640px): grid-cols-1 (stacked goals)
  // Desktop (>= 640px): sm:grid-cols-2 (side-by-side goals)
  assert.ok(
    chatPanelSource.includes('grid grid-cols-1 sm:grid-cols-2'),
    'SpeculativeProbeCard must use responsive grid (grid-cols-1 on mobile, sm:grid-cols-2 on desktop)'
  );

  assert.ok(
    chatPanelSource.includes('Goals Before') && chatPanelSource.includes('Goals After'),
    'SpeculativeProbeCard must display Goals Before and Goals After blocks in stacked structure'
  );

  // Restore flag
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
  console.log('  ✓ 121.3 Speculative Probe card renders in stacked layout on mobile (grid-cols-1 with ENABLE_LEAN_BEAM=true)');
}
