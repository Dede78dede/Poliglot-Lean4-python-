import { Router, type Request, type Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import {
  type LeanProjectRunner,
  ToolchainNotInstalledError,
} from '../services/lean-project-runner';
import {
  AVAILABLE_LEAN_TOOLCHAINS,
  DEFAULT_LEAN_TOOLCHAIN,
} from '../config/lean-runner-config';
import { sessionManager } from '../services/session-manager';
import { assertPathContained } from '../services/verification/server-provenance';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';
import { lspecCiTemplateGenerator, type LSpecCiTemplateOptions } from '../../../src/services/lean-tooling/lspec-ci-template-generator';
import { BridgeError } from '../../../src/services/errors/bridge-error';
import { ERROR_REGISTRY, createProblemDetails } from '../../../src/services/errors/error-registry';
import { StructuredLogger } from '../../../src/services/logging/logger';

const MAX_UPLOAD_FILES = 500;
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024;
const SAFE_PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

const UploadRequestSchema = z.object({
  sessionId: z.string().uuid(),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .max(MAX_UPLOAD_FILES),
});

const BuildRequestSchema = z.object({
  sessionId: z.string().uuid(),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .max(MAX_UPLOAD_FILES)
    .optional(),
});

export function createProjectsRouter(runner: LeanProjectRunner): Router {
  const router = Router();

  // GET /api/v1/projects (list sessions)
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Lean Project Runner Active',
        mode: runner.getConfig().mode,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/v1/projects/lean/upload
  router.post('/lean/upload', async (req: Request, res: Response): Promise<void> => {
    const parse = UploadRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Error',
        status: 400,
        detail: parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const { sessionId, files } = parse.data;

    try {
      const sessionDir = sessionManager.getSessionPath(sessionId);
      await sessionManager.createOrTouchSession(sessionId);

      let totalBytes = 0;
      const verifiedTargets: { fullPath: string; content: string; byteLen: number }[] = [];

      for (const f of files) {
        const byteLen = Buffer.byteLength(f.content, 'utf-8');
        if (byteLen > MAX_SINGLE_FILE_BYTES) {
          res.status(413).json({
            type: 'https://polyglot.dev/errors/payload-too-large',
            title: 'File Too Large',
            status: 413,
            detail: `File "${f.path}" exceeds 5 MB per-file quota.`,
          });
          return;
        }
        const safePath = assertPathContained(sessionDir, f.path);
        totalBytes += byteLen;
        verifiedTargets.push({ fullPath: safePath, content: f.content, byteLen });
      }

      const withinQuota = await sessionManager.checkQuota(sessionId, totalBytes);
      if (!withinQuota) {
        res.status(413).json({
          type: 'https://polyglot.dev/errors/quota-exceeded',
          title: 'Session Storage Quota Exceeded',
          status: 413,
          detail: 'Session or host aggregate storage quota exceeded.',
        });
        return;
      }

      for (const target of verifiedTargets) {
        await fs.mkdir(path.dirname(target.fullPath), { recursive: true });
        await fs.writeFile(target.fullPath, target.content, 'utf-8');
      }

      sessionManager.updateSessionBytes(sessionId, totalBytes, files.length);

      res.status(200).json({
        success: true,
        sessionId,
        fileCount: files.length,
        totalBytes,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('PATH_TRAVERSAL_REJECTED')) {
        res.status(400).json({
          type: 'https://polyglot.dev/errors/invalid-path',
          title: 'Path Traversal Rejected',
          status: 400,
          detail: msg,
        });
        return;
      }
      res.status(500).json({
        type: 'https://polyglot.dev/errors/upload-failed',
        title: 'Project Upload Failed',
        status: 500,
        detail: msg,
      });
    }
  });

  // POST /api/v1/projects/lean/build
  router.post('/lean/build', async (req: Request, res: Response): Promise<void> => {
    const parse = BuildRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Error',
        status: 400,
        detail: parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const { sessionId, files = [] } = parse.data;

    try {
      const result = await runner.build(sessionId, files);

      if (result.fallback) {
        res.setHeader('X-Lean-Fallback', 'true');
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof ToolchainNotInstalledError || (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 409)) {
        const toolchainErr = err as ToolchainNotInstalledError;
        res.status(409).json({
          error: 'TOOLCHAIN_NOT_INSTALLED',
          requested: toolchainErr.requested,
          available: toolchainErr.available,
        });
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('PATH_TRAVERSAL_REJECTED')) {
        res.status(400).json({
          type: 'https://polyglot.dev/errors/invalid-path',
          title: 'Path Traversal Rejected',
          status: 400,
          detail: msg,
        });
        return;
      }
      if (msg.startsWith('PROJECT_QUOTA_EXCEEDED')) {
        res.status(413).json({
          type: 'https://polyglot.dev/errors/quota-exceeded',
          title: 'Project Quota Exceeded',
          status: 413,
          detail: msg,
        });
        return;
      }

      res.status(502).json({
        type: 'https://polyglot.dev/errors/build-failed',
        title: 'Lean 4 Lake Build Failed',
        status: 502,
        detail: msg,
      });
    }
  });

  // GET /api/v1/projects/lean/toolchains
  router.get('/lean/toolchains', async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      available: AVAILABLE_LEAN_TOOLCHAINS,
      default: DEFAULT_LEAN_TOOLCHAIN,
    });
  });

  // GET /api/v1/projects/lean/build-stream (SSE streaming build logs)
  router.get('/lean/build-stream', async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.query['sessionId'] ?? '');
    if (!sessionManager.validateSessionId(sessionId)) {
      res.status(400).json({ error: 'Valid sessionId UUID required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Starting Lake build stream...' })}\n\n`);

    try {
      const isKnownFallback = runner.getConfig().mode === 'simulator';
      if (isKnownFallback) {
        // Strategy B: Emit initial fallback event if runtime is known fallback
        res.write(`event: fallback\ndata: ${JSON.stringify({ fallback: true, notice: 'Running in simulated syntax fallback mode' })}\n\n`);
      }

      const result = await runner.build(sessionId, []);

      if (result.fallback) {
        // Strategy B: Dedicated fallback event in SSE stream for client fallback banner
        res.write(`event: fallback\ndata: ${JSON.stringify({ fallback: true, notice: result.fallbackNotice })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'fallback', fallback: true, notice: result.fallbackNotice })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'log', stdout: result.stdout, stderr: result.stderr })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : String(err) })}\n\n`);
    } finally {
      res.end();
    }
  });

  // POST /api/v1/projects/lean/session/:id/pin (Residuo 1: Long-term pinned sessions)
  router.post('/lean/session/:id/pin', async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params['id'];
    if (!sessionId || !sessionManager.validateSessionId(sessionId)) {
      res.status(400).json({ error: 'Valid sessionId UUID required' });
      return;
    }
    const pinned = Boolean(req.body?.pinned ?? true);
    const success = sessionManager.setPinned(sessionId, pinned);
    if (!success) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }
    res.status(200).json({ success: true, sessionId, pinned });
  });

  // GET /api/v1/projects/lean/session/:id (Get session metadata & pin status)
  router.get('/lean/session/:id', async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.params['id'];
    if (!sessionId || !sessionManager.validateSessionId(sessionId)) {
      res.status(400).json({ error: 'Valid sessionId UUID required' });
      return;
    }
    const meta = sessionManager.getSessionMeta(sessionId);
    if (!meta) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }
    res.status(200).json({ success: true, meta });
  });

  // GET /api/v1/projects/lean/files
  router.get('/lean/files', async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.query['sessionId'] ?? '');
    if (!sessionManager.validateSessionId(sessionId)) {
      res.status(400).json({ error: 'Valid sessionId UUID required' });
      return;
    }

    try {
      const sessionDir = sessionManager.getSessionPath(sessionId);
      const files: { path: string; size: number }[] = [];

      async function scanDir(currentDir: string, relativeBase = ''): Promise<void> {
        const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
          const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            await scanDir(path.join(currentDir, entry.name), relPath);
          } else {
            const stats = await fs.stat(path.join(currentDir, entry.name));
            files.push({ path: relPath, size: stats.size });
          }
        }
      }

      await scanDir(sessionDir);
      res.status(200).json({ sessionId, files });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // DELETE /api/v1/projects/:id
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'];
    if (!id || !sessionManager.validateSessionId(id)) {
      res.status(400).json({ error: 'Valid UUID required' });
      return;
    }

    await sessionManager.deleteSession(id);
    res.status(200).json({ success: true, id });
  });

  // POST /api/v1/projects/:id/lspec-ci-template (Phase 10.9.7, Task LC2)
  router.post('/:id/lspec-ci-template', async (req: Request, res: Response): Promise<void> => {
    const correlationId = (req.headers['x-correlation-id'] as string) || StructuredLogger.generateCorrelationId();
    const id = req.params['id'];

    if (!featureFlagRegistry.isEnabled('ENABLE_LSPEC_CI_TEMPLATE')) {
      const def = ERROR_REGISTRY.LSPEC_CI_TEMPLATE_FAILED;
      const problem = createProblemDetails(def, correlationId, {
        featureFlag: 'ENABLE_LSPEC_CI_TEMPLATE',
        reason: 'Feature flag ENABLE_LSPEC_CI_TEMPLATE is disabled. Enable in Settings -> Feature Flags.',
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      res.status(503).json(problem);
      return;
    }

    const rawId = id ?? 'default';
    if (!SAFE_PROJECT_ID_REGEX.test(rawId)) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-project-id',
        title: 'Invalid Project Identifier',
        status: 400,
        detail: 'Project ID must match /^[a-zA-Z0-9_-]{1,64}$/ without path separators or traversal.',
      });
      return;
    }

    const options: LSpecCiTemplateOptions = {
      projectName: req.body?.options?.projectName || req.body?.projectName || rawId,
      branch: req.body?.options?.branch || req.body?.branch,
      leanVersion: req.body?.options?.leanVersion || req.body?.leanVersion,
      includeCache: req.body?.options?.includeCache ?? req.body?.includeCache,
      correlationId,
    };

    const projectsRoot = path.resolve(process.cwd(), 'projects');
    const projectPath = assertPathContained(projectsRoot, rawId);

    try {
      const result = await lspecCiTemplateGenerator.generateTemplate(projectPath, options);
      res.setHeader('x-correlation-id', correlationId);
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.setHeader('x-correlation-id', err.correlationId);
        res.status(err.httpStatus).json(err.toProblemDetails());
        return;
      }
      const def = ERROR_REGISTRY.LSPEC_CI_TEMPLATE_FAILED;
      const fallbackProblem = createProblemDetails(def, correlationId, {
        error: err instanceof Error ? err.message : String(err),
      });
      res.setHeader('Content-Type', 'application/problem+json');
      res.setHeader('x-correlation-id', correlationId);
      res.status(422).json(fallbackProblem);
    }
  });

  return router;
}
