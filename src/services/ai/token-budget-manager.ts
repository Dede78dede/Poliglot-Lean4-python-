export interface TokenBudget {
  readonly providerId: string;
  readonly dailyLimit: number;
  readonly monthlyLimit: number;
  readonly usedToday: number;
  readonly usedThisMonth: number;
  readonly resetAtDaily: string;
  readonly resetAtMonthly: string;
}

export interface BudgetThresholdWarning {
  readonly providerId: string;
  readonly threshold: 80 | 95 | 100;
  readonly percentUsed: number;
  readonly message: string;
}

export const DEFAULT_BUDGETS: Record<string, { daily: number; monthly: number }> = {
  'nvidia-nim': { daily: 1_000_000, monthly: 25_000_000 },
  'groq': { daily: 500_000, monthly: 15_000_000 },
  'cerebras': { daily: 1_000_000, monthly: 30_000_000 },
  'gemini': { daily: 750_000, monthly: 20_000_000 },
  'openrouter': { daily: 200_000, monthly: 5_000_000 },
  'mistral': { daily: 300_000, monthly: 9_000_000 },
  'axle': { daily: 200_000, monthly: 4_000_000 },
};

import { ExternalStoreBase } from '../stores/external-store-base';

export class TokenBudgetManager extends ExternalStoreBase<readonly TokenBudget[]> {
  private readonly budgets = new Map<string, { usedToday: number; usedThisMonth: number; lastResetDate: string; lastResetMonth: string }>();
  private readonly warningListeners = new Set<(warning: BudgetThresholdWarning) => void>();
  private mockTimestamp: number | null = null;
  private readonly storageKey = 'polyglot_token_budgets_v1';

  constructor() {
    super({ id: 'tokenBudgetManager', multiTabSync: false, persistToIndexedDb: false });
    this.loadFromStorage();
  }

  public setMockTime(timestamp: number | null): void {
    this.mockTimestamp = timestamp;
  }

  private getNow(): Date {
    return this.mockTimestamp !== null ? new Date(this.mockTimestamp) : new Date();
  }

  private getDateKey(d: Date): string {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getMonthKey(d: Date): string {
    return d.toISOString().slice(0, 7); // YYYY-MM
  }

  private getNextUtcMidnight(now: Date): string {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return next.toISOString();
  }

  private getNextUtcMonthStart(now: Date): string {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    return next.toISOString();
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const obj = JSON.parse(raw);
          for (const [k, v] of Object.entries(obj)) {
            this.budgets.set(k, v as { usedToday: number; usedThisMonth: number; lastResetDate: string; lastResetMonth: string });
          }
        }
      } catch {
        // ignore storage parse error
      }
    }
  }

  private save(): void {
    if (typeof localStorage !== 'undefined') {
      const plain: Record<string, unknown> = {};
      for (const [k, v] of this.budgets.entries()) {
        plain[k] = v;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(plain));
    }
  }

  private checkAndPerformReset(providerId: string): { usedToday: number; usedThisMonth: number; lastResetDate: string; lastResetMonth: string } {
    const now = this.getNow();
    const currentDate = this.getDateKey(now);
    const currentMonth = this.getMonthKey(now);

    let entry = this.budgets.get(providerId);
    if (!entry) {
      entry = {
        usedToday: 0,
        usedThisMonth: 0,
        lastResetDate: currentDate,
        lastResetMonth: currentMonth,
      };
      this.budgets.set(providerId, entry);
      return entry;
    }

    // Daily reset check
    if (entry.lastResetDate !== currentDate) {
      entry = {
        ...entry,
        usedToday: 0,
        lastResetDate: currentDate,
      };
    }

    // Monthly reset check
    if (entry.lastResetMonth !== currentMonth) {
      entry = {
        ...entry,
        usedThisMonth: 0,
        lastResetMonth: currentMonth,
      };
    }

    this.budgets.set(providerId, entry);
    return entry;
  }

  public recordUsage(providerId: string, inputTokens: number, outputTokens: number): void {
    const tokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
    const current = this.checkAndPerformReset(providerId);

    const prevUsed = current.usedToday;
    const newUsed = prevUsed + tokens;
    const newMonthUsed = current.usedThisMonth + tokens;

    const limits = DEFAULT_BUDGETS[providerId] ?? { daily: 500_000, monthly: 10_000_000 };

    this.budgets.set(providerId, {
      ...current,
      usedToday: newUsed,
      usedThisMonth: newMonthUsed,
    });
    this.save();
    this.notify();

    // Check thresholds (80%, 95%, 100%)
    const pct = (newUsed / limits.daily) * 100;
    const prevPct = (prevUsed / limits.daily) * 100;

    if (prevPct < 80 && pct >= 80) {
      this.emitWarning({
        providerId,
        threshold: 80,
        percentUsed: pct,
        message: `Token budget warning: ${providerId} has reached 80% of daily limit (${newUsed}/${limits.daily} tokens)`,
      });
    }
    if (prevPct < 95 && pct >= 95) {
      this.emitWarning({
        providerId,
        threshold: 95,
        percentUsed: pct,
        message: `Token budget warning: ${providerId} has reached 95% of daily limit (${newUsed}/${limits.daily} tokens)`,
      });
    }
    if (prevPct < 100 && pct >= 100) {
      this.emitWarning({
        providerId,
        threshold: 100,
        percentUsed: pct,
        message: `Token budget exhausted: ${providerId} has reached 100% of daily limit (${newUsed}/${limits.daily} tokens). Calls blocked.`,
      });
    }
  }

  public getBudget(providerId: string): TokenBudget | undefined {
    const limits = DEFAULT_BUDGETS[providerId] ?? { daily: 500_000, monthly: 10_000_000 };
    const entry = this.checkAndPerformReset(providerId);
    const now = this.getNow();

    return {
      providerId,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      usedToday: entry.usedToday,
      usedThisMonth: entry.usedThisMonth,
      resetAtDaily: this.getNextUtcMidnight(now),
      resetAtMonthly: this.getNextUtcMonthStart(now),
    };
  }

  public isExhausted(providerId: string): boolean {
    const budget = this.getBudget(providerId);
    if (!budget) return false;
    return budget.usedToday >= budget.dailyLimit || budget.usedThisMonth >= budget.monthlyLimit;
  }

  public onWarning(listener: (warning: BudgetThresholdWarning) => void): () => void {
    this.warningListeners.add(listener);
    return () => {
      this.warningListeners.delete(listener);
    };
  }

  private emitWarning(warning: BudgetThresholdWarning): void {
    for (const l of this.warningListeners) {
      l(warning);
    }
  }

  protected computeSnapshot(): readonly TokenBudget[] {
    const allProviders = Object.keys(DEFAULT_BUDGETS);
    return Object.freeze(allProviders.map((pid) => this.getBudget(pid)!));
  }

  /**
   * Exports all token usage as a standardized CSV string.
   */
  public exportCsv(): string {
    const headers = ['providerId', 'usedToday', 'dailyLimit', 'usedThisMonth', 'monthlyLimit', 'resetAtDaily', 'resetAtMonthly', 'status'];
    const rows = this.getSnapshot().map((b) => {
      const status = this.isExhausted(b.providerId) ? 'EXHAUSTED' : (b.usedToday / b.dailyLimit >= 0.8) ? 'WARNING' : 'OK';
      return [
        b.providerId,
        String(b.usedToday),
        String(b.dailyLimit),
        String(b.usedThisMonth),
        String(b.monthlyLimit),
        b.resetAtDaily,
        b.resetAtMonthly,
        status,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n') + '\n';
  }
}

export const tokenBudgetManager = new TokenBudgetManager();
