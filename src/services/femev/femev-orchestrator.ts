/**
 * FEMEV Orchestrator (Phase 10.9.5, Task E1)
 *
 * Canonical orchestrator managing the unified epistemic lifecycle.
 * Enforces transition validity via validateTransition() and requires
 * SEAL_KERNEL_VERIFIED_TIER5 before promoting any declaration to 'formally-proven'.
 * Extends ExternalStoreBase for reactive useSyncExternalStore UI binding.
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import {
  type EpistemicStatus,
  type EpistemicTransition,
  canTransition,
  validateTransition,
} from '../../types/epistemic-status';
import { BridgeError } from '../errors/bridge-error';
import { femevEngine } from './femev-engine';

export interface EpistemicDeclaration {
  readonly id: string;
  readonly name: string;
  readonly statement: string;
  readonly currentStatus: EpistemicStatus;
  readonly seal?: string;
  readonly transitionHistory: readonly EpistemicTransition[];
  readonly lastUpdated: string;
}

export interface FemevOrchestratorSnapshot {
  readonly declarations: readonly EpistemicDeclaration[];
  readonly totalDeclarations: number;
  readonly provenCount: number;
  readonly activeStatusCounts: Readonly<Record<EpistemicStatus, number>>;
}

export class FemevOrchestrator extends ExternalStoreBase<FemevOrchestratorSnapshot> {
  private declarations: Map<string, EpistemicDeclaration> = new Map();

  constructor() {
    super({ id: 'femevOrchestrator', multiTabSync: true });
    this.seedDefaultFeigenbaumDeclaration();
  }

  private seedDefaultFeigenbaumDeclaration(): void {
    const defaultDecl: EpistemicDeclaration = {
      id: 'feigenbaum-delta-bound',
      name: 'feigenbaum_delta_universal_bound',
      statement: 'theorem feigenbaum_delta_bound : |δ - 4.6692| < 0.001',
      currentStatus: 'conjecture',
      transitionHistory: [
        {
          id: 'init-1',
          declarationId: 'feigenbaum-delta-bound',
          from: 'conjecture',
          to: 'conjecture',
          timestamp: new Date().toISOString(),
          reason: 'Initial empirical formulation from Python 3.14 simulation',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
    this.declarations.set(defaultDecl.id, defaultDecl);
  }

  public getDeclaration(id: string): EpistemicDeclaration | undefined {
    return this.declarations.get(id);
  }

  public registerDeclaration(decl: Omit<EpistemicDeclaration, 'transitionHistory' | 'lastUpdated'>): EpistemicDeclaration {
    const record: EpistemicDeclaration = {
      ...decl,
      transitionHistory: [
        {
          id: `trans-${Date.now()}-init`,
          declarationId: decl.id,
          from: decl.currentStatus,
          to: decl.currentStatus,
          timestamp: new Date().toISOString(),
          reason: 'Registered declaration in orchestrator',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
    this.declarations.set(decl.id, record);
    this.notify();
    return record;
  }

  /**
   * Transitions a declaration to a new epistemic status.
   * Throws BridgeError(EPISTEMIC_TRANSITION_INVALID) if transition path is illegal.
   * Throws BridgeError(PROJECT_NOT_KERNEL_VERIFIED) if promoting to formally-proven without SEAL_KERNEL_VERIFIED_TIER5.
   */
  public transitionStatus(
    declarationId: string,
    targetStatus: EpistemicStatus,
    options?: {
      readonly seal?: string;
      readonly reason?: string;
      readonly correlationId?: string;
    }
  ): EpistemicDeclaration {
    const correlationId = options?.correlationId ?? `femev-${Date.now()}`;
    const decl = this.declarations.get(declarationId);

    if (!decl) {
      throw new BridgeError('ROUTER_NO_PROVIDER_AVAILABLE', correlationId, {
        reason: `Declaration ${declarationId} not found in FemevOrchestrator`,
      });
    }

    const currentStatus = decl.currentStatus;

    // Invariant 1: Validate transition path
    validateTransition(currentStatus, targetStatus, correlationId);

    // Invariant 2: Promotion to 'formally-proven' requires SEAL_KERNEL_VERIFIED_TIER5
    if (targetStatus === 'formally-proven') {
      if (options?.seal !== 'SEAL_KERNEL_VERIFIED_TIER5') {
        throw new BridgeError('PROJECT_NOT_KERNEL_VERIFIED', correlationId, {
          declarationId,
          providedSeal: options?.seal ?? 'none',
          requiredSeal: 'SEAL_KERNEL_VERIFIED_TIER5',
        });
      }
    }

    const transition: EpistemicTransition = {
      id: `trans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      declarationId,
      from: currentStatus,
      to: targetStatus,
      timestamp: new Date().toISOString(),
      reason: options?.reason,
      seal: options?.seal,
    };

    const updated: EpistemicDeclaration = {
      ...decl,
      currentStatus: targetStatus,
      seal: options?.seal ?? decl.seal,
      transitionHistory: Object.freeze([...decl.transitionHistory, transition]),
      lastUpdated: new Date().toISOString(),
    };

    this.declarations.set(declarationId, updated);
    this.notify();
    return updated;
  }

  public listDeclarations(): readonly EpistemicDeclaration[] {
    return Array.from(this.declarations.values());
  }

  protected computeSnapshot(): FemevOrchestratorSnapshot {
    const decls = Array.from(this.declarations.values());
    const counts: Record<EpistemicStatus, number> = {
      conjecture: 0,
      'heuristically-validated': 0,
      'faithfulness-screened': 0,
      'numerically-verified': 0,
      'formally-proven': 0,
      refuted: 0,
    };

    let proven = 0;
    for (const d of decls) {
      counts[d.currentStatus] = (counts[d.currentStatus] ?? 0) + 1;
      if (d.currentStatus === 'formally-proven') {
        proven++;
      }
    }

    return Object.freeze({
      declarations: Object.freeze(decls),
      totalDeclarations: decls.length,
      provenCount: proven,
      activeStatusCounts: Object.freeze(counts),
    });
  }
}

export const femevOrchestrator = new FemevOrchestrator();
