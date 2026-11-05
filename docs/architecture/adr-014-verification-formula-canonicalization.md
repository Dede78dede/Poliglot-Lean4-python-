# ADR 014: Verification Formula Canonicalization & Epistemic Drift Resolution

**Status**: APPROVED  
**Date**: 2026-11-04  
**Author**: Lead Python/Lean 4 Engineer & Senior Software Architect  
**Deciders**: Polyglot Code Studio Architecture Council  

---

## 1. Context & Problem Statement

In Polyglot Code Studio, formal proof certification is governed by the strict epistemic invariant:
> Only `SEAL_KERNEL_VERIFIED_TIER5` backed by live Lean 4 kernel evidence certifies truth. Heuristics, client-side regexes, and transpilers never mint formal certificates.

During Phase 13.9, a duplicate verification module was created at `src/services/verification/verification-formula.ts` declaring `evaluateFiveTermFormula` returning `verified: boolean`. This introduced an epistemic drift against the canonical certification authority in `server/src/services/verification-formula.ts` (`evaluateFormalVerification`).

---

## 2. Divergence Matrix (D1–D4)

| # | Anomaly / Case | Canonical Authority (`server/src/services/verification-formula.ts`) | Phase 13.9 Non-Authority (`src/services/verification/verification-formula.ts`) | Epistemic Risk & Assessment |
|---|---|---|---|---|
| **D1** | Pure definitions (e.g. `def foo : Nat := 42`) with exit code 0 | **`verified: false`** (`containsProofObligation` strictly requires `theorem`, `lemma`, or `example`) | **`verified: true`** (`SYNTAX_REGEX` matched `def`) | **Severe False Positive**: Pure definitions have no proof obligation and cannot certify mathematical truth. |
| **D2** | `sorry` in source code without stdout warning | **`verified: true`** (Evaluates `stdout`/`stderr` warnings from kernel) | **`verified: false`** (Evaluates static regex on raw code) | **Documented False Positive**: If the compiler output is missing or mocked empty, canonical trusted kernel logs. |
| **D3** | Error in `stderr` with exit code 0 | **`verified: false`** (`hasError` inspects `stderr` for `error:`) | **`verified: true`** (Inspected only `exitCode === 0`) | **Silent Defect Acceptance**: Kernel warnings or recoverable diagnostic errors with exit 0 were certified as true. |
| **D4** | Interface mismatch | `input: VerificationCheckInput` (`codeOrFiles`, `stdout`, `stderr`, `exitCode`, `simulated`) | `input: VerificationFormulaInput` (`code`, `toolchain`, `openGoalsCount`, `exitCode`, `simulated`) | **Interface Incompatibility**: Client evaluated synthetic counts rather than kernel diagnostics. |

### Concrete Code Divergence Examples

#### D1: Pure definition without proof obligation
```lean
-- Input:
def foo : Nat := 42
```
- **Canonical Evaluator**: `evaluateFormalVerification` detects absence of `theorem|lemma|example` and returns:
  `{ verified: false, reason: "No formal proof obligation (theorem, lemma, or example) found in Lean code" }`
- **Phase 13.9 Module**: `SYNTAX_REGEX` matched `def` and returned:
  `{ verified: true }` ❌ *(Epistemic violation)*

#### D3: Stderr contains fatal diagnostic but process returned 0
```
stderr: "error: unknown identifier 'bar'"
exitCode: 0
```
- **Canonical Evaluator**: detects `/error:/i.test(stderr)` and returns `{ verified: false }`
- **Phase 13.9 Module**: inspected only `exitCode === 0` and returned `{ verified: true }` ❌

---

## 3. Decision

1. **Sole Certification Authority**:
   `server/src/services/verification-formula.ts` is explicitly designated as the single source of truth for formal proof certification.
2. **Declassification to Pre-Flight Syntax Guard**:
   The client module is declassified and relocated to `src/services/verification/preflight-syntax-guard.ts`.
   Function `evaluatePreflightSyntax(input: PreflightSyntaxInput): PreflightSyntaxResult` returns:
   ```ts
   export interface PreflightSyntaxResult {
     readonly codeValid: boolean;
     readonly sorryFree: boolean;
     readonly syntaxValid: boolean;
     readonly toolchainHint: boolean;
     readonly rejectedTerms: readonly string[];
     readonly reason?: string;
   }
   ```
   **CRITICAL**: `PreflightSyntaxResult` has NO `verified` field.
3. **Delegation Helper**:
   The module exposes `certifyWithKernel(input: VerificationCheckInput): VerificationEvaluation`, which delegates strictly to `evaluateFormalVerification`.

---

## 4. Consequences & Epistemic Invariants

- **Zero Client-Side Forgery**: No UI, worker, or client module can return `verified: true` based solely on string regexes.
- **Static Audit Rule**: `grep -rn "verified: true" src/services/verification/` returns zero matches outside the delegation helper.
- **Compatibility**: `src/services/verification/verification-formula.ts` re-exports the pre-flight guard and delegation helper.

---

## 5. Rollback Strategy

If downstream dependencies require the previous signature during testing, `certifyWithKernel` can be invoked with synthesized kernel outputs. Reversion is isolated and non-breaking to the server-side compiler pipelines.
