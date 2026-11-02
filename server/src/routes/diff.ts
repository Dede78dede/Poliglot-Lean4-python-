/**
 * Structural AST Diff Express Routes (Phase 13, Sprint 13.6, DIF2)
 */

import { Router } from 'express';
import { structuralDiffEngine } from '../../../src/services/diff/structural-diff';
import { createSuccessEnvelope, createErrorEnvelope } from '../../../src/shared/contracts/result-envelope';

export const diffRouter = Router();

diffRouter.post('/structural', (req, res) => {
  const { originalSource, modifiedSource } = req.body as {
    originalSource?: string;
    modifiedSource?: string;
  };

  if (typeof originalSource !== 'string' || typeof modifiedSource !== 'string') {
    return res.status(400).json(
      createErrorEnvelope(
        'INVALID_JSON_INPUT',
        'Both originalSource and modifiedSource must be provided as strings.'
      )
    );
  }

  try {
    const result = structuralDiffEngine.diff(originalSource, modifiedSource);
    return res.json(createSuccessEnvelope(result));
  } catch (err) {
    return res.status(500).json(
      createErrorEnvelope('STRUCTURAL_DIFF_UNAVAILABLE', String(err))
    );
  }
});
