/**
 * Evidence Timeline Service (Phase 10.9.7, Task ET1)
 *
 * Implements an auditable, chronological event stream for mathematical evidence
 * and epistemic state transitions with actor attribution and correlation tracking.
 *
 * Invariants:
 * - Chronological order: sorted by timestamp ascending
 * - Actor attribution: user, leancert, leanscreen, leanflow, pastaLean, kernel, veriphy, axle, duper
 * - Transition validation: strictly validates transitions via canTransition()
 *   Throws BridgeError(EPISTEMIC_TRANSITION_INVALID) on invalid state progression
 * - Backward compatibility: legacy evidence entries lacking actor/transition metadata
 *   are normalized on read as actor: 'user', transition: { from: 'conjecture', to: currentStatus }
 * - Local-only telemetry and structured logging
 */

import {
  type EpistemicStatus,
  canTransition,
} from '../../types/epistemic-status';
import { BridgeError } from '../errors/bridge-error';
import { createLogger, StructuredLogger } from '../logging/logger';
import { femevEngine } from './femev-engine';
import { femevOrchestrator } from './femev-orchestrator';

export type EvidenceActor =
  | 'user'
  | 'leancert'
  | 'leanscreen'
  | 'leanflow'
  | 'pastaLean'
  | 'kernel'
  | 'veriphy'
  | 'axle'
  | 'duper';

export type EvidenceKind =
  | 'numerical-test'
  | 'visual-pattern'
  | 'sage-witness'
  | 'lean-goal-state'
  | 'numeric-certificate'
  | 'faithfulness-screening'
  | 'formal-proof'
  | 'counterexample'
  | 'empirical-orbit'
  | 'heuristic-interval'
  | 'kernel-proof';

export interface TimelineEntry {
  readonly id: string;
  readonly declarationId: string;
  readonly timestamp: string;            // ISO 8601
  readonly actor: EvidenceActor;
  readonly transition: {
    readonly from: EpistemicStatus;
    readonly to: EpistemicStatus;
  };
  readonly evidenceKind: EvidenceKind;
  readonly summary: string;              // one-line human-readable
  readonly details?: Readonly<Record<string, unknown>>;
  readonly correlationId: string;
}

export class EvidenceTimelineService {
  private readonly logger = createLogger('EvidenceTimelineService');
  private readonly timelines = new Map<string, TimelineEntry[]>();

  constructor() {
    this.seedDefaultEntries();
  }

  private seedDefaultEntries(): void {
    const declId = 'feigenbaum-delta-bound';
    this.timelines.set(declId, [
      {
        id: 'timeline-seed-1',
        declarationId: declId,
        timestamp: '2026-10-25T01:00:00.000Z',
        actor: 'user',
        transition: {
          from: 'conjecture',
          to: 'conjecture',
        },
        evidenceKind: 'visual-pattern',
        summary: 'Observed self-similar period-doubling cascade in Python 3.14 WASM orbit simulation',
        details: { r: 3.5699456, attractorPeriod: 64 },
        correlationId: 'cid-seed-001',
      },
      {
        id: 'timeline-seed-2',
        declarationId: declId,
        timestamp: '2026-10-25T01:15:00.000Z',
        actor: 'veriphy',
        transition: {
          from: 'conjecture',
          to: 'heuristically-validated',
        },
        evidenceKind: 'numerical-test',
        summary: 'Veriphy skeptical CAS perturbation probe confirmed convergence within 1e-4 tolerance',
        details: { deltaEstimate: 4.6692016, confidence: 0.9999 },
        correlationId: 'cid-seed-002',
      },
    ]);
  }

