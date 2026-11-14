import { Router, Request, Response } from 'express';
import { ProofCoordinator } from '../services/proof/proof-coordinator';
import { AxleAdvancedService } from '../services/proof/axle-advanced';
import { BlueprintSyncService } from '../services/proof/blueprint-sync';
import type { WorkspaceStore } from '../services/collaboration/workspace-store';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  // Phase 11.1 & Phase 15 Wave 2: Speculative Tactic Execution via lean-beam
  router.post('/probe', async (req: Request, res: Response) => {
    const correlationId = String(req.headers['x-correlation-id'] || `probe-${Date.now()}`);
    try {
      const { featureFlagRegistry } = await import('../../../src/services/flags/feature-flag-registry');
      if (!featureFlagRegistry.isEnabled('ENABLE_LEAN_BEAM')) {
        res.status(503).json(
          createProblemDetails(ERROR_REGISTRY.FEATURE_DISABLED, correlationId, {
            feature: 'ENABLE_LEAN_BEAM',
            detail: 'Speculative tactic execution is disabled by feature flag ENABLE_LEAN_BEAM=false',
          })
        );
        return;
      }

      const { path, version, line, character, text, workspace, toolchain } = req.body || {};
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'tactic text string is required' });
        return;
      }

      const { defaultLeanBeamClient } = await import('../../../src/services/mcp/lean-beam-client');
      const result = await defaultLeanBeamClient.runAt({
        path: String(path || 'Main.lean'),
        version: Number(version || 1),
        line: Number(line || 1),
        character: Number(character || 0),
        text: String(text),
        workspace: workspace ? String(workspace) : undefined,
        toolchain: toolchain ? String(toolchain) : undefined,
      });

      res.status(200).json(result);
    } catch (err: unknown) {
      const bridgeErr = err as { code?: string; message?: string; toProblemDetails?: () => unknown };
      if (bridgeErr && bridgeErr.code === 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED') {
        res.status(422).json(
          typeof bridgeErr.toProblemDetails === 'function'
            ? bridgeErr.toProblemDetails()
            : { error: bridgeErr.code, message: bridgeErr.message }
        );
        return;
      }
      if (bridgeErr && bridgeErr.code === 'LEAN_BEAM_UNAVAILABLE') {
        res.status(503).json(
          typeof bridgeErr.toProblemDetails === 'function'
            ? bridgeErr.toProblemDetails()
            : createProblemDetails(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE, correlationId, { detail: bridgeErr.message })
        );
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  // Phase 15 Wave 2: Parallel Speculative Tactic Beam Search (/api/v1/proof/speculative)
  router.post('/speculative', async (req: Request, res: Response) => {
    const correlationId = String(req.headers['x-correlation-id'] || `spec-${Date.now()}`);
    try {
      const { featureFlagRegistry } = await import('../../../src/services/flags/feature-flag-registry');
      if (!featureFlagRegistry.isEnabled('ENABLE_LEAN_BEAM')) {
        const problem = createProblemDetails(ERROR_REGISTRY.FEATURE_DISABLED, correlationId, {
          feature: 'ENABLE_LEAN_BEAM',
          detail: 'Speculative tactic execution is disabled by feature flag ENABLE_LEAN_BEAM=false',
        });
        res.status(503).json(problem);
        return;
      }

      const { path, version, line, character, text, tactics, workspace, toolchain, timeoutMs } = req.body || {};
      const candidateTactics: string[] = Array.isArray(tactics)
        ? tactics.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        : typeof text === 'string' && text.trim().length > 0
        ? [text]
        : [];

      if (candidateTactics.length === 0) {
        res.status(400).json(
          createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
            detail: 'Provide either a non-empty text string or tactics string array.',
          })
        );
        return;
      }

      const MAX_SPECULATIVE_CANDIDATES = 8;
      if (candidateTactics.length > MAX_SPECULATIVE_CANDIDATES) {
        res.status(400).json(
          createProblemDetails(ERROR_REGISTRY.INVALID_JSON_INPUT, correlationId, {
            detail: `Speculative batch size ${candidateTactics.length} exceeds cap of ${MAX_SPECULATIVE_CANDIDATES}.`,
          })
        );
        return;
      }

      const timeoutBudgetMs = Math.min(Math.max(Number(timeoutMs) || 5000, 50), 5000);
      const { defaultLeanBeamClient } = await import('../../../src/services/mcp/lean-beam-client');
      const batchController = new AbortController();
      const batchTimer = setTimeout(() => batchController.abort(), timeoutBudgetMs);
      (batchTimer as unknown as { unref?: () => void }).unref?.();

      const MAX_CONCURRENCY = 4;
      const candidates: Array<{
        tactic: string;
        valid: boolean;
        timedOut: boolean;
        goalsBefore: readonly string[];
        goalsAfter: readonly string[];
        errors: readonly string[];
        durationMs: number;
        speculativelyTested: boolean;
      }> = new Array(candidateTactics.length);

      let nextIndex = 0;
      let unavailableCount = 0;
      const unavailableBox: { err: { toProblemDetails?: () => unknown; message?: string } | null } = { err: null };
      let fatalToolchainErr: unknown = null;

      const worker = async (): Promise<void> => {
        while (nextIndex < candidateTactics.length) {
          const idx = nextIndex++;
          const tactic = candidateTactics[idx]!;
          const startedAt = Date.now();
          try {
            const probeResult = await defaultLeanBeamClient.runAt({
              path: String(path || 'Main.lean'),
              version: Number(version || 1),
              line: Number(line || 1),
              character: Number(character || 0),
              text: tactic,
              workspace: workspace ? String(workspace) : undefined,
              toolchain: toolchain ? String(toolchain) : undefined,
              signal: batchController.signal,
              timeoutMs: timeoutBudgetMs,
            });
            candidates[idx] = {
              tactic,
              timedOut: false,
              ...probeResult,
              speculativelyTested: true,
            };
          } catch (err: unknown) {
            const bridgeErr = err as { code?: string; name?: string; message?: string; toProblemDetails?: () => unknown };
            if (bridgeErr?.code === 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED') {
              fatalToolchainErr = err;
              batchController.abort();
              return;
            }
            const isTimeoutAbort =
              batchController.signal.aborted ||
              bridgeErr?.name === 'AbortError' ||
              bridgeErr?.message === 'SPECULATIVE_BEAM_TIMEOUT';
            if (!isTimeoutAbort && bridgeErr?.code === 'LEAN_BEAM_UNAVAILABLE') {
              unavailableCount += 1;
              unavailableBox.err = bridgeErr;
            }
            candidates[idx] = {
              tactic,
              valid: false,
              timedOut: isTimeoutAbort,
              goalsBefore: [],
              goalsAfter: [],
              errors: [isTimeoutAbort ? 'SPECULATIVE_BEAM_TIMEOUT' : (bridgeErr?.message || String(err))],
              durationMs: Math.max(1, Date.now() - startedAt),
              speculativelyTested: true,
            };
          }
        }
      };

      try {
        await Promise.all(
          Array.from({ length: Math.min(MAX_CONCURRENCY, candidateTactics.length) }, () => worker())
        );
      } finally {
        clearTimeout(batchTimer);
      }

      if (fatalToolchainErr) {
        throw fatalToolchainErr;
      }

      if (unavailableCount === candidateTactics.length && unavailableBox.err) {
        const lastUnavailableErr = unavailableBox.err;
        const problem =
          typeof lastUnavailableErr.toProblemDetails === 'function'
            ? lastUnavailableErr.toProblemDetails()
            : createProblemDetails(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE, correlationId, {
                detail: lastUnavailableErr.message || 'lean-beam MCP server unreachable or unconfigured',
              });
        res.status(503).json(problem);
        return;
      }

      res.status(200).json({
        speculativelyTested: true,
        verified: false,
        certificationTier: 'SYNTAX_ONLY_UNVERIFIED',
        timeoutBudgetMs,
        candidates,
      });
    } catch (err: unknown) {
      const bridgeErr = err as { code?: string; message?: string; toProblemDetails?: () => unknown };
      if (bridgeErr && bridgeErr.code === 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED') {
        res.status(422).json(
          typeof bridgeErr.toProblemDetails === 'function'
            ? bridgeErr.toProblemDetails()
            : { error: bridgeErr.code, message: bridgeErr.message }
        );
        return;
      }
      if (bridgeErr && bridgeErr.code === 'LEAN_BEAM_UNAVAILABLE') {
        res.status(503).json(
          typeof bridgeErr.toProblemDetails === 'function'
            ? bridgeErr.toProblemDetails()
            : createProblemDetails(ERROR_REGISTRY.LEAN_BEAM_UNAVAILABLE, correlationId, { detail: bridgeErr.message })
        );
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json(
        createProblemDetails(ERROR_REGISTRY.INTERNAL_SERVER_ERROR, correlationId, { detail: message })
      );
    }
  });

  // Task PP-1: Paperproof Playback (Phase 11.2, Sprint 11.2.2)
  router.post('/paperproof', async (req: Request, res: Response) => {
    try {
      const isEnabled = process.env.ENABLE_PAPERPROOF_PLAYBACK === 'true' || req.body?.force === true;
      if (!isEnabled && process.env.NODE_ENV === 'production') {
        res.status(503).json({
          error: 'PAPERPROOF_DISABLED',
          message: 'Paperproof playback is disabled by feature flag ENABLE_PAPERPROOF_PLAYBACK=false',
        });
        return;
      }

      const { path: filePath, theoremName, action } = req.body || {};
      const { defaultPaperproofClient } = await import('../../../src/services/mcp/paperproof-client');
      const toolName = action === 'steps' ? 'lean_proof_steps' : 'lean_proof_structure';

      const result = await defaultPaperproofClient.callTool({
        toolName,
        arguments: {
          path: String(filePath || 'Main.lean'),
          theoremName: theoremName ? String(theoremName) : undefined,
        },
      });

      if (!result.success) {
        res.status(400).json({ error: 'PAPERPROOF_ERROR', message: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  return router;
}
