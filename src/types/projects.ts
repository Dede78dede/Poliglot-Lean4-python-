import { z } from 'zod';

export const ProjectTypeSchema = z.enum(['python', 'lean4', 'mixed']);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

export const ProjectFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(5_000_000),
  language: z.enum(['python', 'lean4', 'markdown', 'json', 'toml', 'text']),
  isDirty: z.boolean().optional(),
});

export type ProjectFile = z.infer<typeof ProjectFileSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: ProjectTypeSchema,
  files: z.array(ProjectFileSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  isPinned: z.boolean().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Lean 4 Lake multi-file build result contract.
 * Note: verified is strictly false in any fallback or unverified build.
 */
export const LeanBuildResultSchema = z.object({
  status: z.enum(['success', 'error', 'fallback']),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative(),
  verified: z.boolean(),
  fallback: z.boolean(),
  fallbackNotice: z.string().optional(),
});

export type LeanBuildResult = z.infer<typeof LeanBuildResultSchema>;
