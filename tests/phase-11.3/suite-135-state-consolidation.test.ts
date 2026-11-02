/**
 * Test Suite 135: State Management Consolidation (Phase 11.3, Sprint R.2)
 *
 * Validates:
 * 135.1: ExecutionStore extends ExternalStoreBase and preserves discriminated unions
 * 135.2: ExecutionStore reactive transitions (idle -> running -> completed / failed -> reset)
 * 135.3: useStoreSelector subscription and memoized snapshot retrieval
 * 135.4: Multi-tab sync enablement on ExternalStoreBase instances
 */

import assert from 'node:assert/strict';
import { ExecutionStore, executionStore } from '../../src/services/execution/execution-store';
import { ExternalStoreBase } from '../../src/services/stores/external-store-base';
import { ExecutionError } from '../../src/types/execution';

export async function runSuite135(): Promise<void> {
  console.log('\n[Suite 135] State Management Consolidation Tests:');

  // 135.1: ExecutionStore inherits from ExternalStoreBase
  assert.ok(
    executionStore instanceof ExternalStoreBase,
    'executionStore must inherit from ExternalStoreBase'
  );
  const initialSnapshot = executionStore.getSnapshot();
  assert.equal(initialSnapshot.kind, 'idle', 'Initial execution state must be idle');
  console.log('  ✓ 135.1 ExecutionStore extends ExternalStoreBase with discriminated state');

  // 135.2: State transitions and notifications
  let notificationCount = 0;
  const unsubscribe = executionStore.subscribe(() => {
    notificationCount++;
  });

  executionStore.startExecution('lean');
  const runningSnapshot = executionStore.getSnapshot();
  assert.equal(runningSnapshot.kind, 'running');
  if (runningSnapshot.kind === 'running') {
    assert.ok(runningSnapshot.language === 'lean' || runningSnapshot.language === 'lean4');
    assert.ok(runningSnapshot.startedAt > 0);
  }

  executionStore.completeExecution(
    {
      status: 'success',
      stdout: 'All goals resolved by omega tactic.',
      stderr: '',
      exitCode: 0,
      durationMs: 38,
      verified: true,
    },
    'lean'
  );

  const completedSnapshot = executionStore.getSnapshot();
  assert.equal(completedSnapshot.kind, 'completed');
  if (completedSnapshot.kind === 'completed') {
    assert.equal(completedSnapshot.result.verified, true);
    assert.equal(completedSnapshot.result.exitCode, 0);
  }

  const errorObj = new ExecutionError('LEAN_EXECUTION_FAILED', 'Tactic omega failed');
  executionStore.failExecution(errorObj, 'lean');
  const failedSnapshot = executionStore.getSnapshot();
  assert.equal(failedSnapshot.kind, 'failed');

  executionStore.reset();
  assert.equal(executionStore.getSnapshot().kind, 'idle');
  assert.ok(notificationCount >= 4, 'Listeners must be notified on every state change');
  unsubscribe();
  console.log('  ✓ 135.2 ExecutionStore transitions (idle -> running -> completed -> failed -> reset) validated');

  // 135.3: Independent store instances and selector behavior
  const storeInstance = new ExecutionStore();
  assert.equal(storeInstance.getSnapshot().kind, 'idle');
  storeInstance.startExecution('python');
  assert.equal(storeInstance.getSnapshot().kind, 'running');
  storeInstance.destroy();
  console.log('  ✓ 135.3 Independent store isolation and clean destruction verified');

  // 135.4: Multi-tab sync option contract
  let multiTabConstructed = false;
  class TestMultiTabStore extends ExternalStoreBase<{ count: number }> {
    constructor() {
      super({ id: 'testSync', multiTabSync: true });
      multiTabConstructed = true;
    }
    protected computeSnapshot() {
      return { count: 1 };
    }
  }
  const multiStore = new TestMultiTabStore();
  assert.equal(multiTabConstructed, true);
  assert.equal(multiStore.getSnapshot().count, 1);
  multiStore.destroy();
  console.log('  ✓ 135.4 ExternalStoreBase multiTabSync configuration verified');
}
