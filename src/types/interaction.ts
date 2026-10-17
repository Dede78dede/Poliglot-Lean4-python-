import { z } from 'zod';

export const PipelineExecutionPolicySchema = z.enum([
  'fail-fast',
  'continue',
  'require-verified',
]);

export type PipelineExecutionPolicy = z.infer<typeof PipelineExecutionPolicySchema>;

export const InteractionStepSchema = z.object({
  step: z.number().int().positive(),
  title: z.string().min(1).max(100),
  language: z.enum(['python', 'lean4']),
  code: z.string().min(1).max(100_000),
  inputFiles: z.array(z.string()).optional(),
  outputFiles: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
});

export type InteractionStep = z.infer<typeof InteractionStepSchema>;

export const InteractionRequestSchema = z.object({
  pipeline: z.array(InteractionStepSchema).min(1).max(20),
  executionPolicy: PipelineExecutionPolicySchema.default('fail-fast'),
  initialData: z.record(z.string(), z.unknown()).optional(),
});

export type InteractionRequest = z.infer<typeof InteractionRequestSchema>;

export const PythonStepResultSchema = z.object({
  step: z.number().int().positive(),
  language: z.literal('python'),
  status: z.enum(['success', 'error']),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().nonnegative(),
  outputData: z.record(z.string(), z.unknown()).optional(),
  executedIn: z.literal('client'),
  error: z.string().optional(),
});

export type PythonStepResult = z.infer<typeof PythonStepResultSchema>;

export const Lean4StepResultSchema = z.object({
  step: z.number().int().positive(),
  language: z.literal('lean4'),
  status: z.enum(['success', 'error']),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().nonnegative(),
  verified: z.boolean(),
  simulated: z.boolean().optional(),
  executedIn: z.literal('server'),
  error: z.string().optional(),
});

export type Lean4StepResult = z.infer<typeof Lean4StepResultSchema>;

export const InteractionStepResultSchema = z.discriminatedUnion('language', [
  PythonStepResultSchema,
  Lean4StepResultSchema,
]);

export type InteractionStepResult = z.infer<typeof InteractionStepResultSchema>;

export const PipelineRunResultSchema = z.object({
  sessionId: z.string().uuid(),
  policy: PipelineExecutionPolicySchema,
  steps: z.array(InteractionStepResultSchema),
  pipelineVerified: z.boolean(),
  totalDurationMs: z.number().nonnegative(),
  success: z.boolean(),
});

export type PipelineRunResult = z.infer<typeof PipelineRunResultSchema>;
