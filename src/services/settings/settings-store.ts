/**
 * Settings Store (Sprint 11.0.2, Task ST1, ST2 & ST3)
 *
 * Implements centralized settings management with:
 * - Immediate apply
 * - 5-second undo toast tracking
 * - Reset-to-defaults per section (protecting Token Vault credentials)
 * - Strict Zod import/export round-trip
 * - IndexedDB 'polyglot-settings' persistence
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import { tokenVault } from '../storage/token-vault';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import type {
  PolyglotSettings,
  SettingsCategory,
  EditorSettings,
  AppearanceSettings,
  RuntimeSettings,
  McpSettings,
  ChatSettings,
  PrivacySettings,
  AdvancedSettings,
} from './settings-types';
import { PolyglotSettingsSchema } from './settings-schema';

export const DEFAULT_SETTINGS: Readonly<PolyglotSettings> = Object.freeze({
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on' as const,
    minimap: true,
    lineNumbers: 'on' as const,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: true,
    stickyScroll: true,
    formatOnSave: true,
    autoSaveDelay: 1000,
  },
  appearance: {
    theme: 'dark' as const,
    accentColor: '#3b82f6',
    activityBarSize: 'default' as const,
    sidePanelPosition: 'left' as const,
  },
  runtime: {
    pyodideVersion: '0.27.2',
    defaultLeanToolchain: 'v4.35.0-rc4',
    containerHealthCheckIntervalMs: 15000,
    idleTimeoutMinutes: 60,
    memoryLimitMb: 1024,
  },
  providers: {
    gemini: { id: 'gemini', enabled: true, defaultModel: 'gemini-2.5-flash', priorityOrder: 1 },
    'nvidia-nim': { id: 'nvidia-nim', enabled: true, defaultModel: 'meta/llama-3.3-70b-instruct', priorityOrder: 2 },
    groq: { id: 'groq', enabled: true, defaultModel: 'llama-3.3-70b-versatile', priorityOrder: 3 },
    cerebras: { id: 'cerebras', enabled: true, defaultModel: 'llama3.1-70b', priorityOrder: 4 },
    mistral: { id: 'mistral', enabled: true, defaultModel: 'codestral-latest', priorityOrder: 5 },
    openrouter: { id: 'openrouter', enabled: true, defaultModel: 'deepseek/deepseek-r1:free', priorityOrder: 6 },
    anthropic: { id: 'anthropic', enabled: true, defaultModel: 'claude-3-7-sonnet', priorityOrder: 7 },
    openai: { id: 'openai', enabled: true, defaultModel: 'gpt-4.5-preview', priorityOrder: 8 },
    deepseek: { id: 'deepseek', enabled: true, defaultModel: 'deepseek-chat', priorityOrder: 9 },
    kimi: { id: 'kimi', enabled: true, defaultModel: 'moonshot-v1-8k', priorityOrder: 10 },
    minimax: { id: 'minimax', enabled: true, defaultModel: 'MiniMax-Text-01', priorityOrder: 11 },
    leanstral: { id: 'leanstral', enabled: true, defaultModel: 'leanstral-1.5', priorityOrder: 12 },
    axle: { id: 'axle', enabled: true, defaultModel: 'axle-prover-v2', priorityOrder: 13 },
    'no-ai': { id: 'no-ai', enabled: true, defaultModel: 'local-heuristic-prover', priorityOrder: 14 },
  },
  flags: {},
  mcp: {
    serverEnabled: true,
    httpTransportEnabled: false,
    bearerToken: 'polyglot-mcp-token',
    toolSearchEnabled: false,
    gateway: 'none' as const,
  },
  chat: {
    defaultProvider: 'gemini',
    systemPrompt: 'You are Polyglot Code Studio Assistant. Assist with Lean 4 formal proofs and Python algorithms. When the user asks to test a tactic without applying it, use polyglot_probe_tactic. It returns goals before and after, without mutating the file. Do not confuse a successful probe with a kernel-verified proof — only SEAL_KERNEL_VERIFIED_TIER5 certifies.',
    maxToolCalls: 50,
    maxFileEdits: 10,
    streamingEnabled: true,
    sessionRetentionDays: 30,
    autoArchiveEnabled: true,
    autoArchiveIdleHours: 24,
  },
  privacy: {
    telemetryEnabled: false,
    localOnlyNoticeAcknowledged: true,
  },
  advanced: {
    debugMode: false,
    logLevel: 'info' as const,
    enableCorrelationHeaders: true,
  },
});

export interface SettingsStoreSnapshot {
  readonly settings: PolyglotSettings;
  readonly isModalOpen: boolean;
  readonly activeCategory: SettingsCategory;
  readonly searchQuery: string;
  readonly undoAvailable: boolean;
  readonly undoMessage: string | null;
}

const STORAGE_KEY = 'polyglot.settings';
const IDB_DB_NAME = 'polyglot-settings';
const IDB_STORE_NAME = 'preferences';

export class SettingsStore extends ExternalStoreBase<SettingsStoreSnapshot> {
  private settings: PolyglotSettings;
  private isModalOpen = false;
  private activeCategory: SettingsCategory = 'editor';
  private searchQuery = '';
  private previousSettings: PolyglotSettings | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private undoMessage: string | null = null;

  constructor() {
    super({
      id: 'settingsStore',
      multiTabSync: true,
      persistToIndexedDb: false,
    });
    this.settings = this.loadInitialSettings();
  }

  protected computeSnapshot(): SettingsStoreSnapshot {
    return {
      settings: this.settings,
      isModalOpen: this.isModalOpen,
      activeCategory: this.activeCategory,
      searchQuery: this.searchQuery,
      undoAvailable: this.previousSettings !== null,
      undoMessage: this.undoMessage,
    };
  }

  private loadInitialSettings(): PolyglotSettings {
    let loaded: PolyglotSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const validated = PolyglotSettingsSchema.safeParse(parsed);
          if (validated.success) {
            loaded = validated.data;
          }
        }
      } catch {
        // Fall back to defaults
      }
    }
    return loaded;
  }

  public openModal(category: SettingsCategory = 'editor'): void {
    this.isModalOpen = true;
    this.activeCategory = category;
    this.notify();
  }

  public closeModal(): void {
    this.isModalOpen = false;
    this.notify();
  }

  public setCategory(category: SettingsCategory): void {
    this.activeCategory = category;
    this.notify();
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.notify();
  }

  /**
   * Updates settings with immediate apply and 5-second undo toast
   */
  public updateSettings<K extends keyof PolyglotSettings>(
    category: K,
    patch: Partial<PolyglotSettings[K]>,
    changeDescription?: string
  ): void {
    this.snapshotForUndo(changeDescription ?? `Updated ${String(category)}`);

    this.settings = {
      ...this.settings,
      [category]: {
        ...this.settings[category],
        ...patch,
      },
    };

    // If flags updated, sync to FeatureFlagRegistry
    if (category === 'flags') {
      for (const [k, v] of Object.entries(patch as Record<string, boolean>)) {
        try {
          featureFlagRegistry.set(k as any, v);
        } catch {
          // Ignore
        }
      }
    }

    this.persist();
    this.notify();
  }

  public updateProviderCredential(providerId: string, apiKey: string): void {
    this.snapshotForUndo(`Updated credentials for ${providerId}`);
    void tokenVault.storeSecret(providerId, apiKey, 'polyglot-default-pass', {
      label: `API key for ${providerId}`,
    });

    if (this.settings.providers[providerId]) {
      this.settings.providers[providerId].apiKey = apiKey ? '••••••••' : undefined;
    }
    this.persist();
    this.notify();
  }

  private snapshotForUndo(message: string): void {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
    }
    this.previousSettings = JSON.parse(JSON.stringify(this.settings));
    this.undoMessage = message;

    // Toast expires in 5 seconds
    this.undoTimer = setTimeout(() => {
      this.previousSettings = null;
      this.undoMessage = null;
      this.notify();
    }, 5000);
  }

  public undoLastChange(): boolean {
    if (!this.previousSettings) return false;
    this.settings = this.previousSettings;
    this.previousSettings = null;
    this.undoMessage = null;
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.persist();
    this.notify();
    return true;
  }

  public resetSectionToDefaults(category: SettingsCategory): void {
    this.snapshotForUndo(`Reset ${category} to defaults`);
    switch (category) {
      case 'editor':
        this.settings.editor = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.editor));
        break;
      case 'appearance':
        this.settings.appearance = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.appearance));
        break;
      case 'runtime':
        this.settings.runtime = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.runtime));
        break;
      case 'mcp':
        this.settings.mcp = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.mcp));
        break;
      case 'chat':
        this.settings.chat = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.chat));
        break;
      case 'privacy':
        this.settings.privacy = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.privacy));
        break;
      case 'advanced':
        this.settings.advanced = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.advanced));
        break;
      default:
        break;
    }
    this.persist();
    this.notify();
  }

  public resetAllToDefaults(): void {
    this.snapshotForUndo('Reset all settings to defaults');
    const preservedProviders = { ...this.settings.providers };
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    for (const [id, prov] of Object.entries(preservedProviders)) {
      if (this.settings.providers[id]) {
        this.settings.providers[id].apiKey = prov.apiKey;
      }
    }
    this.persist();
    this.notify();
  }

  public exportJson(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  public importJson(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = PolyglotSettingsSchema.parse(parsed); // Strict check: unknown keys rejected
      this.snapshotForUndo('Imported settings from JSON');
      this.settings = validated;
      this.persist();
      this.notify();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Ignore
      }
    }

    if (typeof indexedDB !== 'undefined') {
      try {
        const req = indexedDB.open(IDB_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        };
        req.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          tx.objectStore(IDB_STORE_NAME).put(this.settings, 'active');
        };
      } catch {
        // Ignore in test environments
      }
    }
  }
}

export const settingsStore = new SettingsStore();
