/**
 * Test Suite 161: Secret Management & Security Observability (Phase 13.9, Task 10)
 *
 * Validates:
 * 161.1: auth_denied event emitted on invalid credentials without leaking the secret
 * 161.2: rate_limited event emitted with client IP and path when quota is exhausted
 * 161.3: bypass_attempt event logged when CI test secret is sent in production mode
 * 161.4: Security event store contains zero raw tokens across all recorded events
 * 161.5: Security observability events emit cleanly even when OpenTelemetry is disabled
 */

import assert from 'node:assert/strict';
import { securityEvents } from '../../src/services/auth/security-events';
import { authMiddleware } from '../../src/middleware/auth';
import { createRateLimitMiddleware } from '../../src/middleware/rate-limit';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import type { Request, Response } from 'express';

function createMockContext(options: {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  ip?: string;
}) {
  const req = {
    method: options.method ?? 'GET',
    path: options.path ?? '/api/v1/test',
    headers: options.headers ?? {},
    ip: options.ip ?? '192.168.1.50',
  } as unknown as Request;

  let statusCode = 200;
  let body: unknown = null;
  const headers: Record<string, string> = {};

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(b: unknown) {
      body = b;
      return this;
    },
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    getHeader(k: string) {
      return headers[k];
    },
  } as unknown as Response;

  return { req, res, getStatus: () => statusCode, getBody: () => body };
}

export async function runSuite161(): Promise<void> {
  console.log('Running Suite 161: Security Observability & Secret Leak Guard (5 sub-tests)...');
  securityEvents.clear();

  // 161.1: auth_denied event without token leak
  const leakedSecret = 'my-super-secret-token-xyz-12345';
  const ctx1 = createMockContext({
    headers: { authorization: `Bearer ${leakedSecret}` },
  });
  let next1 = false;
  authMiddleware(ctx1.req, ctx1.res, () => { next1 = true; });
  assert.equal(next1, false);
  assert.equal(ctx1.getStatus(), 401);

  const events1 = securityEvents.getEvents();
  const deniedEvent = events1.find(e => e.event === 'auth_denied');
  assert.ok(deniedEvent, 'Expected auth_denied event');
  assert.equal(JSON.stringify(deniedEvent).includes(leakedSecret), false, 'Raw token must NEVER appear in security logs');
  console.log('  ✓ 161.1 auth_denied event emitted without leaking credentials');

  // 161.2: rate_limited event emitted when quota is exhausted
  const testLimiter = createRateLimitMiddleware({
    windowMs: 500,
    maxRequests: 2,
    endpointName: 'test-limiter',
  });
  const ctx2a = createMockContext({ ip: '10.0.0.1', path: '/api/v1/resource' });
  const ctx2b = createMockContext({ ip: '10.0.0.1', path: '/api/v1/resource' });
  const ctx2c = createMockContext({ ip: '10.0.0.1', path: '/api/v1/resource' });

  testLimiter(ctx2a.req, ctx2a.res, () => {});
  testLimiter(ctx2b.req, ctx2b.res, () => {});
  testLimiter(ctx2c.req, ctx2c.res, () => {});
  assert.equal(ctx2c.getStatus(), 429);

  const rateEvents = securityEvents.getEvents().filter(e => e.event === 'rate_limited');
  assert.ok(rateEvents.length > 0, 'Expected rate_limited security event');
  assert.equal(rateEvents[0].ip, '10.0.0.1');
  console.log('  ✓ 161.2 rate_limited event emitted with client IP and path on quota exhaustion');

  // 161.3: bypass_attempt event logged in non-test mode
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const ctx3 = createMockContext({
      headers: { 'x-polyglot-test-secret': 'polyglot-ci-test-2026' },
    });
    let next3 = false;
    authMiddleware(ctx3.req, ctx3.res, () => { next3 = true; });
    assert.equal(next3, false);
    assert.equal(ctx3.getStatus(), 401);

    const bypassEvents = securityEvents.getEvents().filter(e => e.event === 'bypass_attempt');
    assert.ok(bypassEvents.length > 0, 'Expected bypass_attempt security event');
    console.log('  ✓ 161.3 bypass_attempt event logged when test secret presented in production');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  // 161.4: Zero raw secrets / tokens across all events
  const allEventsJson = JSON.stringify(securityEvents.getEvents());
  assert.equal(allEventsJson.includes(leakedSecret), false);
  assert.equal(allEventsJson.includes('polyglot-ci-test-2026'), false);
  console.log('  ✓ 161.4 Security event log verified free of raw secrets across all entries');

  // 161.5: Security observability events emit cleanly when OpenTelemetry is disabled
  featureFlagRegistry.set('ENABLE_OTEL_BROWSER', false);
  featureFlagRegistry.set('ENABLE_OTEL_NODE', false);
  securityEvents.emitAuthDenied('test-token-id', '127.0.0.1', '/api/v1/test-otel-disabled');
  const latestEvents = securityEvents.getEvents();
  assert.ok(latestEvents.some(e => e.path === '/api/v1/test-otel-disabled'));
  console.log('  ✓ 161.5 Security observability emits cleanly when OpenTelemetry is disabled');

  securityEvents.clear();
}

if (process.argv[1]?.endsWith('suite-161-security-observability.test.ts')) {
  runSuite161()
    .then(() => {
      console.log('Suite 161 passed (5/5 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
