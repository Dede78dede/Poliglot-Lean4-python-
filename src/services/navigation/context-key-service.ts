import type {
  ContextKey,
  ContextValue,
  ContextSnapshot,
  Disposable,
} from '../../types/navigation';
import { CONTEXT_KEYS } from '../../types/navigation';

export type ContextListener = () => void;

export class ContextKeyService {
  private values = new Map<ContextKey, ContextValue>();
  private readonly parent?: ContextKeyService;
  private readonly listeners = new Set<ContextListener>();
  private cachedSnapshot: ContextSnapshot | null = null;

  constructor(parent?: ContextKeyService) {
    this.parent = parent;
    if (!parent) {
      this.initDefaults();
    }
  }

  private initDefaults(): void {
    for (const key of CONTEXT_KEYS) {
      this.values.set(key, false);
    }
    // Specific typed initial values
    this.values.set('editorLangId', 'lean4');
    this.values.set('presenceCount', 0);
    this.values.set('drawerTab', undefined);
    this.cachedSnapshot = null;
  }

  public getKey(key: ContextKey): ContextValue {
    if (this.values.has(key)) {
      return this.values.get(key);
    }
    if (this.parent) {
      return this.parent.getKey(key);
    }
    return undefined;
  }

  public setKey<K extends ContextKey>(key: K, value: ContextValue): void {
    const existing = this.getKey(key);
    if (existing === value) return;

    this.values.set(key, value);
    this.cachedSnapshot = null;
    this.notify();
  }

  public setKeys(partial: Partial<Record<ContextKey, ContextValue>>): void {
    let changed = false;
    for (const [k, v] of Object.entries(partial) as [ContextKey, ContextValue][]) {
      if (this.getKey(k) !== v) {
        this.values.set(k, v);
        changed = true;
      }
    }
    if (changed) {
      this.cachedSnapshot = null;
      this.notify();
    }
  }

  public getSnapshot = (): ContextSnapshot => {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    const parentSnap = this.parent ? this.parent.getSnapshot() : ({} as Record<ContextKey, ContextValue>);
    const result = { ...parentSnap };

    for (const key of CONTEXT_KEYS) {
      if (this.values.has(key)) {
        result[key] = this.values.get(key);
      } else if (!(key in result)) {
        result[key] = undefined;
      }
    }

    this.cachedSnapshot = Object.freeze(result) as ContextSnapshot;
    return this.cachedSnapshot;
  };

  public subscribe = (listener: ContextListener): (() => void) => {
    this.listeners.add(listener);
    const parentUnsub = this.parent?.subscribe(listener);

    return () => {
      this.listeners.delete(listener);
      parentUnsub?.();
    };
  };

  public createScoped(): ContextKeyService {
    return new ContextKeyService(this);
  }

  public reset(): void {
    this.values.clear();
    if (!this.parent) {
      this.initDefaults();
    }
    this.cachedSnapshot = null;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[ContextKeyService] Listener error', err);
      }
    }
  }
}

export const contextKeyService = new ContextKeyService();
