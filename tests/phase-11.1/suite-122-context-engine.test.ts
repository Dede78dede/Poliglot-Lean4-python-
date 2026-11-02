/**
 * Test Suite 122: Context Engine Flag & Completions (Phase 11.1, Verification Task V2)
 *
 * Verifies optional context-engine behavior under feature flag lifecycle:
 * - 122.1: ENABLE_CONTEXT_ENGINE=false -> Monaco fallback works
 * - 122.2: ENABLE_CONTEXT_ENGINE=true -> @enjoys/context-engine completions work (97 languages, 29 providers)
 * - 122.3: Bundle delta <= 92 kB lazy-loaded
 */

import assert from 'node:assert/strict';
import {
  contextEngineService,
  CONTEXT_ENGINE_LANGUAGES,
  CONTEXT_ENGINE_PROVIDERS,
} from '../../src/services/editor/context-engine-service';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite122(): Promise<void> {
  console.log('\n--- Test Suite 122: Context Engine Flag & Completions ---');

  // 122.1: ENABLE_CONTEXT_ENGINE=false -> Monaco fallback works
  featureFlagRegistry.set('ENABLE_CONTEXT_ENGINE', false);
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_CONTEXT_ENGINE'), false);

  const fallbackStatus = await contextEngineService.getEngineStatus();
  assert.equal(fallbackStatus.enabled, false);
  assert.equal(fallbackStatus.activeProvider, 'monaco-vfs-fallback');
  assert.equal(fallbackStatus.supportedLanguagesCount, 2);
  assert.equal(fallbackStatus.supportedProvidersCount, 1);

  const pyFallback = await contextEngineService.getCompletions('def solve():', 'python');
  assert.ok(pyFallback.length > 0, 'Monaco fallback must yield snippet completions for Python');
  assert.ok(pyFallback.every((c) => c.source === 'monaco-vfs-fallback'));

  const leanFallback = await contextEngineService.getCompletions('theorem add_comm :', 'lean4');
  assert.ok(leanFallback.length > 0, 'Monaco fallback must yield snippet completions for Lean 4');
  assert.ok(leanFallback.every((c) => c.source === 'monaco-vfs-fallback'));
  console.log('  ✓ 122.1 ENABLE_CONTEXT_ENGINE=false -> Monaco fallback works with snippet completions');

  // 122.2: ENABLE_CONTEXT_ENGINE=true -> @enjoys/context-engine completions work (97 languages, 29 providers)
  featureFlagRegistry.set('ENABLE_CONTEXT_ENGINE', true);
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_CONTEXT_ENGINE'), true);

  const enabledStatus = await contextEngineService.getEngineStatus();
  assert.equal(enabledStatus.enabled, true);
  assert.equal(enabledStatus.activeProvider, 'enjoys-context-engine');
  assert.equal(enabledStatus.supportedLanguagesCount, 97, 'Must support exactly 97 languages');
  assert.equal(enabledStatus.supportedProvidersCount, 29, 'Must support exactly 29 providers');
  assert.equal(CONTEXT_ENGINE_LANGUAGES.length, 97);
  assert.equal(CONTEXT_ENGINE_PROVIDERS.length, 29);

  // Test completions across various supported languages and providers
  const testCases = [
    { code: 'def solve():', language: 'python', provider: 'deepseek' },
    { code: 'theorem test : 1 = 1 := by', language: 'lean4', provider: 'copilot' },
    { code: 'fn verify() -> bool', language: 'rust', provider: 'cursor' },
    { code: 'export function run()', language: 'typescript', provider: 'tabnine' },
  ] as const;

  for (const tc of testCases) {
    const completions = await contextEngineService.getCompletions(tc.code, tc.language, tc.provider);
    assert.ok(completions.length >= 2, `Expected completions for ${tc.language} via ${tc.provider}`);
    assert.equal(completions[0]?.source, 'enjoys-context-engine');
    assert.ok(completions[0]?.insertText.includes('@enjoys/context-engine'));
  }
  console.log('  ✓ 122.2 ENABLE_CONTEXT_ENGINE=true -> @enjoys/context-engine completions work (97 languages, 29 providers)');

  // 122.3: Bundle delta <= 92 kB lazy-loaded
  assert.equal(enabledStatus.lazyLoaded, true, 'Engine must be lazy-loaded');
  assert.ok(
    enabledStatus.bundleDeltaKb !== undefined && enabledStatus.bundleDeltaKb <= 92,
    `Bundle delta (${enabledStatus.bundleDeltaKb} kB) must be <= 92 kB`
  );
  assert.ok(
    contextEngineService.lazyBundleDeltaKb <= 92,
    `Service declared delta (${contextEngineService.lazyBundleDeltaKb} kB) must be <= 92 kB`
  );

  // Restore flag to safe default (false)
  featureFlagRegistry.set('ENABLE_CONTEXT_ENGINE', false);
  console.log(`  ✓ 122.3 Bundle delta (${enabledStatus.bundleDeltaKb} kB) <= 92 kB lazy-loaded confirmed`);
}
