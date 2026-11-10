/**
 * FEMEV: Framework Epistemológico para a Matemática Experimental-Visual
 *
 * Epistemic types and state machine contracts for asymmetric trust:
 * Python/Sage generates empirical evidence, Lean verifies formal proof.
 */

import type { KernelVerificationCertificate } from './blueprint';

export type FemevPhaseId =
  | 'visual_exploration'
  | 'quantitative_conjecture'
  | 'heuristic_validation'
  | 'formal_proof'
  | 'phase1_visual'
  | 'phase2_conjecture'
  | 'phase3_heuristic'
  | 'phase4_formal_proof';

export interface FemevEvidence {
  readonly id: string;
  readonly declarationId: string;
  readonly kind: 'empirical-orbit' | 'heuristic-interval' | 'numeric-certificate' | 'kernel-proof';
  readonly certificateHash?: string;
  readonly verified: boolean;
  readonly numericStatus?: 'computed' | 'failed';
  readonly summary: string;
  readonly timestamp: string;
}

export interface FemevDeclaration {
  readonly id: string;
  readonly name: string;
  readonly statement: string;
  readonly isNumericClaim: boolean;
  readonly evidences: readonly FemevEvidence[];
  readonly status: 'draft' | 'numerically_verified' | 'formally_proven' | 'rejected';
}

export interface FemevPhaseDescriptor {
  readonly id: FemevPhaseId;
  readonly stepNumber: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly runtime: 'python' | 'sage' | 'lean4' | 'hybrid';
  readonly epistemicStatus: 'empirical' | 'conjectural' | 'heuristic' | 'verified';
  readonly description: string;
}

export interface FeigenbaumIterationResult {
  readonly r: number;
  readonly attractorPoints: readonly number[];
  readonly period: number;
}

export interface FemevLogisticMapData {
  readonly rMin: number;
  readonly rMax: number;
  readonly rStep: number;
  readonly iterationsPerR: number;
  readonly bifurcations: readonly {
    readonly period: number;
    readonly rVal: number;
  }[];
  readonly deltaEstimate: number; // ~4.6692
  readonly alphaEstimate: number; // ~2.5029
}

export interface FemevConjectureData {
  readonly hypothesisName: string;
  readonly parameter: string;
  readonly estimatedValue: number;
  readonly tolerance: number;
  readonly formalStatementLean: string;
}

export interface FemevHeuristicValidationResult {
  readonly testedIntervals: number;
  readonly counterexamplesFound: number;
  readonly veriphyOracleCertified: boolean;
  readonly axleDisproved: boolean;
  readonly synthesizedTacticBlock: string;
}

export interface FemevWorkflowState {
  readonly activePhase: FemevPhaseId;
  readonly selectedCaseStudy: 'logistic_map_feigenbaum' | 'collatz_stopping_time' | 'gauss_circle_lattice';
  readonly phase1Data?: FemevLogisticMapData;
  readonly phase2Conjecture?: FemevConjectureData;
  readonly phase3Validation?: FemevHeuristicValidationResult;
  readonly phase4Certificate?: KernelVerificationCertificate;
  readonly phase1?: {
    readonly points: readonly { readonly r: number; readonly x: number }[];
    readonly bifurcationRValues: readonly number[];
  };
  readonly phase2?: {
    readonly conjectures: readonly string[];
    readonly selectedConjecture: string | null;
    readonly empiricalDelta: number;
    readonly empiricalAlpha: number;
  };
  readonly phase3?: {
    readonly heuristicPass: boolean;
    readonly sageVerificationCode: string;
  };
  readonly phase4?: {
    readonly leanProposition: string;
    readonly verified?: boolean;
    readonly certificate?: KernelVerificationCertificate;
  };
  readonly isRunning: boolean;
  readonly lastError?: string;
}
