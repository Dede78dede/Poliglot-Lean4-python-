/**
 * Re-export and Delegation Facade (Phase 13.9.1, Task 11 — ADR 014)
 *
 * Epistemic Notice:
 * The 5-term verification formula authority is canonicalized in
 * `server/src/services/verification-formula.ts`.
 *
 * Client-side syntax screening is implemented in `preflight-syntax-guard.ts`.
 */

export {
  evaluatePreflightSyntax,
  type PreflightSyntaxInput,
  type PreflightSyntaxResult,
  QUALIFIED_TOOLCHAIN_PREFIXES,
} from './preflight-syntax-guard';

