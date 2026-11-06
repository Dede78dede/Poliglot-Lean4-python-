/**
 * Full-Stack Express Server (Phase 11.3)
 *
 * Runs Express on port 3000 mounting Vite dev middlewares in development
 * or serving static production assets in production.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { proofReuseRouter } from './server/src/routes/proof-reuse';
import { proposalLoopRouter } from './server/src/routes/proposal-loop';
import { translationRouter } from './server/src/routes/translation';
import { contractsRouter } from './server/src/routes/contracts';
import { notebookRouter } from './server/src/routes/notebook';
import { configRouter } from './server/src/routes/config';
import { searchRouter } from './server/src/routes/search';
import { diffRouter } from './server/src/routes/diff';
import { createMcpServerRouter } from './server/src/routes/mcp-server-router';
import { createLeanRouter } from './server/src/routes/lean';
import { createProjectsRouter } from './server/src/routes/projects';
import { KiminaClientProxy } from './server/src/services/kimina-client-proxy';
import { resolveKiminaConfig } from './server/src/config/kimina-config';
import { LeanProjectRunner } from './server/src/services/lean-project-runner';
import { resolveLeanRunnerConfig } from './server/src/config/lean-runner-config';
import { authMiddleware } from './src/middleware/auth';
import { standardRateLimiter, mcpRateLimiter } from './src/middleware/rate-limit';
import { automationMetrics } from './src/services/proof/metrics/automation-metrics';

const PORT = 3000;

async function startServer(): Promise<void> {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // CORS Origin Middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Polyglot-Test-Secret, Mcp-Method, Mcp-Name, X-Correlation-ID'
    );
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const kiminaConfig = resolveKiminaConfig();
  const kiminaProxy = new KiminaClientProxy(kiminaConfig);
  const leanRunnerConfig = resolveLeanRunnerConfig();
  const leanRunner = new LeanProjectRunner(leanRunnerConfig);

  // Health, liveness, and readiness endpoints (Public, Unauthenticated)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/readyz', (_req, res) => {
    const isReady = kiminaConfig.mode !== 'real' || Boolean(kiminaConfig.baseUrl);
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        kimina: { mode: kiminaConfig.mode },
        runner: { mode: leanRunnerConfig.mode },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        error: 'Kimina or Lake runner service unconfigured in real mode',
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      phase: '14.0',
      compiler: 'annotation',
      virtualization: 'react-window-v2',
      wcag: '2.2-AA',
      proofReuse: true,
      proposalLoop: true,
      translationFidelity: true,
      resultEnvelope: true,
      contractParity: true,
      nativeNotebook: true,
      configManager: true,
      crossArtifactSearch: true,
      structuralDiff: true,
      tokenVault: true,
      securityObservability: true,
      kiminaMounted: true,
      projectsMounted: true,
    });
  });

  // MCP 2026-07-28 Endpoint (Mounted outside Bearer auth with strict 30 req/min rate limit)
  const mcpRouter = createMcpServerRouter();
  app.use('/mcp', mcpRateLimiter, mcpRouter);
  app.use('/api/v1/mcp', mcpRateLimiter, mcpRouter);

  // Protected Routes under Auth & Rate Limiting Middleware
  app.use('/api/v1', standardRateLimiter, authMiddleware);

  // Modular Routers
  app.use('/api/v1/lean', createLeanRouter(kiminaProxy));
  app.use('/api/v1/projects', createProjectsRouter(leanRunner));

  app.use('/api/v1/proof/reuse', proofReuseRouter);
  app.use('/api/v1/proof/proposal-loop', proposalLoopRouter);
  app.use('/api/v1/translation', translationRouter);
  app.use('/api/v1/contracts', contractsRouter);
  app.use('/api/v1/notebook', notebookRouter);
  app.use('/api/v1/config', configRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/diff', diffRouter);
  app.get('/api/v1/proof/metrics', (_req, res) => {
    res.json(automationMetrics.getMetrics());
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Polyglot Code Studio dev server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
