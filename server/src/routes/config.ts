/**
 * Dynamic Config Discovery & Adaptive Recommendation Express Routes (Phase 13, Sprint 13.4, CFG3)
 */

import { Router } from 'express';
import { configManager, type SystemSignals } from '../../../src/services/config/config-manager';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';
import { createErrorEnvelope, createSuccessEnvelope } from '../../../src/shared/contracts/result-envelope';

export const configRouter = Router();

// GET /api/v1/config/proposals - Evaluate system signals and retrieve ranked proposals
configRouter.get('/proposals', (req, res) => {
  if (!featureFlagRegistry.isEnabled('ENABLE_CONFIG_MANAGER')) {
    return res.status(403).json(
      createErrorEnvelope('FORBIDDEN_OPERATION', 'Adaptive Config Manager is disabled by feature flag.')
    );
  }

  // Probe signals or accept mock query overrides
  const signals: SystemSignals = {
    hardware: {
      memoryGb: Number(req.query.memoryGb ?? 32),
      vramGb: Number(req.query.vramGb ?? 16),
      concurrencyCores: Number(req.query.concurrencyCores ?? 12),
      detectedAt: new Date().toISOString(),
    },
    usage: {
      activeTheoremsPerDay: Number(req.query.theorems ?? 15),
      cacheMissRate: Number(req.query.cacheMissRate ?? 0.42),
      meanSolveTimeMs: Number(req.query.meanSolveTimeMs ?? 850),
      observedAt: new Date().toISOString(),
    },
    benchmark: {
      oProverThroughput: Number(req.query.throughput ?? 14.2),
      miniSearchLatencyMs: Number(req.query.searchLatency ?? 65),
      memoryFootprintMb: Number(req.query.memoryMb ?? 240),
      benchmarkedAt: new Date().toISOString(),
    },
  };

  const proposals = configManager.generateProposals(signals);
  return res.json(createSuccessEnvelope(proposals));
});

// POST /api/v1/config/proposals/:id/apply - Apply proposal with mandatory userConfirmed flag
configRouter.post('/proposals/:id/apply', (req, res) => {
  if (!featureFlagRegistry.isEnabled('ENABLE_CONFIG_MANAGER')) {
    return res.status(403).json(
      createErrorEnvelope('FORBIDDEN_OPERATION', 'Adaptive Config Manager is disabled by feature flag.')
    );
  }

  const { id } = req.params;
  const { userConfirmed } = req.body as { userConfirmed?: boolean };

  const envelope = configManager.applyProposal(id, { userConfirmed: !!userConfirmed });
  const status = envelope.ok ? 200 : envelope.error.httpStatus ?? 400;
  return res.status(status).json(envelope);
});

// POST /api/v1/config/proposals/:id/dismiss - Dismiss proposal for 90 days
configRouter.post('/proposals/:id/dismiss', (req, res) => {
  if (!featureFlagRegistry.isEnabled('ENABLE_CONFIG_MANAGER')) {
    return res.status(403).json(
      createErrorEnvelope('FORBIDDEN_OPERATION', 'Adaptive Config Manager is disabled by feature flag.')
    );
  }

  const { id } = req.params;
  configManager.dismissProposal(id);
  return res.json(createSuccessEnvelope({ dismissedId: id, cooldownDays: 90 }));
});

// GET /api/v1/config/audit-log - Retrieve audit log of applied configurations
configRouter.get('/audit-log', (_req, res) => {
  return res.json(createSuccessEnvelope(configManager.getAuditLog()));
});
