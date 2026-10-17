import type { Tier2BufferStats } from '../../types/memory';

interface BufferItem {
  content: string;
  originalContent: string;
  isDirty: boolean;
  lastEditedTimestamp: number;
}

export type SyncCallback = (dirtyMap: ReadonlyMap<string, string>) => Promise<void>;

/**
 * Tier 2: Interactive Buffer.
 * Manages reactive in-memory editor buffers, tracks dirty states against clean disk baselines,
 * and performs debounced (300ms) sync triggers towards Tier 3 IndexedDB store.
 */
export class Tier2InteractiveBuffer {
  private readonly buffers = new Map<string, BufferItem>();
  private readonly debounceMs: number;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSyncTimestamp: number | null = null;
  private syncCallback: SyncCallback | null = null;

  constructor(debounceMs = 300) {
    this.debounceMs = debounceMs;
  }

  setSyncCallback(callback: SyncCallback): void {
    this.syncCallback = callback;
  }

  registerBuffer(path: string, content: string): void {
    if (!this.buffers.has(path)) {
      this.buffers.set(path, {
        content,
        originalContent: content,
        isDirty: false,
        lastEditedTimestamp: Date.now(),
      });
    }
  }

  updateContent(path: string, content: string): void {
    const existing = this.buffers.get(path);
    const now = Date.now();

    if (existing) {
      const isDirty = existing.originalContent !== content;
      this.buffers.set(path, {
        ...existing,
        content,
        isDirty,
        lastEditedTimestamp: now,
      });
    } else {
      this.buffers.set(path, {
        content,
        originalContent: '',
        isDirty: true,
        lastEditedTimestamp: now,
      });
    }

    this.scheduleDebouncedSync();
  }

  markClean(path: string): void {
    const existing = this.buffers.get(path);
    if (existing) {
      this.buffers.set(path, {
        ...existing,
        originalContent: existing.content,
        isDirty: false,
      });
    }
  }

  markAllClean(): void {
    for (const [path, item] of this.buffers.entries()) {
      this.buffers.set(path, {
        ...item,
        originalContent: item.content,
        isDirty: false,
      });
    }
    this.lastSyncTimestamp = Date.now();
  }

  isDirty(path: string): boolean {
    return this.buffers.get(path)?.isDirty ?? false;
  }

  getContent(path: string): string | undefined {
    return this.buffers.get(path)?.content;
  }

  getDirtyFilePaths(): readonly string[] {
    const dirty: string[] = [];
    for (const [path, item] of this.buffers.entries()) {
      if (item.isDirty) dirty.push(path);
    }
    return dirty;
  }

  private scheduleDebouncedSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      void this.flushSync();
    }, this.debounceMs);
  }

  async flushSync(): Promise<void> {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    const dirtyEntries = new Map<string, string>();
    for (const [path, item] of this.buffers.entries()) {
      if (item.isDirty) {
        dirtyEntries.set(path, item.content);
      }
    }

    if (dirtyEntries.size > 0 && this.syncCallback) {
      await this.syncCallback(dirtyEntries);
      this.markAllClean();
    }
  }

  removeBuffer(path: string): void {
    this.buffers.delete(path);
  }

  clear(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.buffers.clear();
  }

  getStats(): Tier2BufferStats {
    const dirtyFilePaths = this.getDirtyFilePaths();
    return {
      dirtyFilesCount: dirtyFilePaths.length,
      dirtyFilePaths,
      lastSyncTimestamp: this.lastSyncTimestamp,
      isSyncPending: this.syncTimer !== null,
    };
  }
}

export const tier2InteractiveBuffer = new Tier2InteractiveBuffer();
