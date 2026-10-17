import { Router, Request, Response } from 'express';
import { ProofCoordinator } from '../services/proof/proof-coordinator';
import { AxleAdvancedService } from '../services/proof/axle-advanced';
import { BlueprintSyncService } from '../services/proof/blueprint-sync';
import type { WorkspaceStore } from '../services/collaboration/workspace-store';

export function createProofAutomationRouter(
  coordinator: ProofCoordinator,
  axle: AxleAdvancedService,
  syncService: BlueprintSyncService,
  workspaceStore: WorkspaceStore
): Router {
  const router = Router();

  // Task P8-1: Duper Auto-Prove with Fallback Chain
  router.post('/duper', async (req: Request, res: Response) => {
    try {
      const { goal, contextCode, timeoutMs } = req.body || {};
      if (!goal || typeof goal !== 'string') {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'goal string is required' });
        return;
      }

      // Check if Duper is disabled
      if (!coordinator.isDuperEnabled()) {
        res.status(503).json({
          error: 'DUPER_DISABLED',
          message: 'Duper automated prover is disabled by feature flag ENABLE_DUPER=false',
        });
        return;
      }

      const result = await coordinator.autoProve({
        goal,
        contextCode,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
      });

      res.status(200).json(result);
    } catch (err: any) {
      if (err.message?.includes('VALIDATION_FAILED')) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: err.message });
        return;
      }
      if (err.message?.includes('TIMEOUT')) {
        res.setHeader('Retry-After', '30');
        res.status(408).json({ error: 'TIMEOUT', message: 'Proof search deadline exceeded' });
        return;
      }
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
    }
  });

  // Task P8-2: AXLE Disprove
  router.post('/disprove', async (req: Request, res: Response) => {
    try {
      const { statement, consentGiven } = req.body || {};
      if (!statement) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'statement is required' });
        return;
      }

      const result = await axle.disprove({
        statement: String(statement),
        consentGiven: Boolean(consentGiven),
      });

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'CONSENT_REQUIRED' || err.status === 403) {
        res.status(403).json({ error: 'CONSENT_REQUIRED', message: err.message });
        return;
      }
      if (err.code === 'RATE_LIMITED' || err.status === 429) {
        res.setHeader('Retry-After', String(err.retryAfter || 60));
        res.status(429).json({ error: 'RATE_LIMITED', message: err.message });
        return;
      }
      if (err.status === 400 || err.message?.includes('VALIDATION_FAILED')) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: err.message });
        return;
      }
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
    }
  });

  // Task P8-2: AXLE Extract Proof States
  router.post('/extract-states', async (req: Request, res: Response) => {
    try {
      const { code, consentGiven } = req.body || {};
      if (!code) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'code is required' });
        return;
      }

      const result = await axle.extractProofStates({
        code: String(code),
        consentGiven: Boolean(consentGiven),
      });

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'CONSENT_REQUIRED' || err.status === 403) {
        res.status(403).json({ error: 'CONSENT_REQUIRED', message: err.message });
        return;
      }
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
    }
  });

  // Task P8-2: AXLE Simplify Theorem
  router.post('/simplify', async (req: Request, res: Response) => {
    try {
      const { code, consentGiven } = req.body || {};
      if (!code) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'code is required' });
        return;
      }

      const result = await axle.simplifyTheorem({
        code: String(code),
        consentGiven: Boolean(consentGiven),
      });

      res.status(200).json(result);
    } catch (err: any) {
      if (err.code === 'CONSENT_REQUIRED' || err.status === 403) {
        res.status(403).json({ error: 'CONSENT_REQUIRED', message: err.message });
        return;
      }
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
    }
  });

  // Task P8-3: LeanArchitect Blueprint Sync
  router.post('/workspaces/:id/blueprint/sync', (req: Request, res: Response) => {
    try {
      const { mode, files, targetLeanFilePath } = req.body || {};
      if (!mode || !['extract', 'reconcile', 'push'].includes(mode)) {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Valid mode (extract, reconcile, push) is required' });
        return;
      }

      const ws = workspaceStore.getWorkspace(req.params.id);
      if (!ws) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
        return;
      }

      const result = syncService.syncWorkspace(ws, {
        mode,
        files,
        targetLeanFilePath,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || String(err) });
    }
  });

  return router;
}
