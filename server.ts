import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveKiminaConfig } from './server/src/config/kimina-config';
import { KiminaClientProxy } from './server/src/services/kimina-client-proxy';
import { createLeanRouter } from './server/src/routes/lean';
import { createHealthRouter } from './server/src/routes/health';

import { resolveLeanRunnerConfig } from './server/src/config/lean-runner-config';
import { LeanProjectRunner } from './server/src/services/lean-project-runner';
import { createProjectsRouter } from './server/src/routes/projects';
import { createInteractRouter } from './server/src/routes/interact';
import { createGitHubAuthRouter } from './server/src/routes/github-auth';
import { createDiscoveryRouter } from './server/src/routes/discovery';
import { createAiRouter } from './server/src/routes/ai';
import { createAutoCorrectRouter } from './server/src/routes/autocorrect';
import { WorkspaceStore } from './server/src/services/collaboration/workspace-store';
import { BlueprintRelay } from './server/src/services/collaboration/blueprint-relay';
import { createWorkspacesRouter } from './server/src/routes/workspaces';
import { ProofCoordinator } from './server/src/services/proof/proof-coordinator';
import { AxleAdvancedService } from './server/src/services/proof/axle-advanced';
import { BlueprintSyncService } from './server/src/services/proof/blueprint-sync';
import { createProofAutomationRouter } from './server/src/routes/proof-automation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const kiminaConfig = resolveKiminaConfig(process.env);
  const kiminaProxy = new KiminaClientProxy(kiminaConfig);

  const runnerConfig = resolveLeanRunnerConfig(process.env);
  const leanRunner = new LeanProjectRunner(runnerConfig);

  const app = express();
  app.use(express.json({ limit: '500kb' }));

  // API Routes
  app.post('/api/v1/lean/execute', createLeanRouter(kiminaProxy));
  app.get('/api/v1/health', createHealthRouter(kiminaProxy));
  app.use('/api/v1/projects', createProjectsRouter(leanRunner));
  app.use('/api/v1', createInteractRouter(kiminaProxy));
  app.use('/proof', createInteractRouter(kiminaProxy));
  app.get('/api/v1/lean/toolchains', (_req, res) => {
    res.status(200).json({
      available: ['v4.28.0', 'v4.31.0', 'v4.33.1', 'v4.35.0-rc4'],
      default: 'v4.35.0-rc4',
    });
  });
  const workspaceStore = new WorkspaceStore();
  const proofCoordinator = new ProofCoordinator();
  const axleAdvanced = new AxleAdvancedService();
  const blueprintSync = new BlueprintSyncService();

  app.use('/api/v1/auth/github', createGitHubAuthRouter());
  app.use('/api/v1/discovery', createDiscoveryRouter());
  app.use('/api/v1/ai', createAiRouter());
  app.use('/api/v1/autocorrect', createAutoCorrectRouter());
  app.use('/api/v1/workspaces', createWorkspacesRouter(workspaceStore));
  app.use('/api/v1/proof', createProofAutomationRouter(proofCoordinator, axleAdvanced, blueprintSync, workspaceStore));

  const isProduction = process.env.NODE_ENV === 'production';
  // In dev, AI Studio's supervisor proxies ingress traffic to port 3000.
  // In production Cloud Run, process.env.PORT (8080) is used.
  const port = isProduction ? Number(process.env.PORT || 8080) : 3000;

  if (!isProduction) {
    // Development: Integrate Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static built files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  new BlueprintRelay(server, workspaceStore);

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Polyglot Code Studio] Server running on http://0.0.0.0:${port}`);
    console.log(`[Polyglot Code Studio] Kimina Lean mode: ${kiminaConfig.mode}`);
    console.log(`[Polyglot Code Studio] Archon Blueprint Workspaces & WebSocket Relay active`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal Error]', err);
  process.exit(1);
});
