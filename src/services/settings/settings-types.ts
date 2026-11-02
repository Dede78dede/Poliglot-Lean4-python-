/**
 * Settings Types & Contracts (Sprint 11.0.2, Task ST1 & ST2)
 */

export type SettingsCategory =
  | 'editor'
  | 'appearance'
  | 'runtime'
  | 'providers'
  | 'flags'
  | 'mcp'
  | 'toolchain'
  | 'keybindings'
  | 'chat'
  | 'memory'
  | 'privacy'
  | 'advanced';

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
  bracketPairColorization: boolean;
  stickyScroll: boolean;
  formatOnSave: boolean;
  autoSaveDelay: number;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'high-contrast' | 'system';
  accentColor: string;
  activityBarSize: 'default' | 'compact';
  sidePanelPosition: 'left' | 'right';
}

export interface RuntimeSettings {
  pyodideVersion: string;
  defaultLeanToolchain: string;
  containerHealthCheckIntervalMs: number;
  idleTimeoutMinutes: number;
  memoryLimitMb: number;
}

export interface AiProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  priorityOrder: number;
}

export interface McpSettings {
  serverEnabled: boolean;
  httpTransportEnabled: boolean;
  bearerToken: string;
  toolSearchEnabled: boolean;
  gateway: 'none' | 'litellm' | 'agentgateway';
}

export interface ChatSettings {
  defaultProvider: string;
  systemPrompt: string;
  maxToolCalls: number;
  maxFileEdits: number;
  streamingEnabled: boolean;
  sessionRetentionDays: number;
  autoArchiveEnabled: boolean;
  autoArchiveIdleHours: number;
}

export interface PrivacySettings {
  telemetryEnabled: boolean;
  localOnlyNoticeAcknowledged: boolean;
}

export interface AdvancedSettings {
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCorrelationHeaders: boolean;
}

export interface PolyglotSettings {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  runtime: RuntimeSettings;
  providers: Record<string, AiProviderConfig>;
  flags: Record<string, boolean>;
  mcp: McpSettings;
  chat: ChatSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}
