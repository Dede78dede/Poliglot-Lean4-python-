/**
 * Telemetry Routes (Phase 11.2, Sprint 11.2.3)
 *
 * Implements:
 * - GET /api/v1/telemetry/trace/:traceId (fetch correlated trace with spans and logs)
 * - POST /api/v1/telemetry/spans (ingest spans from frontend tracer)
 */

import { Router, Request, Response } from 'express';
import { backendOtelEngine } from '../../../src/services/telemetry/otel-backend';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';

export function createTelemetryRouter(): Router {
  const router = Router();

  router.get('/trace/:traceId', (req: Request, res: Response) => {
    try {
      const { traceId } = req.params;
      if (!traceId) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'traceId parameter is required' });
        return;
      }

      const trace = backendOtelEngine.getTrace(traceId);
      if (!trace) {
        const problem = createProblemDetails(
          ERROR_REGISTRY.OTEL_TRACE_CORRELATION_FAILED,
          traceId,
          { traceId, detail: 'Trace ID not found or has expired from in-memory trace buffer' }
        );
        res.status(404).json(problem);
        return;
      }

      res.status(200).json(trace);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  router.post('/spans', (req: Request, res: Response) => {
    try {
      const { span } = req.body || {};
      if (!span || !span.traceId || !span.spanId) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Valid span object required' });
        return;
      }

      backendOtelEngine.recordSpan(span);
      res.status(201).json({ success: true, spanId: span.spanId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  return router;
}
