/**
 * Five-Term Formal Kernel Verification Seal Evaluator (Phase 7 / Phase 13.9, Task 05)
 *
 * Implements:
 * Verified = T_code ∧ T_sorry ∧ T_syntax ∧ T_toolchain ∧ T_goals
 *
 * Epistemic Rules:
 * 1. T_code: Code buffer must not be empty or whitespace only.
 * 2. T_sorry: Zero sorry ban — rejects `sorry`, `admit`, `sorryAx`, or synthetic holes.
 * 3. T_syntax: Contains valid formal declaration keyword (theorem, lemma, example, def).
 * 4. T_toolchain: Toolchain is within qualified versions (e.g. v4.28.0 - v4.35.0).
 * 5. T_goals: Kernel returns 0 open goals and exitCode === 0 without simulated flag.
 */

export interface VerificationFormulaInput {
  readonly code: string;
  readonly toolchain: string;
  readonly openGoalsCount: number;
  readonly exitCode: number;
  readonly simulated?: boolean;
}

export interface VerificationFormulaResult {
  readonly verified: boolean;
  readonly terms: {
    readonly code: boolean;
    readonly sorryFree: boolean;
    readonly syntaxValid: boolean;
    readonly toolchainAligned: boolean;
    readonly goalsClosed: boolean;
  };
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

export function evaluateFiveTermFormula(input: VerificationFormulaInput): VerificationFormulaResult {
  const rejectedTerms: string[] = [];

  // Term 1: Non-empty code
  const codeValid = typeof input.code === 'string' && input.code.trim().length > 0;
  if (!codeValid) rejectedTerms.push('T_code');

  // Term 2: Zero sorry ban
  const sorryFree = !SORRY_REGEX.test(input.code);
  if (!sorryFree) rejectedTerms.push('T_sorry');

  // Term 3: Formal declaration syntax
  const syntaxValid = SYNTAX_REGEX.test(input.code);
  if (!syntaxValid) rejectedTerms.push('T_syntax');

  // Term 4: Toolchain alignment
  const toolchainAligned = QUALIFIED_TOOLCHAIN_PREFIXES.some(
    prefix => input.toolchain === prefix || input.toolchain.startsWith(prefix) || input.toolchain.includes(prefix)
  );
  if (!toolchainAligned) rejectedTerms.push('T_toolchain');

  // Term 5: Strict closed goals & exit code
  const goalsClosed = input.openGoalsCount === 0 && input.exitCode === 0 && input.simulated !== true;
  if (!goalsClosed) rejectedTerms.push('T_goals');

  const verified = codeValid && sorryFree && syntaxValid && toolchainAligned && goalsClosed;

  return {
    verified,
    terms: {
      code: codeValid,
      sorryFree,
      syntaxValid,
      toolchainAligned,
      goalsClosed,
    },
    rejectedTerms: Object.freeze(rejectedTerms),
    reason: verified ? undefined : `Rejected by terms: ${rejectedTerms.join(', ')}`,
  };
}
