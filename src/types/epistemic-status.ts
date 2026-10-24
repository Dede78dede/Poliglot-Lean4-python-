/**
 * Unified Epistemic Status Hierarchy (Phase 10.9.5, Section 2)
 *
 * Reconciles the three previously unaligned confidence scales:
 * 1. FEMEV: conjecture / heuristically-validated / formally-proven / refuted
 * 2. leanscreen: passed_screening / rejected / uncertain
 * 3. leancert: verified (certified numerical bounds)
 *
 * Epistemic Invariants:
 * - Direct transition from 'conjecture' to 'formally-proven' is FORBIDDEN.
 * - Promotion to 'formally-proven' requires SEAL_KERNEL_VERIFIED_TIER5.
 * - 'refuted' is terminal (cannot un-refute).
 */

import { BridgeError } from '../services/errors/bridge-error';

export type EpistemicStatus =
  | 'conjecture'
  | 'heuristically-validated'
  | 'faithfulness-screened'
  | 'numerically-verified'
  | 'formally-proven'
  | 'refuted';

/**
 * Backward compatibility alias (see docs/architecture/nomenclature.md)
 */
export type EpistemicState = EpistemicStatus;

export interface EpistemicTransition {
  readonly id: string;
  readonly declarationId: string;
  readonly from: EpistemicStatus;
  readonly to: EpistemicStatus;
  readonly timestamp: string;
  readonly reason?: string;
  readonly seal?: string;
}

export const VALID_EPISTEMIC_TRANSITIONS: Readonly<Record<EpistemicStatus, readonly EpistemicStatus[]>> = Object.freeze({
  conjecture: Object.freeze<EpistemicStatus>([
    'conjecture',
    'heuristically-validated',
    'faithfulness-screened',
    'numerically-verified',
    'refuted',
  ]),
  'heuristically-validated': Object.freeze<EpistemicStatus>([
    'heuristically-validated',
    'faithfulness-screened',
    'numerically-verified',
    'formally-proven',
    'refuted',
  ]),
  'faithfulness-screened': Object.freeze<EpistemicStatus>([
    'faithfulness-screened',
    'numerically-verified',
    'formally-proven',
    'refuted',
  ]),
  'numerically-verified': Object.freeze<EpistemicStatus>([
    'numerically-verified',
    'formally-proven',
    'refuted',
  ]),
  'formally-proven': Object.freeze<EpistemicStatus>([
    'formally-proven',
    'refuted',
  ]),
  refuted: Object.freeze<EpistemicStatus>([
    'refuted',
  ]),
});

/**
 * Evaluates whether a transition between two epistemic statuses is permitted by integrity rules.
 */
export function canTransition(current: EpistemicStatus, target: EpistemicStatus): boolean {
  if (current === target) return true;
  const allowed = VALID_EPISTEMIC_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

/**
 * Asserts that an epistemic transition is valid; throws BridgeError(EPISTEMIC_TRANSITION_INVALID) if not.
 */
export function validateTransition(
  current: EpistemicStatus,
  target: EpistemicStatus,
  correlationId = 'epistemic-transition-gate'
): void {
  if (!canTransition(current, target)) {
    throw new BridgeError('EPISTEMIC_TRANSITION_INVALID', correlationId, {
      current,
      target,
      allowed: VALID_EPISTEMIC_TRANSITIONS[current],
    });
  }
}

export const EPISTEMIC_PALETTE: Readonly<
  Record<
    EpistemicStatus,
    {
      readonly label: string;
      readonly description: string;
      readonly bgClass: string;
      readonly textClass: string;
      readonly borderClass: string;
    }
  >
> = Object.freeze({
  conjecture: {
    label: 'Conjecture',
    description: 'Empirically observed hypothesis without formal or symbolic certification',
    bgClass: 'bg-slate-900/60',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-800',
  },
  'heuristically-validated': {
    label: 'Heuristically Validated',
    description: 'Tested via CAS interval arithmetic or Veriphy perturbation probe',
    bgClass: 'bg-amber-950/40',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-800/80',
  },
  'faithfulness-screened': {
    label: 'Faithfulness Screened',
    description: 'Passed leanscreen check_fast / check_deep dual-judge semantic fidelity',
    bgClass: 'bg-cyan-950/40',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-800/80',
  },
  'numerically-verified': {
    label: 'Numerically Verified',
    description: 'Certified bounds proven via LeanCert interval arithmetic or Taylor models',
    bgClass: 'bg-indigo-950/40',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-800/80',
  },
  'formally-proven': {
    label: 'Formally Proven',
    description: 'Machine-checked theorem sealed with SEAL_KERNEL_VERIFIED_TIER5 (6-kernel consensus)',
    bgClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-800/80',
  },
  refuted: {
    label: 'Refuted',
    description: 'Definitively disproven by counterexample or formal refutation',
    bgClass: 'bg-rose-950/40',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-800/80',
  },
});
