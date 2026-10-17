import { z } from 'zod';

export const AUXILIARY_TABS = ['infoview', 'output', 'pipeline', 'problems'] as const;
export type AuxiliaryTab = (typeof AUXILIARY_TABS)[number];

export const WorkspaceLayoutSchema = z.object({
  editorWidthRatio: z.number().min(0.2).max(0.85).default(0.62),
  infoviewHeightRatio: z.number().min(0.2).max(0.85).default(0.50),
  activeAuxiliaryTab: z.enum(AUXILIARY_TABS).default('infoview'),
  isInfoviewVisible: z.boolean().default(true),
  isOutputVisible: z.boolean().default(true),
});

export type WorkspaceLayout = z.infer<typeof WorkspaceLayoutSchema>;
