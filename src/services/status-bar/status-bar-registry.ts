import type {
  StatusBarItemDescriptor,
  StatusBarItemAlignment,
  Disposable,
} from '../../types/navigation';

export class StatusBarRegistry {
  private items = new Map<string, StatusBarItemDescriptor>();
  private listeners = new Set<() => void>();
  private cachedSnapshot: readonly StatusBarItemDescriptor[] | null = null;

  public add(item: StatusBarItemDescriptor): Disposable {
    this.items.set(item.id, { visible: true, ...item });
    this.cachedSnapshot = null;
    this.notify();

    return {
      dispose: () => {
        this.remove(item.id);
      },
    };
  }

  public update(id: string, partial: Partial<StatusBarItemDescriptor>): void {
    const existing = this.items.get(id);
    if (!existing) return;

    this.items.set(id, { ...existing, ...partial });
    this.cachedSnapshot = null;
    this.notify();
  }

  public remove(id: string): void {
    if (this.items.delete(id)) {
      this.cachedSnapshot = null;
      this.notify();
    }
  }

  public getItem(id: string): StatusBarItemDescriptor | undefined {
    return this.items.get(id);
  }

  public getItems(alignment?: StatusBarItemAlignment): readonly StatusBarItemDescriptor[] {
    const all = this.getSnapshot();
    if (!alignment) return all;
    return all.filter((item) => item.alignment === alignment);
  }

  public getSnapshot = (): readonly StatusBarItemDescriptor[] => {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    const list = Array.from(this.items.values())
      .filter((i) => i.visible !== false)
      .sort((a, b) => b.priority - a.priority);

    this.cachedSnapshot = Object.freeze(list);
    return this.cachedSnapshot;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public reset(): void {
    this.items.clear();
    this.cachedSnapshot = null;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[StatusBarRegistry] Listener error', err);
      }
    }
  }
}

export const statusBarRegistry = new StatusBarRegistry();
