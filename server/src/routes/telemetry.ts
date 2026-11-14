/**
 * Telemetry Routes (Phase 11.2 & Phase 15 Wave 1)
 *
 * Implements:
 * - GET /api/v1/telemetry/trace/:traceId (fetch correlated trace with spans and logs)
 * - POST /api/v1/telemetry/spans (ingest spans from frontend tracer with Zod validation + redaction)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { backendOtelEngine } from '../../../src/services/telemetry/otel-backend';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';
import { redactSensitiveData } from '../../../src/services/logging/logger';

const SpanEventSchema = z.object({
  name: z.string().min(1),
  time: z.number(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

const SpanPayloadSchema = z.object({
  span: z.object({
    spanId: z.string().min(1),
    traceId: z.string().min(1),
    parentSpanId: z.string().optional(),
    name: z.string().min(1).default('client_span'),
    startTime: z.number().default(() => Date.now()),
    endTime: z.number().default(() => Date.now()),
    durationMs: z.number().nonnegative().default(0),
    attributes: z.record(z.string(), z.unknown()).default({}),
    status: z
      .object({
        code: z.enum(['OK', 'ERROR', 'UNSET']),
        message: z.string().optional(),
      })
      .default({ code: 'OK' }),
    events: z.array(SpanEventSchema).default([]),
  }),
});

export function createTelemetryRouter(): Router {
  const router = Router();

  router.get('/trace/:traceId', (req: Request, res: Response) => {
    const correlationId = String(req.headers['x-correlation-id'] || req.params.traceId || 'telemetry');
    if (!backendOtelEngine.isEnabled()) {
      res.status(503).json(
        createProblemDetails(ERROR_REGISTRY.FEATURE_DISABLED, correlationId, {
          feature: 'ENABLE_OTEL_NODE',
          detail: 'Backend OpenTelemetry is disabled by feature flag ENABLE_OTEL_NODE=false',
        })
      );
      return;
    }

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
    const correlationId = String(req.headers['x-correlation-id'] || 'telemetry-ingest');
    if (!backendOtelEngine.isEnabled()) {
      res.status(503).json(
        createProblemDetails(ERROR_REGISTRY.FEATURE_DISABLED, correlationId, {
          feature: 'ENABLE_OTEL_NODE',
          detail: 'Backend OpenTelemetry is disabled by feature flag ENABLE_OTEL_NODE=false',
        })
      );
      return;
    }

    try {
      const parsed = SpanPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        });
        return;
      }

      const sanitized = {
        ...parsed.data.span,
        attributes: (redactSensitiveData(parsed.data.span.attributes) as Record<string, unknown>) || {},
      };

      backendOtelEngine.recordSpan(sanitized);
      res.status(201).json({ success: true, spanId: sanitized.spanId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  return router;
}
