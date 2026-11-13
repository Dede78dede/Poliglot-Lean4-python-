/**
 * Test Suite 195: OpenTelemetry Observability Verification (Phase 15 Wave 1, ADR-016)
 *
 * Validates:
 * 195.1: Browser OpenTelemetry generates compliant W3C traceparent headers (00-traceId-spanId-01).
 * 195.2: Backend OpenTelemetry correlates server spans with trace context and logs.
 * 195.3: Disabling ENABLE_OTEL_BROWSER or ENABLE_OTEL_NODE cleanly degrades to safe no-op or RFC 9457 error.
 * 195.4: Recursive attribute sanitization masks sensitive secrets, tokens, and cookies before export.
 * 195.5: Non-blocking telemetry: exporter network unreachability fails silently without throwing or delaying operations.
 */

import assert from 'node:assert/strict';
import { browserOtelTracer } from '../../src/services/telemetry/otel-browser';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite195(): Promise<void> {
  console.log('Running Suite 195: OpenTelemetry Observability (5 sub-tests)...');

  // 195.1: W3C traceparent generation
  browserOtelTracer.startTrace('4bf92f3577b34da6a3ce929d0e0e4736');
  const traceparent = browserOtelTracer.getTraceparent('00f067aa0ba902b7');
  assert.equal(
    traceparent,
    '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    'W3C traceparent header must format as 00-<traceId>-<spanId>-01'
  );
  console.log('  ✓ 195.1 Browser OpenTelemetry generates standard W3C traceparent header');

  // 195.2: Backend trace context correlation
  const parsed = backendOtelEngine.parseTraceparent(traceparent);
  assert.ok(parsed !== null, 'Backend engine must parse valid traceparent header');
  assert.equal(parsed?.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(parsed?.spanId, '00f067aa0ba902b7');

  backendOtelEngine.recordSpan({
    spanId: parsed!.spanId,
    traceId: parsed!.traceId,
    name: 'http_request_lean_execute',
    startTime: 1000,
    endTime: 1050,
    durationMs: 50,
    attributes: { 'http.status_code': 200 },
    status: { code: 'OK' },
    events: [],
  });

  backendOtelEngine.recordLog({
    timestamp: '2026-11-12T12:00:00Z',
    level: 'info',
    service: 'lean-runner',
    message: 'Lean obligation evaluated',
    correlationId: parsed!.traceId,
  });

  const correlated = backendOtelEngine.getTrace(parsed!.traceId);
  assert.ok(correlated !== null, 'Correlated trace response must be retrievable');
  assert.equal(correlated?.totalSpans, 1);
  assert.equal(correlated?.correlatedLogs.length, 1);
  assert.equal(correlated?.correlatedLogs[0]?.correlationId, parsed!.traceId);
  console.log('  ✓ 195.2 Backend engine correlates spans with structured log entries by trace ID');

  // 195.3: Fail-safe degradation on disabled flags
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', false);
  const initResult = browserOtelTracer.initialize(false);
  assert.equal(initResult, false, 'initialize() must return false when flag is disabled');
  assert.throws(
    () => browserOtelTracer.checkEnabled(),
    (err: any) => err.code === 'FEATURE_DISABLED',
    'checkEnabled() must throw BridgeError with code FEATURE_DISABLED when flag is off'
  );

  featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  backendOtelEngine.setEnabled(false);
  assert.throws(
    () => backendOtelEngine.checkEnabled(),
    (err: any) => err.code === 'FEATURE_DISABLED',
    'backend checkEnabled() must throw BridgeError with code FEATURE_DISABLED when flag is off'
  );
  console.log('  ✓ 195.3 Telemetry components fail closed with structured error when feature flags are off');

  // 195.4: Recursive attribute sanitization
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', true);
  browserOtelTracer.initialize(false);
  browserOtelTracer.clearBuffer();

  await browserOtelTracer.withSpan(
    'client_api_call',
    {
      'http.url': 'https://api.polyglot.dev/v1/proof',
      'user.auth_token': 'secret_bearer_token_xyz',
      'session.cookie': 'session_token=12345',
      'api.secretKey': 'priv_key_999',
      'safe.item': 'theorem_nat_comm',
    },
    async (spanCtx) => {
      assert.ok(spanCtx.traceId.length === 32);
      assert.ok(spanCtx.spanId.length === 16);
      return 'done';
    }
  );

  const buffered = browserOtelTracer.getBufferedSpans();
  assert.equal(buffered.length, 1);
  const span = buffered[0]!;
  assert.equal(span.attributes['user.auth_token'], '[REDACTED]');
  assert.equal(span.attributes['session.cookie'], '[REDACTED]');
  assert.equal(span.attributes['api.secretKey'], '[REDACTED]');
  assert.equal(span.attributes['safe.item'], 'theorem_nat_comm');
  console.log('  ✓ 195.4 Sensitive credentials in span attributes are recursively redacted before buffering');

  // 195.5: Non-blocking silent fallback on network failure
  let exportFailed = false;
  try {
    // Attempting export against dead/invalid endpoint must not throw unhandled rejections
    await browserOtelTracer.exportSpan(span);
  } catch {
    exportFailed = true;
  }
  assert.equal(exportFailed, false, 'exportSpan must catch network errors silently');
  console.log('  ✓ 195.5 Network unreachability for OTLP exporter handles failures silently without throwing');

  // Cleanup
  browserOtelTracer.clearBuffer();
  backendOtelEngine.clear();
}
