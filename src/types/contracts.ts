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

/**
 * Dual-Engine Consensus Verification Request Schema (polyglot.verification.v1)
 */
export const ConsensusProjectFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
}).strict();

export const ConsensusEnvironmentSchema = z.object({
  leanToolchain: z.string().min(1),
  kiminaImageDigest: z.string().optional(),
  lakeRunnerImageDigest: z.string().optional(),
  manifestDigest: z.string().optional(),
}).strict();

export const ConsensusRequestSchema = z.object({
  protocolVersion: z.literal('polyglot.verification.v1'),
  requestId: z.string().min(1),
  scope: z.enum(['snippet', 'project']),
  sourceDigest: z.string().min(1),
  contextDigest: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  code: z.string().optional(),
  files: z.array(ConsensusProjectFileSchema).optional(),
  sessionId: z.string().uuid().optional(),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  environment: ConsensusEnvironmentSchema,
  axiomPolicyId: z.string().default('polyglot.axioms.standard.v1'),
  requireConsensus: z.boolean().default(true),
}).strict();

export type ConsensusRequest = z.infer<typeof ConsensusRequestSchema>;

export const ConsensusAdjudicationResultSchema = z.object({
  protocolVersion: z.literal('polyglot.verification.v1'),
  requestId: z.string(),
  verdict: z.enum(['confirmed_valid', 'confirmed_invalid', 'unconfirmed']),
  verified: z.boolean(),
  seal: z.literal('SEAL_KERNEL_VERIFIED_TIER5').nullable(),
  axiomPolicyCompliance: z.boolean(),
  enginesConsulted: z.array(z.string()),
  consensusAchieved: z.boolean(),
  reason: z.string(),
  diagnostics: z.array(z.unknown()),
}).strict();

export const ServerHealthzResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
}).strict();

export const ServerReadyzEngineStatusSchema = z.object({
  mode: z.enum(['real', 'simulator', 'auto']),
  reachable: z.boolean(),
}).strict();

export const ServerReadyzResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string().optional(),
  error: z.string().optional(),
  kimina: ServerReadyzEngineStatusSchema,
  runner: ServerReadyzEngineStatusSchema,
}).strict();

/**
 * Telemetry ingestion and retrieval strict schemas.
 */
export const TelemetrySpanEventSchema = z.object({
  name: z.string().min(1),
  time: z.number(),
  attributes: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const TelemetrySpanPayloadSchema = z.object({
  span: z.object({
    spanId: z.string().min(1),
    traceId: z.string().min(1),
    parentSpanId: z.string().optional(),
    name: z.string().min(1).default('client_span'),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    durationMs: z.number().nonnegative().default(0),
    attributes: z.record(z.string(), z.unknown()).default({}),
    status: z.object({
      code: z.enum(['OK', 'ERROR', 'UNSET']),
      message: z.string().optional(),
    }).strict().default({ code: 'OK' }),
    events: z.array(TelemetrySpanEventSchema).default([]),
  }).strict(),
}).strict();

/**
 * Speculative Probe (LeanBeam) & LP2 Translation strict request schemas.
 */
export const SpeculativeProbeRequestSchema = z.object({
  path: z.string().optional(),
  version: z.number().int().optional(),
  line: z.number().int().optional(),
  character: z.number().int().optional(),
  text: z.string().optional(),
  tactics: z.array(z.string()).max(8).optional(),
  workspace: z.string().optional(),
  toolchain: z.string().optional(),
  timeoutMs: z.number().int().min(50).max(5_000).optional(),
}).strict();

export const Lp2TranslationRequestSchema = z.object({
  direction: z.enum(['py2lean', 'lean2py']),
  source: z.string().min(1),
}).strict();

