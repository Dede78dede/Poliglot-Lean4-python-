/**
 * Authentication Middleware (Phase 13.9, Tasks 03 & 10)
 *
 * Epistemic & Security Rules:
 * 1. Requires valid Bearer token from TokenVault.
 * 2. CI test bypass header X-Polyglot-Test-Secret is permitted ONLY when
 *    NODE_ENV === 'test' AND ALLOW_CI_BYPASS === 'true'.
 * 3. Any bypass attempt in production or unauthorized environments yields 401
 *    and logs a security violation via securityEvents.emitBypassAttempt().
 * 4. SSE fallback allows ?token= query parameter with warning.
 */

import type { Request, Response, NextFunction } from 'express';
import { tokenVault } from '../services/auth/token-vault';
import { securityEvents } from '../services/auth/security-events';
import { ERROR_REGISTRY, createProblemDetails } from '../services/errors/error-registry';

const CI_TEST_SECRET = 'polyglot-ci-test-2026';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

  // 1. Check CI test secret bypass
  const testSecret = req.headers['x-polyglot-test-secret'];
  if (testSecret === CI_TEST_SECRET) {
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isBypassAllowed = process.env.ALLOW_CI_BYPASS === 'true';

    if (isTestEnv && isBypassAllowed) {
      // Authorized test bypass
      (req as unknown as { userTokenId?: string }).userTokenId = 'ci-test-bypass';
      return next();
    }

    // Security violation: Test bypass attempt outside test env
    securityEvents.emitBypassAttempt(req.ip, req.path);
    const problem = createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
      reason: 'CI test bypass secret is forbidden in production or non-test environments.',
    });
    res.status(401).json(problem);
    return;
  }

  // 2. Extract Bearer token from Authorization header
  let rawToken: string | undefined;
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.slice(7).trim();
  } else if (typeof req.query.token === 'string') {
    // SSE fallback
    rawToken = req.query.token.trim();
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[SECURITY_NOTICE] Token passed via URL query parameter on ${req.path}`);
    }
  }

  if (!rawToken) {
    securityEvents.emitAuthDenied(undefined, req.ip, req.path);
    const problem = createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
      reason: 'Missing Authorization header with Bearer token.',
    });
    res.status(401).json(problem);
    return;
  }

  // 3. Validate token against TokenVault
  const validation = tokenVault.validateToken(rawToken);
  if (!validation.valid) {
    securityEvents.emitAuthDenied(validation.tokenId, req.ip, req.path);
    const problem = createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
      reason: 'Invalid or revoked Bearer token.',
    });
    res.status(401).json(problem);
    return;
  }

  (req as unknown as { userTokenId?: string }).userTokenId = validation.tokenId;
  return next();
}
