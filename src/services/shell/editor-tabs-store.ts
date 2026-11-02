/**
 * Editor Tabs Store (Sprint 11.0.1, Advanced Tabs & Split View)
 *
 * Extends ExternalStoreBase with multiTabSync: false (tab-local).
 * Manages reopen stack (max 10 entries), split views, and tab order overrides.
 */

import { ExternalStoreBase } from '../stores/external-store-base';

export type TabSplitMode = 'none' | 'side-by-side' | 'stacked';

export interface EditorTabsSnapshot {
  readonly closedStack: readonly string[];
  readonly splitMode: TabSplitMode;
  readonly splitFilePath: string | null;
  readonly tabOrder: readonly string[];
}

const MAX_CLOSED_STACK = 10;

export class EditorTabsStore extends ExternalStoreBase<EditorTabsSnapshot> {
  private closedStack: string[] = [];
  private splitMode: TabSplitMode = 'none';
  private splitFilePath: string | null = null;
  private tabOrder: string[] = [];

  public constructor() {
    super({
      id: 'editor-tabs',
      multiTabSync: false,
    });
  }

  public pushClosedTab(path: string): void {
    if (!path) return;
    // Remove if already present so it moves to top of LIFO stack
    this.closedStack = this.closedStack.filter((p) => p !== path);
    this.closedStack.unshift(path);
    if (this.closedStack.length > MAX_CLOSED_STACK) {
      this.closedStack = this.closedStack.slice(0, MAX_CLOSED_STACK);
    }
    this.notify();
  }

  public popClosedTab(): string | undefined {
    if (this.closedStack.length === 0) return undefined;
    const popped = this.closedStack.shift();
    this.notify();
    return popped;
  }

  public setTabOrder(tabs: readonly string[]): void {
    this.tabOrder = [...tabs];
    this.notify();
  }

  public moveTab(fromIndex: number, toIndex: number): readonly string[] {
    if (
      fromIndex < 0 ||
      fromIndex >= this.tabOrder.length ||
      toIndex < 0 ||
      toIndex >= this.tabOrder.length
    ) {
      return this.tabOrder;
    }
    const copy = [...this.tabOrder];
    const [moved] = copy.splice(fromIndex, 1);
    if (moved) {
      copy.splice(toIndex, 0, moved);
    }
    this.tabOrder = copy;
    this.notify();
    return this.tabOrder;
  }

  public setSplitMode(mode: TabSplitMode, splitPath?: string | null): void {
    this.splitMode = mode;
    this.splitFilePath = splitPath ?? (mode === 'none' ? null : this.splitFilePath);
    this.notify();
  }

  public toggleSplit(currentPath?: string | null): void {
    if (this.splitMode === 'none') {
      this.splitMode = 'side-by-side';
      this.splitFilePath = currentPath ?? null;
    } else {
      this.splitMode = 'none';
      this.splitFilePath = null;
    }
    this.notify();
  }

  public reset(): void {
    this.closedStack = [];
    this.splitMode = 'none';
    this.splitFilePath = null;
    this.tabOrder = [];
    this.notify();
  }

  protected computeSnapshot(): EditorTabsSnapshot {
    return Object.freeze({
      closedStack: Object.freeze([...this.closedStack]),
      splitMode: this.splitMode,
      splitFilePath: this.splitFilePath,
      tabOrder: Object.freeze([...this.tabOrder]),
    });
  }
}

export const editorTabsStore = new EditorTabsStore();
