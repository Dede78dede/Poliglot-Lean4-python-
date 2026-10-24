/**
 * FEMEV & Paperproof Routes (Phase 10.9.5, Task S3)
 *
 * Implements POST /api/v1/femev/:id/paperproof.
 * Gated by ENABLE_PAPERPROOF feature flag and emits RFC 9457 ProblemDetails.
 */

import { Router, type Request, type Response } from 'express';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { paperproofClient } from '../../src/services/femev/paperproof-client';
import { BridgeError } from '../../src/services/errors/bridge-error';
import { ERROR_REGISTRY, createProblemDetails } from '../../src/services/errors/error-registry';
import { StructuredLogger } from '../../src/services/logging/logger';

export function createFemevRouter(): Router {
  const router = Router();

  router.post('/:id/paperproof', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || StructuredLogger.generateCorrelationId();
    const { id } = req.params;
    const { leanCode = 'theorem default_thm : 1 + 1 = 2 := by rfl' } = req.body || {};

    if (!featureFlagRegistry.isEnabled('ENABLE_PAPERPROOF')) {
      const def = ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE;
      const problem = createProblemDetails(def, correlationId, {
        featureFlag: 'ENABLE_PAPERPROOF',
        reason: 'Feature flag ENABLE_PAPERPROOF is disabled. Enable in Settings -> Feature Flags.',
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      return res.status(503).json(problem);
    }

    try {
      const tree = await paperproofClient.generateProofTree(leanCode, {
        theoremName: id,
        correlationId,
      });
      res.setHeader('x-correlation-id', correlationId);
      return res.status(200).json(tree);
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.setHeader('x-correlation-id', err.correlationId);
        return res.status(err.httpStatus).json(err.toProblemDetails());
      }
      const def = ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE;
      const fallbackProblem = createProblemDetails(def, correlationId, {
        error: err instanceof Error ? err.message : String(err),
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      return res.status(503).json(fallbackProblem);
    }
  });

  return router;
}
