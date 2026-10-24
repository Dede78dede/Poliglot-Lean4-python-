import type {
  StatusBarItemDescriptor,
  StatusBarItemAlignment,
  Disposable,
} from '../../types/navigation';

import { ExternalStoreBase } from '../stores/external-store-base';

export class StatusBarRegistry extends ExternalStoreBase<readonly StatusBarItemDescriptor[]> {
  private items = new Map<string, StatusBarItemDescriptor>();

  constructor() {
    super({ id: 'statusBarRegistry', multiTabSync: true });
  }

  public add(item: StatusBarItemDescriptor): Disposable {
    const existing = this.items.get(item.id);
    if (existing) {
      this.update(item.id, item);
      return {
        dispose: () => {
          this.remove(item.id);
        },
      };
    }

    this.items.set(item.id, { visible: true, ...item });
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

    // Check if any property actually changed
    let hasChange = false;
    for (const [key, val] of Object.entries(partial)) {
      if ((existing as unknown as Record<string, unknown>)[key] !== val) {
        hasChange = true;
        break;
      }
    }
    if (!hasChange) return;

    this.items.set(id, { ...existing, ...partial });
    this.notify();
  }

  public remove(id: string): void {
    if (this.items.delete(id)) {
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

  protected computeSnapshot(): readonly StatusBarItemDescriptor[] {
    const list = Array.from(this.items.values())
      .filter((i) => i.visible !== false)
      .sort((a, b) => b.priority - a.priority);

    return Object.freeze(list);
  }

  public reset(): void {
    if (this.items.size === 0) return;
    this.items.clear();
    this.notify();
  }
}

export const statusBarRegistry = new StatusBarRegistry();
