/**
 * Test Suite 158: Feature Flag Wiring Verification (Phase 13.9, Task 04)
 *
 * Verifies that all 8 optional/experimental tools cleanly check their feature flag
 * and reject execution with 503 FEATURE_DISABLED (RFC 9457) when disabled,
 * and execute or initialize cleanly when enabled.
 *
 * 16 Sub-tests:
 * 158.1  [lean-beam:off] rejects runAt with 503 FEATURE_DISABLED when ENABLE_LEAN_BEAM is false
 * 158.2  [lean-beam:on] executes speculative tactic probe successfully when ENABLE_LEAN_BEAM is true
 * 158.3  [mathesis:off] rejects formalize with 503 FEATURE_DISABLED when ENABLE_MATHESIS is false
 * 158.4  [mathesis:on] executes formalization successfully when ENABLE_MATHESIS is true
 * 158.5  [lp2:off] rejects pyToLean with 503 FEATURE_DISABLED when ENABLE_LP2 is false
 * 158.6  [lp2:on] translates python code to Lean 4 when ENABLE_LP2 is true
 * 158.7  [treethink:off] rejects treeSearch with 503 FEATURE_DISABLED when ENABLE_TREETHINK is false
 * 158.8  [treethink:on] executes tree exploration successfully when ENABLE_TREETHINK is true
 * 158.9  [otel-browser:off] rejects checkEnabled with 503 FEATURE_DISABLED when ENABLE_OTEL_BROWSER is false
 * 158.10 [otel-browser:on] initializes and records spans cleanly when ENABLE_OTEL_BROWSER is true
 * 158.11 [otel-node:off] rejects checkEnabled with 503 FEATURE_DISABLED when ENABLE_OTEL_NODE is false
 * 158.12 [otel-node:on] initializes and tracks spans cleanly when ENABLE_OTEL_NODE is true
 * 158.13 [yjs:off] rejects authentication with 503 FEATURE_DISABLED when ENABLE_YJS_COLLABORATION is false
 * 158.14 [yjs:on] authenticates permitted tokens when ENABLE_YJS_COLLABORATION is true
 * 158.15 [paperproof:off] rejects callTool with 503 FEATURE_DISABLED when ENABLE_PAPERPROOF is false
 * 158.16 [paperproof:on] connects and executes tools successfully when ENABLE_PAPERPROOF is true
 */

