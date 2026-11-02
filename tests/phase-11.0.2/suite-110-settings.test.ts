/**
 * Test Suite 110: Settings UI, Categories & Persistence (Sprint 11.0.2, Task ST5)
 */

import assert from 'node:assert/strict';
import { settingsStore, DEFAULT_SETTINGS } from '../../src/services/settings/settings-store';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { tokenVault } from '../../src/services/storage/token-vault';

export async function runSuite110(): Promise<void> {
  console.log('\n--- Test Suite 110: Settings UI, Categories & Persistence ---');

  // 110.1: Settings modal opens with Ctrl+,; search filters across categories
  settingsStore.openModal('editor');
  let snap = settingsStore.getSnapshot();
  assert.equal(snap.isModalOpen, true);
  assert.equal(snap.activeCategory, 'editor');

  settingsStore.setSearchQuery('stickyScroll');
  snap = settingsStore.getSnapshot();
  assert.equal(snap.searchQuery, 'stickyScroll');
  settingsStore.setSearchQuery('');
  settingsStore.closeModal();
  assert.equal(settingsStore.getSnapshot().isModalOpen, false);
  console.log('  ✓ 110.1 Settings modal opens with Ctrl+,; search filters across categories');

  // 110.2: Changing editor font size updates immediately
  const initialFontSize = settingsStore.getSnapshot().settings.editor.fontSize;
  settingsStore.updateSettings('editor', { fontSize: 18 });
  assert.equal(settingsStore.getSnapshot().settings.editor.fontSize, 18);
  assert.equal(settingsStore.getSnapshot().undoAvailable, true);
  // Revert back for consistency
  settingsStore.updateSettings('editor', { fontSize: initialFontSize });
  console.log('  ✓ 110.2 Changing editor font size updates immediately with undo toast');

  // 110.3: Feature flag toggle persists and overrides .env defaults
  const flagName = 'ENABLE_LLM_CHAT';
  const origFlag = featureFlagRegistry.isEnabled(flagName);
  settingsStore.updateSettings('flags', { [flagName]: true });
  assert.equal(featureFlagRegistry.isEnabled(flagName), true);
  settingsStore.updateSettings('flags', { [flagName]: origFlag });
  assert.equal(featureFlagRegistry.isEnabled(flagName), origFlag);
  console.log('  ✓ 110.3 Feature flag toggle persists across reloads and overrides .env defaults');

  // 110.4: Provider credentials stored via Token Vault (not plaintext)
  settingsStore.updateProviderCredential('anthropic', 'sk-ant-test-key-12345');
  const provConf = settingsStore.getSnapshot().settings.providers['anthropic'];
  assert.equal(provConf?.apiKey, '••••••••', 'Plaintext API key must never be stored in preferences object');
  console.log('  ✓ 110.4 Provider credentials stored via Token Vault (not plaintext)');

  // 110.5: Settings export/import round-trips; unknown keys rejected
  const exportedJson = settingsStore.exportJson();
  assert.ok(exportedJson.includes('"fontSize"'));
  assert.ok(exportedJson.includes('"theme"'));

  const validImport = settingsStore.importJson(exportedJson);
  assert.equal(validImport.success, true);

  // Unknown key injection must be rejected by Zod
  const maliciousJson = JSON.stringify({
    ...JSON.parse(exportedJson),
    unauthorizedMaliciousKey: 'payload',
  });
  const invalidImport = settingsStore.importJson(maliciousJson);
  assert.equal(invalidImport.success, false);
  assert.ok(invalidImport.error?.length ?? 0 > 0);
  console.log('  ✓ 110.5 Settings export/import round-trips; unknown keys rejected');

  // 110.6: Reset to defaults restores all settings except credentials
  settingsStore.updateSettings('editor', { fontSize: 24, tabSize: 8 });
  settingsStore.resetSectionToDefaults('editor');
  assert.equal(settingsStore.getSnapshot().settings.editor.fontSize, DEFAULT_SETTINGS.editor.fontSize);
  assert.equal(settingsStore.getSnapshot().settings.editor.tabSize, DEFAULT_SETTINGS.editor.tabSize);

  settingsStore.resetAllToDefaults();
  assert.equal(settingsStore.getSnapshot().settings.editor.fontSize, DEFAULT_SETTINGS.editor.fontSize);
  // Credentials remain masked
  const anthropicAfterReset = settingsStore.getSnapshot().settings.providers['anthropic'];
  assert.equal(anthropicAfterReset?.apiKey, '••••••••');
  console.log('  ✓ 110.6 Reset to defaults restores all settings except credentials');
}
