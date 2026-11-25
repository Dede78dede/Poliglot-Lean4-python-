/**
 * Authentication & RBAC Middleware (Phase 13.9 + RBAC Extension)
 *
 * Epistemic & Security Rules:
 * 1. Requires valid Bearer token from TokenVault.
 * 2. CI test bypass header X-Polyglot-Test-Secret is permitted ONLY when
 *    NODE_ENV === 'test' AND ALLOW_CI_BYPASS === 'true'.
 * 3. Any bypass attempt in production or unauthorized environments yields 401
 *    and logs a security violation via securityEvents.emitBypassAttempt().
 * 4. SSE fallback allows ?token= query parameter with warning.
 * 5. Enforces role-based authorization via requireRole(...roles).
 */

import type { Request, Response, NextFunction } from 'express';
import { tokenVault } from '../services/auth/token-vault';
import { securityEvents } from '../services/auth/security-events';
import { ERROR_REGISTRY, createProblemDetails } from '../services/errors/error-registry';
import { APP_ROLES, hasRole, type AppRole } from '../services/auth/roles';

const DEFAULT_CI_TEST_SECRET = 'polyglot-ci-test-2026';

export interface AuthenticatedRequest extends Request {
  userTokenId?: string;
  userId?: string;
  userRole?: AppRole;
  userBaseRole?: AppRole;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  const expectedCiSecret = process.env.POLYGLOT_CI_TEST_SECRET?.trim() || DEFAULT_CI_TEST_SECRET;

  // 1. Check CI test secret bypass
  const testSecret = req.headers['x-polyglot-test-secret'];
  if (typeof testSecret === 'string' && (testSecret === expectedCiSecret || testSecret === DEFAULT_CI_TEST_SECRET)) {
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isBypassAllowed = process.env.ALLOW_CI_BYPASS === 'true';

    if (isTestEnv && isBypassAllowed) {
      authReq.userTokenId = 'ci-test-bypass';
      authReq.userId = 'ci-test-bypass';
      authReq.userRole = APP_ROLES.ADMIN;
      authReq.userBaseRole = APP_ROLES.ADMIN;
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
      reason: validation.expired ? 'Session Bearer token has expired.' : 'Invalid or revoked Bearer token.',
    });
    res.status(401).json(problem);
    return;
  }

  authReq.userTokenId = validation.tokenId;
  authReq.userId = validation.userId ?? validation.tokenId;
  authReq.userRole = validation.role ?? APP_ROLES.ADMIN;
  authReq.userBaseRole = validation.baseRole ?? authReq.userRole;
  return next();
}

export function requireRole(...allowedRoles: AppRole[]) {
  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    const authReq = req as AuthenticatedRequest;
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    const activeRole = authReq.userRole;

    if (!activeRole) {
      securityEvents.emitAuthDenied(authReq.userTokenId, req.ip, req.path);
      const problem = createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
        reason: 'Authentication context is missing for RBAC evaluation.',
      });
      res.status(401).json(problem);
      return;
    }

    if (!hasRole(activeRole, allowedRoles)) {
      securityEvents.emitAuthDenied(authReq.userTokenId, req.ip, req.path);
      const problem = createProblemDetails(ERROR_REGISTRY.FORBIDDEN_OPERATION, correlationId, {
        reason: `Role '${activeRole}' is not authorized. Required role: ${allowedRoles.join(' | ')}.`,
        activeRole,
        requiredRoles: allowedRoles,
      });
      res.status(403).json(problem);
      return;
    }

    next();
  };
}
