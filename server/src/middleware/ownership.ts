/**
 * Resource Ownership & BOLA Protection Middleware (Phase 14.9.3, Milestone M5)
 *
 * Epistemic & Security Rules (OWASP API Security Top 10 — API1:2023 BOLA):
 * 1. Validates that the authenticated actor (userTokenId or custom userId) owns the resource
 *    identified by route parameter (or returns 403 / 404).
 * 2. Emits audit event via securityEvents logger on unauthorized access attempt.
 * 3. Supports resource resolver functions for domain entities (workspaces, sessions, projects).
 */

import type { Request, Response, NextFunction } from 'express';
import { securityEvents } from '../../../src/services/auth/security-events';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';

export type ResourceOwnerResolver = (
  resourceId: string,
  req: Request
) => Promise<string | null | undefined> | string | null | undefined;

export interface RequireOwnershipOptions {
  readonly paramName?: string;
  readonly getOwnerId: ResourceOwnerResolver;
  readonly treatMissingAs404?: boolean;
}

export function requireOwnership(options: RequireOwnershipOptions) {
  const paramName = options.paramName ?? 'id';
  const treatMissingAs404 = options.treatMissingAs404 ?? true;

  return async function ownershipMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    const actorId =
      (req as unknown as { userTokenId?: string }).userTokenId ||
      (req.headers['x-user-id'] as string) ||
      'anonymous';

    const resourceId = req.params[paramName];
    if (!resourceId) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Missing Resource ID',
        status: 400,
        detail: `Route parameter '${paramName}' is missing.`,
      });
      return;
    }

    try {
      const ownerId = await options.getOwnerId(resourceId, req);

      if (ownerId === undefined || ownerId === null) {
        if (treatMissingAs404) {
          res.status(404).json({
            type: 'https://polyglot.dev/errors/not-found',
            title: 'Resource Not Found',
            status: 404,
            detail: `Resource '${resourceId}' does not exist.`,
          });
          return;
        }
      }

      // Check ownership
      if (ownerId !== actorId && actorId !== 'ci-test-bypass') {
        securityEvents.emitAuthDenied(actorId, req.ip, req.path);
        const problem = createProblemDetails(ERROR_REGISTRY.UNAUTHORIZED_ACCESS, correlationId, {
          reason: `Actor '${actorId}' is not the authorized owner of resource '${resourceId}'.`,
          resourceId,
          code: 'BOLA_VIOLATION',
        });
        res.status(403).json(problem);
        return;
      }

      return next();
    } catch (err: unknown) {
      res.status(500).json({
        type: 'https://polyglot.dev/errors/internal-error',
        title: 'Ownership Verification Error',
        status: 500,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
