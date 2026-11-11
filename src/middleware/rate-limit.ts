/**
 * In-Memory Sliding-Window Rate Limiting Middleware (Phase 13.9, Task 03)
 *
 * Operational Constraints:
 * 1. Single-process in-memory limiter (documented in docs/architecture/rate-limiting.md).
 * 2. Emits X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.
 * 3. On 429 returns Retry-After header and logs security event via securityEvents.emitRateLimited().
 */

import type { Request, Response, NextFunction } from 'express';
import { securityEvents } from '../services/auth/security-events';
import { ERROR_REGISTRY, createProblemDetails } from '../services/errors/error-registry';

export interface RateLimitOptions {
  readonly windowMs?: number;     // Window duration in ms (default: 60,000)
  readonly maxRequests?: number;  // Max requests per window (default: 100)
  readonly keyPrefix?: string;
  readonly getNow?: () => number;
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 100;
  const keyPrefix = options.keyPrefix ?? 'global';
  const getNow = options.getNow ?? (() => Date.now());

  // Map of clientIdentifier -> array of request timestamps
  const clients = new Map<string, number[]>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    const tokenUser = (req as unknown as { userTokenId?: string }).userTokenId;
    const clientKey = `${keyPrefix}:${tokenUser || req.ip || '127.0.0.1'}`;

    const now = getNow();
    const windowStart = now - windowMs;

    let timestamps = clients.get(clientKey) ?? [];
    // Evict timestamps outside current sliding window
    timestamps = timestamps.filter((t) => t > windowStart);

    const remaining = Math.max(0, maxRequests - timestamps.length);
    const resetSeconds = Math.ceil(windowMs / 1000);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));

      securityEvents.emitRateLimited(tokenUser, req.ip, req.path);

      const problem = createProblemDetails(ERROR_REGISTRY.RATE_LIMIT_EXCEEDED, correlationId, {
        limit: maxRequests,
        windowMs,
        retryAfterSeconds,
      });

      res.status(429).json(problem);
      return;
    }

    timestamps.push(now);
    clients.set(clientKey, timestamps);
    return next();
  };
}

export const standardRateLimiter = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 100 });
export const mcpRateLimiter = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 30, keyPrefix: 'mcp' });
