/**
 * Test Suite 179: Observability, Trace Correlation & Security Events (Phase 14.9.3, Milestone M6)
 *
 * Validates:
 * 179.1: StructuredLogger incorporates traceId and spanId alongside correlationId.
 * 179.2: W3C traceparent header parsing parses version-traceId-spanId-flags.
 * 179.3: SecurityEventService emits structured records with trace context independently of OTel flags.
 * 179.4: Raw tokens are never logged in security events (sanitized or opaque).
 */

import assert from 'node:assert/strict';
import { StructuredLogger, createLogger } from '../../src/services/logging/logger';
import { serverSecurityEvents } from '../../server/src/services/telemetry/security-events';

export async function runSuite179(): Promise<void> {
  console.log('Running Suite 179: Observability & Trace Correlation (4 sub-tests)...');

  // 179.1: StructuredLogger with traceId and spanId
  const testLogger = createLogger('test-telemetry');
  const traceId = StructuredLogger.generateTraceId();
  const spanId = StructuredLogger.generateSpanId();
  const correlationId = StructuredLogger.generateCorrelationId();

  StructuredLogger.setTraceContext({ traceId, spanId });

  const entry = testLogger.info('Testing trace correlation', correlationId);
  assert.equal(entry.traceId, traceId, 'Log entry must carry traceId from context');
  assert.equal(entry.spanId, spanId, 'Log entry must carry spanId from context');
  assert.equal(entry.correlationId, correlationId, 'Log entry must carry correlationId');
  console.log('  ✓ 179.1 StructuredLogger correlates logs with traceId, spanId and correlationId');

  // 179.2: W3C traceparent header parsing
  const rawTraceParent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const parsed = StructuredLogger.parseTraceParent(rawTraceParent);
  assert.ok(parsed, 'Valid W3C traceparent must parse successfully');
  assert.equal(parsed.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(parsed.spanId, '00f067aa0ba902b7');

  const invalidParse = StructuredLogger.parseTraceParent('invalid-format');
  assert.equal(invalidParse, undefined, 'Invalid traceparent must return undefined');
  console.log('  ✓ 179.2 W3C traceparent parser parses 32-char traceId and 16-char spanId');

  // 179.3: SecurityEventService emits events independently of OTel
  serverSecurityEvents.clear();
  const secEvent = serverSecurityEvents.emitRateLimited('user-test-token', '192.168.1.1', '/api/v1/projects', correlationId);
  assert.equal(secEvent.event, 'rate_limited');
  assert.equal(secEvent.correlationId, correlationId);
  assert.equal(secEvent.traceId, traceId);
  assert.equal(secEvent.spanId, spanId);
  assert.equal(serverSecurityEvents.getEvents().length, 1);
  console.log('  ✓ 179.3 SecurityEventService emits structured records with trace correlation');

  // 179.4: Raw tokens are NEVER logged in security events
  const sensitiveRawToken = 'polyglot_raw_token_super_secret_string_base64_long_value==';
  const deniedEvent = serverSecurityEvents.emitAuthDenied(sensitiveRawToken, '10.0.0.1', '/api/v1/auth');
  assert.ok(
    !JSON.stringify(deniedEvent).includes(sensitiveRawToken),
    'Sensitive raw token string must NEVER appear in security event payload'
  );
  assert.ok(deniedEvent.tokenId?.startsWith('opaque_ref_'), 'Raw token must be sanitized to opaque reference');
  console.log('  ✓ 179.4 Strict secret hygiene: sensitive raw tokens sanitized to opaque references');

  // Reset context
  StructuredLogger.setTraceContext(undefined);
}

if (process.argv[1]?.endsWith('suite-179-observability.test.ts')) {
  runSuite179()
    .then(() => {
      console.log('Suite 179 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