  /**
   * Retrieves all timeline entries for a declaration in chronological order.
   * Automatically normalizes legacy FemevDeclaration.evidences if not yet present in timeline.
   */
  public async timeline(declarationId: string): Promise<readonly TimelineEntry[]> {
    let entries = this.timelines.get(declarationId);
    if (!entries) {
      entries = [];
      this.timelines.set(declarationId, entries);
    }

    // Check if femevEngine has legacy evidences for this declaration
    const engineDecl = femevEngine.getDeclaration(declarationId);
    if (engineDecl && engineDecl.evidences) {
      for (const ev of engineDecl.evidences) {
        const alreadyInTimeline = entries.some((e) => e.id === ev.id || e.summary === ev.summary);
        if (!alreadyInTimeline) {
          // Normalize legacy evidence entry on read
          const currentStatus: EpistemicStatus =
            engineDecl.status === 'formally_proven'
              ? 'formally-proven'
              : engineDecl.status === 'numerically_verified'
                ? 'numerically-verified'
                : engineDecl.status === 'rejected'
                  ? 'refuted'
                  : 'conjecture';

          const normalizedKind: EvidenceKind =
            ev.kind === 'empirical-orbit'
              ? 'visual-pattern'
              : ev.kind === 'heuristic-interval'
                ? 'numerical-test'
                : ev.kind === 'numeric-certificate'
                  ? 'numeric-certificate'
                  : 'formal-proof';

          entries.push({
            id: ev.id,
            declarationId,
            timestamp: ev.timestamp || new Date().toISOString(),
            actor: 'user',
            transition: {
              from: 'conjecture',
              to: currentStatus,
            },
            evidenceKind: normalizedKind,
            summary: ev.summary || 'Legacy empirical observation',
            details: ev.certificateHash ? { certificateHash: ev.certificateHash } : undefined,
            correlationId: 'legacy-init',
          });
        }
      }
    }

    // Return entries sorted chronologically (timestamp ascending)
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return Object.freeze(sorted);
  }

  /**
   * Appends an auditable evidence entry to the timeline after validating transition rules.
   */
  public async append(
    declarationId: string,
    entry: Omit<TimelineEntry, 'id' | 'timestamp' | 'correlationId'> & {
      id?: string;
      timestamp?: string;
      correlationId?: string;
    }
  ): Promise<TimelineEntry> {
    const correlationId = entry.correlationId ?? StructuredLogger.generateCorrelationId();
    const timestamp = entry.timestamp ?? new Date().toISOString();
    const id = entry.id ?? `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    this.logger.info(`Validating and appending evidence for declaration ${declarationId}`, correlationId, {
      actor: entry.actor,
      from: entry.transition.from,
      to: entry.transition.to,
    });

    // Validate Transition (cannot jump illegally, e.g. conjecture -> formally-proven)
    const isSelfTransition = entry.transition.from === entry.transition.to;
    const isAllowed = isSelfTransition || canTransition(entry.transition.from, entry.transition.to);

    if (!isAllowed) {
      this.logger.warn(`Illegal epistemic transition rejected: ${entry.transition.from} -> ${entry.transition.to}`, correlationId);
      throw new BridgeError('EPISTEMIC_TRANSITION_INVALID', correlationId, {
        declarationId,
        from: entry.transition.from,
        to: entry.transition.to,
        actor: entry.actor,
      });
    }

    const newEntry: TimelineEntry = {
      id,
      declarationId,
      timestamp,
      actor: entry.actor,
      transition: {
        from: entry.transition.from,
        to: entry.transition.to,
      },
      evidenceKind: entry.evidenceKind,
      summary: entry.summary,
      details: entry.details,
      correlationId,
    };

    let entries = this.timelines.get(declarationId);
    if (!entries) {
      entries = [];
      this.timelines.set(declarationId, entries);
    }
    entries.push(newEntry);

    // Also update FemevOrchestrator if status changed
    if (!isSelfTransition) {
      try {
        femevOrchestrator.transitionStatus(declarationId, entry.transition.to, {
          reason: `Evidence from ${entry.actor}: ${entry.summary}`,
          correlationId,
        });
      } catch {
        // Safe to ignore if declaration not yet registered in orchestrator
      }
    }

    return newEntry;
  }
}

export const evidenceTimelineService = new EvidenceTimelineService();
