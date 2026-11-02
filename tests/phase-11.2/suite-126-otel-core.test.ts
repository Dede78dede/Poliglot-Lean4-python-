/**
 * Test Suite 126: OpenTelemetry Core (Phase 11.2, Sprint 11.2.3)
 */

import assert from 'node:assert/strict';
import {
  OTEL_PINNED_VERSION,
  OTEL_DEFAULT_ENDPOINT,
} from '../../src/services/telemetry/otel-types';
import {
  BrowserOtelTracer,
  browserOtelTracer,
} from '../../src/services/telemetry/otel-browser';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite126(): Promise<void> {
  console.log('\n--- Test Suite 126: OpenTelemetry Core ---');

  // 126.1: Pinned version verification (2.12.0)
  assert.equal(OTEL_PINNED_VERSION, '2.12.0');
  assert.equal(browserOtelTracer.getVersion(), '2.12.0');
  console.log('  ✓ 126.1 Pinned version: @opentelemetry/sdk-trace-web pinned to 2.12.0');

  // 126.2: Trace ID format (32 hex) and Span ID format (16 hex)
  const traceId = BrowserOtelTracer.generateTraceId();
  const spanId = BrowserOtelTracer.generateSpanId();
  assert.equal(traceId.length, 32, 'Trace ID must be 32 hex chars');
  assert.match(traceId, /^[0-9a-f]{32}$/);
  assert.equal(spanId.length, 16, 'Span ID must be 16 hex chars');
  assert.match(spanId, /^[0-9a-f]{16}$/);
  console.log('  ✓ 126.2 Trace & Span ID format: 32-hex traceId and 16-hex spanId verified');

  // 126.3: Span execution lifecycle via withSpan
  browserOtelTracer.clearBuffer();
  const res = await browserOtelTracer.withSpan(
    'monaco.editor.change',
    { 'file.path': 'Math/Basic.lean', 'file.lines': 42 },
    async (spanContext) => {
      assert.ok(spanContext.traceId);
      assert.ok(spanContext.spanId);
      return 'edit-ok';
    }
  );
  assert.equal(res, 'edit-ok');
  const spans = browserOtelTracer.getBufferedSpans();
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, 'monaco.editor.change');
  assert.equal(spans[0].status.code, 'OK');
  assert.equal(spans[0].attributes['telemetry.sdk.version'], '2.12.0');
  assert.equal(spans[0].attributes['file.path'], 'Math/Basic.lean');
  assert.ok(spans[0].durationMs >= 0);
  console.log('  ✓ 126.3 Span execution lifecycle: withSpan captured status, attributes, and duration');

  // 126.4: Local exporter endpoint verification
  assert.equal(OTEL_DEFAULT_ENDPOINT, 'http://localhost:4318/v1/traces');
  assert.equal(browserOtelTracer.getEndpoint(), 'http://localhost:4318/v1/traces');
  console.log('  ✓ 126.4 Local exporter endpoint: restricted to local collector http://localhost:4318/v1/traces');

  // 126.5: Feature flag gate: ENABLE_OTEL_BROWSER default is false
  assert.equal(featureFlagRegistry.isEnabled('ENABLE_OTEL_BROWSER'), false);
  const tracer = new BrowserOtelTracer();
  const initialized = tracer.initialize();
  assert.equal(initialized, false, 'Should not activate when ENABLE_OTEL_BROWSER is false');
  console.log('  ✓ 126.5 Feature flag gate: tracer inactive by default when ENABLE_OTEL_BROWSER is false');
}
