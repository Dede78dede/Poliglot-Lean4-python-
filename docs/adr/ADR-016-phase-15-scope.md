# ADR-016 — Phase 15 Scope, Epistemic Guarantees, and Activation Waves

**Status**: Accepted  
**Date**: 2026-11-08  
**Decisori**: Architecture Review Board (ARB), Formal Systems Architect, Epistemic Security Lead  
**Related**: ADR-014 (Verification Formula Canonicalization), ADR-015 (Epistemic Authority), ADR-017 (Bundle Budget Revision), ADR-018 (Client Seal Excision)

---

## 1. Context

Polyglot Code Studio provides an integrated browser-based dual-runtime environment for Python 3.14 and Lean 4 formal mathematics. Following the completion of Phase 14 and Phase 14.9 consolidation (172 test suites, 303 sub-tests passing 100%), the system required formal specification for:
1. **Closing Phase 14.9.9.1 Hardening**: Solidifying contract parity (Zod ↔ Pydantic v2), eliminating client-side pseudo-certification bypasses, and establishing strict feature flag governance across all 62 flags.
2. **Phase 15 Target Scope**: Expanding verification from the 172-suite baseline through the post-14.9.3 target (183 suites / 348 sub-tests) to the target Phase 15 milestone (195 suites / 420 sub-tests).
3. **Epistemic Authority Non-Negotiable Invariants**: Guaranteeing that only verified Lean 4 kernel evidence can mint truth certificates.

---

## 2. Decision

The Architecture Review Board codifies the following architectural boundaries and roadmap:

### 2.1 Epistemic Authority Invariant (The Single Certifier Rule)
- **Sole Emission Point**: `server/src/services/verification/hybrid-adjudicator.ts:264` is the **exclusive site** authorized to emit `verified: true`, `certificationTier: 'KERNEL_VERIFIED_TIER5'`, and `seal: 'SEAL_KERNEL_VERIFIED_TIER5'`.
- **5-Term Formula**: Certification requires:
  $$\text{verified} \iff (\text{exitCode} = 0) \land \text{contains\_proof\_obligation} \land \neg\text{hasSorry} \land \neg\text{hasError} \land \neg\text{simulated}$$
- **Zero Client Certification**: Client-side guards (`src/services/verification/preflight-syntax-guard.ts`) and secondary bridges (`leancert`, `provepy`, `pastalean`, `axle-repair`) emit strictly non-certifying variants (`numeric-certificate`, `transport`, `preflight`, `unavailable`, `metadata`) with `verified: false`.

### 2.2 Testing Milestones & Growth Metrics
- **Historical Baseline (Commit `e7319a2`)**: 172 test suites / 303 sub-tests.
- **Phase 14.9.3 Intermediate Target**: 183 test suites / 348 sub-tests (M0–M11 closure).
- **Phase 14.9.9.1 Hardened State**: 191 test suites / 377 sub-tests (including property-based and a11y suites).
- **Phase 15 Final Milestone**: 195 test suites / 420 sub-tests across full activation waves.
- **Discipline**: Zero passing-by-construction stubs; all assertions validate substantive semantics.

### 2.3 Activation Waves (W1–W4)
Feature flags gating resource-intensive or network-dependent modules are scheduled for activation across 4 staged waves:
1. **Wave 1 (Observability)**: OpenTelemetry Browser (`ENABLE_OTEL_BROWSER`) and Node (`ENABLE_OTEL_NODE`).
2. **Wave 2 (Tactic Parallelism)**: LeanBeam speculative tactic bridge (`ENABLE_LEAN_BEAM`).
3. **Wave 3 (Advanced Reasoners)**: Mathesis (`ENABLE_MATHESIS`), LP2 adapter (`ENABLE_LP2`), TreeThink backend (`ENABLE_TREETHINK`).
4. **Wave 4 (Collaboration)**: Yjs real-time CRDT multi-user editing (`ENABLE_YJS_COLLABORATION`).

### 2.4 Toolchain & Budget Requirements
- **Node.js**: `>= 20.18.0`.
- **Vite**: `8.3.x` with Rolldown code-splitting.
- **Lean 4**: `v4.16.0` default runner, compatible with toolchain alignment range `v4.28`–`v4.35`.
- **Python**: `>= 3.11` with Pydantic v2 (`strict=True`, `extra='forbid'`, `frozen=True`).
- **Bundle Ceilings (ADR-017)**:
  - O1 Single chunk max: $\le 100.00\text{ KB gzip}$.
  - O2 Initial load: $\le 220.00\text{ KB gzip}$.
  - O3 Accounting discrepancy: $\le 0.50\text{ KB}$.
  - Total client JS: $\le 290.00\text{ KB gzip}$.

---

## 3. Consequences

### Positive
- Prevents split-brain certification bugs where UI components or client workers claim proof validity.
- Provides predictable capacity planning for client bundles and memory budgets.
- Unifies cross-language contracts with zero schema divergence.

### Negative
- Any third-party solver or numerical assistant must route through the server hybrid-adjudicator to obtain formal promotion to `formally-proven`.
