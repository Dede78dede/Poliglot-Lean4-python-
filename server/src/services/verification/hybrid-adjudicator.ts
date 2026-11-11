/**
 * Hybrid Consensus Adjudicator for Polyglot Code Studio.
 * Protocol: polyglot.verification.v1
 * Axiom Policy: polyglot.axioms.standard.v1
 *
 * Epistemic Invariant:
 * Only identical proof obligations validated by both Kimina and Lake
 * with zero sorry axioms and conforming to the standard foundational allowlist
 * may yield confirmed_valid and mint SEAL_KERNEL_VERIFIED_TIER5.
 */

export const CANONICAL_VERIFICATION_PROTOCOL = 'polyglot.verification.v1' as const;
export const STANDARD_AXIOM_POLICY = 'polyglot.axioms.standard.v1' as const;

export const STANDARD_AXIOM_ALLOWLIST: readonly string[] = Object.freeze([
  'propext',
  'Classical.choice',
  'Quot.sound',
]);

export type EngineKind = 'kimina' | 'lake' | 'simulator';

export type EngineOutcome =
  | 'accepted'
  | 'rejected'
  | 'inconclusive'
  | 'unavailable'
  | 'simulated';

export type HybridVerdict = 'confirmed_valid' | 'confirmed_invalid' | 'unconfirmed';

export interface VerificationRequestV1 {
  readonly protocolVersion: typeof CANONICAL_VERIFICATION_PROTOCOL;
  readonly requestId: string;
  readonly scope: 'snippet' | 'project';
  readonly sourceDigest: string;
  readonly contextDigest?: string;
  readonly targetIds?: readonly string[];
  readonly environment: {
    readonly leanToolchain: string;
    readonly kiminaImageDigest?: string;
    readonly lakeRunnerImageDigest?: string;
    readonly manifestDigest?: string;
  };
  readonly axiomPolicyId: typeof STANDARD_AXIOM_POLICY | string;
  readonly requireConsensus: boolean;
}

export interface EngineDiagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

export interface AxiomAuditReport {
  readonly status: 'passed' | 'failed' | 'not_run' | 'not_applicable';
  readonly observedAxioms: readonly string[];
  readonly allowedAxioms: readonly string[];
  readonly violations?: readonly string[];
}

export interface EngineEvidence {
  readonly engine: EngineKind;
  readonly contractVersion: string;
  readonly outcome: EngineOutcome;
  readonly requestId: string;
  readonly sourceDigest: string;
  readonly contextDigest?: string;
  readonly targetIds?: readonly string[];
  readonly toolchain?: string;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly diagnostics: readonly EngineDiagnostic[];
  readonly axiomAudit: AxiomAuditReport;
  readonly error: string | null;
}

export interface ComparabilityEvaluation {
  readonly comparable: boolean;
  readonly reasons: readonly string[];
}

export interface HybridAdjudicationResult {
  readonly protocolVersion: typeof CANONICAL_VERIFICATION_PROTOCOL;
  readonly requestId: string;
  readonly verdict: HybridVerdict;
  /**
   * Derived backward-compatible property.
   * verified ⟺ verdict === 'confirmed_valid'
   */
  readonly verified: boolean;
  readonly comparable: boolean;
  readonly badge: string;
  readonly reason: string;
  readonly axiomAuditStatus: 'passed' | 'failed' | 'not_run';
  readonly engines: {
    readonly kimina: EngineEvidence;
    readonly lake: EngineEvidence;
  };
}

export type AdjudicationResultV1 = {
  readonly protocolVersion: typeof CANONICAL_VERIFICATION_PROTOCOL;
  readonly requestId: string;
  readonly verdict: HybridVerdict;
  readonly verified: boolean;
  readonly seal: 'SEAL_KERNEL_VERIFIED_TIER5' | null;
  readonly axiomPolicyCompliance: boolean;
  readonly enginesConsulted: readonly string[];
  readonly consensusAchieved: boolean;
  readonly reason: string;
  readonly diagnostics: readonly any[];
};

/**
 * Validates whether evidence from Kimina and Lake are epistemically comparable.
 */
export function evaluateComparability(
  req: VerificationRequestV1,
  kimina: EngineEvidence,
  lake: EngineEvidence,
): ComparabilityEvaluation {
  const reasons: string[] = [];

  if (kimina.sourceDigest !== lake.sourceDigest) {
    reasons.push(
      `Source digest mismatch: Kimina (${kimina.sourceDigest}) vs Lake (${lake.sourceDigest})`,
    );
  }

  if (req.sourceDigest && kimina.sourceDigest !== req.sourceDigest) {
    reasons.push(
      `Request source digest mismatch: expected ${req.sourceDigest}, received ${kimina.sourceDigest}`,
    );
  }

  if (kimina.contextDigest && lake.contextDigest && kimina.contextDigest !== lake.contextDigest) {
    reasons.push(
      `Context digest mismatch: Kimina (${kimina.contextDigest}) vs Lake (${lake.contextDigest})`,
    );
  }

  if (kimina.toolchain && lake.toolchain && kimina.toolchain !== lake.toolchain) {
    reasons.push(
      `Toolchain mismatch: Kimina (${kimina.toolchain}) vs Lake (${lake.toolchain})`,
    );
  }

  if (kimina.targetIds && lake.targetIds) {
    const kSorted = [...kimina.targetIds].sort().join(',');
    const lSorted = [...lake.targetIds].sort().join(',');
    if (kSorted !== lSorted) {
      reasons.push(`Target IDs mismatch: Kimina [${kSorted}] vs Lake [${lSorted}]`);
    }
  }

  return {
    comparable: reasons.length === 0,
    reasons,
  };
}

