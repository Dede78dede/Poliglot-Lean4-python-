/**
 * Hybrid Consensus Adjudicator for Polyglot Code Studio.
 * Protocol: polyglot.verification.v1
 * Axiom Policy: polyglot.axioms.standard.v1
 *
 * Epistemic Invariant:
 * Only identical proof obligations validated by both Kimina and Lake
 * with server-owned execution provenance, zero sorry axioms, exitCode === 0,
 * zero error diagnostics, and conforming to the standard foundational allowlist
 * may yield confirmed_valid and mint SEAL_KERNEL_VERIFIED_TIER5.
 */

import {
  isValidSha256Digest,
  mintServerExecutionProvenance,
  normalizeSha256,
  verifyServerExecutionProvenance,
  type ServerExecutionProvenance,
} from './server-provenance';

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
  readonly manifestDigest?: string;
  readonly imageDigest?: string;
  readonly targetIds?: readonly string[];
  readonly toolchain?: string;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly diagnostics: readonly EngineDiagnostic[];
  readonly axiomAudit: AxiomAuditReport;
  readonly error: string | null;
  readonly provenance?: ServerExecutionProvenance;
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
  readonly diagnostics: readonly unknown[];
};

const consumedProvenanceIds = new Set<string>();

/**
 * Attaches server-owned HMAC provenance to an authentic engine execution evidence record.
 */
export function attachServerProvenance(
  evidence: Omit<EngineEvidence, 'provenance'> & { readonly engine: 'kimina' | 'lake' },
): EngineEvidence {
  const provenance = mintServerExecutionProvenance({
    requestId: evidence.requestId,
    engine: evidence.engine,
    sourceDigest: evidence.sourceDigest,
    contextDigest: evidence.contextDigest,
    manifestDigest: evidence.manifestDigest,
    toolchain: evidence.toolchain,
    imageDigest: evidence.imageDigest,
    outcome: evidence.outcome,
    exitCode: evidence.exitCode,
  });

  return {
    ...evidence,
    provenance,
  };
}

/**
 * Validates whether evidence from Kimina and Lake are epistemically comparable.
 */
