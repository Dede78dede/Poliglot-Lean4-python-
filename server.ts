/**
 * Full-Stack Express Server (Phase 15)
 *
 * Runs Express on port 3000 mounting Vite dev middlewares in development
 * or serving static production assets in production.
 */

import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/src/app';
import { resolveKiminaConfig } from './server/src/config/kimina-config';
import { resolveLeanRunnerConfig } from './server/src/config/lean-runner-config';
import { resolveServerProvenanceKeyRing } from './server/src/services/verification/server-provenance';
import { ENGINE_MODES } from './src/types/verification-ui';
import { hocuspocusServer } from './src/services/collaboration/hocuspocus-server';

const PORT = 3000;

export function assertProductionSecurityPosture(env: Record<string, string | undefined> = process.env): void {
  if (env['NODE_ENV'] !== 'production') {
    return;
  }

  // 1. Validate canonical JCS HMAC provenance secret and single-instance lock
  resolveServerProvenanceKeyRing(env);

  // 2. Forbid CI auth bypass in production
  if (env['ALLOW_CI_BYPASS'] === 'true') {
    throw new Error('CRITICAL SECURITY VIOLATION: ALLOW_CI_BYPASS=true is strictly forbidden in production.');
  }

  // 3. Enforce real-mode & bearer tokens for external kernel runners
  const kiminaCfg = resolveKiminaConfig(env);
  if (kiminaCfg.mode !== ENGINE_MODES.REAL || !kiminaCfg.authToken) {
    throw new Error(
      'CRITICAL SECURITY VIOLATION: Production requires KIMINA_MODE=real with non-empty KIMINA_AUTH_TOKEN.',
    );
  }

  const runnerCfg = resolveLeanRunnerConfig(env);
  if (runnerCfg.mode !== ENGINE_MODES.REAL || !runnerCfg.authToken) {
    throw new Error(
      'CRITICAL SECURITY VIOLATION: Production requires LEAN_RUNNER_MODE=real with non-empty LEAN_RUNNER_AUTH_TOKEN.',
    );
  }
}

async function startServer(): Promise<void> {
  assertProductionSecurityPosture(process.env);
  const app = createApp();
  const isProduction = process.env.NODE_ENV === 'production';

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

  const httpServer = http.createServer(app);
  const collabWorkspaceRoot = process.env.POLYGLOT_COLLAB_ROOT
    ? path.resolve(process.env.POLYGLOT_COLLAB_ROOT)
    : path.resolve(process.cwd(), '.collab-workspace');
  hocuspocusServer.attachUpgradeHandler(httpServer, { workspacePath: collabWorkspaceRoot });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Polyglot Code Studio dev server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
