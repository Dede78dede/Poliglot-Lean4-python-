/**
 * Activity Bar Store (Sprint 11.0.1, Shell Architecture)
 *
 * Extends ExternalStoreBase with multiTabSync: true.
 * Persists layout preferences to localStorage ('polyglot.activitybar.layout').
 */

import { ExternalStoreBase } from '../stores/external-store-base';

export type ActivityId =
  | 'explorer'
  | 'search'
  | 'git'
  | 'proof'
  | 'blueprint'
  | 'memory'
  | 'chat'
  | 'settings';

export type ActivityBarSize = 'default' | 'compact';
export type ActivityBarPosition = 'left' | 'right';

export interface ActivityDescriptor {
  readonly id: ActivityId;
  readonly label: string;
  readonly iconName: string;
  readonly defaultOrder: number;
}

export const CANONICAL_ACTIVITIES: readonly ActivityDescriptor[] = Object.freeze([
  { id: 'explorer', label: 'Explorer', iconName: 'Files', defaultOrder: 1 },
  { id: 'search', label: 'Unified Search', iconName: 'Search', defaultOrder: 2 },
  { id: 'git', label: 'Source Control', iconName: 'GitBranch', defaultOrder: 3 },
  { id: 'proof', label: 'Proof Automation & FEMEV', iconName: 'FlaskConical', defaultOrder: 4 },
  { id: 'blueprint', label: 'Lean Blueprint', iconName: 'Network', defaultOrder: 5 },
  { id: 'memory', label: '5-Tier Memory', iconName: 'Database', defaultOrder: 6 },
  { id: 'chat', label: 'LLM Chat & Prover', iconName: 'MessageSquare', defaultOrder: 7 },
  { id: 'settings', label: 'Settings', iconName: 'Settings', defaultOrder: 8 },
]);

export interface ActivityBarSnapshot {
  readonly activeActivity: ActivityId | null;
  readonly size: ActivityBarSize;
  readonly position: ActivityBarPosition;
  readonly isZenMode: boolean;
  readonly badges: Readonly<Record<ActivityId, number | string | null>>;
}

const STORAGE_KEY = 'polyglot.activitybar.layout';

interface PersistedActivityBarLayout {
  activeActivity?: ActivityId | null;
  size?: ActivityBarSize;
  position?: ActivityBarPosition;
  isZenMode?: boolean;
}

export class ActivityBarStore extends ExternalStoreBase<ActivityBarSnapshot> {
  private activeActivity: ActivityId | null = 'explorer';
  private size: ActivityBarSize = 'default';
  private position: ActivityBarPosition = 'left';
  private isZenMode: boolean = false;
  private badges: Record<ActivityId, number | string | null> = {
    explorer: null,
    search: null,
    git: null,
    proof: null,
    blueprint: null,
    memory: null,
    chat: null,
    settings: null,
  };

  public constructor() {
    super({
      id: 'activity-bar',
      multiTabSync: true,
    });
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedActivityBarLayout;
      if (parsed.activeActivity !== undefined) {
        this.activeActivity = parsed.activeActivity;
      }
      if (parsed.size === 'default' || parsed.size === 'compact') {
        this.size = parsed.size;
      }
      if (parsed.position === 'left' || parsed.position === 'right') {
        this.position = parsed.position;
      }
      if (typeof parsed.isZenMode === 'boolean') {
        this.isZenMode = parsed.isZenMode;
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload: PersistedActivityBarLayout = {
        activeActivity: this.activeActivity,
        size: this.size,
        position: this.position,
        isZenMode: this.isZenMode,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write errors
    }
  }

  public setActiveActivity(id: ActivityId | null): void {
    if (this.activeActivity === id) return;
    this.activeActivity = id;
    this.saveToStorage();
    this.notify();
  }

  public toggleActivity(id: ActivityId): void {
    if (this.activeActivity === id) {
      this.activeActivity = null;
    } else {
      this.activeActivity = id;
    }
    this.saveToStorage();
    this.notify();
  }

  public setSize(size: ActivityBarSize): void {
    if (this.size === size) return;
    this.size = size;
    this.saveToStorage();
    this.notify();
  }

  public toggleSize(): void {
    this.setSize(this.size === 'default' ? 'compact' : 'default');
  }

  public setPosition(position: ActivityBarPosition): void {
    if (this.position === position) return;
    this.position = position;
    this.saveToStorage();
    this.notify();
  }

  public togglePosition(): void {
    this.setPosition(this.position === 'left' ? 'right' : 'left');
  }

  public setZenMode(enabled: boolean): void {
    if (this.isZenMode === enabled) return;
    this.isZenMode = enabled;
    this.saveToStorage();
    this.notify();
  }

  public toggleZenMode(): void {
    this.setZenMode(!this.isZenMode);
  }

  public setBadge(id: ActivityId, badge: number | string | null): void {
    if (this.badges[id] === badge) return;
    this.badges = { ...this.badges, [id]: badge };
    this.notify();
  }

  public reset(): void {
    this.activeActivity = 'explorer';
    this.size = 'default';
    this.position = 'left';
    this.isZenMode = false;
    this.badges = {
      explorer: null,
      search: null,
      git: null,
      proof: null,
      blueprint: null,
      memory: null,
      chat: null,
      settings: null,
    };
    this.saveToStorage();
    this.notify();
  }

  protected computeSnapshot(): ActivityBarSnapshot {
    return Object.freeze({
      activeActivity: this.activeActivity,
      size: this.size,
      position: this.position,
      isZenMode: this.isZenMode,
      badges: Object.freeze({ ...this.badges }),
    });
  }
}

export const activityBarStore = new ActivityBarStore();