import assert from 'node:assert/strict';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { defaultLeanBeamClient } from '../../src/services/mcp/lean-beam-client';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { lp2Adapter } from '../../src/services/translation/lp2-adapter';
import { treeThinkProvider } from '../../src/services/proof/treethink/treethink-provider';
import { browserOtelTracer } from '../../src/services/telemetry/otel-browser';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { hocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';
import { defaultPaperproofClient } from '../../src/services/mcp/paperproof-client';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite158(): Promise<void> {
  console.log('Running Suite 158: Feature Flag Wiring Verification (8 tools x off/on = 16 sub-tests)...');

  featureFlagRegistry.reset();

  // 158.1: lean-beam off
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', false);
  let err1: BridgeError | null = null;
  try {
    await defaultLeanBeamClient.runAt({
      path: 'Test.lean',
      version: 1,
      line: 1,
      character: 0,
      text: 'rfl',
    });
  } catch (err) {
    if (err instanceof BridgeError) err1 = err;
  }
  assert.ok(err1 !== null, 'Expected BridgeError when ENABLE_LEAN_BEAM is false');
  assert.equal(err1?.code, 'FEATURE_DISABLED');
  assert.equal(err1?.httpStatus, 503);
  assert.equal(err1?.toProblemDetails().status, 503);
  console.log('  ✓ 158.1 [lean-beam:off] rejects runAt with 503 FEATURE_DISABLED');

  // 158.2: lean-beam on
  featureFlagRegistry.set('ENABLE_LEAN_BEAM', true);
  const res2 = await defaultLeanBeamClient.runAt({
    path: 'Test.lean',
    version: 1,
    line: 1,
    character: 0,
    text: 'rfl',
  });
  assert.equal(res2.valid, true);
  console.log('  ✓ 158.2 [lean-beam:on] executes speculative tactic probe successfully');

  // 158.3: mathesis off
  featureFlagRegistry.set('ENABLE_MATHESIS', false);
  let err3: BridgeError | null = null;
  try {
    await mathesisProvider.formalize({
      naturalLanguagePrompt: 'Prove 1 + 1 = 2',
      endpointOverride: 'http://localhost:8088/v1/mathesis',
    });
  } catch (err) {
    if (err instanceof BridgeError) err3 = err;
  }
  assert.ok(err3 !== null, 'Expected BridgeError when ENABLE_MATHESIS is false');
  assert.equal(err3?.code, 'FEATURE_DISABLED');
  assert.equal(err3?.httpStatus, 503);
  console.log('  ✓ 158.3 [mathesis:off] rejects formalize with 503 FEATURE_DISABLED');

  // 158.4: mathesis on
  featureFlagRegistry.set('ENABLE_MATHESIS', true);
  const res4 = await mathesisProvider.formalize({
    naturalLanguagePrompt: 'Prove 1 + 1 = 2',
    endpointOverride: 'http://localhost:8088/v1/mathesis',
    simulatedScore: 0.95,
  });
  assert.equal(res4.provider, 'mathesis');
  assert.equal(res4.accepted, true);
  assert.equal(res4.confidenceScore, 0.95);
  console.log('  ✓ 158.4 [mathesis:on] executes formalization successfully');

  // 158.5: lp2 off
  featureFlagRegistry.set('ENABLE_LP2', false);
  let err5: BridgeError | null = null;
  try {
    await lp2Adapter.pyToLean('def add(a, b):\n    return a + b');
  } catch (err) {
    if (err instanceof BridgeError) err5 = err;
  }
  assert.ok(err5 !== null, 'Expected BridgeError when ENABLE_LP2 is false');
  assert.equal(err5?.code, 'FEATURE_DISABLED');
  assert.equal(err5?.httpStatus, 503);
  console.log('  ✓ 158.5 [lp2:off] rejects pyToLean with 503 FEATURE_DISABLED');

  // 158.6: lp2 on
  featureFlagRegistry.set('ENABLE_LP2', true);
  const res6 = await lp2Adapter.pyToLean('def double(n):\n    return n + n');
  assert.equal(res6.source, 'lp2');
  assert.ok(res6.translated.includes('def double'));
  console.log('  ✓ 158.6 [lp2:on] translates Python code to Lean 4 successfully');

  // 158.7: treethink off
  featureFlagRegistry.set('ENABLE_TREETHINK', false);
  let err7: BridgeError | null = null;
  try {
    await treeThinkProvider.treeSearch({ goal: '⊢ ∀ n, n + 0 = n' });
  } catch (err) {
    if (err instanceof BridgeError) err7 = err;
  }
  assert.ok(err7 !== null, 'Expected BridgeError when ENABLE_TREETHINK is false');
  assert.equal(err7?.code, 'FEATURE_DISABLED');
  assert.equal(err7?.httpStatus, 503);
  console.log('  ✓ 158.7 [treethink:off] rejects treeSearch with 503 FEATURE_DISABLED');

  // 158.8: treethink on
  featureFlagRegistry.set('ENABLE_TREETHINK', true);
  const res8 = await treeThinkProvider.treeSearch({ goal: '⊢ ∀ n, n + 0 = n', method: 'mcts' });
  assert.equal(res8.proved, true);
  assert.equal(res8.method, 'mcts');
  console.log('  ✓ 158.8 [treethink:on] executes tree exploration successfully');

  // 158.9: otel-browser off
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', false);
  let err9: BridgeError | null = null;
  try {
    browserOtelTracer.checkEnabled();
  } catch (err) {
    if (err instanceof BridgeError) err9 = err;
  }
  assert.ok(err9 !== null, 'Expected BridgeError when ENABLE_OTEL_BROWSER is false');
  assert.equal(err9?.code, 'FEATURE_DISABLED');
  assert.equal(err9?.httpStatus, 503);
  console.log('  ✓ 158.9 [otel-browser:off] rejects checkEnabled with 503 FEATURE_DISABLED');

  // 158.10: otel-browser on
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', true);
  browserOtelTracer.checkEnabled();
  const res10 = await browserOtelTracer.withSpan('test-span', { key: 'val' }, async (ctx) => {
    assert.ok(ctx.traceId);
    return 42;
  });
  assert.equal(res10, 42);
  console.log('  ✓ 158.10 [otel-browser:on] initializes and records spans cleanly');

  // 158.11: otel-node off
  featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  backendOtelEngine.setEnabled(false);
  delete process.env.ENABLE_OTEL_NODE;
  let err11: BridgeError | null = null;
  try {
    backendOtelEngine.checkEnabled();
  } catch (err) {
    if (err instanceof BridgeError) err11 = err;
  }
  assert.ok(err11 !== null, 'Expected BridgeError when ENABLE_OTEL_NODE is false');
  assert.equal(err11?.code, 'FEATURE_DISABLED');
  assert.equal(err11?.httpStatus, 503);
  console.log('  ✓ 158.11 [otel-node:off] rejects checkEnabled with 503 FEATURE_DISABLED');

  // 158.12: otel-node on
  featureFlagRegistry.set('ENABLE_OTEL_NODE', true);
  backendOtelEngine.setEnabled(true);
  backendOtelEngine.checkEnabled();
  backendOtelEngine.recordSpan({
    spanId: 's1',
    traceId: 't1',
    name: 'root',
    startTime: 100,
    endTime: 200,
    durationMs: 100,
    attributes: {},
    status: { code: 'OK' },
    events: [],
  });
  assert.equal(backendOtelEngine.getTrace('t1')?.totalSpans, 1);
  console.log('  ✓ 158.12 [otel-node:on] initializes and tracks spans cleanly');

  // 158.13: yjs collaboration off
  featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', false);
  let err13: BridgeError | null = null;
  try {
    hocuspocusServer.authenticate('polyglot-collab-token-default');
  } catch (err) {
    if (err instanceof BridgeError) err13 = err;
  }
  assert.ok(err13 !== null, 'Expected BridgeError when ENABLE_YJS_COLLABORATION is false');
  assert.equal(err13?.code, 'FEATURE_DISABLED');
  assert.equal(err13?.httpStatus, 503);
  console.log('  ✓ 158.13 [yjs:off] rejects authentication with 503 FEATURE_DISABLED');

  // 158.14: yjs collaboration on
  featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
  const res14 = hocuspocusServer.authenticate('polyglot-collab-token-default', 'http://localhost:3000');
  assert.equal(res14.success, true);
  console.log('  ✓ 158.14 [yjs:on] authenticates permitted tokens cleanly');

  // 158.15: paperproof off
  featureFlagRegistry.set('ENABLE_PAPERPROOF', false);
  let err15: BridgeError | null = null;
  try {
    await defaultPaperproofClient.callTool({
      toolName: 'lean_proof_structure',
      arguments: { path: 'Main.lean' },
    });
  } catch (err) {
    if (err instanceof BridgeError) err15 = err;
  }
  assert.ok(err15 !== null, 'Expected BridgeError when ENABLE_PAPERPROOF is false');
  assert.equal(err15?.code, 'FEATURE_DISABLED');
  assert.equal(err15?.httpStatus, 503);
  console.log('  ✓ 158.15 [paperproof:off] rejects callTool with 503 FEATURE_DISABLED');

  // 158.16: paperproof on
  featureFlagRegistry.set('ENABLE_PAPERPROOF', true);
  await defaultPaperproofClient.connect();
  assert.equal(defaultPaperproofClient.isConnected(), true);
  const res16 = await defaultPaperproofClient.callTool({
    toolName: 'lean_proof_structure',
    arguments: { path: 'Main.lean', theoremName: 'my_theorem' },
  });
  assert.equal(res16.success, true);
  assert.ok(res16.data);
  await defaultPaperproofClient.disconnect();
  console.log('  ✓ 158.16 [paperproof:on] connects and executes tools successfully');

  featureFlagRegistry.reset();
}

if (process.argv[1]?.endsWith('suite-158-feature-flags.test.ts')) {
  runSuite158()
    .then(() => {
      console.log('Suite 158 passed (16/16 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
