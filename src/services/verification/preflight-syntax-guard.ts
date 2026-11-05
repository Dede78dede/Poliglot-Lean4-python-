/**
 * Pre-Flight Syntax Guard (Phase 13.9.1, Task 11 — ADR 014)
 *
 * Epistemic Guardrail:
 * This module is a client-side pre-flight syntax and hygiene screening guard.
 * It NEVER returns `verified: true` or any certificate of truth.
 *
 * Formal certification is strictly reserved for the canonical evaluator
 * (`server/src/services/verification-formula.ts`) backed by Lean 4 kernel evidence
 * (exitCode === 0 ∧ contains_proof_obligation ∧ ¬hasSorry ∧ ¬hasError ∧ ¬simulated).
 */

import {
  evaluateFormalVerification,
  type VerificationCheckInput,
  type VerificationEvaluation,
} from '../../../server/src/services/verification-formula';

export interface PreflightSyntaxInput {
  readonly code: string;
  readonly toolchainHint?: string;
}

export interface PreflightSyntaxResult {
  readonly codeValid: boolean;
  readonly sorryFree: boolean;
  readonly syntaxValid: boolean;
  readonly toolchainHint: boolean;
  readonly rejectedTerms: readonly string[];
  readonly reason?: string;
}

export const QUALIFIED_TOOLCHAIN_PREFIXES = Object.freeze([
  'v4.28', 'v4.29', 'v4.30', 'v4.31', 'v4.32', 'v4.33', 'v4.34', 'v4.35',
  'leanprover/lean4:v4.28', 'leanprover/lean4:v4.29', 'leanprover/lean4:v4.30',
  'leanprover/lean4:v4.31', 'leanprover/lean4:v4.32', 'leanprover/lean4:v4.33',
  'leanprover/lean4:v4.34', 'leanprover/lean4:v4.35',
]);

const SORRY_REGEX = /\b(sorry|admit|sorryAx)\b/;
const SYNTAX_REGEX = /\b(theorem|lemma|example|def)\s+([a-zA-Z0-9_'.]+)/;

/**
 * Pre-flight syntax evaluation.
 * Returns term-by-term screening results without certifying proof validity.
 */
export function evaluatePreflightSyntax(input: PreflightSyntaxInput): PreflightSyntaxResult {
  const rejectedTerms: string[] = [];

  // Term 1: Non-empty code buffer
  const codeValid = typeof input.code === 'string' && input.code.trim().length > 0;
  if (!codeValid) rejectedTerms.push('T_code');

  // Term 2: Zero sorry ban in code text
  const sorryFree = !SORRY_REGEX.test(input.code);
  if (!sorryFree) rejectedTerms.push('T_sorry');

  // Term 3: Declaration syntax keyword present (theorem, lemma, example, def)
  const syntaxValid = SYNTAX_REGEX.test(input.code);
  if (!syntaxValid) rejectedTerms.push('T_syntax');

  // Term 4: Toolchain alignment hint
  const toolchain = input.toolchainHint ?? 'v4.34.0';
  const toolchainHint = QUALIFIED_TOOLCHAIN_PREFIXES.some(
    prefix => toolchain === prefix || toolchain.startsWith(prefix) || toolchain.includes(prefix)
  );
  if (!toolchainHint) rejectedTerms.push('T_toolchain');

  return {
    codeValid,
    sorryFree,
    syntaxValid,
    toolchainHint,
    rejectedTerms: Object.freeze(rejectedTerms),
    reason: rejectedTerms.length === 0 ? undefined : `Preflight rejected by terms: ${rejectedTerms.join(', ')}`,
  };
}

/**
 * Sole delegation path to kernel certification.
 * Only the canonical server evaluator can certify truth and mint verified: true.
 */
export function certifyWithKernel(input: VerificationCheckInput): VerificationEvaluation {
  return evaluateFormalVerification(input);
}
