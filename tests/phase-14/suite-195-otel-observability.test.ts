/**
 * Test Suite 195: OpenTelemetry Observability Verification (Phase 15 Wave 1, ADR-016)
 *
 * Validates:
 * 195.1: Browser OpenTelemetry generates compliant W3C traceparent headers (00-traceId-spanId-01) and rejects invalid/zero traceparents.
 * 195.2: Backend OpenTelemetry correlates concurrent ALS server child spans with trace context and logs (zero cross-request leakage).
 * 195.3: Disabling ENABLE_OTEL_BROWSER or ENABLE_OTEL_NODE cleanly degrades to safe no-op or RFC 9457 503 on telemetry routes.
 * 195.4: Recursive attribute sanitization masks deeply nested sensitive secrets, tokens, and cookies before export.
 * 195.5: Non-blocking telemetry: OTLP exporter to offline/hanging collector fails silently without throwing or blocking.
 */

import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { browserOtelTracer } from '../../src/services/telemetry/otel-browser';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { StructuredLogger, runWithTraceContext, getTraceContext } from '../../src/services/logging/logger';
import { createTelemetryRouter } from '../../server/src/routes/telemetry';

export async function runSuite195(): Promise<void> {
  console.log('Running Suite 195: OpenTelemetry Observability (5 sub-tests)...');

  backendOtelEngine.clear();

  // 195.1: W3C traceparent generation + strict validation
  browserOtelTracer.startTrace('4bf92f3577b34da6a3ce929d0e0e4736');
  const traceparent = browserOtelTracer.getTraceparent('00f067aa0ba902b7');
  assert.equal(
    traceparent,
    '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    'W3C traceparent header must format as 00-<traceId>-<spanId>-01'
  );
  assert.equal(backendOtelEngine.parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01'), null);
  assert.equal(backendOtelEngine.parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01'), null);
  assert.equal(backendOtelEngine.parseTraceparent('invalid-header'), null);
  console.log('  ✓ 195.1 Browser OpenTelemetry generates W3C traceparent and rejects all-zero/malformed headers');

  // 195.2: Concurrent ALS isolation + child span parent linkage
  const logger = new StructuredLogger('wave1-concurrent');
  const traceA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const traceB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const parentA = backendOtelEngine.parseTraceparent(`00-${traceA}-1111111111111111-01`)!;
  const parentB = backendOtelEngine.parseTraceparent(`00-${traceB}-2222222222222222-01`)!;
  const childA = backendOtelEngine.createChildSpanContext(parentA);
  const childB = backendOtelEngine.createChildSpanContext(parentB);
  assert.notEqual(childA.spanId, parentA.spanId);
  assert.equal(childA.parentSpanId, parentA.spanId);

  await Promise.all([
    runWithTraceContext(childA, async () => {
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(getTraceContext()?.traceId, traceA);
      const entry = logger.info('Concurrent op A');
      backendOtelEngine.recordLog(entry);
      backendOtelEngine.recordSpan({
        spanId: childA.spanId,
        traceId: childA.traceId,
        parentSpanId: childA.parentSpanId,
        name: 'http_req_a',
        startTime: 1000,
        endTime: 1020,
        durationMs: 20,
        attributes: { 'http.status_code': 200 },
        status: { code: 'OK' },
        events: [],
      });
    }),
    runWithTraceContext(childB, async () => {
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(getTraceContext()?.traceId, traceB);
      const entry = logger.info('Concurrent op B');
      backendOtelEngine.recordLog(entry);
      backendOtelEngine.recordSpan({
        spanId: childB.spanId,
        traceId: childB.traceId,
        parentSpanId: childB.parentSpanId,
        name: 'http_req_b',
        startTime: 1000,
        endTime: 1010,
        durationMs: 10,
        attributes: { 'http.status_code': 200 },
        status: { code: 'OK' },
        events: [],
      });
    }),
  ]);

  const correlatedA = backendOtelEngine.getTrace(traceA);
  const correlatedB = backendOtelEngine.getTrace(traceB);
  assert.ok(correlatedA && correlatedA.totalSpans === 1);
  assert.equal(correlatedA.correlatedLogs.length, 1);
  assert.equal(correlatedA.correlatedLogs[0]?.message, 'Concurrent op A');
  assert.equal(correlatedB?.correlatedLogs[0]?.message, 'Concurrent op B');
  console.log('  ✓ 195.2 Concurrent AsyncLocalStorage contexts isolate traces/logs with zero cross-request leakage');

  // 195.3: Fail-safe degradation on disabled flags (service + HTTP telemetry router)
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', false);
  const initResult = browserOtelTracer.initialize(false);
  assert.equal(initResult, false, 'initialize() must return false when flag is disabled');
  assert.throws(
    () => browserOtelTracer.checkEnabled(),
    (err: { code?: string }) => err.code === 'FEATURE_DISABLED',
    'checkEnabled() must throw BridgeError with code FEATURE_DISABLED when flag is off'
  );

  featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  backendOtelEngine.setEnabled(false);
  assert.throws(
    () => backendOtelEngine.checkEnabled(),
    (err: { code?: string }) => err.code === 'FEATURE_DISABLED',
    'backend checkEnabled() must throw BridgeError with code FEATURE_DISABLED when flag is off'
  );

  const app = express();
  app.use(express.json());
  app.use('/api/v1/telemetry', createTelemetryRouter());
  const srv = http.createServer(app);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
  const port = (srv.address() as { port: number }).port;

  try {
    const disabledResp = await fetch(`http://127.0.0.1:${port}/api/v1/telemetry/trace/${traceA}`);
    assert.equal(disabledResp.status, 503);
    const disabledBody = (await disabledResp.json()) as { code?: string };
    assert.equal(disabledBody.code, 'FEATURE_DISABLED');

    // Enable node telemetry and test POST /spans redaction + GET /trace
    backendOtelEngine.setEnabled(true);
    const ingestResp = await fetch(`http://127.0.0.1:${port}/api/v1/telemetry/spans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        span: {
          spanId: '9999999999999999',
          traceId: traceA,
          name: 'browser_nested_op',
          attributes: { nested: { apiKey: 'raw-secret-123', safe: 'ok' } },
        },
      }),
    });
    assert.equal(ingestResp.status, 201);
    const traceResp = await fetch(`http://127.0.0.1:${port}/api/v1/telemetry/trace/${traceA}`);
    assert.equal(traceResp.status, 200);
    const traceJson = (await traceResp.json()) as { spans: Array<{ attributes: { nested?: { apiKey?: string; safe?: string } } }> };
    const ingested = traceJson.spans.find((s) => s.attributes?.nested);
    assert.equal(ingested?.attributes.nested?.apiKey, '[REDACTED]');
    assert.equal(ingested?.attributes.nested?.safe, 'ok');
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()));
    backendOtelEngine.setEnabled(false);
  }
  console.log('  ✓ 195.3 Telemetry components and HTTP routes fail closed with RFC 9457 503 when flags are off');

  // 195.4: Recursive attribute sanitization
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', true);
  browserOtelTracer.initialize(false);
  browserOtelTracer.clearBuffer();

  await browserOtelTracer.withSpan(
    'client_api_call',
    {
      'http.url': 'https://api.polyglot.dev/v1/proof?token=query_secret',
      'user.auth_token': 'secret_bearer_token_xyz',
      'session.cookie': 'session_token=12345',
      'api.secretKey': 'priv_key_999',
      nested: { headers: { authorization: 'Bearer super_secret_jwt' }, safeKey: 'theorem_nat_comm' },
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
  assert.equal((span.attributes.nested as { headers: { authorization: string } }).headers.authorization, '[REDACTED]');
  assert.ok(!String(span.attributes['http.url']).includes('query_secret'));
  console.log('  ✓ 195.4 Sensitive credentials in span attributes are recursively redacted before buffering');

  // 195.5: Non-blocking silent fallback on network failure
  const prevEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:1/v1/traces';
  backendOtelEngine.setEnabled(true);
  let exportFailed = false;
  try {
    await browserOtelTracer.exportSpan(span);
    backendOtelEngine.recordSpan(span);
    await backendOtelEngine.drainExportQueue();
  } catch {
    exportFailed = true;
  } finally {
    if (prevEndpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = prevEndpoint;
  }
  assert.equal(exportFailed, false, 'exportSpan & drainExportQueue must catch network errors silently');
  console.log('  ✓ 195.5 Network unreachability for OTLP exporter handles failures silently without throwing');

  // Cleanup
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', false);
  featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  backendOtelEngine.setEnabled(false);
  browserOtelTracer.clearBuffer();
  backendOtelEngine.clear();
}
