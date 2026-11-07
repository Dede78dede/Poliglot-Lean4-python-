# Phase 14.9.2 — Architectural Hardening, Fallback Contracts & Antipattern Remediation

This phase resolves open deferred technical debts (F5 Pyodide offline lockfile, F7 fallback degradation contracts), remediates loose-boolean verification antipatterns across secondary bridge services, eliminates Vite 8 CJS config warnings, and validates the system with Suite 172.

---

> [!IMPORTANT]
> **User Review & Critical Decisions**
> 
> - **Unified Epistemic Discipline**: Bridge modules (`axle-repair`, `leancert-bridge`, `provepy-bridge`, `pastalean-bridge`) will no longer report ungrounded boolean success flags without explicit typing; all proof results conform to the `ProofOutcome` discriminated union introduced in Phase 14.9.1.
> - **Zero Regression & Budget Invariant**: All additions must preserve the bundle budget constraints established in Phase 14.9.1 (main entry $\le 180\text{ KB}$, total client JS $\le 260\text{ KB}$, max chunk $\le 80\text{ KB}$).
> - **Testing Standard**: Addition of Test Suite 172 expands cumulative coverage from 171 suites (297 sub-tests) to 172 suites (303 sub-tests) at 100% pass rate.

---

## 1. Overview & Core Concept

### What It Delivers
Phase 14.9.2 addresses the remaining technical debt items identified in the pre-flight and Phase 14 review annexes before authorizing Phase 15. Specifically, it tackles:
1. **F7 Closure**: Formalizes `docs/architecture/fallback-contracts.md` specifying deterministic circuit breaker behaviors, degradation modes, and error recovery policies for all execution engines (Kimina, Hermetic Lake, Pyodide, and remote MCP bridges).
2. **F5 Closure**: Provisions `public/pyodide/pyodide-lock.json` containing cryptographic SHA-256 checksums and pinned versions for offline Pyodide execution, eliminating runtime drift and external network dependencies.
3. **Bridge Antipattern Remediation**: Replaces raw boolean `verified: true/false` antipatterns in secondary autocorrect/bridge engines with typed `ProofOutcome` and `ResultEnvelope<T>` contracts, preventing loose mock-verification propagation.
4. **Toolchain Modernization**: Cleanses `vitest.config.ts` of legacy CommonJS `__dirname` references in favor of native Vite 8 `import.meta.dirname` and removes the `@ts-nocheck` directive.
5. **Suite 172 & Reconciliation**: Adds 6 automated verification sub-tests asserting contract adherence and updates `CHANGELOG.md` [Unreleased] to retire F5 and F7 from the deferred backlog.

### Target Audience & Persona
- **Verification Engineers & Mathematicians**: Guaranteed deterministic proof status without heuristic false-positives.
- **System Architects & Security Auditors**: Zero unpinned dependencies, documented circuit breakers, and verifiable single-source truth certification.

---

## 2. User Experience & Visual Design

While Phase 14.9.2 is primarily architectural and epistemic, it directly enhances the developer and user experience in the IDE shell:
- **Degraded Status Clarity**: When a verification backend triggers a fallback or circuit breaker, the 3-zone `StatusBar` and diagnostic panels display an amber badge indicating `UNCONFIRMED_FALLBACK` rather than misleading failure or synthetic success.
- **Offline Indicator**: The Pyodide runtime initialization communicates lockfile verification status through the console and worker health monitors.
- **Deterministic Diagnostic Codes**: All engine degradation events emit RFC 9457 compliant error structures with actionable remediation steps.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Formal Fallback Contracts (Closing F7)
- **Chosen Approach**: Codify `docs/architecture/fallback-contracts.md` establishing explicit fallback state machines. When an upstream engine (Kimina or Lake) fails or times out, the system degrades to syntax-only validation with `kind: 'unavailable'` or `kind: 'preflight'`, strictly prohibiting `badge: 'SEAL_KERNEL_VERIFIED_TIER5'`.
- **Why**: Eliminates the "silent mock pass" antipattern where unavailable external dependencies default to synthetic passes.
- **Alternatives Considered**: In-process mock theorem synthesis (rejected as epistemically unsound).

### Decision 2: Pyodide Offline Lockfile (Closing F5)
- **Chosen Approach**: Generate a canonical `public/pyodide/pyodide-lock.json` specifying pinned wheel packages (`micropip`, `packaging`, `numpy`, `sympy`) and SHA-256 integrity hashes.
- **Why**: Protects air-gapped / offline deployments and ensures zero supply-chain drift in browser Python execution.
- **Alternatives Considered**: Dynamic CDN fetching at runtime (rejected due to offline unavailability and non-reproducible builds).

### Decision 3: Secondary Bridge Typing & Antipattern Removal
- **Chosen Approach**: Align secondary engines (`axle-repair`, `leancert-bridge`, `provepy-bridge`, `pastalean-bridge`) with `ProofOutcome` or explicit result types, ensuring they only emit `status: 'completed'` or `kind: 'transport'`, never claiming kernel verification.
- **Why**: Enforces ADR 015 Section 5 rule: `hybrid-adjudicator.ts:264` is the sole authorized certifier.
- **Alternatives Considered**: Keeping untyped booleans (rejected as an antipattern that obscures certification boundaries).

