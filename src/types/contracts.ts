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
