/**
 * Test Suite 132: Yjs Lazy Load & Monaco Adapter (Phase 11.2, Sprint 11.2.5)
 */

import assert from 'node:assert/strict';
import {
  MonacoYjsAdapter,
  Y_MONACO_PINNED_VERSION,
} from '../../src/services/collaboration/monaco-yjs-adapter';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite132(): Promise<void> {
  console.log('\n--- Test Suite 132: Yjs Lazy Load & Monaco Adapter ---');

  // 132.1: Monaco adapter pinned version check
  assert.equal(Y_MONACO_PINNED_VERSION, '0.1.6');
  assert.equal(MonacoYjsAdapter.VERSION, '0.1.6');
  console.log('  ✓ 132.1 Pinned version: y-monaco adapter pinned to 0.1.6');

  // 132.2: Bundle isolation when ENABLE_YJS_COLLABORATION=false (no-op binding)
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_YJS_COLLABORATION'), false);
  const mockModel = {
    getValue: () => 'def foo := 1',
    setValue: (_val: string) => {},
  };
  const noopBinding = MonacoYjsAdapter.bindMonacoEditor(mockModel, {
    docId: 'Main.lean',
    userName: 'Tester',
  });
  assert.equal(noopBinding.isBound, false, 'Should be unbound when flag is disabled');
  assert.equal(noopBinding.docId, 'Main.lean');
  noopBinding.destroy();
  console.log('  ✓ 132.2 Bundle isolation: returns safe no-op handle when flag is disabled');

  // 132.3: Active binding when ENABLE_YJS_COLLABORATION=true
  featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
  try {
    const activeBinding = MonacoYjsAdapter.bindMonacoEditor(mockModel, {
      docId: 'Main.lean',
      userName: 'Collaborator',
    });
    assert.equal(activeBinding.isBound, true, 'Should bind when flag is enabled');
    assert.equal(activeBinding.version, '0.1.6');
    activeBinding.destroy();
    console.log('  ✓ 132.3 Active binding: successfully initializes CRDT binding when enabled');
  } finally {
    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', false);
  }
}
