/**
 * ProofOutcome Discriminated Union & Epistemic Certification Tier
 * (Phase 14.9.9.1 — Window 1/2)
 *
 * Epistemic Authority Invariant:
 * Only the 'certified' variant contains SEAL_KERNEL_VERIFIED_TIER5 and verified: true.
 * Non-certifying sites emit 'numeric-certificate', 'transport', 'preflight', 'unavailable', or 'metadata'.
 */

export type CertificationTier =
  | 'KERNEL_VERIFIED_TIER5'
  | 'NUMERIC_CERTIFICATE_UNVERIFIED'
  | 'SYNTAX_ONLY_UNVERIFIED'
  | 'DEGRADED_FALLBACK_UNVERIFIED'
  | 'UNAVAILABLE';

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
      readonly certificationTier: 'KERNEL_VERIFIED_TIER5';
      readonly verified: true;
      readonly digest: string;
      readonly axioms: readonly string[];
    }
  | {
      readonly kind: 'numeric-certificate';
      readonly certificationTier: 'NUMERIC_CERTIFICATE_UNVERIFIED';
      readonly verified: false;
      readonly certificate: string;
      readonly methodUsed: 'interval' | 'taylor-model' | 'solver';
      readonly bounds?: { readonly lower: number; readonly upper: number };
    }
  | {
      readonly kind: 'transport';
      readonly certificationTier: 'DEGRADED_FALLBACK_UNVERIFIED';
      readonly verified: false;
      readonly source: 'hybrid-adjudicator' | 'bridge_fallback';
      readonly payload: CertifiedPayload;
    }
  | {
      readonly kind: 'preflight';
      readonly certificationTier: 'SYNTAX_ONLY_UNVERIFIED';
      readonly verified: false;
      readonly syntaxValid: boolean;
      readonly sorryFree: boolean;
      readonly reason: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly certificationTier: 'UNAVAILABLE';
      readonly verified: false;
      readonly reason: 'client_stub' | 'adjudicator_unreachable' | 'feature_disabled';
    }
  | {
      readonly kind: 'metadata';
      readonly certificationTier: 'SYNTAX_ONLY_UNVERIFIED';
      readonly verified: false;
      readonly note: string;
    };
