/**
 * Zod Schema for Polyglot Settings (Sprint 11.0.2, Task ST3)
 * Enforces strict validation: unknown keys are rejected.
 */

import { z } from 'zod';

export const EditorSettingsSchema = z.object({
  fontSize: z.number().min(8).max(36),
  tabSize: z.number().min(1).max(8),
  wordWrap: z.enum(['on', 'off', 'wordWrapColumn']),
  minimap: z.boolean(),
  lineNumbers: z.enum(['on', 'off', 'relative']),
  renderWhitespace: z.enum(['none', 'boundary', 'selection', 'all']),
  bracketPairColorization: z.boolean(),
  stickyScroll: z.boolean(),
  formatOnSave: z.boolean(),
  autoSaveDelay: z.number().min(0).max(60000),
}).strict();

export const AppearanceSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'high-contrast', 'system']),
  accentColor: z.string(),
  activityBarSize: z.enum(['default', 'compact']),
  sidePanelPosition: z.enum(['left', 'right']),
}).strict();

export const RuntimeSettingsSchema = z.object({
  pyodideVersion: z.string(),
  defaultLeanToolchain: z.string(),
  containerHealthCheckIntervalMs: z.number().min(1000),
  idleTimeoutMinutes: z.number().min(1),
  memoryLimitMb: z.number().min(128),
}).strict();

export const AiProviderConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  defaultModel: z.string(),
  priorityOrder: z.number(),
}).strict();

export const McpSettingsSchema = z.object({
  serverEnabled: z.boolean(),
  httpTransportEnabled: z.boolean(),
  bearerToken: z.string(),
  toolSearchEnabled: z.boolean(),
  gateway: z.enum(['none', 'litellm', 'agentgateway']),
}).strict();

export const ChatSettingsSchema = z.object({
  defaultProvider: z.string(),
  systemPrompt: z.string(),
  maxToolCalls: z.number().min(1).max(200),
  maxFileEdits: z.number().min(1).max(50),
  streamingEnabled: z.boolean(),
  sessionRetentionDays: z.number().min(1),
  autoArchiveEnabled: z.boolean(),
  autoArchiveIdleHours: z.number().min(1),
}).strict();

export const PrivacySettingsSchema = z.object({
  telemetryEnabled: z.boolean(),
  localOnlyNoticeAcknowledged: z.boolean(),
}).strict();

export const AdvancedSettingsSchema = z.object({
  debugMode: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  enableCorrelationHeaders: z.boolean(),
}).strict();

export const PolyglotSettingsSchema = z.object({
  editor: EditorSettingsSchema,
  appearance: AppearanceSettingsSchema,
  runtime: RuntimeSettingsSchema,
  providers: z.record(z.string(), AiProviderConfigSchema),
  flags: z.record(z.string(), z.boolean()),
  mcp: McpSettingsSchema,
  chat: ChatSettingsSchema,
  privacy: PrivacySettingsSchema,
  advanced: AdvancedSettingsSchema,
}).strict();

export type ValidatedPolyglotSettings = z.infer<typeof PolyglotSettingsSchema>;
