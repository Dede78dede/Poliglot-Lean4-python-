import { Router, type Request, type Response } from 'express';
import {
  aiProviderRegistry,
  type AiSuggestionRequest,
} from '../services/ai/ai-provider';
import { validateProofSearchQuery } from './interact';

export function createAiRouter(): Router {
  const router = Router();

  // POST /api/v1/ai/suggest
  router.post('/suggest', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      goal?: string;
      context?: string;
      maxTokens?: number;
      provider?: string;
    };

    if (!body || typeof body.goal !== 'string') {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Must provide a "goal" string.',
      });
      return;
    }

    // Sanitization check: max 10k, no control chars, balanced brackets
    const validation = validateProofSearchQuery(body.goal);
    if (!validation.valid) {
      res.status(400).json({
        error: validation.errorCode,
        message: validation.message,
      });
      return;
    }

    const provider = body.provider
      ? aiProviderRegistry.get(body.provider) ?? aiProviderRegistry.getActive()
      : aiProviderRegistry.getActive();

    const request: AiSuggestionRequest = {
      goal: body.goal,
      context: body.context,
      maxTokens: body.maxTokens ?? 512,
    };

    const result = await provider.suggest(request);
    if (!result.success) {
      res.status(result.error.code === 'VALIDATION_FAILED' ? 400 : 502).json({
        error: result.error.code,
        message: result.error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      provider: provider.id,
      providerName: provider.name,
      suggestions: result.data,
      count: result.data.length,
    });
  });

  // POST /api/v1/ai/repair
  router.post('/repair', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      brokenProof?: string;
      code?: string;
      provider?: string;
    };

    const targetProof = body.brokenProof ?? body.code;
    if (!targetProof || typeof targetProof !== 'string') {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Must provide "brokenProof" string.',
      });
      return;
    }

    const provider = body.provider
      ? aiProviderRegistry.get(body.provider) ?? aiProviderRegistry.getActive()
      : aiProviderRegistry.getActive();

    if (!provider.repair) {
      res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: `Provider ${provider.id} does not support automated proof repair.`,
      });
      return;
    }

    const result = await provider.repair(targetProof);
    if (!result.success) {
      res.status(502).json({
        error: result.error.code,
        message: result.error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      provider: provider.id,
      repairedProof: result.data,
    });
  });

  // GET /api/v1/ai/providers
  router.get('/providers', async (_req: Request, res: Response): Promise<void> => {
    const providers = await aiProviderRegistry.list();
    res.status(200).json({
      providers,
      active: aiProviderRegistry.getActive().id,
    });
  });

  // POST /api/v1/ai/provider/select
  router.post('/provider/select', (req: Request, res: Response): void => {
    const providerId = req.body?.providerId;
    if (typeof providerId !== 'string') {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'providerId string is required' });
      return;
    }

    const success = aiProviderRegistry.setActive(providerId);
    if (!success) {
      res.status(404).json({ error: 'NOT_FOUND', message: `Provider "${providerId}" not found` });
      return;
    }

    res.status(200).json({
      success: true,
      activeProvider: aiProviderRegistry.getActive().id,
    });
  });

  return router;
}
