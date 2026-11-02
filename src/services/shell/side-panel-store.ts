/**
 * Side Panel Store (Sprint 11.0.1, Shell Architecture)
 *
 * Extends ExternalStoreBase with multiTabSync: true.
 * Persists width, collapsed state, and per-activity view modes to localStorage ('polyglot.sidepanel.layout').
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import type { ActivityId } from './activity-bar-store';

export const SIDE_PANEL_LIMITS = Object.freeze({
  MIN_WIDTH: 200,
  MAX_WIDTH: 480,
  DEFAULT_WIDTH: 280,
} as const);

export type ExplorerViewMode = 'tree' | 'list' | 'changes' | 'trash';

export interface SidePanelSnapshot {
  readonly width: number;
  readonly collapsed: boolean;
  readonly viewModes: Readonly<Record<ActivityId, string>>;
}

const STORAGE_KEY = 'polyglot.sidepanel.layout';

interface PersistedSidePanelLayout {
  width?: number;
  collapsed?: boolean;
  viewModes?: Partial<Record<ActivityId, string>>;
}

export class SidePanelStore extends ExternalStoreBase<SidePanelSnapshot> {
  private width: number = SIDE_PANEL_LIMITS.DEFAULT_WIDTH;
  private collapsed: boolean = false;
  private viewModes: Record<ActivityId, string> = {
    explorer: 'tree',
    search: 'all',
    git: 'changes',
    proof: 'overview',
    blueprint: 'graph',
    memory: 'tiers',
    chat: 'assistant',
    settings: 'general',
  };

  public constructor() {
    super({
      id: 'side-panel',
      multiTabSync: true,
    });
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedSidePanelLayout;
      if (typeof parsed.width === 'number' && !Number.isNaN(parsed.width)) {
        this.width = Math.min(
          SIDE_PANEL_LIMITS.MAX_WIDTH,
          Math.max(SIDE_PANEL_LIMITS.MIN_WIDTH, Math.round(parsed.width)),
        );
      }
      if (typeof parsed.collapsed === 'boolean') {
        this.collapsed = parsed.collapsed;
      }
      if (parsed.viewModes && typeof parsed.viewModes === 'object') {
        this.viewModes = { ...this.viewModes, ...parsed.viewModes };
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload: PersistedSidePanelLayout = {
        width: this.width,
        collapsed: this.collapsed,
        viewModes: this.viewModes,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write errors
    }
  }

  public setWidth(rawWidth: number): void {
    const clamped = Math.min(
      SIDE_PANEL_LIMITS.MAX_WIDTH,
      Math.max(SIDE_PANEL_LIMITS.MIN_WIDTH, Math.round(rawWidth)),
    );
    if (this.width === clamped) return;
    this.width = clamped;
    this.saveToStorage();
    this.notify();
  }

  public setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) return;
    this.collapsed = collapsed;
    this.saveToStorage();
    this.notify();
  }

  public toggleCollapsed(): void {
    this.setCollapsed(!this.collapsed);
  }

  public setViewMode(activityId: ActivityId, mode: string): void {
    if (this.viewModes[activityId] === mode) return;
    this.viewModes = { ...this.viewModes, [activityId]: mode };
    this.saveToStorage();
    this.notify();
  }

  public getViewMode(activityId: ActivityId): string {
    return this.viewModes[activityId] ?? 'tree';
  }

  public reset(): void {
    this.width = SIDE_PANEL_LIMITS.DEFAULT_WIDTH;
    this.collapsed = false;
    this.viewModes = {
      explorer: 'tree',
      search: 'all',
      git: 'changes',
      proof: 'overview',
      blueprint: 'graph',
      memory: 'tiers',
      chat: 'assistant',
      settings: 'general',
    };
    this.saveToStorage();
    this.notify();
  }

  protected computeSnapshot(): SidePanelSnapshot {
    return Object.freeze({
      width: this.width,
      collapsed: this.collapsed,
      viewModes: Object.freeze({ ...this.viewModes }),
    });
  }
}

export const sidePanelStore = new SidePanelStore();
