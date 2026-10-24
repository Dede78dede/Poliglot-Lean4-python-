import type {
  ContextKey,
  ContextValue,
  ContextSnapshot,
  Disposable,
} from '../../types/navigation';
import { CONTEXT_KEYS } from '../../types/navigation';

export type ContextListener = () => void;

import { ExternalStoreBase } from '../stores/external-store-base';

export class ContextKeyService extends ExternalStoreBase<ContextSnapshot> {
  private values = new Map<ContextKey, ContextValue>();
  private readonly parent?: ContextKeyService;

  constructor(parent?: ContextKeyService) {
    super({ id: 'contextKeyService', multiTabSync: true });
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
      this.notify();
    }
  }

  protected computeSnapshot(): ContextSnapshot {
    const parentSnap = this.parent ? this.parent.getSnapshot() : ({} as Record<ContextKey, ContextValue>);
    const result = { ...parentSnap };

    for (const key of CONTEXT_KEYS) {
      if (this.values.has(key)) {
        result[key] = this.values.get(key);
      } else if (!(key in result)) {
        result[key] = undefined;
      }
    }

    return Object.freeze(result) as ContextSnapshot;
  }

  public createScoped(): ContextKeyService {
    return new ContextKeyService(this);
  }

  public reset(): void {
    this.values.clear();
    if (!this.parent) {
      this.initDefaults();
    }
    this.notify();
  }
}

export const contextKeyService = new ContextKeyService();
