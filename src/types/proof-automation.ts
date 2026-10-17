/**
 * Phase 8: Advanced Proof Automation Types
 * Governs Duper fallback chains, AXLE advanced cloud tools,
 * and LeanArchitect-style blueprint synchronization.
 */

import type { KernelVerificationCertificate, BlueprintNode } from './blueprint';

export type AutomationFallbackTier = 'duper' | 'aesop' | 'pantograph';

export interface ProofAutomationRequest {
  readonly goal: string;
  readonly contextCode?: string;
  readonly timeoutMs?: number; // Default 30000, max 60000
}

export interface FallbackStepLog {
  readonly tier: AutomationFallbackTier;
  readonly status: 'skipped' | 'attempted' | 'proved' | 'rejected';
  readonly durationMs: number;
  readonly reason?: string;
}

export interface ProofAutomationResult {
  readonly proved: boolean;
  readonly proofTerm?: string;
  readonly durationMs: number;
  readonly kernelVerified: boolean;
  readonly fallbackUsed?: AutomationFallbackTier;
  readonly certificate?: KernelVerificationCertificate;
  readonly stepsEvaluated: number;
  readonly chainLog: readonly FallbackStepLog[];
  readonly error?: string;
}

export interface AxleConsentRequest {
  readonly consentGiven: boolean;
}

export interface AxleDisproveRequest extends AxleConsentRequest {
  readonly statement: string;
}

export interface AxleDisproveResult {
  readonly hasCounterexample: boolean;
  readonly counterexample?: string;
  readonly negationProof?: string;
  readonly verified: boolean;
  readonly timeMs: number;
  readonly message?: string;
}

export interface AxleExtractStatesRequest extends AxleConsentRequest {
  readonly code: string;
}

export interface ProofLineState {
  readonly line: number;
  readonly codeLine: string;
  readonly state: string;
}

export interface AxleExtractStatesResult {
  readonly perLineStates: readonly ProofLineState[];
  readonly totalLines: number;
  readonly timeMs: number;
}

export interface AxleSimplifyRequest extends AxleConsentRequest {
  readonly code: string;
}

export interface AxleSimplifyResult {
  readonly simplifiedCode: string;
  readonly kernelVerified: boolean;
  readonly originalLength: number;
  readonly simplifiedLength: number;
  readonly tacticsRemoved: number;
  readonly timeMs: number;
}

export type BlueprintSyncMode = 'extract' | 'reconcile' | 'push';

export interface BlueprintDiscrepancy {
  readonly id: string;
  readonly type: 'added_in_code' | 'missing_in_code' | 'signature_drift';
  readonly details: string;
  readonly codeSignature?: string;
  readonly blueprintSignature?: string;
}

export interface BlueprintSyncRequest {
  readonly mode: BlueprintSyncMode;
  readonly files?: readonly { readonly path: string; readonly content: string }[];
  readonly targetLeanFilePath?: string;
}

export interface BlueprintSyncResult {
  readonly mode: BlueprintSyncMode;
  readonly nodes?: readonly BlueprintNode[];
  readonly driftDetected?: boolean;
  readonly discrepancies?: readonly BlueprintDiscrepancy[];
  readonly generatedStubs?: string;
  readonly skippedFrozenNodes?: readonly string[];
  readonly timeMs: number;
}
