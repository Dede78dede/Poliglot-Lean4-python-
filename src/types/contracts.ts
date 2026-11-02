import { z } from 'zod';

/**
 * Lean 4 execution request schema.
 * Strict boundaries: code 1..100k characters, timeout 1..30k ms.
 */
export const LeanExecuteRequestSchema = z.object({
  code: z.string().min(1).max(100_000),
  timeoutMs: z.number().int().min(1_000).max(30_000).default(10_000),
});

export type LeanExecuteRequest = z.infer<typeof LeanExecuteRequestSchema>;

/**
 * Lean 4 execution response schema.
 * verified: boolean strictly denotes whether a theorem proof completed without 'sorry', errors, or simulation.
 */
export const LeanExecuteResponseSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative(),
  verified: z.boolean(),
  simulated: z.boolean().optional(),
});

export type LeanExecuteResponse = z.infer<typeof LeanExecuteResponseSchema>;

/**
 * RFC 9457 Problem Details standard error response schema.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  instance: z.string().optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Health check response schema.
 */
export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  kiminaMode: z.enum(['real', 'simulator', 'auto']),
  kiminaConnected: z.boolean(),
  version: z.string(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * Serialized Bridge Error schema.
 */
export const SerializedBridgeErrorSchema = z.object({
  code: z.string(),
  problemType: z.string(),
  httpStatus: z.number().int().min(100).max(599),
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export type SerializedBridgeErrorZod = z.infer<typeof SerializedBridgeErrorSchema>;

/**
 * Factory for creating typed ResultEnvelope schemas.
 * Uses discriminatedUnion on 'ok' consistently per C1/C3 (no plain z.union).
 */
export function createResultEnvelopeSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      value: valueSchema,
      correlationId: z.string(),
      timestamp: z.string(),
    }),
    z.object({
      ok: z.literal(false),
      error: SerializedBridgeErrorSchema,
      correlationId: z.string(),
      timestamp: z.string(),
    }),
  ]);
}

/**
 * Proof reuse query and result schemas.
 */
export const ProofReuseQuerySchema = z.object({
  goal: z.string().min(1),
  leanToolchain: z.string().min(1),
  minSimilarity: z.number().min(0).max(1).optional(),
});

export const ProofReuseResultSchema = z.object({
  goalHash: z.string(),
  proof: z.string(),
  dependencies: z.array(z.string()).optional(),
  certificateSha256: z.string(),
  similarity: z.number().min(0).max(1),
  sourceDeclaration: z.string(),
  createdAt: z.string(),
  warning: z.string().optional(),
});

/**
 * Proposal Loop schemas.
 */
export const ProposalLoopNodeResultSchema = z.object({
  node: z.enum(['proposer', 'builder', 'reviewer', 'memory']),
  iteration: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  status: z.enum(['success', 'failure', 'timeout', 'budget_exceeded']),
  details: z.record(z.string(), z.unknown()),
});

export const ProposalLoopResultSchema = z.object({
  proved: z.boolean(),
  finalProof: z.string().optional(),
  certificateSha256: z.string().optional(),
  iterations: z.number().int().nonnegative(),
  nodes: z.array(ProposalLoopNodeResultSchema),
  totalCostUsd: z.number().nonnegative(),
  totalDurationMs: z.number().nonnegative(),
  memoryLessons: z.array(z.string()),
});

/**
 * Translation Fidelity schemas.
 */
export const FidelityCheckRequestSchema = z.object({
  direction: z.enum(['python-to-lean', 'lean-to-python']),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
});

export const FidelityCheckResultSchema = z.object({
  passed: z.boolean(),
  checks: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    details: z.string().optional(),
  })),
  durationMs: z.number().nonnegative(),
  epistemicWarning: z.string().optional(),
});

/**
 * Config Proposal schemas.
 */
export const ConfigChangeSchema = z.object({
  flag: z.string(),
  from: z.boolean(),
  to: z.boolean(),
});

export const ConfigProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  source: z.enum(['hardware', 'usage', 'benchmark']),
  changes: z.array(ConfigChangeSchema),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
