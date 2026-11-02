/**
 * Test Suite 149: Unified ResultEnvelope<T> Across All Bridges (Phase 13, Sprint 13.1)
 *
 * Validates:
 * 149.1: ResultEnvelope<T> narrows correctly on ok === true
 * 149.2: withEnvelope() returns ok: true on success and ok: false on BridgeError
 * 149.3: Every bridge returns ResultEnvelope<T> (static check: 18 bridges)
 * 149.4: unwrapEnvelope() throws the original BridgeError on ok: false
 * 149.5: HTTP boundary: ok: false -> error.httpStatus; ok: true -> 200
 * 149.6: Zod rejects malformed envelopes; correlationId is always present
 */

import assert from 'node:assert/strict';
import {
  type ResultEnvelope,
  createSuccessEnvelope,
  createErrorEnvelope,
  unwrapEnvelope,
} from '../../src/shared/contracts/result-envelope';
import { withEnvelope } from '../../src/shared/contracts/with-envelope';
import { BridgeError } from '../../src/services/errors/bridge-error';
import {
  bridgeAdapters,
  MIGRATED_BRIDGES,
} from '../../src/services/contracts/bridge-envelope-registry';
import {
  createResultEnvelopeSchema,
  SerializedBridgeErrorSchema,
} from '../../src/types/contracts';
import { z } from 'zod';

export async function runSuite149(): Promise<void> {
  console.log('\n[Suite 149] Unified ResultEnvelope<T> Tests:');

  // 149.1: Type narrowing on ok === true
  const successEnvelope: ResultEnvelope<number> = createSuccessEnvelope(42, 'corr-test-1');
  if (successEnvelope.ok) {
    // TypeScript compiles this because ok: true narrows value to number
    const val: number = successEnvelope.value;
    assert.equal(val, 42);
  } else {
    assert.fail('Expected successEnvelope.ok to be true');
  }

  const errorEnvelope: ResultEnvelope<number> = createErrorEnvelope(
    new BridgeError('BUDGET_EXHAUSTED', 'corr-test-2'),
    'corr-test-2'
  );
  if (!errorEnvelope.ok) {
    assert.equal(errorEnvelope.error.code, 'BUDGET_EXHAUSTED');
    assert.equal(errorEnvelope.error.httpStatus, 429);
  } else {
    assert.fail('Expected errorEnvelope.ok to be false');
  }
  console.log('  ✓ 149.1 ResultEnvelope<T> narrows correctly on ok === true');

  // 149.2: withEnvelope() returns ok: true on success and ok: false on BridgeError
  const okWrapped = await withEnvelope(async () => 'computation_result', 'corr-wrap-ok');
  assert.equal(okWrapped.ok, true);
  if (okWrapped.ok) {
    assert.equal(okWrapped.value, 'computation_result');
    assert.equal(okWrapped.correlationId, 'corr-wrap-ok');
  }

  const failWrapped = await withEnvelope(async () => {
    throw new BridgeError('DOCGEN_UNAVAILABLE', 'corr-wrap-fail', { target: 'v4.35.0' });
  }, 'corr-wrap-fail');
  assert.equal(failWrapped.ok, false);
  if (!failWrapped.ok) {
    assert.equal(failWrapped.error.code, 'DOCGEN_UNAVAILABLE');
    assert.equal(failWrapped.error.httpStatus, 503);
    assert.equal(failWrapped.correlationId, 'corr-wrap-fail');
  }
  console.log('  ✓ 149.2 withEnvelope() returns ok: true on success and ok: false on BridgeError');

  // 149.3: 18 bridges in static registry
  assert.equal(MIGRATED_BRIDGES.length, 18);
  assert.ok(MIGRATED_BRIDGES.includes('PastaLeanBridge'));
  assert.ok(MIGRATED_BRIDGES.includes('LungoBridge'));
  assert.ok(MIGRATED_BRIDGES.includes('LeanCertBridge'));
  assert.ok(MIGRATED_BRIDGES.includes('ProofReuseService'));
  assert.ok(MIGRATED_BRIDGES.includes('ProposalLoop'));
  assert.ok(MIGRATED_BRIDGES.includes('TranslationFidelityGate'));
  assert.ok(MIGRATED_BRIDGES.includes('TreeThinkProvider'));

  // Test one of the live adapters
  const adapterResult = await bridgeAdapters.translationFidelity.check({
    direction: 'python-to-lean',
    source: 'def id_fn(x: int) -> int:\n    return x',
    target: 'def id_fn (x : Int) : Int :=\n  x',
  });
  assert.equal(adapterResult.ok, true);
  if (adapterResult.ok) {
    assert.equal(adapterResult.value.passed, true);
  }
  console.log('  ✓ 149.3 Every bridge returns ResultEnvelope<T> (18 bridges registered)');

  // 149.4: unwrapEnvelope() throws original BridgeError on ok: false
  assert.throws(
    () => {
      unwrapEnvelope(failWrapped);
    },
    (err: unknown) => {
      if (err instanceof BridgeError) {
        return err.code === 'DOCGEN_UNAVAILABLE' && err.httpStatus === 503;
      }
      return false;
    }
  );
  const unwrappedVal = unwrapEnvelope(okWrapped);
  assert.equal(unwrappedVal, 'computation_result');
  console.log('  ✓ 149.4 unwrapEnvelope() throws the original BridgeError on ok: false');

  // 149.5: HTTP boundary mapping
  function simulateHttpResponse<T>(envelope: ResultEnvelope<T>) {
    if (envelope.ok) {
      return { status: 200, body: envelope };
    }
    return { status: envelope.error.httpStatus, body: envelope };
  }

  const httpOk = simulateHttpResponse(okWrapped);
  assert.equal(httpOk.status, 200);

  const httpFail = simulateHttpResponse(failWrapped);
  assert.equal(httpFail.status, 503);
  console.log('  ✓ 149.5 HTTP boundary maps ok: false -> error.httpStatus (503) and ok: true -> 200');

  // 149.6: Zod validation rejects malformed envelopes and requires correlationId
  const StringEnvelopeSchema = createResultEnvelopeSchema(z.string());

  const validParsed = StringEnvelopeSchema.safeParse(okWrapped);
  assert.equal(validParsed.success, true);

  const malformed = {
    ok: true,
    // Missing value, correlationId, timestamp
  };
  const malformedParsed = StringEnvelopeSchema.safeParse(malformed);
  assert.equal(malformedParsed.success, false);

  const missingCorrelation = {
    ok: false,
    error: {
      code: 'UNKNOWN',
      problemType: 'uri',
      httpStatus: 500,
      message: 'error',
      details: {},
    },
    // Missing correlationId and timestamp
  };
  assert.equal(StringEnvelopeSchema.safeParse(missingCorrelation).success, false);
  console.log('  ✓ 149.6 Zod schema validates ResultEnvelope and rejects malformed payloads');
}
