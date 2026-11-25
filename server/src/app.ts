/**
 * Express Application Factory
 *
 * Centralizes middleware, RBAC auth enforcement, OpenTelemetry trace correlation,
 * health/readiness probes, and all 27 backend routers so both server.ts and
 * Supertest integration suites execute identical routing behavior.
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { proofReuseRouter } from './routes/proof-reuse';
import { proposalLoopRouter } from './routes/proposal-loop';
import { translationRouter } from './routes/translation';
import { contractsRouter } from './routes/contracts';
import { notebookRouter } from './routes/notebook';
import { configRouter } from './routes/config';
import { searchRouter } from './routes/search';
import { diffRouter } from './routes/diff';
import { createMcpServerRouter } from './routes/mcp-server-router';
import { createLeanRouter } from './routes/lean';
import { createProjectsRouter } from './routes/projects';
import { createTelemetryRouter } from './routes/telemetry';
import { createProofAutomationRouter } from './routes/proof-automation';
import { createPublicAuthRouter, createProtectedAuthRouter } from './routes/auth';
import { createAiRouter } from './routes/ai';
import { createAutoCorrectRouter } from './routes/autocorrect';
import { createAutomationRouter, exportProjectBundleHandler } from './routes/automation';
import { createBlueprintRouter } from './routes/blueprint';
import { createChatRouter } from './routes/chat';
import { createDiscoveryRouter } from './routes/discovery';
import { createFemevRouter } from './routes/femev';
import { createFilesRouter } from './routes/files';
import { createGitHubAuthRouter } from './routes/github-auth';
import { createHealthRouter, createReadinessRouter } from './routes/health';
import { createInteractRouter } from './routes/interact';
import { createSettingsRouter } from './routes/settings';
import { createWorkspaceArchiveRouter } from './routes/workspace';
import { createWorkspacesRouter } from './routes/workspaces';
import { KiminaClientProxy } from './services/kimina-client-proxy';
import { resolveKiminaConfig } from './config/kimina-config';
import { LeanProjectRunner } from './services/lean-project-runner';
import { resolveLeanRunnerConfig } from './config/lean-runner-config';
import { ProofCoordinator } from './services/proof/proof-coordinator';
import { AxleAdvancedService } from './services/proof/axle-advanced';
import { BlueprintSyncService } from './services/proof/blueprint-sync';
import { WorkspaceStore } from './services/collaboration/workspace-store';
import { authMiddleware, requireRole } from '../../src/middleware/auth';
import { standardRateLimiter, mcpRateLimiter } from '../../src/middleware/rate-limit';
import { APP_ROLES, type AppRole } from '../../src/services/auth/roles';
import { tokenVault } from '../../src/services/auth/token-vault';
import { automationMetrics } from '../../src/services/proof/metrics/automation-metrics';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { runWithTraceContext } from '../../src/services/logging/logger';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export interface CreateAppOptions {
  readonly kiminaProxy?: KiminaClientProxy;
  readonly leanRunner?: LeanProjectRunner;
  readonly workspaceStore?: WorkspaceStore;
  readonly settingsStoragePath?: string;
}

function isAllowedCorsOrigin(origin: string, requestHost?: string): boolean {
  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0'
    ) {
      return true;
    }
    if (requestHost && parsed.host === requestHost) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function requireRoleForWrites(...roles: AppRole[]) {
  const guard = requireRole(...roles);
  return function writeGuard(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    return guard(req, res, next);
  };
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  if (process.env.ENABLE_YJS_COLLABORATION === 'true') {
    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
  }

  tokenVault.ensureEnvBootstrapToken();

  app.use(express.json({ limit: '10mb' }));

  // Strict CORS Origin Middleware (never emits Access-Control-Allow-Origin: * on /api/v1/*)
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (origin && isAllowedCorsOrigin(origin, req.headers.host)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Polyglot-Test-Secret, X-GitHub-Token, X-Session-Id, Mcp-Method, Mcp-Name, X-Correlation-ID, traceparent, tracestate'
    );
    if (req.method === 'OPTIONS') {
      if (origin && !isAllowedCorsOrigin(origin, req.headers.host)) {
        res.sendStatus(403);
        return;
      }
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Conditional OpenTelemetry Trace Correlation Middleware
  app.use((req, res, next) => {
    if (!backendOtelEngine.isEnabled()) {
      return next();
    }
    const startTime = Date.now();
    const rawTraceparent = typeof req.headers.traceparent === 'string' ? req.headers.traceparent : '';
    const rawTracestate = typeof req.headers.tracestate === 'string' ? req.headers.tracestate : undefined;
    const parentCtx = rawTraceparent ? backendOtelEngine.parseTraceparent(rawTraceparent) : null;
    const serverSpanCtx = backendOtelEngine.createChildSpanContext(parentCtx, rawTracestate);

    res.setHeader('X-Trace-ID', serverSpanCtx.traceId);
    res.on('finish', () => {
      const endTime = Date.now();
      backendOtelEngine.recordSpan({
        spanId: serverSpanCtx.spanId,
        traceId: serverSpanCtx.traceId,
        ...(serverSpanCtx.parentSpanId ? { parentSpanId: serverSpanCtx.parentSpanId } : {}),
        name: `http_${req.method}_${req.path}`,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        attributes: {
          'http.method': req.method,
          'http.status_code': res.statusCode,
        },
        status: { code: res.statusCode >= 500 ? 'ERROR' : 'OK' },
        events: [],
      });
    });

    runWithTraceContext(serverSpanCtx, () => next());
  });

  const kiminaConfig = resolveKiminaConfig();
  const kiminaProxy = options.kiminaProxy ?? new KiminaClientProxy(kiminaConfig);
  const leanRunnerConfig = resolveLeanRunnerConfig();
  const leanRunner = options.leanRunner ?? new LeanProjectRunner(leanRunnerConfig);
  const proofCoordinator = new ProofCoordinator();
  const axleService = new AxleAdvancedService();
  const blueprintSync = new BlueprintSyncService();
  const workspaceStore = options.workspaceStore ?? new WorkspaceStore();

  // Public Health, Liveness, and Readiness Endpoints
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/readyz', async (_req, res) => {
    const [kiminaReady, runnerReady] = await Promise.all([
      kiminaConfig.mode === 'real' ? kiminaProxy.checkReady() : Promise.resolve(false),
      leanRunnerConfig.mode === 'real' ? leanRunner.checkReady() : Promise.resolve(false),
    ]);

    const realKiminaRequired = kiminaConfig.mode === 'real';
    const realRunnerRequired = leanRunnerConfig.mode === 'real';
    const isReady =
      (!realKiminaRequired || (Boolean(kiminaConfig.baseUrl) && kiminaReady)) &&
      (!realRunnerRequired || (Boolean(leanRunnerConfig.runnerUrl) && runnerReady));

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        kimina: { mode: kiminaConfig.mode, reachable: kiminaReady },
        runner: { mode: leanRunnerConfig.mode, reachable: runnerReady },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        error: 'Kimina or Lake runner service unconfigured or unreachable in real mode',
        kimina: { mode: kiminaConfig.mode, reachable: kiminaReady },
        runner: { mode: leanRunnerConfig.mode, reachable: runnerReady },
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      phase: '15.2',
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
      telemetryMounted: true,
      proofAutomationMounted: true,
      authMounted: true,
      rbacEnabled: true,
      allRoutersMounted: true,
      mountedRoutesCount: 27,
    });
  });

  app.get('/api/v1/health', createHealthRouter(kiminaProxy));
  app.get('/api/v1/ready', createReadinessRouter());

  // MCP 2026-07-28 Endpoint (Public with strict rate limit)
  const mcpRouter = createMcpServerRouter();
  app.use('/mcp', mcpRateLimiter, mcpRouter);
  app.use('/api/v1/mcp', mcpRateLimiter, mcpRouter);

  // Public Authentication Entry Points (/status, /bootstrap, /login)
  app.use('/api/v1/auth', standardRateLimiter, createPublicAuthRouter());

  // Authenticated /api/v1 Gate (Standard rate limit + Bearer Token / RBAC Middleware)
  app.use('/api/v1', standardRateLimiter, authMiddleware);

  // Authenticated Auth Session & Admin User/Token Routes
  app.use('/api/v1/auth', createProtectedAuthRouter());

  // Role groups matching src/services/auth/roles.ts
  const verifyGuard = requireRoleForWrites(APP_ROLES.ADMIN, APP_ROLES.VERIFIER);
  const contributeGuard = requireRoleForWrites(APP_ROLES.ADMIN, APP_ROLES.VERIFIER, APP_ROLES.COLLABORATOR);

  // Core Kernel & Project Routers
  app.use('/api/v1/lean', verifyGuard, createLeanRouter(kiminaProxy, leanRunner));
  app.post(
    '/api/v1/projects/:id/export-bundle',
    requireRole(APP_ROLES.ADMIN, APP_ROLES.VERIFIER),
    exportProjectBundleHandler
  );
  app.use('/api/v1/projects', contributeGuard, createProjectsRouter(leanRunner));

  // Proof, Translation, Contracts, Notebook, Config, Search, Diff
  app.use('/api/v1/proof/reuse', contributeGuard, proofReuseRouter);
  app.use('/api/v1/proof/proposal-loop', contributeGuard, proposalLoopRouter);
  app.use('/api/v1/translation', contributeGuard, translationRouter);
  app.use('/api/v1/contracts', contributeGuard, contractsRouter);
  app.use('/api/v1/notebook', contributeGuard, notebookRouter);
  app.use('/api/v1/config', requireRoleForWrites(APP_ROLES.ADMIN), configRouter);
  app.use('/api/v1/search', contributeGuard, searchRouter);
  app.use('/api/v1/diff', contributeGuard, diffRouter);
  app.get('/api/v1/proof/metrics', (_req, res) => {
    res.json(automationMetrics.getMetrics());
  });
  app.use(
    '/api/v1/proof',
    contributeGuard,
    createProofAutomationRouter(proofCoordinator, axleService, blueprintSync, workspaceStore)
  );
  app.use('/api/v1/telemetry', contributeGuard, createTelemetryRouter());

  // Newly Mounted Workbench Routers (Sprint 2 Full Backend Exposure)
  app.use('/api/v1/ai', contributeGuard, createAiRouter());
  app.use('/api/v1/autocorrect', contributeGuard, createAutoCorrectRouter());
  app.use('/api/v1/automation', verifyGuard, createAutomationRouter());
  app.use('/api/v1/blueprint', contributeGuard, createBlueprintRouter(workspaceStore));
  app.use('/api/v1/chat', contributeGuard, createChatRouter());
  app.use('/api/v1/discovery', contributeGuard, createDiscoveryRouter());
  app.use('/api/v1/femev', contributeGuard, createFemevRouter());
  app.use('/api/v1/files', contributeGuard, createFilesRouter());
  app.use('/api/v1/auth/github', contributeGuard, createGitHubAuthRouter());
  app.use('/api/v1/settings', createSettingsRouter(options.settingsStoragePath));
  app.use('/api/v1/workspace', verifyGuard, createWorkspaceArchiveRouter());
  app.post(
    '/api/v1/workspaces/:id/blueprint/verify',
    requireRole(APP_ROLES.ADMIN, APP_ROLES.VERIFIER),
    createWorkspacesRouter(workspaceStore)
  );
  app.use('/api/v1/workspaces', contributeGuard, createWorkspacesRouter(workspaceStore));
  app.use('/api/v1', contributeGuard, createInteractRouter(kiminaProxy));

  return app;
}