export function evaluateComparability(
  req: VerificationRequestV1,
  kimina: EngineEvidence,
  lake: EngineEvidence,
): ComparabilityEvaluation {
  const reasons: string[] = [];

  if (req.protocolVersion !== CANONICAL_VERIFICATION_PROTOCOL) {
    reasons.push(`Unsupported protocol version: ${String(req.protocolVersion)}`);
  }

  if (req.axiomPolicyId !== STANDARD_AXIOM_POLICY) {
    reasons.push(`Unsupported axiom policy: ${req.axiomPolicyId}`);
  }

  if (kimina.engine !== 'kimina' || lake.engine !== 'lake') {
    reasons.push(`Distinct dual engines required (kimina & lake), got (${kimina.engine}, ${lake.engine})`);
  }

  if (kimina.requestId !== req.requestId || lake.requestId !== req.requestId) {
    reasons.push(
      `Request ID mismatch: expected ${req.requestId}, got Kimina (${kimina.requestId}) / Lake (${lake.requestId})`,
    );
  }

  if (!isValidSha256Digest(req.sourceDigest)) {
    reasons.push(`Invalid SHA-256 source digest format in request: ${req.sourceDigest}`);
  }

  if (!isValidSha256Digest(kimina.sourceDigest) || !isValidSha256Digest(lake.sourceDigest)) {
    reasons.push('Invalid SHA-256 source digest format in engine evidence');
  } else if (normalizeSha256(kimina.sourceDigest) !== normalizeSha256(lake.sourceDigest)) {
    reasons.push(
      `Source digest mismatch: Kimina (${kimina.sourceDigest}) vs Lake (${lake.sourceDigest})`,
    );
  }

  if (
    isValidSha256Digest(req.sourceDigest) &&
    isValidSha256Digest(kimina.sourceDigest) &&
    normalizeSha256(kimina.sourceDigest) !== normalizeSha256(req.sourceDigest)
  ) {
    reasons.push(
      `Request source digest mismatch: expected ${req.sourceDigest}, received ${kimina.sourceDigest}`,
    );
  }

  if (req.contextDigest) {
    if (kimina.contextDigest !== req.contextDigest || lake.contextDigest !== req.contextDigest) {
      reasons.push(
        `Context digest mismatch against request (${req.contextDigest}): Kimina (${kimina.contextDigest ?? 'missing'}) vs Lake (${lake.contextDigest ?? 'missing'})`,
      );
    }
  } else if (kimina.contextDigest !== lake.contextDigest) {
    reasons.push(
      `Context digest mismatch: Kimina (${kimina.contextDigest ?? 'missing'}) vs Lake (${lake.contextDigest ?? 'missing'})`,
    );
  }

  const reqToolchain = req.environment?.leanToolchain;
  if (!reqToolchain || !kimina.toolchain || !lake.toolchain) {
    reasons.push(
      `Toolchain required across request and both engines: req=${reqToolchain ?? 'missing'}, Kimina=${kimina.toolchain ?? 'missing'}, Lake=${lake.toolchain ?? 'missing'}`,
    );
  } else if (kimina.toolchain !== reqToolchain || lake.toolchain !== reqToolchain) {
    reasons.push(
      `Toolchain mismatch: requested (${reqToolchain}), Kimina (${kimina.toolchain}), Lake (${lake.toolchain})`,
    );
  }

  if (req.environment.manifestDigest) {
    if (
      kimina.manifestDigest !== req.environment.manifestDigest ||
      lake.manifestDigest !== req.environment.manifestDigest
    ) {
      reasons.push('Manifest digest mismatch between request and engine evidence');
    }
  }

  if (req.environment.kiminaImageDigest && kimina.imageDigest !== req.environment.kiminaImageDigest) {
    reasons.push('Kimina runner image digest mismatch');
  }

  if (req.environment.lakeRunnerImageDigest && lake.imageDigest !== req.environment.lakeRunnerImageDigest) {
    reasons.push('Lake runner image digest mismatch');
  }

  if (req.targetIds && req.targetIds.length > 0) {
    const reqSorted = [...req.targetIds].sort().join(',');
    const kSorted = kimina.targetIds ? [...kimina.targetIds].sort().join(',') : '';
    const lSorted = lake.targetIds ? [...lake.targetIds].sort().join(',') : '';
    if (kSorted !== reqSorted || lSorted !== reqSorted) {
      reasons.push(`Target IDs mismatch: expected [${reqSorted}], Kimina [${kSorted}], Lake [${lSorted}]`);
    }
  } else if (kimina.targetIds && lake.targetIds) {
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
    const existing = report.violations && report.violations.length > 0 ? [...report.violations] : ['Pre-existing axiom extraction failure'];
    return { passed: false, violations: existing };
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

function unconfirmedResult(
  req: VerificationRequestV1,
  kimina: EngineEvidence,
  lake: EngineEvidence,
  options: {
    comparable: boolean;
    badge: string;
    reason: string;
    axiomAuditStatus: 'passed' | 'failed' | 'not_run';
  },
): HybridAdjudicationResult {
  return {
    protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
    requestId: req.requestId,
    verdict: 'unconfirmed',
    verified: false,
    comparable: options.comparable,
    badge: options.badge,
    reason: options.reason,
    axiomAuditStatus: options.axiomAuditStatus,
    engines: { kimina, lake },
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
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: '⚠ SIMULATED — NON-CERTIFYING',
      reason: 'Simulation detected in verification evidence. No formal kernel certification was performed.',
      axiomAuditStatus: 'not_run',
    });
  }

  // 2. Availability & Inconclusive Guard
  if (kimina.outcome === 'unavailable' || lake.outcome === 'unavailable') {
    const unavail = kimina.outcome === 'unavailable' ? 'Kimina server' : 'Lake runner';
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: 'UNVERIFIED',
      reason: `Verification engine unavailable: ${unavail} did not respond.`,
      axiomAuditStatus: 'not_run',
    });
  }

  if (kimina.outcome === 'inconclusive' || lake.outcome === 'inconclusive') {
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: 'UNVERIFIED',
      reason: 'Verification engine returned inconclusive evidence.',
      axiomAuditStatus: 'not_run',
    });
  }

  // 3. Comparability Predicate (digests, toolchain, policy, target IDs, distinct engines)
  const compEval = evaluateComparability(req, kimina, lake);
  if (!compEval.comparable) {
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: 'UNVERIFIED',
      reason: `Verdict not confirmed — Context not comparable: ${compEval.reasons.join('; ')}`,
      axiomAuditStatus: 'not_run',
    });
  }

  // 4. Cryptographic Server-Owned Provenance & Anti-Replay Guard
  const kProv = verifyServerExecutionProvenance(kimina, kimina.provenance);
  const lProv = verifyServerExecutionProvenance(lake, lake.provenance);
  if (!kProv.valid || !lProv.valid) {
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: 'UNVERIFIED',
      reason: `Verdict not confirmed — Invalid server execution provenance: ${kProv.reason ?? lProv.reason}`,
      axiomAuditStatus: 'not_run',
    });
  }

  const kProvId = kimina.provenance!.provenanceId;
  const lProvId = lake.provenance!.provenanceId;
  if (kProvId === lProvId || consumedProvenanceIds.has(kProvId) || consumedProvenanceIds.has(lProvId)) {
    return unconfirmedResult(req, kimina, lake, {
      comparable: false,
      badge: 'UNVERIFIED',
      reason: 'Verdict not confirmed — Provenance replay detected.',
      axiomAuditStatus: 'not_run',
    });
  }
  consumedProvenanceIds.add(kProvId);
  consumedProvenanceIds.add(lProvId);

  // 5. Transitive Axiom Audit
  const kiminaAxioms = auditAxioms(kimina.axiomAudit);
  const lakeAxioms = auditAxioms(lake.axiomAudit);
  const axiomPassed = kiminaAxioms.passed && lakeAxioms.passed;
  const allViolations = [...kiminaAxioms.violations, ...lakeAxioms.violations];

  // 6. Consensus Decision Table
  if (kimina.outcome === 'accepted' && lake.outcome === 'accepted') {
    if (kimina.exitCode !== 0 || lake.exitCode !== 0) {
      return unconfirmedResult(req, kimina, lake, {
        comparable: true,
        badge: 'UNVERIFIED',
        reason: `Verdict not confirmed — Non-zero or missing exit code (Kimina=${kimina.exitCode}, Lake=${lake.exitCode}).`,
        axiomAuditStatus: axiomPassed ? 'passed' : 'failed',
      });
    }

    const allDiagnostics = [...kimina.diagnostics, ...lake.diagnostics];
    const hasDiagnosticError = allDiagnostics.some((d) => d.severity === 'error');
    const hasDiagnosticSorry = allDiagnostics.some((d) => /\b(sorry|admit|sorryAx)\b/i.test(d.message));
    if (hasDiagnosticError || hasDiagnosticSorry) {
      return unconfirmedResult(req, kimina, lake, {
        comparable: true,
        badge: 'UNVERIFIED',
        reason: 'Verdict not confirmed — Diagnostics contain errors or unproven sorry/admit markers.',
        axiomAuditStatus: 'failed',
      });
    }

    if (!axiomPassed) {
      return unconfirmedResult(req, kimina, lake, {
        comparable: true,
        badge: 'UNVERIFIED',
        reason: `Verdict not confirmed — Axiom policy violation detected: disallowed axioms [${allViolations.join(', ')}]`,
        axiomAuditStatus: 'failed',
      });
    }

    return {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: req.requestId,
      verdict: 'confirmed_valid',
      verified: true,
      comparable: true,
      badge: 'SEAL_KERNEL_VERIFIED_TIER5',
      reason: 'Verified — Kimina and Lake agree with server provenance and zero unproved axioms.',
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

  return unconfirmedResult(req, kimina, lake, {
    comparable: true,
    badge: 'UNVERIFIED',
    reason: `Verdict not confirmed — Engines disagree: Kimina reported "${kimina.outcome}", Lake reported "${lake.outcome}".`,
    axiomAuditStatus: axiomPassed ? 'passed' : 'not_run',
  });
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
    const hasSorry = /\b(sorry|admit)\b/.test(input.source);
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

export function toAdjudicationResultV1(result: HybridAdjudicationResult): AdjudicationResultV1 {
  const isCertified = result.verdict === 'confirmed_valid' && result.verified;
  return {
    protocolVersion: result.protocolVersion,
    requestId: result.requestId,
    verdict: result.verdict,
    verified: result.verified,
    seal: isCertified ? 'SEAL_KERNEL_VERIFIED_TIER5' : null,
    axiomPolicyCompliance: result.axiomAuditStatus === 'passed',
    enginesConsulted: ['kimina', 'lake'],
    consensusAchieved: result.verdict === 'confirmed_valid' || result.verdict === 'confirmed_invalid',
    reason: result.reason,
    diagnostics: [
      ...result.engines.kimina.diagnostics,
      ...result.engines.lake.diagnostics,
    ],
  };
}

export const hybridAdjudicator = new HybridAdjudicator();
