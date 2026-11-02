/**
 * Test Suite 95: Extended Provider Registry & Capability Matrix (Phase 10.10, Task P1 & P2)
 */

import assert from 'node:assert/strict';
import { AI_PROVIDERS } from '../../src/services/ai/ai-provider-registry';
import { DeepSeekProvider } from '../../src/services/ai/providers/deepseek-provider';
import { KimiProvider } from '../../src/services/ai/providers/kimi-provider';
import { MiniMaxProvider } from '../../src/services/ai/providers/minimax-provider';
import { tokenVault } from '../../src/services/storage/token-vault';

export async function runSuite95(): Promise<void> {
  console.log('\n--- Test Suite 95: Extended Provider Registry & Capability Matrix ---');

  // 95.1: AI_PROVIDERS has 14 descriptors
  assert.equal(AI_PROVIDERS.length, 14, `Expected 14 AI providers, got ${AI_PROVIDERS.length}`);
  const providerIds = AI_PROVIDERS.map((p) => p.id);
  assert.ok(providerIds.includes('deepseek'));
  assert.ok(providerIds.includes('kimi'));
  assert.ok(providerIds.includes('minimax'));
  assert.ok(providerIds.includes('openai'));
  assert.ok(providerIds.includes('anthropic'));
  assert.ok(providerIds.includes('gemini'));
  assert.ok(providerIds.includes('groq'));
  console.log('  ✓ 95.1 AI_PROVIDERS contains all 14 provider descriptors');

  // 95.2: DeepSeek provider registered with transport: 'function-only', maxTools: 128
  const deepseek = new DeepSeekProvider();
  assert.equal(deepseek.capabilities.transport, 'function-only');
  assert.equal(deepseek.capabilities.maxTools, 128);
  assert.equal(deepseek.capabilities.pricingUsdPerMillionInput, 0.14);
  assert.equal(deepseek.capabilities.pricingUsdPerMillionOutput, 0.28);
  console.log('  ✓ 95.2 DeepSeek provider verified (transport: function-only, maxTools: 128, $0.14/$0.28)');

  // 95.3: Kimi provider registered with transport: 'function-only', supportsToolChoice: 'all'
  const kimi = new KimiProvider();
  assert.equal(kimi.capabilities.transport, 'function-only');
  assert.equal(kimi.capabilities.supportsToolChoice, 'all');
  assert.equal(kimi.capabilities.pricingUsdPerMillionInput, 0.60);
  assert.equal(kimi.capabilities.pricingUsdPerMillionOutput, 2.50);
  console.log('  ✓ 95.3 Kimi provider verified (transport: function-only, supportsToolChoice: all)');

  // 95.4: MiniMax provider registered with transport: 'hybrid', thinkingMode: 'interleaved'
  const minimax = new MiniMaxProvider();
  assert.equal(minimax.capabilities.transport, 'hybrid');
  assert.equal(minimax.capabilities.thinkingMode, 'interleaved');
  assert.equal(minimax.capabilities.authScheme, 'bearer-plus-header');
  assert.equal(minimax.capabilities.authHeaderName, 'GroupId');
  console.log('  ✓ 95.4 MiniMax provider verified (transport: hybrid, thinkingMode: interleaved, GroupId header)');

  // 95.5: MiniMax rejects thinking.type === 'disabled' with MINIMAX_THINKING_DISABLED_REJECTED
  const disabledRes = await minimax.suggest({
    goal: '⊢ True',
    thinking: { type: 'disabled' },
  });
  assert.equal(disabledRes.success, false);
  assert.equal(disabledRes.error?.code, 'VALIDATION_FAILED');
  assert.equal(disabledRes.error?.details, 'MINIMAX_THINKING_DISABLED_REJECTED');
  console.log('  ✓ 95.5 MiniMax rejects thinking.type === "disabled" with MINIMAX_THINKING_DISABLED_REJECTED');

  // 95.6: TokenVault calculates cost using capability pricing
  // DeepSeek: 10,000 in, 5,000 out => (10000 * 0.14 + 5000 * 0.28) / 1M = 0.0014 + 0.0014 = 0.0028
  const deepseekCost = tokenVault.calculateCostUsd('deepseek', 10_000, 5_000);
  assert.equal(deepseekCost, 0.0028);

  // MiniMax: 10,000 in, 5,000 out => (10000 * 0.20 + 5000 * 0.60) / 1M = 0.0020 + 0.0030 = 0.005
  const minimaxCost = tokenVault.calculateCostUsd('minimax', 10_000, 5_000);
  assert.equal(minimaxCost, 0.005);
  console.log('  ✓ 95.6 TokenVault accurately calculates estimated USD costs from pricing matrix');

  // 95.7: TokenVault stores authScheme and additionalHeaders in SecretMetadata
  const secId = await tokenVault.storeSecret('minimax', 'mm-key-secret-999', 'test-passphrase-2026', {
    label: 'MiniMax Primary Key',
    authScheme: 'bearer-plus-header',
    additionalHeaders: { GroupId: 'grp_test_123' },
  });
  const stored = tokenVault.listSecrets().find((s) => s.id === secId);
  assert.ok(stored);
  assert.equal(stored.authScheme, 'bearer-plus-header');
  assert.equal(stored.additionalHeaders?.['GroupId'], 'grp_test_123');
  console.log('  ✓ 95.7 TokenVault stores authScheme and additionalHeaders in SecretMetadata');
}
