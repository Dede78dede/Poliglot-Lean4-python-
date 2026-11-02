/**
 * JSON Schema Exporter (Phase 13, Sprint 13.2, Task CP1)
 *
 * Exports Zod v4 schemas to standard JSON Schema (draft-2020-12 / OpenAPI 3.1)
 * with explicit OpenAPI `discriminator: { propertyName }` injection for
 * ZodDiscriminatedUnion.
 *
 * Epistemic Rules:
 * - Always inject discriminator: { propertyName } for ZodDiscriminatedUnion.
 * - Discriminated unions emit `oneOf` with const-tagged literals.
 * - Plain z.union() is banned from boundary contracts (emits anyOf).
 */

import { z } from 'zod';
import * as contracts from '../../types/contracts';

export interface ExportOptions {
  readonly target?: 'draft-2020-12' | 'openapi-3.1';
  readonly emitDiscriminators?: boolean; // default true
}

export function exportJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: ExportOptions = { target: 'draft-2020-12', emitDiscriminators: true }
): Record<string, unknown> {
  const emitDisc = options.emitDiscriminators ?? true;

  return z.toJSONSchema(schema, {
    target: options.target ?? 'draft-2020-12',
    override: (ctx) => {
      if (!emitDisc) return;

      // Extract discriminator property from Zod definition
      const disc =
        (ctx.zodSchema as { _def?: { discriminator?: string } })._def?.discriminator ??
        (ctx.zodSchema as { def?: { discriminator?: string } }).def?.discriminator;

      if (disc) {
        ctx.jsonSchema.discriminator = { propertyName: disc };
      }
    },
  });
}

/**
 * Returns a catalog of all exported boundary schemas for Pydantic v2 sync.
 */
export function exportAllBoundarySchemas(): Record<string, Record<string, unknown>> {
  return {
    LeanExecuteRequest: exportJsonSchema(contracts.LeanExecuteRequestSchema),
    LeanExecuteResponse: exportJsonSchema(contracts.LeanExecuteResponseSchema),
    ProblemDetails: exportJsonSchema(contracts.ProblemDetailsSchema),
    HealthCheckResponse: exportJsonSchema(contracts.HealthCheckResponseSchema),
    SerializedBridgeError: exportJsonSchema(contracts.SerializedBridgeErrorSchema),
    ProofReuseQuery: exportJsonSchema(contracts.ProofReuseQuerySchema),
    ProofReuseResult: exportJsonSchema(contracts.ProofReuseResultSchema),
    ProposalLoopResult: exportJsonSchema(contracts.ProposalLoopResultSchema),
    FidelityCheckRequest: exportJsonSchema(contracts.FidelityCheckRequestSchema),
    FidelityCheckResult: exportJsonSchema(contracts.FidelityCheckResultSchema),
    ConfigProposal: exportJsonSchema(contracts.ConfigProposalSchema),
  };
}
