/**
 * Blueprint Routes (Phase 10.9.7, Task BG2)
 *
 * Implements POST /api/v1/blueprint/:id/generate-stubs.
 * Generates Lean 4 stubs using BlueprintStubGenerator.
 * Gated by feature flag and rate limited (5 requests/minute per session).
 * Emits RFC 9457 ProblemDetails and structured logging with correlationId.
 */

import { Router, type Request, type Response } from 'express';
import { blueprintStubGenerator, type BlueprintDag, type BlueprintStubOptions } from '../../../src/services/blueprint/blueprint-stub-generator';
import { BridgeError } from '../../../src/services/errors/bridge-error';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';
import { StructuredLogger, createLogger } from '../../../src/services/logging/logger';
import type { WorkspaceStore } from '../services/collaboration/workspace-store';

// In-memory sliding window rate limiter: 5 requests per 60 seconds per session/IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const sessionRequestTimestamps = new Map<string, number[]>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const timestamps = sessionRequestTimestamps.get(sessionId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    sessionRequestTimestamps.set(sessionId, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  sessionRequestTimestamps.set(sessionId, validTimestamps);
  return true;
}

export function createBlueprintRouter(workspaceStore?: WorkspaceStore): Router {
  const router = Router();
  const logger = createLogger('BlueprintRouter');

  router.post('/:id/generate-stubs', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || StructuredLogger.generateCorrelationId();
    const sessionId = (req.headers['x-session-id'] as string) || req.ip || 'anonymous-session';
    const { id } = req.params;

    // 1. Rate Limiting Check
    if (!checkRateLimit(sessionId)) {
      const def = ERROR_REGISTRY.BUDGET_EXHAUSTED;
      const problem = createProblemDetails(def, correlationId, {
        limit: MAX_REQUESTS_PER_WINDOW,
        windowMs: RATE_LIMIT_WINDOW_MS,
        message: 'Blueprint stub generation rate limit exceeded: maximum 5 requests per minute.',
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      return res.status(429).json(problem);
    }

    const options: BlueprintStubOptions = req.body?.options || {
      moduleName: `Blueprint.${id.replace(/[^a-zA-Z0-9]/g, '_')}`,
      correlationId,
    };

    // 2. Resolve DAG: either passed in body or resolved from workspace store
    let dag: BlueprintDag | undefined = req.body?.dag;
    if (!dag && workspaceStore) {
      const ws = workspaceStore.getWorkspace(id);
      if (ws) {
        dag = {
          id: ws.id,
          nodes: ws.nodes,
          edges: ws.edges,
        };
      }
    }

    if (!dag) {
      // If neither was provided, check if fallback DAG or error
      const def = ERROR_REGISTRY.BLUEPRINT_STUB_GENERATION_FAILED;
      const problem = createProblemDetails(def, correlationId, {
        reason: `Workspace or Blueprint DAG with ID '${id}' not found and no DAG payload provided.`,
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      return res.status(404).json(problem);
    }

    try {
      logger.info(`Generating blueprint stubs for blueprint ${id}`, correlationId);
      const result = await blueprintStubGenerator.generateStub(dag, {
        ...options,
        correlationId,
      });

      res.setHeader('x-correlation-id', correlationId);
      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.setHeader('x-correlation-id', err.correlationId);
        return res.status(err.httpStatus).json(err.toProblemDetails());
      }

      logger.error('Unexpected error during blueprint stub generation', correlationId, {
        error: err instanceof Error ? err.message : String(err),
      });

      const def = ERROR_REGISTRY.BLUEPRINT_STUB_GENERATION_FAILED;
      const fallbackProblem = createProblemDetails(def, correlationId, {
        error: err instanceof Error ? err.message : String(err),
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      return res.status(500).json(fallbackProblem);
    }
  });

  return router;
}
