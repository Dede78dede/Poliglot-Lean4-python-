/**
 * Test Suite 193: Deterministic Rate-Limit Burst Tests (Phase 14.9.9.2, G-P11)
 *
 * Validates configured rate limiting policies using deterministic clock injection:
 * 193.1: General API limiter: 100 req/60s policy (150 burst requests -> exactly 100 accepted, 50 HTTP 429).
 * 193.2: HTTP Header contract: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and Retry-After.
 * 193.3: MCP limiter: 30 req/60s policy (40 burst requests -> exactly 30 accepted, 10 HTTP 429).
 * 193.4: Window expiry: advancing deterministic clock by 60s resets quota completely.
 * 193.5: Identity isolation: Client A exhausting quota does not impact Client B.
 */

import assert from 'node:assert/strict';
import { createRateLimitMiddleware } from '../../src/middleware/rate-limit';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
}

function createMockReqRes(options: { ip?: string; tokenId?: string; headers?: Record<string, string> } = {}) {
  let currentTime = 100_000;
  const clock = () => currentTime;
  const advanceClock = (ms: number) => { currentTime += ms; };

  const req: any = {
    ip: options.ip ?? '192.168.1.100',
    path: '/api/v1/test',
    userTokenId: options.tokenId,
    headers: options.headers ?? {},
  };

  const createRes = (): MockResponse => {
    const res: MockResponse = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  return { req, createRes, clock, advanceClock };
}

export async function runSuite193(): Promise<void> {
  console.log('Running Suite 193: Deterministic Rate-Limit Burst Tests (5 sub-tests)...');

  // 193.1: General API limiter (100 req / 60s) — exactly 100 accepted, 50 rejected out of 150
  let simulatedTime = 1_000_000;
  const apiLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 100,
    keyPrefix: 'test-api',
    getNow: () => simulatedTime,
  });

  let acceptedCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < 150; i++) {
    const { req, createRes } = createMockReqRes({ ip: '10.0.0.1' });
    const res = createRes();
    let nextCalled = false;

    apiLimiter(req, res as any, () => { nextCalled = true; });

    if (nextCalled) {
      acceptedCount++;
      assert.equal(res.statusCode, 200);
    } else {
      rejectedCount++;
      assert.equal(res.statusCode, 429);
      assert.ok(res.headers['retry-after'], 'HTTP 429 must include Retry-After header');
    }
  }

  assert.equal(acceptedCount, 100, 'Expected exactly 100 accepted requests under general limiter');
  assert.equal(rejectedCount, 50, 'Expected exactly 50 rate-limited requests under general limiter');
  console.log('  ✓ 193.1 General API burst: 150 requests yielded exactly 100 accepted and 50 rate-limited');

  // 193.2: HTTP Header contract validation
  const { req: headerReq, createRes: headerCreateRes } = createMockReqRes({ ip: '10.0.0.2' });
  const freshRes = headerCreateRes();
  apiLimiter(headerReq, freshRes as any, () => {});

  assert.equal(freshRes.headers['x-ratelimit-limit'], '100');
  assert.equal(freshRes.headers['x-ratelimit-remaining'], '100');
  assert.equal(freshRes.headers['x-ratelimit-reset'], '60');

  // Second request from same client decrements remaining to 99
  const secondRes = headerCreateRes();
  apiLimiter(headerReq, secondRes as any, () => {});
  assert.equal(secondRes.headers['x-ratelimit-remaining'], '99');
  console.log('  ✓ 193.2 Header contract: X-RateLimit-Limit, Remaining, and Reset match specifications');

  // 193.3: MCP limiter (30 req / 60s) — exactly 30 accepted, 10 rejected out of 40
  const mcpLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'test-mcp',
    getNow: () => simulatedTime,
  });

  let mcpAccepted = 0;
  let mcpRejected = 0;

  for (let i = 0; i < 40; i++) {
    const { req, createRes } = createMockReqRes({ ip: '10.0.0.3' });
    const res = createRes();
    let nextCalled = false;

    mcpLimiter(req, res as any, () => { nextCalled = true; });

    if (nextCalled) {
      mcpAccepted++;
    } else {
      mcpRejected++;
      assert.equal(res.statusCode, 429);
    }
  }

  assert.equal(mcpAccepted, 30, 'Expected exactly 30 accepted requests under MCP limiter');
  assert.equal(mcpRejected, 10, 'Expected exactly 10 rate-limited requests under MCP limiter');
  console.log('  ✓ 193.3 MCP limiter burst: 40 requests yielded exactly 30 accepted and 10 rate-limited');

  // 193.4: Window expiry and replenishment
  simulatedTime += 61_000; // Advance past the 60s sliding window
  const expiredRes = headerCreateRes();
  let expiredNext = false;
  apiLimiter(headerReq, expiredRes as any, () => { expiredNext = true; });

  assert.equal(expiredNext, true, 'Request after window expiry must be accepted');
  assert.equal(expiredRes.headers['x-ratelimit-remaining'], '100');
  console.log('  ✓ 193.4 Window expiry: Clock advancement past 60s successfully replenishes quota');

  // 193.5: Identity and token isolation
  const { req: clientAReq, createRes: createResA } = createMockReqRes({ tokenId: 'token-user-a' });
  const { req: clientBReq, createRes: createResB } = createMockReqRes({ tokenId: 'token-user-b' });

  // Exhaust client A on isolated limiter
  const isolatedLimiter = createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 5,
    keyPrefix: 'test-iso',
    getNow: () => simulatedTime,
  });

  for (let i = 0; i < 5; i++) {
    isolatedLimiter(clientAReq, createResA() as any, () => {});
  }
  const clientABlocked = createResA();
  let clientANext = false;
  isolatedLimiter(clientAReq, clientABlocked as any, () => { clientANext = true; });
  assert.equal(clientANext, false, 'Client A must be blocked after 5 requests');
  assert.equal(clientABlocked.statusCode, 429);

  // Client B makes fresh request
  const clientBRes = createResB();
  let clientBNext = false;
  isolatedLimiter(clientBReq, clientBRes as any, () => { clientBNext = true; });
  assert.equal(clientBNext, true, 'Client B must remain unaffected by Client A exhaustion');
  assert.equal(clientBRes.statusCode, 200);
  console.log('  ✓ 193.5 Identity isolation: Rate limits strictly segregated per client identifier');
}

if (process.argv[1]?.endsWith('suite-193-rate-limiting.test.ts')) {
  runSuite193()
    .then(() => {
      console.log('Suite 193 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
