/**
 * Re-export and Delegation Facade (Phase 13.9.1, Task 11 — ADR 014)
 *
 * Epistemic Notice:
 * The 5-term verification formula authority is canonicalized in
 * `server/src/services/verification-formula.ts`.
 *
 * Client-side syntax screening is implemented in `preflight-syntax-guard.ts`.
 * To maintain the non-bypassable epistemic invariant, no function in this module
 * returns `verified: true` without delegating to `certifyWithKernel()`.
 */

export {
  evaluatePreflightSyntax,
  certifyWithKernel,
  type PreflightSyntaxInput,
  type PreflightSyntaxResult,
  QUALIFIED_TOOLCHAIN_PREFIXES,
} from './preflight-syntax-guard';
