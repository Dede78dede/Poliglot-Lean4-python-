/**
 * Dynamic Config Discovery & Adaptive Recommendation Manager (Phase 13, Sprint 13.4, CFG1)
 *
 * Epistemic & Architectural Guardrails:
 * 1. Observes 3 explicit signals: Hardware probe, Usage patterns, Benchmark results.
 * 2. Produces max 3 non-intrusive proposals ranked by expected utility.
 * 3. Prohibits auto-applying: requires explicit `userConfirmed: true`.
 * 4. Dismissals persist for 90 days before proposals may resurface.
 * 5. Detects and resolves concurrent conflicting proposals.
 */

import {
  type ResultEnvelope,
  createSuccessEnvelope,
  createErrorEnvelope,
} from '../../shared/contracts/result-envelope';
import { BridgeError } from '../errors/bridge-error';

export interface HardwareProbeSignal {
  readonly memoryGb: number;
  readonly vramGb: number;
  readonly concurrencyCores: number;
  readonly detectedAt: string;
}

export interface UsagePatternSignal {
  readonly activeTheoremsPerDay: number;
  readonly cacheMissRate: number; // 0..1
  readonly meanSolveTimeMs: number;
  readonly observedAt: string;
}

export interface BenchmarkResultSignal {
  readonly oProverThroughput: number; // proofs/sec
  readonly miniSearchLatencyMs: number;
  readonly memoryFootprintMb: number;
  readonly benchmarkedAt: string;
}

export interface SystemSignals {
  readonly hardware?: HardwareProbeSignal;
  readonly usage?: UsagePatternSignal;
  readonly benchmark?: BenchmarkResultSignal;
}

export interface ConfigProposal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'hardware' | 'cache' | 'concurrency' | 'search' | 'model';
  readonly targetSetting: string;
  readonly currentValue: unknown;
  readonly proposedValue: unknown;
  readonly diffSummary: string;
  readonly expectedUtility: number; // 0..1
  readonly sourceSignal: 'hardware' | 'usage' | 'benchmark';
  readonly conflictsWith?: readonly string[];
  readonly generatedAt: string;
}

export interface ConfigAuditEntry {
  readonly proposalId: string;
  readonly targetSetting: string;
  readonly previousValue: unknown;
  readonly newValue: unknown;
  readonly appliedAt: string;
  readonly userConfirmed: true;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const DISMISSAL_STORAGE_KEY = 'polyglot_config_dismissals_v1';

export class ConfigManager {
  private readonly dismissals: Map<string, number> = new Map();
  private readonly appliedSettings: Map<string, unknown> = new Map();
  private readonly auditLog: ConfigAuditEntry[] = [];
  private activeProposals: ConfigProposal[] = [];

  constructor() {
    this.loadDismissals();
    this.initDefaultSettings();
  }

  private initDefaultSettings(): void {
    this.appliedSettings.set('maxConcurrentBuilds', 4);
    this.appliedSettings.set('maxCachedProofs', 500);
    this.appliedSettings.set('searchIndexingDebounceMs', 300);
    this.appliedSettings.set('enableDenseWorker', false);
  }

