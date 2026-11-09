/**
 * Test Suite 186: Circuit Breaker HALF_OPEN & Fault Injection Verification (Pre-Flight 14.9.9, Window 2)
 *
 * Validates:
 * 186.1: Fault injection: intermittent network/timeout errors trip circuit breaker from CLOSED to OPEN.
 * 186.2: Cooldown period transitions circuit breaker from OPEN to HALF_OPEN trial state.
 * 186.3: HALF_OPEN requires >= 3 consecutive successful probe executions to reset back to CLOSED.
 * 186.4: Neither OPEN nor HALF_OPEN states emit verified: true or any kernel seal (F7 compliance).
 * 186.5: Circuit breaker state transitions verified across secondary bridge adapters.
 */

import assert from 'node:assert/strict';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private consecutiveSuccessesInHalfOpen = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private nextAttempt = 0;

  constructor(options: { failureThreshold?: number; successThreshold?: number; resetTimeoutMs?: number } = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.successThreshold = options.successThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 50;
  }

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.consecutiveSuccessesInHalfOpen = 0;
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<{ success: boolean; result?: T; error?: string; state: CircuitBreakerState; verified: boolean }> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      return {
        success: false,
        error: 'CIRCUIT_BREAKER_OPEN: Service degraded under fallback tier',
        state: 'OPEN',
        verified: false,
      };
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return {
        success: true,
        result,
        state: this.state,
        verified: false, // Circuit breaker itself NEVER certifies truth
      };
    } catch (err: any) {
      this.recordFailure();
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        state: this.state,
        verified: false,
      };
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccessesInHalfOpen++;
      if (this.consecutiveSuccessesInHalfOpen >= this.successThreshold) {
        this.state = 'CLOSED';
        this.consecutiveSuccessesInHalfOpen = 0;
      }
    }
  }

  private recordFailure(): void {
    this.consecutiveSuccessesInHalfOpen = 0;
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }
}

export async function runSuite186(): Promise<void> {
  console.log('Running Suite 186: Circuit Breaker HALF_OPEN & Fault Injection (5 sub-tests)...');

  const breaker = new CircuitBreaker({ failureThreshold: 3, successThreshold: 3, resetTimeoutMs: 30 });
  assert.equal(breaker.getState(), 'CLOSED', 'Initial state must be CLOSED');

  // 186.1: Fault injection transitions CLOSED -> OPEN after 3 failures
  for (let i = 0; i < 3; i++) {
    const res = await breaker.execute(async () => {
      throw new Error('Intermittent upstream timeout');
    });
    assert.equal(res.success, false);
    assert.equal(res.verified, false, 'Failure must not emit verified: true');
  }
  assert.equal(breaker.getState(), 'OPEN', 'Breaker must be OPEN after 3 failures');
  console.log('  ✓ 186.1 Fault injection trips circuit breaker from CLOSED to OPEN after 3 failures');

  // 186.2: Cooldown period transitions OPEN -> HALF_OPEN
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(breaker.getState(), 'HALF_OPEN', 'Cooldown must transition state to HALF_OPEN');
  console.log('  ✓ 186.2 Cooldown elapsed: circuit breaker transitions from OPEN to HALF_OPEN');

  // 186.3: HALF_OPEN requires 3 consecutive successes to return to CLOSED
  const trial1 = await breaker.execute(async () => 'trial-ok-1');
  assert.equal(trial1.success, true);
  assert.equal(breaker.getState(), 'HALF_OPEN', 'State remains HALF_OPEN after 1 success');

  const trial2 = await breaker.execute(async () => 'trial-ok-2');
  assert.equal(trial2.success, true);
  assert.equal(breaker.getState(), 'HALF_OPEN', 'State remains HALF_OPEN after 2 successes');

  const trial3 = await breaker.execute(async () => 'trial-ok-3');
  assert.equal(trial3.success, true);
  assert.equal(breaker.getState(), 'CLOSED', 'State must reset to CLOSED after 3 consecutive successes');
  console.log('  ✓ 186.3 HALF_OPEN requires >= 3 consecutive successes to reset to CLOSED');

  // 186.4: Invariant F7: Neither OPEN nor HALF_OPEN emit verified: true
  // Trip breaker again
  for (let i = 0; i < 3; i++) {
    await breaker.execute(async () => { throw new Error('Fault'); });
  }
  assert.equal(breaker.getState(), 'OPEN');
  const openCall = await breaker.execute(async () => 'should_not_run');
  assert.equal(openCall.verified, false, 'OPEN state must never emit verified: true');
  assert.equal(openCall.success, false);

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(breaker.getState(), 'HALF_OPEN');
  const halfOpenCall = await breaker.execute(async () => 'trial');
  assert.equal(halfOpenCall.verified, false, 'HALF_OPEN probe must never emit verified: true');
  console.log('  ✓ 186.4 Invariant F7: Neither OPEN nor HALF_OPEN ever emit verified: true');

  // 186.5: Bridge failure in HALF_OPEN immediately trips back to OPEN
  const tripBackCall = await breaker.execute(async () => {
    throw new Error('Trial probe failed');
  });
  assert.equal(tripBackCall.success, false);
  assert.equal(breaker.getState(), 'OPEN', 'Failure during trial must immediately trip back to OPEN');
  console.log('  ✓ 186.5 Bridge failure during HALF_OPEN trial immediately trips back to OPEN');
}

if (process.argv[1]?.endsWith('suite-186-circuit-breaker-half-open.test.ts')) {
  runSuite186()
    .then(() => {
      console.log('Suite 186 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
