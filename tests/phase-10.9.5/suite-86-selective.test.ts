import assert from 'node:assert/strict';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import {
  autoformalizationRouter,
  AutoformalizationRouter,
} from '../../src/services/formalization/autoformalization-router';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { paperproofClient } from '../../src/services/femev/paperproof-client';
import { educationalService } from '../../src/services/education/educational-templates';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite86(): Promise<void> {
  console.log('\n--- Test Suite 86: Selective Integrations (Feature-Flagged) ---');

  // 86.1: AutoformalizationRouter registers strategies for pastalean, leanflow, and mathesis
  const router = new AutoformalizationRouter();
  const providers = router.listProviders();
  assert.ok(providers.some((p) => p.name === 'pastalean'));
  assert.ok(providers.some((p) => p.name === 'leanflow'));
  assert.ok(providers.some((p) => p.name === 'mathesis'));
  console.log('  ✓ 86.1 AutoformalizationRouter registers all 3 autoformalization strategies');

  // 86.2: Router throws ROUTER_NO_PROVIDER_AVAILABLE when no provider is enabled for an input type
  let routerBlocked = false;
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
  try {
    await router.routeFormalization({
      inputType: 'natural_language',
      sourceCode: 'Every even integer greater than 2 is the sum of two primes',
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError && err.code === 'ROUTER_NO_PROVIDER_AVAILABLE') {
      routerBlocked = true;
    }
  }
  assert.equal(routerBlocked, true, 'Router must throw ROUTER_NO_PROVIDER_AVAILABLE when candidate strategy is disabled');
  console.log('  ✓ 86.2 Router throws ROUTER_NO_PROVIDER_AVAILABLE when candidates are disabled');

  // 86.3: Mathesis throws MATHESIS_UNAVAILABLE when disabled; succeeds when enabled
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
  let mathesisBlocked = false;
  try {
    await mathesisProvider.formalize({
      naturalLanguagePrompt: 'Prove that 1 + 1 = 2',
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError && err.code === 'MATHESIS_UNAVAILABLE') {
      mathesisBlocked = true;
    }
  }
  assert.equal(mathesisBlocked, true, 'Mathesis must throw MATHESIS_UNAVAILABLE when disabled');

  // Enable flag and verify synthesis
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const mathRes = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'Prove that 1 + 1 = 2',
  });
  assert.equal(mathRes.provider, 'mathesis');
  assert.ok(mathRes.leanCode.includes('theorem mathesis_synthesized_theorem'));
  featureFlagRegistry.reset('ENABLE_MATHESIS');
  console.log('  ✓ 86.3 Mathesis provider strictly respects ENABLE_MATHESIS flag lifecycle');

  // 86.4: Paperproof throws PAPERPROOF_UNAVAILABLE when disabled; returns tree when enabled
  featureFlagRegistry.set('ENABLE_PAPERPROOF', false);
  let paperproofBlocked = false;
  try {
    await paperproofClient.generateProofTree('theorem t : 1 + 1 = 2 := by rfl');
  } catch (err: unknown) {
    if (err instanceof BridgeError && err.code === 'PAPERPROOF_UNAVAILABLE') {
      paperproofBlocked = true;
    }
  }
  assert.equal(paperproofBlocked, true, 'Paperproof must throw PAPERPROOF_UNAVAILABLE when disabled');

  // Enable flag and generate tree
  featureFlagRegistry.set('ENABLE_PAPERPROOF', true);
  const tree = await paperproofClient.generateProofTree('theorem test_thm : 1 + 1 = 2 := by rfl', {
    theoremName: 'test_thm',
  });
  assert.equal(tree.theoremName, 'test_thm');
  assert.ok(tree.nodes.length >= 3);
  assert.ok(tree.edges.length >= 2);
  assert.equal(tree.verified, true);
  featureFlagRegistry.reset('ENABLE_PAPERPROOF');
  console.log('  ✓ 86.4 Paperproof client strictly respects ENABLE_PAPERPROOF and produces valid proof DAG');

  // 86.5: Educational Mode filters templates based on ENABLE_EDUCATIONAL_MODE
  featureFlagRegistry.set('ENABLE_EDUCATIONAL_MODE', false);
  assert.equal(educationalService.listTemplates().length, 0);

  featureFlagRegistry.set('ENABLE_EDUCATIONAL_MODE', true);
  const templates = educationalService.listTemplates();
  assert.ok(templates.length >= 3);
  assert.ok(templates.some((t) => t.id === 'robo-nng-add-zero'));
  assert.ok(templates.some((t) => t.id === 'lean4game-set-inter-subset'));
  assert.ok(templates.some((t) => t.id === 'provable-python-fibonacci'));
  featureFlagRegistry.reset('ENABLE_EDUCATIONAL_MODE');
  console.log('  ✓ 86.5 Educational Mode templates cleanly gated behind ENABLE_EDUCATIONAL_MODE');

  // 86.6: AutoformalizationRouter extends ExternalStoreBase and provides stable snapshots
  const snap1 = router.getSnapshot();
  const snap2 = router.getSnapshot();
  assert.equal(snap1, snap2, 'Router snapshot must be referentially stable when unchanged');
  console.log('  ✓ 86.6 AutoformalizationRouter snapshot caching & ExternalStoreBase compliance verified');
}