  private loadDismissals(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DISMISSAL_STORAGE_KEY);
        if (raw) {
          const list: Array<{ id: string; timestamp: number }> = JSON.parse(raw);
          const now = Date.now();
          for (const item of list) {
            if (now - item.timestamp < NINETY_DAYS_MS) {
              this.dismissals.set(item.id, item.timestamp);
            }
          }
        }
      } catch {
        // Ignored in non-browser environments
      }
    }
  }

  private saveDismissals(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const list = Array.from(this.dismissals.entries()).map(([id, timestamp]) => ({
          id,
          timestamp,
        }));
        localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Evaluates system signals and generates at most 3 non-intrusive proposals.
   */
  public generateProposals(signals: SystemSignals): readonly ConfigProposal[] {
    const candidates: ConfigProposal[] = [];
    const now = new Date().toISOString();

    // 1. Hardware probe evaluation
    if (signals.hardware) {
      if (signals.hardware.concurrencyCores >= 8 || signals.hardware.memoryGb >= 32) {
        candidates.push({
          id: 'prop-concurrency-boost',
          title: 'Increase Concurrent Build Workers',
          description: `Detected ${signals.hardware.concurrencyCores} cores & ${signals.hardware.memoryGb}GB RAM. Scale concurrency from 4 to 12.`,
          category: 'concurrency',
          targetSetting: 'maxConcurrentBuilds',
          currentValue: this.appliedSettings.get('maxConcurrentBuilds') ?? 4,
          proposedValue: 12,
          diffSummary: '- maxConcurrentBuilds: 4\n+ maxConcurrentBuilds: 12',
          expectedUtility: 0.88,
          sourceSignal: 'hardware',
          conflictsWith: ['prop-concurrency-conservative'],
          generatedAt: now,
        });
      }

      if (signals.hardware.vramGb >= 16) {
        candidates.push({
          id: 'prop-enable-dense-embeddings',
          title: 'Enable In-Worker Dense Embeddings',
          description: `Detected ${signals.hardware.vramGb}GB VRAM. Offload all-MiniLM-L6-v2 vector indexing to GPU/WebWorker.`,
          category: 'hardware',
          targetSetting: 'enableDenseWorker',
          currentValue: this.appliedSettings.get('enableDenseWorker') ?? false,
          proposedValue: true,
          diffSummary: '- enableDenseWorker: false\n+ enableDenseWorker: true',
          expectedUtility: 0.94,
          sourceSignal: 'hardware',
          generatedAt: now,
        });
      }
    }

    // 2. Usage patterns evaluation
    if (signals.usage) {
      if (signals.usage.cacheMissRate > 0.35) {
        candidates.push({
          id: 'prop-expand-proof-cache',
          title: 'Expand Proof Retrieval Cache',
          description: `Cache miss rate is ${(signals.usage.cacheMissRate * 100).toFixed(1)}%. Expand capacity to 2,000 theorems.`,
          category: 'cache',
          targetSetting: 'maxCachedProofs',
          currentValue: this.appliedSettings.get('maxCachedProofs') ?? 500,
          proposedValue: 2000,
          diffSummary: '- maxCachedProofs: 500\n+ maxCachedProofs: 2000',
          expectedUtility: 0.91,
          sourceSignal: 'usage',
          generatedAt: now,
        });
      }
    }

    // 3. Benchmark results evaluation
    if (signals.benchmark) {
      if (signals.benchmark.miniSearchLatencyMs > 40) {
        candidates.push({
          id: 'prop-optimize-search-indexing',
          title: 'Optimize Search Indexing Latency',
          description: `MiniSearch latency is ${signals.benchmark.miniSearchLatencyMs}ms. Adjust indexing debounce to 150ms.`,
          category: 'search',
          targetSetting: 'searchIndexingDebounceMs',
          currentValue: this.appliedSettings.get('searchIndexingDebounceMs') ?? 300,
          proposedValue: 150,
          diffSummary: '- searchIndexingDebounceMs: 300\n+ searchIndexingDebounceMs: 150',
          expectedUtility: 0.74,
          sourceSignal: 'benchmark',
          generatedAt: now,
        });
      }
    }

    // Filter out dismissed proposals (within 90-day cooldown)
    const currentTime = Date.now();
    const active = candidates.filter((p) => {
      const dismissedTimestamp = this.dismissals.get(p.id);
      if (!dismissedTimestamp) return true;
      return currentTime - dismissedTimestamp >= NINETY_DAYS_MS;
    });

    // Rank by expected utility descending and cap strictly at 3
    active.sort((a, b) => b.expectedUtility - a.expectedUtility);
    this.activeProposals = active.slice(0, 3);
    return [...this.activeProposals];
  }

  public getActiveProposals(): readonly ConfigProposal[] {
    return [...this.activeProposals];
  }

  /**
   * Applies a proposed configuration change.
   * STRICT EPISTEMIC RULE: Requires userConfirmed: true.
   */
  public applyProposal(
    proposalId: string,
    options: { userConfirmed: boolean }
  ): ResultEnvelope<{ proposalId: string; targetSetting: string; value: unknown; appliedAt: string }> {
    if (!options?.userConfirmed) {
      return createErrorEnvelope(
        new BridgeError('CONFIG_PROPOSAL_CONFLICT', crypto.randomUUID(), {
          proposalId,
          reason: 'Configuration proposal cannot be applied without explicit user confirmation (userConfirmed: true).',
          userConfirmed: options?.userConfirmed,
          severity: 'epistemic_block',
        })
      );
    }

    const proposal = this.activeProposals.find((p) => p.id === proposalId);
    if (!proposal) {
      return createErrorEnvelope(
        new BridgeError('CONFIG_PROPOSAL_CONFLICT', crypto.randomUUID(), {
          proposalId,
          reason: `Proposal ${proposalId} not found or no longer active.`,
        })
      );
    }

    // Check for conflict with previously applied settings or mutually exclusive proposals
    if (proposal.conflictsWith) {
      for (const conflictId of proposal.conflictsWith) {
        if (this.auditLog.some((e) => e.proposalId === conflictId)) {
          return createErrorEnvelope(
            new BridgeError('CONFIG_PROPOSAL_CONFLICT', crypto.randomUUID(), {
              proposalId,
              conflictId,
              reason: `Proposal ${proposalId} conflicts with previously applied proposal ${conflictId}.`,
            })
          );
        }
      }
    }

    const previousValue = this.appliedSettings.get(proposal.targetSetting);
    this.appliedSettings.set(proposal.targetSetting, proposal.proposedValue);

    const now = new Date().toISOString();
    this.auditLog.push({
      proposalId,
      targetSetting: proposal.targetSetting,
      previousValue,
      newValue: proposal.proposedValue,
      appliedAt: now,
      userConfirmed: true,
    });

    // Remove from active proposals
    this.activeProposals = this.activeProposals.filter((p) => p.id !== proposalId);

    return createSuccessEnvelope({
      proposalId,
      targetSetting: proposal.targetSetting,
      value: proposal.proposedValue,
      appliedAt: now,
    });
  }

  /**
   * Dismisses a proposal with a 90-day cooldown.
   */
  public dismissProposal(proposalId: string): void {
    this.dismissals.set(proposalId, Date.now());
    this.saveDismissals();
    this.activeProposals = this.activeProposals.filter((p) => p.id !== proposalId);
  }

  public getAuditLog(): readonly ConfigAuditEntry[] {
    return [...this.auditLog];
  }

  public getAppliedSetting<T>(key: string): T | undefined {
    return this.appliedSettings.get(key) as T | undefined;
  }

  public isDismissed(proposalId: string): boolean {
    const ts = this.dismissals.get(proposalId);
    if (!ts) return false;
    return Date.now() - ts < NINETY_DAYS_MS;
  }
}

export const configManager = new ConfigManager();
