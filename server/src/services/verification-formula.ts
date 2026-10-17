/**
 * Pure verification logic for Lean 4 formal proof obligations.
 *
 * Formal specification:
 * verified ⟺ exitCode === 0
 *          ∧ contains_proof_obligation (theorem | lemma | example)
 *          ∧ ¬contains_sorry
 *          ∧ ¬contains_error_severity
 *          ∧ ¬simulated
 */

export interface VerificationCheckInput {
  readonly codeOrFiles: string | readonly { readonly path: string; readonly content: string }[];
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly simulated: boolean;
  readonly hasErrorSeverity?: boolean;
  readonly toolchainMismatch?: { readonly required: string; readonly current: string } | boolean;
  readonly strictGoals?: boolean;
}

export interface VerificationEvaluation {
  readonly verified: boolean;
  readonly hasProofObligation: boolean;
  readonly hasSorry: boolean;
  readonly hasError: boolean;
  readonly reason?: string;
}

/**
 * Checks if code contains at least one formal proof obligation keyword
 * (theorem, lemma, or example). Pure declarations like `#check Nat`,
 * `#eval 1+1`, or `def foo : Nat := 42` are valid Lean expressions
 * but do NOT constitute proof verification.
 */
export function containsProofObligation(code: string): boolean {
  // Matches theorem, lemma, example as standalone keywords (not inside comments/strings ideally)
  // Stripping line comments (-- ...) and block comments (/- ... -/)
  const sanitized = code
    .replace(/--.*$/gm, '')
    .replace(/\/-[\s\S]*?-\//g, '');

  return /\b(theorem|lemma|example)\b/.test(sanitized);
}

/**
 * Checks if a project containing multiple files has any formal proof obligation
 */
export function projectContainsProofObligation(
  files: readonly { readonly path: string; readonly content: string }[],
): boolean {
  return files.some((f) => {
    // Only check Lean source files, skip lakefile or non-lean
    if (!f.path.endsWith('.lean') || f.path === 'lakefile.lean') return false;
    return containsProofObligation(f.content);
  });
}

/**
 * Rigorously evaluates Lean formal verification according to the full 5-term criterion:
 * verified ⟺ exitCode === 0 ∧ contains_proof_obligation ∧ ¬hasSorry ∧ ¬hasError ∧ ¬simulated
 */
export function evaluateFormalVerification(input: VerificationCheckInput): VerificationEvaluation {
  const {
    codeOrFiles,
    stdout,
    stderr,
    exitCode,
    simulated,
    hasErrorSeverity,
    toolchainMismatch,
  } = input;

  if (simulated) {
    return {
      verified: false,
      hasProofObligation: false,
      hasSorry: false,
      hasError: false,
      reason: 'Execution was simulated without live formal verification kernel',
    };
  }

  if (toolchainMismatch) {
    const mismatchDetails =
      typeof toolchainMismatch === 'object'
        ? ` (requires ${toolchainMismatch.required}, runner is ${toolchainMismatch.current})`
        : '';
    return {
      verified: false,
      hasProofObligation: true,
      hasSorry: false,
      hasError: false,
      reason: `Toolchain mismatch: formal proof obligations cannot be certified under unaligned runner toolchain${mismatchDetails}`,
    };
  }

  const hasProofObligation =
    typeof codeOrFiles === 'string'
      ? containsProofObligation(codeOrFiles)
      : projectContainsProofObligation(codeOrFiles);

  const hasSorry =
    stdout.includes("declaration uses 'sorry'") ||
    stderr.includes("declaration uses 'sorry'") ||
    /\bwarning: declaration uses 'sorry'\b/.test(stdout) ||
    /\bwarning: declaration uses 'sorry'\b/.test(stderr);

  const hasError =
    exitCode !== 0 ||
    Boolean(hasErrorSeverity) ||
    /\berror:\b/i.test(stderr) ||
    /\berror:\b/i.test(stdout);

  if (!hasProofObligation) {
    return {
      verified: false,
      hasProofObligation: false,
      hasSorry,
      hasError,
      reason: 'No formal proof obligation (theorem, lemma, or example) found in Lean code',
    };
  }

  if (hasSorry) {
    return {
      verified: false,
      hasProofObligation: true,
      hasSorry: true,
      hasError,
      reason: "Proof contains unproven goals ('sorry')",
    };
  }

  if (hasError) {
    return {
      verified: false,
      hasProofObligation: true,
      hasSorry: false,
      hasError: true,
      reason: 'Lean execution produced errors',
    };
  }

  // 6th Term (Opt-In via PIPELINE_STRICT_GOALS=true): Strict goal and metavariable closure
  const isStrictGoalsEnabled =
    input.strictGoals ??
    (typeof process !== 'undefined' && process.env?.['PIPELINE_STRICT_GOALS'] === 'true');

  if (isStrictGoalsEnabled) {
    const hasUnsolvedGoals =
      /\bunsolved goals\b/i.test(stdout) ||
      /\bunsolved goals\b/i.test(stderr) ||
      /\bhas metavariables\b/i.test(stdout) ||
      /\bhas metavariables\b/i.test(stderr) ||
      /declaration contains unsolved goals/i.test(stdout) ||
      /declaration contains unsolved goals/i.test(stderr);

    if (hasUnsolvedGoals) {
      return {
        verified: false,
        hasProofObligation: true,
        hasSorry: false,
        hasError: true,
        reason: 'Strict mode: unsolved goals or uninstantiated metavariables detected (PIPELINE_STRICT_GOALS)',
      };
    }
  }

  const verified = exitCode === 0 && !simulated;

  return {
    verified,
    hasProofObligation: true,
    hasSorry: false,
    hasError: false,
  };
}