/**
 * Validates observed axioms against the standard allowlist.
 */
export function auditAxioms(
  report: AxiomAuditReport,
  allowlist: readonly string[] = STANDARD_AXIOM_ALLOWLIST,
): { passed: boolean; violations: string[] } {
  if (report.status === 'failed') {
    return { passed: false, violations: ['Pre-existing axiom extraction failure'] };
  }

  if (report.status === 'not_run' || report.status === 'not_applicable') {
    return { passed: false, violations: ['Axiom audit was not performed or not applicable'] };
  }

  const allowedSet = new Set(allowlist);
  const violations: string[] = [];

  for (const ax of report.observedAxioms) {
    if (!allowedSet.has(ax)) {
      violations.push(ax);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Adjudicates dual verification evidence into a binding hybrid consensus verdict.
 */
export function adjudicateHybridConsensus(
  req: VerificationRequestV1,
  kimina: EngineEvidence,
  lake: EngineEvidence,
): HybridAdjudicationResult {
  // 1. Simulation Guard
  if (kimina.outcome === 'simulated' || lake.outcome === 'simulated') {
    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'unconfirmed',
      verified: false,
      comparable: false,
      badge: '⚠ SIMULATED — NON-CERTIFYING',
      reason: 'Simulation detected in verification evidence. No formal kernel certification was performed.',
      axiomAuditStatus: 'not_run',
      engines: { kimina, lake },
    };
  }

  // 2. Availability & Transport Error Guard
  if (kimina.outcome === 'unavailable' || lake.outcome === 'unavailable') {
    const unavail = kimina.outcome === 'unavailable' ? 'Kimina server' : 'Lake runner';
    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'unconfirmed',
      verified: false,
      comparable: false,
      badge: 'UNVERIFIED',
      reason: `Verification engine unavailable: ${unavail} did not respond.`,
      axiomAuditStatus: 'not_run',
      engines: { kimina, lake },
    };
  }

  // 3. Comparability Predicate
  const compEval = evaluateComparability(req, kimina, lake);
  if (!compEval.comparable) {
    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'unconfirmed',
      verified: false,
      comparable: false,
      badge: 'UNVERIFIED',
      reason: `Verdict not confirmed — Context not comparable: ${compEval.reasons.join('; ')}`,
      axiomAuditStatus: 'not_run',
      engines: { kimina, lake },
    };
  }

  // 4. Transitive Axiom Audit
  const kiminaAxioms = auditAxioms(kimina.axiomAudit);
  const lakeAxioms = auditAxioms(lake.axiomAudit);
  const axiomPassed = kiminaAxioms.passed && lakeAxioms.passed;
  const allViolations = [...kiminaAxioms.violations, ...lakeAxioms.violations];

  // 5. Consensus Decision Table
  if (kimina.outcome === 'accepted' && lake.outcome === 'accepted') {
    if (!axiomPassed) {
      return {
        protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
        requestId: req.requestId,
        verdict: 'unconfirmed',
        verified: false,
        comparable: true,
        badge: 'UNVERIFIED',
        reason: `Verdict not confirmed — Axiom policy violation detected: disallowed axioms [${allViolations.join(', ')}]`,
        axiomAuditStatus: 'failed',
        engines: { kimina, lake },
      };
    }

    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'confirmed_valid',
      verified: true,
      comparable: true,
      badge: 'SEAL_KERNEL_VERIFIED_TIER5',
      reason: 'Verified — Kimina and Lake agree with zero unproved axioms.',
      axiomAuditStatus: 'passed',
      engines: { kimina, lake },
    };
  }

  if (kimina.outcome === 'rejected' && lake.outcome === 'rejected') {
    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'confirmed_invalid',
      verified: false,
      comparable: true,
      badge: 'UNVERIFIED',
      reason: 'Rejected — Both engines rejected the proof obligation.',
      axiomAuditStatus: axiomPassed ? 'passed' : 'failed',
      engines: { kimina, lake },
    };
  }

  // Disagreement
  return {
    protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
    requestId: req.requestId,
    verdict: 'unconfirmed',
    verified: false,
    comparable: true,
    badge: 'UNVERIFIED',
    reason: `Verdict not confirmed — Engines disagree: Kimina reported "${kimina.outcome}", Lake reported "${lake.outcome}".`,
    axiomAuditStatus: axiomPassed ? 'passed' : 'not_run',
    engines: { kimina, lake },
  };
}

export interface AdjudicateInput {
  readonly source: string;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exitCode?: number | null;
  readonly toolchain?: string;
}

export interface AdjudicateOutput {
  readonly verdict: HybridVerdict;
  readonly verified: boolean;
  readonly seal: 'SEAL_KERNEL_VERIFIED_TIER5' | null;
  readonly reason: string;
  readonly axioms: readonly string[];
}

export class HybridAdjudicator {
  adjudicate(input: AdjudicateInput): AdjudicateOutput {
    // Non-certifying synchronous preflight analysis only (Defect A contained).
    // Epistemic Invariant 1: Genuine server-side dual-engine execution only.
    // A synchronous text check can never issue confirmed_valid or mint SEAL_KERNEL_VERIFIED_TIER5.
    const hasSorry = input.source.includes('sorry') || input.source.includes('admit');
    return {
      verdict: 'unconfirmed',
      verified: false,
      seal: null,
      reason: hasSorry
        ? 'Proof contains unproven sorry/admit.'
        : 'Non-certifying synchronous preflight: dual-engine consensus execution required for verification.',
      axioms: [],
    };
  }
}

export const hybridAdjudicator = new HybridAdjudicator();

