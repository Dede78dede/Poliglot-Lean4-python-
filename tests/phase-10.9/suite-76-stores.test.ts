import assert from 'node:assert/strict';
import { ExternalStoreBase } from '../../src/services/stores/external-store-base';
import { commandRegistry } from '../../src/services/navigation/command-registry';
import { contextKeyService } from '../../src/services/navigation/context-key-service';
import { statusBarRegistry } from '../../src/services/status-bar/status-bar-registry';
import { mcpServerRegistry } from '../../src/services/mcp/mcp-server-registry';
import { mcpClientRegistry } from '../../src/services/mcp/mcp-client-registry';
import { semanticSearchRegistry } from '../../src/services/search/semantic-search-provider';
import { tokenBudgetManager } from '../../src/services/ai/token-budget-manager';
import { llmRouter } from '../../src/services/ai/llm-router';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

class TestSyncStore extends ExternalStoreBase<{ count: number }> {
  public value = 0;
  constructor(multiTabSync: boolean) {
    super({ id: 'testSyncStore', multiTabSync });
  }
  public increment(): void {
    this.value++;
    this.notify();
  }
  protected computeSnapshot(): { count: number } {
    return { count: this.value };
  }
}

export async function runSuite76(): Promise<void> {
  console.log('\n--- Test Suite 76: Unified External Store Base ---');

  // 76.1: ExternalStoreBase caches getSnapshot (same object reference until notify())
  const store = new TestSyncStore(false);
  const snap1 = store.getSnapshot();
  const snap2 = store.getSnapshot();
  assert.equal(snap1, snap2, 'Snapshot must be cached and return identical reference before mutation');
  store.increment();
  const snap3 = store.getSnapshot();
  assert.notEqual(snap1, snap3, 'Snapshot must return new reference after notify()');
  assert.equal(snap3.count, 1);
  console.log('  ✓ 76.1 ExternalStoreBase guarantees snapshot reference stability between notifications');

  // 76.2: multiTabSync: true propagates invalidation across simulated remote channel
  const syncStore = new TestSyncStore(true);
  let invalidatedCount = 0;
  const unsub = syncStore.subscribe(() => {
    invalidatedCount++;
  });
  const beforeRemote = syncStore.getSnapshot();
  syncStore.simulateRemoteInvalidation();
  assert.equal(invalidatedCount, 1, 'Subscriber must be notified on remote invalidation');
  assert.notEqual(beforeRemote, syncStore.getSnapshot(), 'Cache must be invalidated after remote signal');
  unsub();
  console.log('  ✓ 76.2 multiTabSync: true propagates invalidation across tabs');

  // 76.3: multiTabSync: false does not enable broadcast channel
  const localStore = new TestSyncStore(false);
  assert.equal(localStore.isMultiTabSyncEnabled(), false);
  console.log('  ✓ 76.3 multiTabSync: false preserves tab-local semantics without cross-tab broadcast');

  // 76.4: All verified stores extend ExternalStoreBase
  assert.ok(commandRegistry instanceof ExternalStoreBase, 'commandRegistry must extend ExternalStoreBase');
  assert.ok(contextKeyService instanceof ExternalStoreBase, 'contextKeyService must extend ExternalStoreBase');
  assert.ok(statusBarRegistry instanceof ExternalStoreBase, 'statusBarRegistry must extend ExternalStoreBase');
  assert.ok(mcpServerRegistry instanceof ExternalStoreBase, 'mcpServerRegistry must extend ExternalStoreBase');
  assert.ok(mcpClientRegistry instanceof ExternalStoreBase, 'mcpClientRegistry must extend ExternalStoreBase');
  assert.ok(semanticSearchRegistry instanceof ExternalStoreBase, 'semanticSearchRegistry must extend ExternalStoreBase');
  assert.ok(tokenBudgetManager instanceof ExternalStoreBase, 'tokenBudgetManager must extend ExternalStoreBase');
  assert.ok(llmRouter instanceof ExternalStoreBase, 'llmRouter must extend ExternalStoreBase');
  assert.ok(featureFlagRegistry instanceof ExternalStoreBase, 'featureFlagRegistry must extend ExternalStoreBase');
  console.log('  ✓ 76.4 All stores extend ExternalStoreBase with unified subscription and caching');
}
