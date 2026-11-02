/**
 * Translation Express Routes (Phase 12, Sprint 12.3, Task TF3)
 */

import { Router } from 'express';
import { translationFidelityGate, type FidelityCheckRequest } from '../../../src/services/translation/fidelity-gate';
import { lp2Adapter } from '../../../src/services/translation/lp2-adapter';
import { automationMetrics } from '../../../src/services/proof/metrics/automation-metrics';

export const translationRouter = Router();

translationRouter.post('/fidelity-check', async (req, res) => {
  try {
    const request = req.body as FidelityCheckRequest;
    if (!request.direction || !request.source || !request.target) {
      return res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-json-input',
        title: 'INVALID_JSON_INPUT',
        status: 400,
        detail: 'direction, source, and target are required fields.',
      });
    }

    const result = await translationFidelityGate.check(request);
    automationMetrics.recordTranslation(result.passed);
    return res.json(result);
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

translationRouter.post('/lp2', async (req, res) => {
  if (!lp2Adapter.isEnabled()) {
    return res.status(404).json({
      type: 'https://polyglot.dev/errors/resource-not-found',
      title: 'RESOURCE_NOT_FOUND',
      status: 404,
      detail: 'LP² adapter is disabled by feature flag ENABLE_LP2=false.',
    });
  }

  try {
    const { direction, source } = req.body as { direction: 'py2lean' | 'lean2py'; source: string };
    if (!direction || !source) {
      return res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-json-input',
        title: 'INVALID_JSON_INPUT',
        status: 400,
        detail: 'direction and source are required.',
      });
    }

    const result = direction === 'py2lean'
      ? await lp2Adapter.pyToLean(source)
      : await lp2Adapter.leanToPy(source);

    return res.json(result);
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
