/**
 * Trash Service (Sprint 11.0.1, Soft Delete & Two-Stage Deletion)
 *
 * Implements two-stage file deletion:
 * 1. Move to soft-delete store (.trash/<uuid>/) with metadata.json
 * 2. Restore or empty trash (permanent purge)
 *
 * Extends ExternalStoreBase for reactive UI synchronization.
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import { BridgeError } from '../errors/bridge-error';

export interface TrashItemMetadata {
  readonly id: string;
  readonly originalPath: string;
  readonly deletedAt: string; // ISO 8601
  readonly sizeBytes: number;
  readonly contentType: string;
}

export interface TrashItem extends TrashItemMetadata {
  readonly content: string;
}

const STORAGE_KEY = 'polyglot.trash.items';

export class TrashService extends ExternalStoreBase<readonly TrashItem[]> {
  private items: TrashItem[] = [];

  public constructor() {
    super({
      id: 'trash-store',
      multiTabSync: true,
    });
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrashItem[];
      if (Array.isArray(parsed)) {
        this.items = parsed;
      }
    } catch {
      // Ignore storage read error
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // Ignore storage write error
    }
  }

  public moveToTrash(
    originalPath: string,
    content: string,
    correlationId = `trash-${Date.now()}`,
  ): TrashItem {
    if (!originalPath) {
      throw new BridgeError('TRASH_OPERATION_FAILED', correlationId, {
        reason: 'Path must not be empty',
      });
    }

    const id = `trash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const encoder = new TextEncoder();
    const sizeBytes = encoder.encode(content).byteLength;

    let contentType = 'text/plain';
    if (originalPath.endsWith('.py')) contentType = 'text/x-python';
    else if (originalPath.endsWith('.lean')) contentType = 'text/x-lean';
    else if (originalPath.endsWith('.json')) contentType = 'application/json';
    else if (originalPath.endsWith('.md')) contentType = 'text/markdown';

    const item: TrashItem = {
      id,
      originalPath,
      deletedAt: new Date().toISOString(),
      sizeBytes,
      contentType,
      content,
    };

    this.items = [item, ...this.items];
    this.saveToStorage();
    this.notify();
    return item;
  }

  public listTrash(): readonly TrashItem[] {
    return Object.freeze([...this.items]);
  }

  public restoreFromTrash(
    id: string,
    correlationId = `restore-${Date.now()}`,
  ): { originalPath: string; content: string } {
    const index = this.items.findIndex((item) => item.id === id || item.originalPath === id);
    if (index === -1) {
      throw new BridgeError('TRASH_OPERATION_FAILED', correlationId, {
        reason: `Item with id/path "${id}" not found in trash`,
      });
    }

    const [item] = this.items.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return {
      originalPath: item!.originalPath,
      content: item!.content,
    };
  }

  public deletePermanently(
    id: string,
    correlationId = `purge-${Date.now()}`,
  ): void {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new BridgeError('TRASH_OPERATION_FAILED', correlationId, {
        reason: `Item with id "${id}" not found in trash`,
      });
    }
    this.items.splice(index, 1);
    this.saveToStorage();
    this.notify();
  }

  public emptyTrash(): { deletedCount: number } {
    const count = this.items.length;
    this.items = [];
    this.saveToStorage();
    this.notify();
    return { deletedCount: count };
  }

  public reset(): void {
    this.items = [];
    this.saveToStorage();
    this.notify();
  }

  protected computeSnapshot(): readonly TrashItem[] {
    return Object.freeze([...this.items]);
  }
}

export const trashService = new TrashService();
