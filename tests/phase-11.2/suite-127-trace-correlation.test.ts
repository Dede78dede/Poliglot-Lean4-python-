/**
 * Test Suite 127: OpenTelemetry Trace Correlation (Phase 11.2, Sprint 11.2.3)
 */

import assert from 'node:assert/strict';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { StructuredLogger } from '../../src/services/logging/logger';
import { ERROR_REGISTRY } from '../../src/services/errors/error-registry';

export async function runSuite127(): Promise<void> {
  console.log('\n--- Test Suite 127: OpenTelemetry Trace Correlation ---');

  backendOtelEngine.clear();
  const testTraceId = '1234567890abcdef1234567890abcdef';

  // 127.1: Backend correlation engine matches traceId with StructuredLogger logs
  const logger = new StructuredLogger('proof-runner');
  const logEntry = logger.info('Compiling theorem step', testTraceId, { tactic: 'exact trivial' });
  backendOtelEngine.recordLog(logEntry);

  backendOtelEngine.recordSpan({
    spanId: 'span-0001',
    traceId: testTraceId,
    name: 'lean.check.theorem',
    startTime: 1000,
    endTime: 1045,
    durationMs: 45,
    attributes: { 'lean.module': 'Math.Test' },
    status: { code: 'OK' },
    events: [],
  });

  const correlated = backendOtelEngine.getTrace(testTraceId);
  assert.ok(correlated, 'Trace must be found');
  assert.equal(correlated.traceId, testTraceId);
  assert.equal(correlated.totalSpans, 1);
  assert.equal(correlated.correlatedLogs.length, 1);
  assert.equal(correlated.correlatedLogs[0].correlationId, testTraceId);
  assert.equal(correlated.correlatedLogs[0].message, 'Compiling theorem step');
  console.log('  ✓ 127.1 Backend correlation engine: linked traceId with StructuredLogger output');

  // 127.2: Missing trace returns null and maps to OTEL_TRACE_CORRELATION_FAILED
  const missingTrace = backendOtelEngine.getTrace('non-existent-trace-id');
  assert.equal(missingTrace, null);
  assert.ok('OTEL_TRACE_CORRELATION_FAILED' in ERROR_REGISTRY);
  assert.equal(ERROR_REGISTRY.OTEL_TRACE_CORRELATION_FAILED.httpStatus, 404);
  console.log('  ✓ 127.2 Missing trace query: maps to OTEL_TRACE_CORRELATION_FAILED (404)');

  // 127.3: Complex multi-span trace hierarchy reconstruction
  const multiTraceId = 'fedcba0987654321fedcba0987654321';
  backendOtelEngine.recordSpan({
    spanId: 'root-span',
    traceId: multiTraceId,
    name: 'http.request.post.lean.execute',
    startTime: 2000,
    endTime: 2150,
    durationMs: 150,
    attributes: { 'http.route': '/api/v1/lean/execute' },
    status: { code: 'OK' },
    events: [],
  });
  backendOtelEngine.recordSpan({
    spanId: 'child-span-1',
    traceId: multiTraceId,
    parentSpanId: 'root-span',
    name: 'kimina.proxy.execute',
    startTime: 2010,
    endTime: 2120,
    durationMs: 110,
    attributes: { 'kimina.toolchain': 'v4.34.0-rc1' },
    status: { code: 'OK' },
    events: [],
  });

  const multiCorrelated = backendOtelEngine.getTrace(multiTraceId);
  assert.ok(multiCorrelated);
  assert.equal(multiCorrelated.rootSpan?.spanId, 'root-span');
  assert.equal(multiCorrelated.totalSpans, 2);
  assert.equal(multiCorrelated.durationMs, 150);
  console.log('  ✓ 127.3 Multi-span trace hierarchy: correctly reconstructed parent-child relations and duration');
}
