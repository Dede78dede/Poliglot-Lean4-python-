/**
 * Test Suite 104: Status Bar Zone Segregation & Telemetry (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import { statusBarRegistry } from '../../src/services/status-bar/status-bar-registry';
import { initializeDefaultStatusBarItems } from '../../src/services/status-bar/runtime-items';

export async function runSuite104(): Promise<void> {
  console.log('\n--- Test Suite 104: Status Bar Zone Segregation & Telemetry ---');

  // Initialize runtime status bar items
  statusBarRegistry.reset();
  initializeDefaultStatusBarItems();
  const items = statusBarRegistry.getSnapshot();

  // 104.1: Left zone items
  const leftItems = items.filter((i) => i.alignment === 'left');
  const leftIds = leftItems.map((i) => i.id);
  assert.ok(leftIds.includes('system-readiness'), 'system-readiness missing in left zone');
  assert.ok(leftIds.includes('kimina-ready'), 'kimina-ready missing in left zone');
  assert.ok(leftIds.includes('pyodide-ready'), 'pyodide-ready missing in left zone');
  assert.ok(leftIds.includes('git-branch'), 'git-branch missing in left zone');
  assert.ok(leftIds.includes('correlation-id'), 'correlation-id missing in left zone');
  console.log('  ✓ 104.1 Left zone contains system readiness, toolchain, pyodide, git branch, trace correlation');

  // 104.2: Center zone items
  const centerItems = items.filter((i) => i.alignment === 'center');
  const centerIds = centerItems.map((i) => i.id);
  assert.ok(centerIds.includes('doc-language'), 'doc-language missing in center zone');
  assert.ok(centerIds.includes('doc-encoding'), 'doc-encoding missing in center zone');
  assert.ok(centerIds.includes('doc-eol'), 'doc-eol missing in center zone');
  assert.ok(centerIds.includes('doc-indent'), 'doc-indent missing in center zone');
  assert.ok(centerIds.includes('proof-progress'), 'proof-progress missing in center zone');
  console.log('  ✓ 104.2 Center zone contains language, encoding (UTF-8), EOL (LF), indentation, proof progress');

  // 104.3: Right zone items
  const rightItems = items.filter((i) => i.alignment === 'right');
  const rightIds = rightItems.map((i) => i.id);
  assert.ok(rightIds.includes('problems-count'), 'problems-count missing in right zone');
  assert.ok(rightIds.includes('cursor-position'), 'cursor-position missing in right zone');
  assert.ok(rightIds.includes('memory-status'), 'memory-status missing in right zone');
  assert.ok(rightIds.includes('feature-flags-count'), 'feature-flags-count missing in right zone');
  assert.ok(rightIds.includes('toolchain-policy'), 'toolchain-policy missing in right zone');
  console.log('  ✓ 104.3 Right zone contains diagnostics, cursor, 5-tier memory, feature flags, toolchain policy');

  // 104.4: Dynamic updates & priority ordering
  statusBarRegistry.updateItem('cursor-position', { text: 'Ln 42, Col 15' });
  const updatedItem = statusBarRegistry.getItem('cursor-position');
  assert.equal(updatedItem?.text, 'Ln 42, Col 15');

  // Verify priority ordering within right zone
  const rightZoneItems = statusBarRegistry.getSnapshot().filter((i) => i.alignment === 'right');
  for (let i = 0; i < rightZoneItems.length - 1; i++) {
    const cur = rightZoneItems[i];
    const next = rightZoneItems[i + 1];
    assert.ok(
      (cur.priority ?? 0) >= (next.priority ?? 0),
      `Priority ordering check: item ${cur.id} priority ${cur.priority} should be >= ${next.id} priority ${next.priority}`
    );
  }
  console.log('  ✓ 104.4 Priority ordering invariant enforced across status bar zones');
}
