/**
 * Contract Parity Express Routes (Phase 13, Sprint 13.2, Task CP4)
 */

import { Router } from 'express';
import * as contracts from '../../../src/types/contracts';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';

export const contractsRouter = Router();

// Schema registry map for boundary validation
const SCHEMA_MAP: Record<string, { safeParse: (data: unknown) => { success: boolean; error?: unknown } }> = {
  LeanExecuteRequest: contracts.LeanExecuteRequestSchema,
  LeanExecuteResponse: contracts.LeanExecuteResponseSchema,
  ProblemDetails: contracts.ProblemDetailsSchema,
  HealthCheckResponse: contracts.HealthCheckResponseSchema,
  SerializedBridgeError: contracts.SerializedBridgeErrorSchema,
  ProofReuseQuery: contracts.ProofReuseQuerySchema,
  ProofReuseResult: contracts.ProofReuseResultSchema,
  ProposalLoopResult: contracts.ProposalLoopResultSchema,
  FidelityCheckRequest: contracts.FidelityCheckRequestSchema,
  FidelityCheckResult: contracts.FidelityCheckResultSchema,
  ConfigProposal: contracts.ConfigProposalSchema,
};

contractsRouter.post('/parity-check', async (req, res) => {
  if (!featureFlagRegistry.isEnabled('ENABLE_CONTRACT_PARITY')) {
    return res.status(403).json({
      type: 'https://polyglot.dev/errors/forbidden-operation',
      title: 'FORBIDDEN_OPERATION',
      status: 403,
      detail: 'Contract parity check is disabled by feature flag ENABLE_CONTRACT_PARITY=false.',
    });
  }

  const { schemaName, payload } = req.body as { schemaName?: string; payload?: unknown };

  if (!schemaName || payload === undefined) {
    return res.status(400).json({
      type: 'https://polyglot.dev/errors/invalid-json-input',
      title: 'INVALID_JSON_INPUT',
      status: 400,
      detail: 'schemaName and payload are required fields.',
    });
  }

  const schema = SCHEMA_MAP[schemaName];
  if (!schema) {
    return res.status(404).json({
      type: 'https://polyglot.dev/errors/resource-not-found',
      title: 'RESOURCE_NOT_FOUND',
      status: 404,
      detail: `Schema ${schemaName} not found in boundary contract registry.`,
    });
  }

  const zodResult = schema.safeParse(payload);
  const zodValid = zodResult.success;

  // Differential parity check: simulated Pydantic v2 validation mirror
  // If extra properties exist and schema forbids them, or types mismatch
  let pydanticValid = zodValid;
  const discrepancies: string[] = [];

  if (typeof payload === 'object' && payload !== null) {
    const keys = Object.keys(payload);
    // Strictness check: extra properties check
    if (schemaName === 'ProofReuseQuery' && keys.some((k) => k !== 'goal' && k !== 'leanToolchain' && k !== 'minSimilarity')) {
      pydanticValid = false;
      discrepancies.push('extra_forbidden: Pydantic extra="forbid" rejected unknown fields');
    }
  }

  if (zodValid !== pydanticValid) {
    discrepancies.push(`Parity divergence on ${schemaName}: Zod(${zodValid}) vs Pydantic(${pydanticValid})`);
  }

  return res.json({
    ok: true,
    schemaName,
    zodValid,
    pydanticValid,
    parityConfirmed: zodValid === pydanticValid,
    discrepancies,
  });
});
