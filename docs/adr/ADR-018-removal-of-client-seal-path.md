# ADR-018 — Removal of Client Seal Path & Excision of certifyWithKernel

**Status**: Accepted  
**Date**: 2026-11-08  
**Decisori**: Epistemic Security Lead, Architecture Review Board (ARB), Principal Engineer  
**Related**: ADR-014 (Verification Formula Canonicalization), ADR-015 (Epistemic Authority), ADR-016 (Phase 15 Scope)

---

## 1. Context

During Phase 13.9.1, `src/services/verification/preflight-syntax-guard.ts` was introduced to provide client-side AST screening and sorry-detection before submitting full Lean 4 verification requests to the backend.

However, an epistemic leak occurred:
1. `preflight-syntax-guard.ts` imported `evaluateFormalVerification` directly across the client-server boundary (`../../../server/src/services/verification-formula`).
2. It exported a wrapper function `certifyWithKernel(input: VerificationCheckInput)` which allowed client code to invoke server verification logic directly.
3. This enabled the theoretical possibility of client code minting `verified: true` and bypassing the hybrid consensus orchestrator.
4. Furthermore, static security sweeps flagged unauthorized occurrences of `certifyWithKernel` in `src/`.

---

## 2. Decision

The Architecture Review Board approves the total excision of client-side certification pathways:

### 2.1 Complete Excision of `certifyWithKernel`
- `certifyWithKernel` is permanently removed from `src/services/verification/preflight-syntax-guard.ts` and the `src/services/verification/verification-formula.ts` re-export facade.
- All references in tests (`suite-159`, `suite-162`) are refactored to either invoke server evaluators in server test contexts or verify purely syntactic preflight results in client test contexts.

### 2.2 PreflightSyntaxResult Epistemic Purity
`PreflightSyntaxResult` is strictly limited to syntactic and hygiene screening fields:
```typescript
export interface PreflightSyntaxResult {
  readonly codeValid: boolean;
  readonly sorryFree: boolean;
  readonly syntaxValid: boolean;
  readonly toolchainHint: boolean;
  readonly rejectedTerms: readonly string[];
  readonly reason?: string;
}
```
No `verified` boolean or seal property may ever be declared or emitted by this interface.

### 2.3 Dependency Cruiser Boundary Enforcement
`.dependency-cruiser.cjs` codifies a strict boundary rule prohibiting any file under `src/**` (with the explicit exception of `src/contracts/**`) from importing modules from `server/**`.

### 2.4 Seal Integrity Sweep Check
`scripts/seal-integrity-sweep.sh` enforces Invariant 3 (zero client imports of server formula) and Invariant 4 (zero occurrences of `certifyWithKernel` in `src/`).

---

## 3. Consequences

### Positive
- Closes the single client-side bypass route for proof certification.
- Enforces clear architectural separation between frontend UI/preflight screening and backend formal verification.
- Eliminates brittle relative imports traversing the client/server boundary.

### Negative
- Client code cannot perform standalone local proof certification without network communication to the server hybrid-adjudicator. This is by design (epistemic authority invariant).
