/**
 * ExternalStoreBase (Phase 10.9 & Phase 11.3)
 *
 * Abstract base class providing useSyncExternalStore compatible subscription,
 * snapshot caching, multiTabSync via BroadcastChannel, and persistence hooks.
 */

export interface ExternalStoreOptions {
  readonly id: string;
  readonly multiTabSync?: boolean;
  readonly persistToIndexedDb?: boolean;
}

export abstract class ExternalStoreBase<TState> {
  protected readonly options: ExternalStoreOptions;
  private readonly listeners = new Set<() => void>();
  private broadcastChannel: BroadcastChannel | null = null;
  private cachedSnapshot: TState | null = null;

  constructor(options: ExternalStoreOptions) {
    this.options = options;

    if (options.multiTabSync && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(`polyglot.store.${options.id}`);
        (this.broadcastChannel as unknown as { unref?: () => void }).unref?.();
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STORE_SYNC') {
            this.handleRemoteSync(event.data.state);
          }
        };
      } catch {
        // BroadcastChannel unavailable in this environment
      }
    }
  }

  protected abstract computeSnapshot(): TState;

  public getSnapshot = (): TState => {
    if (this.cachedSnapshot === null) {
      this.cachedSnapshot = this.computeSnapshot();
    }
    return this.cachedSnapshot;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  protected notify(): void {
    this.cachedSnapshot = this.computeSnapshot();
    for (const listener of this.listeners) {
      listener();
    }

    if (this.broadcastChannel && this.options.multiTabSync) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STORE_SYNC',
          state: this.cachedSnapshot,
        });
      } catch {
        // Message serialization or transmission failure ignored
      }
    }
  }

  protected handleRemoteSync(_state: unknown): void {
    this.notify();
  }

  public destroy(): void {
    this.listeners.clear();
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
  }
}
