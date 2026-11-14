/**
 * Test Suite 129: Mathesis Router & Dispatcher (Phase 11.2 & Phase 15 Wave 3)
 */

import assert from 'node:assert/strict';
import { AutoformalizationRouter } from '../../src/services/formalization/autoformalization-router';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { startMathesisMockServer } from '../phase-14/mocks/reasoner-mocks';

export async function runSuite129(): Promise<void> {
  console.log('\n--- Test Suite 129: Mathesis Router & Dispatcher ---');

  const router = new AutoformalizationRouter();

  // 129.1: AutoformalizationRouter registers and routes natural_language input type
  const snapshot = router.getSnapshot();
  assert.ok(snapshot.registeredProviders.some(p => p.name === 'mathesis'));
  console.log('  ✓ 129.1 Router registration: mathesis strategy registered in AutoformalizationRouter');

  // 129.2: Error handling with problem details when no provider available
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
  let failed = false;
  try {
    await router.routeFormalization({
      inputType: 'natural_language',
      sourceCode: 'Every even number greater than 2 is the sum of two primes.',
    });
  } catch (err: any) {
    failed = true;
    assert.equal(err.code, 'ROUTER_NO_PROVIDER_AVAILABLE');
  }
  assert.equal(failed, true, 'Must fail when provider is disabled');
  console.log('  ✓ 129.2 Problem details: ROUTER_NO_PROVIDER_AVAILABLE raised cleanly');

  // 129.3: Fallback routing works when enabled against a real HTTP endpoint
  const mathMock = await startMathesisMockServer({ score: 0.91 });
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  process.env.MATHESIS_ENDPOINT = mathMock.url;
  try {
    const res = await router.routeFormalization({
      inputType: 'natural_language',
      sourceCode: 'For all natural numbers n, n + 0 = n.',
    });
    assert.ok(res.generatedLeanCode.length > 0);
    assert.equal(res.providerUsed, 'mathesis');
    assert.equal(mathMock.requestCount(), 1);
    console.log('  ✓ 129.3 Fallback routing: autoformalization dispatched to real HTTP mathesis provider');
  } finally {
    await mathMock.close();
    featureFlagRegistry.set('ENABLE_MATHESIS', false);
    delete process.env.MATHESIS_ENDPOINT;
  }
}
