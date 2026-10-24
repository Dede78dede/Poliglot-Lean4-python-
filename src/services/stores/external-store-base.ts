/**
 * Unified External Store Base (Phase 10.9, Task S1)
 *
 * Base class for all useSyncExternalStore compatible stores.
 * Enforces reference stability on getSnapshot, deterministic notify(),
 * and opt-in multiTabSync via BroadcastChannel (Refinement R2).
 */

export interface ExternalStoreOptions {
  readonly id: string;
  readonly multiTabSync?: boolean;         // default false
  readonly persistToIndexedDb?: boolean;   // default false
}

export abstract class ExternalStoreBase<TSnapshot> {
  protected readonly options: Required<ExternalStoreOptions>;
  private cachedSnapshot: TSnapshot | null = null;
  private readonly listeners: Set<() => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  protected constructor(options: ExternalStoreOptions) {
    this.options = {
      id: options.id,
      multiTabSync: options.multiTabSync ?? false,
      persistToIndexedDb: options.persistToIndexedDb ?? false,
    };

    if (this.options.multiTabSync) {
      this.initBroadcastChannel();
    }
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new window.BroadcastChannel(`polyglot-store-${this.options.id}`);
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          if (event.data?.id === this.options.id && event.data?.type === 'invalidated') {
            this.cachedSnapshot = null;
            for (const listener of this.listeners) {
              listener();
            }
          }
        };
      } catch {
        // BroadcastChannel unavailable in this environment
      }
    }
  }

  public subscribe = (listener: () => void): (() => void) & { dispose: () => void } => {
    this.listeners.add(listener);
    const unsub = () => {
      this.listeners.delete(listener);
    };
    const disposableUnsub = Object.assign(unsub, { dispose: unsub });
    return disposableUnsub;
  };

  public getSnapshot = (): TSnapshot => {
    if (this.cachedSnapshot === null) {
      this.cachedSnapshot = this.computeSnapshot();
    }
    return this.cachedSnapshot;
  };

  protected notify(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) {
      listener();
    }
    if (this.options.multiTabSync && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ id: this.options.id, type: 'invalidated' });
      } catch {
        // Non-blocking channel message error
      }
    }
  }

  public getListenerCount(): number {
    return this.listeners.size;
  }

  public isMultiTabSyncEnabled(): boolean {
    return this.options.multiTabSync;
  }

  public getId(): string {
    return this.options.id;
  }

  /**
   * For testing: simulate remote BroadcastChannel invalidation
   */
  public simulateRemoteInvalidation(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners.clear();
  }

  /**
   * Derived classes implement this to construct the immutable snapshot.
   */
  protected abstract computeSnapshot(): TSnapshot;
}
