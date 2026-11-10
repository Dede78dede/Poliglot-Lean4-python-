/**
 * Canonical Zod Boundary Contracts (Phase 14.9.9.1)
 *
 * Single source of truth for runtime boundary validation and Pydantic v2 code generation.
 */

import { z } from 'zod';

export * from '../types/contracts';
export { type CertificationTier, type ProofOutcome } from '../types/proof-outcome';

export const CertificationTierSchema = z.enum([
  'KERNEL_VERIFIED_TIER5',
  'NUMERIC_CERTIFICATE_UNVERIFIED',
  'SYNTAX_ONLY_UNVERIFIED',
  'DEGRADED_FALLBACK_UNVERIFIED',
  'UNAVAILABLE',
]);

/**
 * Zod schema for ProofOutcome discriminated union.
 */
export const ProofOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('certified'),
    seal: z.literal('SEAL_KERNEL_VERIFIED_TIER5'),
    certificationTier: z.literal('KERNEL_VERIFIED_TIER5'),
    verified: z.literal(true),
    digest: z.string(),
    axioms: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('numeric-certificate'),
    certificationTier: z.literal('NUMERIC_CERTIFICATE_UNVERIFIED'),
    verified: z.literal(false),
    certificate: z.string(),
    methodUsed: z.enum(['interval', 'taylor-model', 'solver']),
    bounds: z
      .object({
        lower: z.number(),
        upper: z.number(),
      })
      .optional(),
  }),
  z.object({
    kind: z.literal('transport'),
    certificationTier: z.literal('DEGRADED_FALLBACK_UNVERIFIED'),
    verified: z.literal(false),
    source: z.enum(['hybrid-adjudicator', 'bridge_fallback']),
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
    certificationTier: z.literal('SYNTAX_ONLY_UNVERIFIED'),
    verified: z.literal(false),
    syntaxValid: z.boolean(),
    sorryFree: z.boolean(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('unavailable'),
    certificationTier: z.literal('UNAVAILABLE'),
    verified: z.literal(false),
    reason: z.enum(['client_stub', 'adjudicator_unreachable', 'feature_disabled']),
  }),
  z.object({
    kind: z.literal('metadata'),
    certificationTier: z.literal('SYNTAX_ONLY_UNVERIFIED'),
    verified: z.literal(false),
    note: z.string(),
  }),
]);

export type ProofOutcomeZod = z.infer<typeof ProofOutcomeSchema>;
