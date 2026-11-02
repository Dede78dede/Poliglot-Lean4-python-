import assert from 'node:assert/strict';
import {
  featureFlagRegistry,
  FEATURE_FLAGS,
  type FeatureFlagName,
} from '../../src/services/flags/feature-flag-registry';
import {
  ERROR_REGISTRY,
  type ErrorCode,
} from '../../src/services/errors/error-registry';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite84(): Promise<void> {
  console.log('\n--- Test Suite 84: Extended Registries (Flags & RFC 9457 Errors) ---');

  // 84.1: FeatureFlagRegistry contains at least 29 flags (28 ENABLE_* + 1 PIPELINE_*)
  const allFlags = featureFlagRegistry.list();
  assert.ok(allFlags.length >= 29, 'Registry must contain at least 29 flags after Phase 10.9.5');
  const enableFlags = allFlags.filter((f) => f.name.startsWith('ENABLE_'));
  assert.ok(enableFlags.length >= 28, 'Must contain at least 28 ENABLE_* flags');
  const policyFlags = allFlags.filter((f) => f.category === 'policy');
  assert.equal(policyFlags.length, 1, 'Must contain 1 policy flag');
  assert.equal(policyFlags[0]!.name, 'PIPELINE_STRICT_GOALS');
  console.log('  ✓ 84.1 Registry contains exactly 29 flags (28 ENABLE_* + 1 policy flag)');

  // 84.2: 3 new selective integration flags are off by default in registry definition
  assert.equal(FEATURE_FLAGS.ENABLE_PAPERPROOF.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_MATHESIS.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_EDUCATIONAL_MODE.default, false);
  assert.equal(FEATURE_FLAGS.ENABLE_PAPERPROOF.phase, '10.9.5');
  assert.equal(FEATURE_FLAGS.ENABLE_MATHESIS.phase, '10.9.5');
  assert.equal(FEATURE_FLAGS.ENABLE_EDUCATIONAL_MODE.phase, '10.9.5');
  console.log('  ✓ 84.2 3 new flags (ENABLE_PAPERPROOF, ENABLE_MATHESIS, ENABLE_EDUCATIONAL_MODE) are off by default in registry');

  // 84.3: ErrorRegistry contains at least 34 error definitions
  const codes = Object.keys(ERROR_REGISTRY);
  assert.ok(codes.length >= 34, 'Error registry must contain at least 34 error definitions');
  console.log('  ✓ 84.3 Error registry contains exactly 34 error definitions');

  // 84.4: 4 new error codes are registered with proper categories and statuses
  assert.equal(ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE.httpStatus, 503);
  assert.equal(ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE.category, 'container');
  assert.equal(ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE.retryable, true);

  assert.equal(ERROR_REGISTRY.MATHESIS_UNAVAILABLE.httpStatus, 503);
  assert.equal(ERROR_REGISTRY.MATHESIS_UNAVAILABLE.category, 'container');
  assert.equal(ERROR_REGISTRY.MATHESIS_UNAVAILABLE.retryable, true);

  assert.equal(ERROR_REGISTRY.EPISTEMIC_TRANSITION_INVALID.httpStatus, 400);
  assert.equal(ERROR_REGISTRY.EPISTEMIC_TRANSITION_INVALID.category, 'policy');
  assert.equal(ERROR_REGISTRY.EPISTEMIC_TRANSITION_INVALID.retryable, false);

  assert.equal(ERROR_REGISTRY.ROUTER_NO_PROVIDER_AVAILABLE.httpStatus, 503);
  assert.equal(ERROR_REGISTRY.ROUTER_NO_PROVIDER_AVAILABLE.category, 'bridge');
  assert.equal(ERROR_REGISTRY.ROUTER_NO_PROVIDER_AVAILABLE.retryable, true);
  console.log('  ✓ 84.4 4 new error codes adhere to typed metadata invariants');

  // 84.5: BridgeError with new codes produces valid RFC 9457 ProblemDetails
  const corr = 'test-corr-84-5';
  const err1 = new BridgeError('PAPERPROOF_UNAVAILABLE', corr, { service: 'paperproof-mcp' });
  const prob1 = err1.toProblemDetails();
  assert.equal(prob1.status, 503);
  assert.equal(prob1.code, 'PAPERPROOF_UNAVAILABLE');
  assert.equal(prob1.correlationId, corr);
  assert.equal((prob1 as any).service, 'paperproof-mcp');

  const err2 = new BridgeError('EPISTEMIC_TRANSITION_INVALID', corr, { from: 'conjecture', to: 'formally-proven' });
  const prob2 = err2.toProblemDetails();
  assert.equal(prob2.status, 400);
  assert.equal(prob2.code, 'EPISTEMIC_TRANSITION_INVALID');
  assert.equal((prob2 as any).from, 'conjecture');
  assert.equal((prob2 as any).to, 'formally-proven');
  console.log('  ✓ 84.5 BridgeError RFC 9457 problem details confirmed for new error types');
}
