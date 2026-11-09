/**
 * Canonical Zod Boundary Contracts (Phase 14.9.3 M3)
 *
 * Single source of truth for runtime boundary validation and Pydantic v2 code generation.
 */

import { z } from 'zod';

export * from '../types/contracts';

/**
 * Zod schema for ProofOutcome discriminated union.
 */
export const ProofOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('certified'),
    seal: z.literal('SEAL_KERNEL_VERIFIED_TIER5'),
    digest: z.string(),
    axioms: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('transport'),
    source: z.literal('hybrid-adjudicator'),
    payload: z.object({
      theoremName: z.string().optional(),
      declarationCount: z.number().int().optional(),
      unprovenCount: z.number().int().optional(),
      axioms: z.array(z.string()).optional(),
      durationMs: z.number().optional(),
    }),
  }),
  z.object({
    kind: z.literal('preflight'),
    syntaxValid: z.boolean(),
    sorryFree: z.boolean(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('unavailable'),
    reason: z.enum(['client_stub', 'adjudicator_unreachable', 'feature_disabled']),
  }),
  z.object({
    kind: z.literal('metadata'),
    note: z.string(),
  }),
]);

export type ProofOutcomeZod = z.infer<typeof ProofOutcomeSchema>;