### Decision 4: Vitest & Vite 8 Configuration Purity
- **Chosen Approach**: Update `vitest.config.ts` to use `import.meta.dirname` and proper TypeScript typing, removing `// @ts-nocheck`.
- **Why**: Eliminates Vite 8 native configuration deprecation warnings during test runs and aligns with ESM standards.

---

## 4. Technical Architecture & Data Strategy

### System Flow & Circuit Breaker Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Polyglot Verification Dispatch                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │   Kimina Client Proxy │             │   Hermetic Lake Runner│
        │   (/api/v1/lean)      │             │   (/api/v1/projects)  │
        └───────────┬───────────┘             └───────────┬───────────┘
                    │                                     │
                    ▼                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │           Hybrid Consensus Adjudicator (ADR 015)            │
        │      (Single Certifying Authority for Kernel Seals)         │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
     [DUAL CONSENSUS]          [CIRCUIT BREAKER]         [DEGRADED FALLBACK]
    Both engines agree;       Timeout / Downstream       Offline / Syntax-only
    Axioms in allowlist       Connection dropped         validation
            │                          │                          │
            ▼                          ▼                          ▼
    `ProofOutcome`:            `ProofOutcome`:            `ProofOutcome`:
       certified                  unavailable                preflight
    SEAL_KERNEL_VERIFIED_TIER5    No seal emitted            No seal emitted
```

### Proposed Deliverables & File Changes

| Category | Target Path | Action | Description |
|:---|:---|:---:|:---|
| **Documentation (F7)** | `docs/architecture/fallback-contracts.md` | Create | Architecture specification for engine circuit breakers, fallback tiers, and RFC 9457 error contracts. |
| **Integrity Asset (F5)** | `public/pyodide/pyodide-lock.json` | Create | Pinned packages, wheel names, and SHA-256 hashes for offline Pyodide execution. |
| **Toolchain Config** | `vitest.config.ts` | Refactor | Replace `__dirname` with `import.meta.dirname`, remove `// @ts-nocheck`. |
| **Bridge Hardening** | `server/src/services/autocorrect/axle-repair.ts` | Refactor | Clarify repair outcome types and decouple from synthetic verification assertions. |
| **Bridge Hardening** | `server/src/services/leancert/leancert-bridge.ts` | Refactor | Enforce numerical bounds outcome types without ambiguous `verified: true` flags. |
| **Bridge Hardening** | `server/src/services/provepy/provepy-bridge.ts` | Refactor | Type Python proof translation outcome with `ProofOutcome`. |
| **Verification Suite** | `tests/phase-14/suite-172-fallback-contracts-and-integrity.test.ts` | Create | 6 sub-tests validating F5 lockfile, F7 documentation, config purity, and fallback safety. |
| **Cumulative Runner** | `scripts/verify-all.ts` | Update | Mount `runSuite172`, updating total count to 172 suites / 303 sub-tests. |
| **Release & History** | `CHANGELOG.md` | Update | Move F5 and F7 from Deferred Items to Phase 14.9.2 Completed; declare 172 suites / 303 sub-tests. |
| **Consolidation Summary** | `reports/phase-14.9.2-summary.md` | Create | Detailed audit and sign-off report for Phase 14.9.2. |

---

## 5. Verification Plan

### Automated Test Assertions (Suite 172)
1. **Sub-test 172.1 (F7 Specification)**: Verify `docs/architecture/fallback-contracts.md` exists, defines the 4 fallback tiers (`FULL_DUAL`, `SINGLE_ENGINE_DEGRADED`, `SYNTAX_PREFLIGHT`, `UNAVAILABLE`), and codifies RFC 9457 error mappings.
2. **Sub-test 172.2 (F5 Lockfile Integrity)**: Verify `public/pyodide/pyodide-lock.json` exists, is valid JSON, contains mandatory keys (`version`, `packages`, `sha256`), and has non-empty SHA-256 checksums.
3. **Sub-test 172.3 (Vite 8 ESM Purity)**: Verify `vitest.config.ts` does not contain `__dirname` and contains `import.meta.dirname`.
4. **Sub-test 172.4 (Single Certifier Invariant)**: Assert that secondary bridges (`axle-repair`, `leancert-bridge`, `provepy-bridge`, `pastalean-bridge`) do not emit `SEAL_KERNEL_VERIFIED_TIER5`.
5. **Sub-test 172.5 (Fallback Outcome Typing)**: Assert that degraded circuit breaker responses strictly return `kind: 'unavailable'` or `kind: 'preflight'` with zero kernel seals.
6. **Sub-test 172.6 (Cumulative Runner Coverage)**: Validate that `verify-all.ts` executes all 172 suites / 303 sub-tests with 100% pass rate.

### Static Analysis & Toolchain Gates
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `npm run test` (`tsx scripts/verify-all.ts`): 172 suites / 303 sub-tests, 100% PASS.
- `npm run build`: Clean production build under Rolldown/Vite 8.
