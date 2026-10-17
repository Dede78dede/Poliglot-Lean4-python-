import { Router, type Request, type Response } from 'express';
import { fixPythonCode } from '../services/autocorrect/ruff-fixer';
import { leanProbeClient } from '../services/autocorrect/leanprobe-client';
import { analyzePythonFeedback } from '../services/autocorrect/python-feedback';
import { leanstralRepairService } from '../services/autocorrect/leanstral-repair';
import { repairPythonWithContractGate } from '../services/autocorrect/pyfixer-style';
import { axleRepairService } from '../services/autocorrect/axle-repair';
import { veriphyClient } from '../services/autocorrect/veriphy-client';

export function createAutoCorrectRouter(): Router {
  const router = Router();

  // GET /api/v1/autocorrect/levels
  router.get('/levels', async (_req: Request, res: Response): Promise<void> => {
    const leanProbeAvailable = await leanProbeClient.isAvailable();
    const leanstralAvailable = await leanstralRepairService.isAvailable();
    const axleConfigured = axleRepairService.isConfigured();
    const veriphyAvailable = veriphyClient.isAvailable();

    res.status(200).json({
      levels: [
        { level: 'L1', name: 'Deterministic', engine: 'Ruff / Lean LSP', status: 'available', optIn: false },
        { level: 'L2', name: 'Feedback-Loop', engine: 'LeanProbe / mypy', status: leanProbeAvailable ? 'available' : 'local-simulation', optIn: false },
        { level: 'L3', name: 'Specialized Model', engine: 'Leanstral 1.5 / PyFixer', status: leanstralAvailable ? 'available' : 'offline', optIn: true },
        { level: 'L4', name: 'Cloud Metaprogramming', engine: 'AXLE repair_proofs', status: axleConfigured ? 'available' : 'unconfigured', optIn: true },
        { level: 'L5', name: 'Certified CAS', engine: 'Veriphy / SageMath', status: veriphyAvailable ? 'available' : 'offline', optIn: true },
      ],
    });
  });

  // POST /api/v1/autocorrect/deterministic (L1 Python)
  router.post('/deterministic', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { code?: string; allowUnsafe?: boolean };
    if (!body || typeof body.code !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "code" string' });
      return;
    }

    try {
      const result = await fixPythonCode(body.code, { allowUnsafe: body.allowUnsafe });
      res.status(200).json({ success: true, result });
    } catch (err: unknown) {
      res.status(500).json({ error: 'L1_FIX_FAILED', message: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/v1/autocorrect/feedback-loop (L2 Lean)
  router.post('/feedback-loop', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { code?: string; maxAttempts?: number };
    if (!body || typeof body.code !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "code" string' });
      return;
    }

    try {
      const result = await leanProbeClient.repairLoop(body.code, body.maxAttempts ?? 3);
      res.status(200).json({ success: true, result });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'LEANPROBE_UNAVAILABLE') {
        res.status(503).json({ error: 'LEANPROBE_UNAVAILABLE', message: 'LeanProbe compiler daemon offline.' });
        return;
      }
      res.status(500).json({ error: 'L2_FEEDBACK_FAILED', message: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/v1/autocorrect/python-feedback (L2 Python)
  router.post('/python-feedback', (req: Request, res: Response): void => {
    const body = req.body as { code?: string };
    if (!body || typeof body.code !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "code" string' });
      return;
    }

    const result = analyzePythonFeedback(body.code);
    res.status(200).json({ success: true, result });
  });

  // POST /api/v1/autocorrect/specialized (L3 Lean)
  router.post('/specialized', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { brokenProof?: string; diagnostics?: string[] };
    if (!body || typeof body.brokenProof !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "brokenProof" string' });
      return;
    }

    try {
      const result = await leanstralRepairService.repairProof(body.brokenProof, body.diagnostics);
      if (!result.success) {
        res.status(503).json({ error: 'LEANSTRAL_UNAVAILABLE', message: result.error.message });
        return;
      }
      res.status(200).json({ success: true, result: result.data });
    } catch (err: unknown) {
      res.status(503).json({ error: 'LEANSTRAL_UNAVAILABLE', message: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/v1/autocorrect/python-specialized (L3 Python PyFixer)
  router.post('/python-specialized', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { code?: string };
    if (!body || typeof body.code !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "code" string' });
      return;
    }

    const result = await repairPythonWithContractGate(body.code);
    res.status(200).json({ success: true, result });
  });

  // POST /api/v1/autocorrect/cloud (L4 AXLE)
  router.post('/cloud', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { brokenProof?: string; consentGiven?: boolean };
    if (!body || typeof body.brokenProof !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "brokenProof" string' });
      return;
    }

    try {
      const result = await axleRepairService.repairProofCloud(body.brokenProof, body.consentGiven ?? false);
      if (result.rateLimited) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds ?? 60));
        res.status(429).json({ error: 'RATE_LIMITED', message: result.error, retryAfter: result.retryAfterSeconds });
        return;
      }
      res.status(200).json({ success: true, result });
    } catch (err: unknown) {
      const isConsentErr = (err as { code?: string }).code === 'CONSENT_REQUIRED' || (err as { statusCode?: number }).statusCode === 403;
      if (isConsentErr) {
        res.status(403).json({ error: 'CONSENT_REQUIRED', message: err instanceof Error ? err.message : 'User consent mandatory' });
        return;
      }
      res.status(502).json({ error: 'AXLE_REPAIR_FAILED', message: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/v1/autocorrect/certified-cas (L5 Veriphy)
  router.post('/certified-cas', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { goal?: string };
    if (!body || typeof body.goal !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing "goal" string' });
      return;
    }

    try {
      const result = await veriphyClient.certifyAlgebraicGoal(body.goal);
      res.status(200).json({ success: true, result });
    } catch (err: unknown) {
      const isSageErr = (err as { code?: string }).code === 'SAGE_UNAVAILABLE' || (err as { statusCode?: number }).statusCode === 503;
      if (isSageErr) {
        res.status(503).json({ error: 'SAGE_UNAVAILABLE', message: 'SageMath 10.x binary not found on PATH.' });
        return;
      }
      res.status(500).json({ error: 'VERIPHY_CERTIFICATION_FAILED', message: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
