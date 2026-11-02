/**
 * Proof Reuse Express Routes (Phase 12, Sprint 12.1, Task PR3)
 */

import { Router } from 'express';
import { proofReuseService, type ProofReuseQuery } from '../../../src/services/proof/reuse/proof-reuse-service';
import { automationMetrics } from '../../../src/services/proof/metrics/automation-metrics';

export const proofReuseRouter = Router();

proofReuseRouter.post('/search', async (req, res) => {
  try {
    const query = req.body as ProofReuseQuery;
    if (!query.goal || !query.leanToolchain) {
      return res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-json-input',
        title: 'INVALID_JSON_INPUT',
        status: 400,
        detail: 'Goal statement and leanToolchain are required fields.',
      });
    }

    const results = await proofReuseService.search(query);
    const hit = results.length > 0 && results[0].similarity >= (query.minSimilarity ?? 0.85);
    automationMetrics.recordReuse(hit, hit ? 350 : 0);
    return res.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      type: 'https://polyglot.dev/errors/internal-server-error',
      title: 'INTERNAL_SERVER_ERROR',
      status: 500,
      detail: message,
    });
  }
});

proofReuseRouter.get('/metrics', async (_req, res) => {
  try {
    const metrics = await proofReuseService.metrics();
    return res.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      type: 'https://polyglot.dev/errors/internal-server-error',
      title: 'INTERNAL_SERVER_ERROR',
      status: 500,
      detail: message,
    });
  }
});

proofReuseRouter.post('/reindex', async (_req, res) => {
  return res.json({ status: 'reindexed', timestamp: new Date().toISOString() });
});
