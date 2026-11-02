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
import { automationMetrics } from './src/services/proof/metrics/automation-metrics';

const PORT = 3000;

async function startServer(): Promise<void> {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health and readiness endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      phase: '13',
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
    });
  });

  // Modular Routers
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
