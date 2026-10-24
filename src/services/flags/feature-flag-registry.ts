/**
 * Unified Feature Flag Registry (Phase 10.9, Task F1)
 *
 * Consolidates 26 scattered feature flags (25 ENABLE_* + 1 PIPELINE_STRICT_GOALS)
 * into a single typed registry with IndexedDB persistence for user overrides.
 * Strict adherence to Manifesto: no any, no enum, discriminated categories.
 */

export const FEATURE_FLAGS = {
  // Runtime
  ENABLE_FEMEV:            { default: false, phase: '10.5', category: 'runtime' },
  ENABLE_PASTALEAN:        { default: false, phase: '10.6', category: 'runtime' },
  ENABLE_LUNGO:            { default: false, phase: '10.6', category: 'runtime' },
  ENABLE_LEANFLOW:         { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LEANSCREEN:       { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LATEX_INGESTION:  { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LEANCERT:         { default: false, phase: '10.8', category: 'runtime' },
  // Tooling
  ENABLE_NUMPYSPEC:        { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_NERODIA:          { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_PROVEPY:          { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_LEAN_FMT:         { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_HERON:            { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_VERSO:            { default: false, phase: '10.8', category: 'tooling' },
  // Search
  ENABLE_LEAN_FINDER_V2:   { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_LEANSEARCH_V2:    { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_LEANEXPLORE:      { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_CRAMF:            { default: false, phase: '10.8', category: 'experiment' },
  // Blueprint
  ENABLE_LEAN_ATLAS:       { default: false, phase: '10.8', category: 'tooling' },
  // MCP
  ENABLE_MCP_SERVER:       { default: false, phase: '10.3', category: 'runtime' },
  ENABLE_MCP_HTTP_TRANSPORT: { default: false, phase: '10.3', category: 'runtime' },
  // Infrastructure
  ENABLE_ARCHON_HORIZON:   { default: false, phase: '10.3', category: 'experiment' },
  ENABLE_LEAN_RESERVOIR:   { default: true,  phase: '10.3', category: 'runtime' },
  ENABLE_DUPER:            { default: false, phase: '8',    category: 'experiment' },
  ENABLE_LEANSAGE:         { default: false, phase: '8',    category: 'experiment' },
  ENABLE_PYODIDE_BUILD:    { default: false, phase: '10.1', category: 'experiment' },
  // Selective Integrations (Phase 10.9.5)
  ENABLE_PAPERPROOF:       { default: false, phase: '10.9.5', category: 'runtime' },
  ENABLE_MATHESIS:         { default: false, phase: '10.9.5', category: 'runtime' },
  ENABLE_EDUCATIONAL_MODE: { default: false, phase: '10.9.5', category: 'tooling' },
  // Policy (different prefix; documented as a policy flag, not an enable flag)
  PIPELINE_STRICT_GOALS:   { default: false, phase: '10.5', category: 'policy' },
} as const satisfies Record<string, { default: boolean; phase: string; category: 'runtime' | 'tooling' | 'experiment' | 'policy' }>;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagItem {
  readonly name: FeatureFlagName;
  readonly enabled: boolean;
  readonly category: 'runtime' | 'tooling' | 'experiment' | 'policy';
  readonly phase: string;
}

import { ExternalStoreBase } from '../stores/external-store-base';

export interface IFeatureFlagRegistry {
  isEnabled(name: FeatureFlagName): boolean;
  set(name: FeatureFlagName, value: boolean): void;
  reset(name?: FeatureFlagName): void;
  list(): readonly FeatureFlagItem[];
  subscribe(listener: () => void): () => void;
  getSnapshot(): Readonly<Record<FeatureFlagName, boolean>>;
  getUnknownFlagWarnings(): readonly string[];
}

export class DefaultFeatureFlagRegistry extends ExternalStoreBase<Readonly<Record<FeatureFlagName, boolean>>> implements IFeatureFlagRegistry {
  private values: Record<FeatureFlagName, boolean>;
  private readonly unknownFlagWarnings: string[] = [];
  private inMemoryIdbMock: Map<string, boolean> = new Map();

  constructor() {
    super({ id: 'featureFlagRegistry', multiTabSync: false, persistToIndexedDb: true });
    this.values = this.initializeFromDefaultsAndEnv();
    this.detectUnknownEnvFlags();
  }

  private initializeFromDefaultsAndEnv(): Record<FeatureFlagName, boolean> {
    const initial: Partial<Record<FeatureFlagName, boolean>> = {};

    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagName[]) {
      const def = FEATURE_FLAGS[key].default;
      let val = def;

      // Check environment variables
      const envVal = this.readEnv(key);
      if (envVal !== undefined) {
        val = envVal.toLowerCase() === 'true' || envVal === '1';
      }

      initial[key] = val;
    }

    return initial as Record<FeatureFlagName, boolean>;
  }

  private readEnv(key: string): string | undefined {
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] !== 'undefined') {
      return process.env[key];
    }
    return undefined;
  }

  public detectUnknownEnvFlags(): readonly string[] {
    this.unknownFlagWarnings.length = 0;
    if (typeof process !== 'undefined' && process.env) {
      for (const envKey of Object.keys(process.env)) {
        if (envKey.startsWith('ENABLE_') && !(envKey in FEATURE_FLAGS)) {
          const warning = `FEATURE_FLAG_UNKNOWN: Environment variable ${envKey} is not recognized in FeatureFlagRegistry.`;
          this.unknownFlagWarnings.push(warning);
        }
      }
    }
    return [...this.unknownFlagWarnings];
  }

  public isEnabled(name: FeatureFlagName): boolean {
    return this.values[name] ?? FEATURE_FLAGS[name]?.default ?? false;
  }

  public set(name: FeatureFlagName, value: boolean): void {
    if (this.values[name] !== value) {
      this.values[name] = value;
      this.persistToIndexedDb(name, value);
      this.notify();
    }
  }

  public reset(name?: FeatureFlagName): void {
    if (name) {
      this.values[name] = FEATURE_FLAGS[name].default;
      this.removeFromIndexedDb(name);
    } else {
      for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagName[]) {
        this.values[key] = FEATURE_FLAGS[key].default;
      }
      this.clearIndexedDb();
    }
    this.notify();
  }

  public list(): readonly FeatureFlagItem[] {
    return (Object.keys(FEATURE_FLAGS) as FeatureFlagName[]).map((name) => ({
      name,
      enabled: this.isEnabled(name),
      category: FEATURE_FLAGS[name].category,
      phase: FEATURE_FLAGS[name].phase,
    }));
  }

  protected computeSnapshot(): Readonly<Record<FeatureFlagName, boolean>> {
    return Object.freeze({ ...this.values });
  }

  public getUnknownFlagWarnings(): readonly string[] {
    return [...this.unknownFlagWarnings];
  }

  // IndexedDB persistence for user overrides
  public persistToIndexedDb(name: FeatureFlagName, value: boolean): void {
    this.inMemoryIdbMock.set(name, value);
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      try {
        const req = window.indexedDB.open('polyglot-feature-flags', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('overrides')) {
            db.createObjectStore('overrides');
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('overrides', 'readwrite');
          tx.objectStore('overrides').put(value, name);
        };
      } catch {
        // Fallback gracefully in testing/SSR
      }
    }
  }

  public removeFromIndexedDb(name: FeatureFlagName): void {
    this.inMemoryIdbMock.delete(name);
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      try {
        const req = window.indexedDB.open('polyglot-feature-flags', 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('overrides', 'readwrite');
          tx.objectStore('overrides').delete(name);
        };
      } catch {
        // Fallback gracefully
      }
    }
  }

  public clearIndexedDb(): void {
    this.inMemoryIdbMock.clear();
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      try {
        const req = window.indexedDB.open('polyglot-feature-flags', 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('overrides', 'readwrite');
          tx.objectStore('overrides').clear();
        };
      } catch {
        // Fallback gracefully
      }
    }
  }

  public getPersistedOverride(name: FeatureFlagName): boolean | undefined {
    return this.inMemoryIdbMock.get(name);
  }
}

export const featureFlagRegistry = new DefaultFeatureFlagRegistry();
