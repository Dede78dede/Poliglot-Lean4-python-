/**
 * Cross-Artifact Search Express Routes (Phase 13, Sprint 13.6, SCH2)
 */

import { Router } from 'express';
import { crossArtifactSearch, type SearchCorpus } from '../../../src/services/search/cross-artifact-search';
import { createSuccessEnvelope, createErrorEnvelope } from '../../../src/shared/contracts/result-envelope';

export const searchRouter = Router();

// GET /api/v1/search/cross - Query across artifacts
searchRouter.get('/cross', (req, res) => {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    return res.status(400).json(
      createErrorEnvelope('INVALID_JSON_INPUT', 'Query parameter q is required.')
    );
  }

  const corporaQuery = req.query.corpora ? String(req.query.corpora).split(',') as SearchCorpus[] : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  const start = performance.now();
  const hits = crossArtifactSearch.search(query, {
    corpora: corporaQuery,
    limit,
  });
  const durationMs = performance.now() - start;

  return res.json(
    createSuccessEnvelope({
      query,
      hits,
      totalHits: hits.length,
      durationMs: Number(durationMs.toFixed(2)),
    })
  );
});

// POST /api/v1/search/reindex - Trigger full corpus indexing
searchRouter.post('/reindex', (req, res) => {
  const { documents } = req.body as { documents?: unknown[] };
  if (!Array.isArray(documents)) {
    return res.status(400).json(
      createErrorEnvelope('INVALID_JSON_INPUT', 'documents must be an array of SearchDocument.')
    );
  }

  crossArtifactSearch.indexBatch(documents as any);
  return res.json(
    createSuccessEnvelope({
      indexedCount: crossArtifactSearch.getDocumentCount(),
      message: 'Search corpus reindexed successfully.',
    })
  );
});
