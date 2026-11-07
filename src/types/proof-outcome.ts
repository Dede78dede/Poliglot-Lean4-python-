/**
 * ProofOutcome Discriminated Union (Phase 14.9.1 FIX-B)
 *
 * Epistemic Authority Invariant:
 * Only the 'certified' variant contains SEAL_KERNEL_VERIFIED_TIER5.
 * Non-certifying sites emit 'transport', 'preflight', 'unavailable', or 'metadata'.
 */

export interface CertifiedPayload {
  readonly theoremName?: string;
  readonly declarationCount?: number;
  readonly unprovenCount?: number;
  readonly axioms?: readonly string[];
  readonly durationMs?: number;
}

export type ProofOutcome =
  | {
      readonly kind: 'certified';
      readonly seal: 'SEAL_KERNEL_VERIFIED_TIER5';
      readonly digest: string;
      readonly axioms: readonly string[];
    }
  | {
      readonly kind: 'transport';
      readonly source: 'hybrid-adjudicator';
      readonly payload: CertifiedPayload;
    }
  | {
      readonly kind: 'preflight';
      readonly syntaxValid: boolean;
      readonly sorryFree: boolean;
      readonly reason: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly reason: 'client_stub' | 'adjudicator_unreachable' | 'feature_disabled';
    }
  | {
      readonly kind: 'metadata';
      readonly note: string;
    };
