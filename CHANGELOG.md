# Changelog

All notable changes to Polyglot Code Studio will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 14.9.9.2 — Verification Authority Containment & Prerequisite Repair
- **Verification Authority Containment (P0 Stop-Ship)**:
  - Contained Defect A: Excised synthetic synchronous certification from `HybridAdjudicator.adjudicate()`; all synchronous paths fail closed as `unconfirmed` with `verified: false` and null seal. Replaced truncated hex digest with standard SHA-256.
  - Contained Defect B: Hardened `/api/v1/lean/consensus` route; client-supplied `kiminaEvidence` and `lakeEvidence` fields are strictly forbidden by Invariant 2 and rejected with HTTP 400.
  - Remediated Defect C1: Eliminated hardcoded `v4.8.0` in `lean-project-runner.ts`; toolchain resolution now dynamically resolves against `AVAILABLE_LEAN_TOOLCHAINS`.
  - Remediated Defect C2: Created root `Dockerfile` for `studio` service and defined `kimina-backend` in `docker-compose.yml`.
  - Remediated Defect C3: Implemented minimal real HTTP Lake build runner in `docker/lean-runner/server.js` handling `POST /build` with integer `exitCode`.
- **Governance & Hygiene**:
  - G-H1: Removed empty committed files (`subfolder`, `theorem`, `file.lean`); rotated tokens, committed `data/tokens.template.json`, and added live store to `.gitignore`. Updated `README.md` §7 and §8.
  - G-H2: Repaired `json-schema-exporter.ts` and `export-schemas.ts` to emit populated JSON schemas in `schemas/contracts.json`.
  - G-D1 & ADR-019: Ratified `ADR-019-feature-flag-ttl-policy.md` grandfathering existing flags to 2027-12-31 with 180-day max TTL for new flags; added Suite 192 (5 sub-tests).
  - G-P11: Implemented deterministic rate-limiting burst tests with clock injection in Suite 193 (5 sub-tests).
  - G-P12: Implemented recursive redaction of credentials, cookies, and query strings in `security-events.ts`; added Suite 194 (5 sub-tests).
  - Active baseline reached: **61 suites / 392 sub-tests (100% pass rate)**.

## [2.3.0] - Phase 14.9.9.1 (2026-11-08)

### Added
- **ADR-016 (Phase 15 Scope, Epistemic Guarantees & Activation Waves)**: Formally codified roadmap from 172-suite baseline to 195-suite Phase 15 target, bundle ceilings (O1 $\le$ 100 KB, O2 $\le$ 220 KB, total $\le$ 290 KB), and activation waves (W1–W4).
- **ADR-018 (Removal of Client Seal Path)**: Documented excision of `certifyWithKernel` from client preflight syntax guard.
- **Feature Flag Governance (62/62 Flags Annotated)**: Codified squad ownership, fail-closed behaviors (`503`, `404`, `noop`), and expiry horizons across all 62 registered feature flags; created `reports/feature-flag-audit.md` and `docs/architecture/feature-flags.md`.
- **Master Indexes**: Created `docs/INDEX.md` and `reports/INDEX.md` indexing all architecture decisions, specifications, and audit reports.
- **Property-Based Contract Testing**: Implemented Suite 190 with `fast-check` executing 1000 randomized iterations across 4 contract properties.
- **Accessibility & Design Tokens**: Implemented Suite 191 validating WCAG 2.2 AA contrast rules, minimum 44px touch hitboxes, and `axe-core` rule engine integration.

### Changed & Hardened
- **Sole Epistemic Authority Invariant**: `server/src/services/verification/hybrid-adjudicator.ts:264` is verified as the exclusive site authorized to emit `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5`.
- **Excision of `certifyWithKernel`**: Removed `certifyWithKernel` and direct server formula imports from `src/services/verification/preflight-syntax-guard.ts` and `verification-formula.ts`.
- **ProofOutcome Parity**: Added `NUMERIC_CERTIFICATE_UNVERIFIED` tier and `numeric-certificate` variant to `ProofOutcome`; updated Zod and Pydantic v2 schemas with `extra='forbid'`, `Discriminator('ok')`, and `Discriminator('kind')`.
- **FEMEV & LeanCert Adaptation**: Distinguish numerical bound computation (`numericStatus: 'computed'`, `NUMERIC_CERTIFICATE_UNVERIFIED`) from kernel formal verification, preventing false verification claims.
- **Supply Chain Security**: Pinned all 23 production dependencies in `package.json` to exact versions; codified `npm ci --ignore-scripts` in CI workflow.

### Phase 14.9.1 Reconciliation (FIX-A & FIX-B)
- **FIX-A: Bundle Reduction to 216.92 KB Total JS Gzip**: Resolved development runtime leak by defining `'process.env.NODE_ENV': JSON.stringify('production')` in `vite.config.ts`, added native Vite 8 / Rolldown `codeSplitting.groups` with priority hierarchy, applied route-level `React.lazy` + `Suspense`, and converted main entry to direct Lucide imports. Total JS gzip dropped from 274.63 KB to **216.92 KB** (budget ≤ 260.00 KB, +43.08 KB margin) and main entry dropped to **31.96 KB** (budget ≤ 180.00 KB). Validated via Suite 170 (6 sub-tests).
- **FIX-B: Single Certifier Epistemic Authority**: Introduced `ProofOutcome` discriminated union (`certified`, `transport`, `preflight`, `unavailable`, `metadata`). Refactored `lean-lsp-mcp-client.ts` (delegates to `hybridAdjudicator`), `lean-lsp-client.ts` (returns `unavailable: client_stub`), and `mcp-server.ts` (gates `kernelSeal` strictly behind adjudicator). Codified Epistemic Authority Matrix in ADR 015 Section 5. Validated via Suite 171 (6 sub-tests).
- **Cumulative Test Suite Expanded**: 171 test suites / 297 cumulative sub-tests with 100% pass rate.

### Phase 14.9.2 Architectural Hardening, Fallback Contracts & Antipattern Remediation
- **F7 Closed — Fallback Contracts & Circuit Breaker Architecture**: Codified `docs/architecture/fallback-contracts.md` defining 4 operational tiers (`FULL_DUAL`, `SINGLE_ENGINE_DEGRADED`, `SYNTAX_PREFLIGHT`, `UNAVAILABLE`), explicit failure thresholds and probe windows, and RFC 9457 error mappings (`FALLBACK_DEGRADED`).
- **F5 Closed — Pyodide Offline Integrity Lockfile**: Generated `public/pyodide/pyodide-lock.json` with pinned packages (`micropip`, `packaging`, `numpy`, `sympy`, `mpmath`) and SHA-256 cryptographic hashes for air-gapped / offline deterministic browser execution.
- **Bridge Antipattern Remediation**: Refactored `server/src/services/autocorrect/axle-repair.ts` to strictly return `verified: false`, eliminating heuristic mock verification from code rewriters. Confirmed auxiliary bridges (`leancert`, `provepy`, `pastalean`) emit 0 kernel seals.
- **Toolchain Modernization**: Cleansed `vitest.config.ts` replacing CommonJS `__dirname` with standard Vite 8 `import.meta.dirname` and removed `@ts-nocheck` directive.
- **Suite 172 Added**: Introduced 6 automated sub-tests in `tests/phase-14/suite-172-fallback-contracts-and-integrity.test.ts`. Cumulative test suite expanded to **172 test suites / 303 sub-tests with 100% pass rate**.

### Backlog Status
- Zero blocking technical debts or deferred items remaining in pre-Phase 15 backlog (F5 and F7 closed).

## [2.2.0] - 2026-11-05

### Added
- **Canonical Verification Protocol (`polyglot.verification.v1`) & ADR 015**: Codified immutable verification dispatch envelope, dual execution pathways (interactive Kimina snippet vs isolated Lake runner), and transitive foundational axiom allowlist (`propext`, `Classical.choice`, `Quot.sound`).
- **Hybrid Consensus Adjudication Engine**: Implemented `server/src/services/verification/hybrid-adjudicator.ts` with strict comparability predicates (source digest, context digest, toolchain digest) and binding consensus decision matrix (`confirmed_valid`, `confirmed_invalid`, `unconfirmed`).
- **Full Modular IDE Workspace Shell**: Assembled comprehensive workspace in `src/App.tsx` featuring `EditorTabsStore` with LIFO reopen stack (max 10 entries), split-view toggle, symbol `Breadcrumbs`, Ctrl+K `CommandPalette`, top-left `NavigationDrawer`, and live 3-zone `StatusBar` (`statusBarRegistry`).
- **Test Suites 166-169**:
  - Suite 166: Hybrid consensus adjudication, axiom policy violations, and process error types (7 sub-tests).
  - Suite 167: Worker request-ID correlation, concurrency duplicate guards, and security boundaries (6 sub-tests).
  - Suite 168: Modular IDE workspace shell, tab navigation, keyboard shortcuts, and WCAG 2.2 AA accessibility (6 sub-tests).
  - Suite 169: Mobile touch usability, top-left navigation drawer dialog, zero magic strings, and Alt+1..6 view switching (6 sub-tests).
- **Expanded Cumulative Test Suite**: 169 test suites / 285 sub-tests achieving 100% pass rate.

### Fixed & Epistemic Hardening
- **F-01 Remediation**: Eliminated client-side `setTimeout(..., 400)` mock verification and synthetic `verified: true` emissions in `src/App.tsx`; connected execution dispatch through `executionStore` and live backend APIs.
- **F-02 Remediation**: Eliminated heuristic string pattern matching (`goal.includes`) and fake kernel seals (`DUPER_KERNEL_SEAL_...`, `AESOP_KERNEL_SEAL_...`, `PANTOGRAPH_KERNEL_SEAL_...`) in `proof-coordinator.ts`.
- **F-04, F-07, F-11 Remediation**: Mounted canonical `/api/v1/lean` router (`KiminaClientProxy`) and `/api/v1/projects` router (`LeanProjectRunner`) on full-stack Express server; added `/healthz` and `/readyz` probes.
- **Kimina Contract Adapter**: Pinned `/api/check` upstream contract with UUID correlation ID checking, structured diagnostics, and `sorries` extraction.
- **Lake Runner Process Rigor**: Refactored `LeanProjectRunner` to require explicit integer process exit code, failing closed on missing exit codes.
- **Production Bundle Optimization**: Dynamic `React.lazy()` code-splitting for non-primary panels keeping initial main entry chunk gzip at 172.24 KB (well under the 180.00 KB budget).

## [2.1.0] - 2026-11-03

### Added
- **Unified Result Contracts (`ResultEnvelope<T>`)**: Strongly typed discriminated union on `ok: boolean` with RFC 9457 `SerializedBridgeError` across all 18 bridge services.
- **Contract Parity Automation**: Native `exportJsonSchema()` injecting `discriminator: { propertyName }` on `ZodDiscriminatedUnion` and synchronized Pydantic v2 boundary models enforcing `extra='forbid'`, `strict=True`, `Discriminator('ok')`.
- **Native Interactive Notebook**: In-memory persistent Python kernel (`notebook.worker.ts`) maintaining globals across cells without termination on timeout, with Jupyter `.ipynb` (nbformat v4) and `.polyglot-notebook` serialization.
- **Dynamic Config Discovery & Recommendation Manager**: 3-signal hardware/usage/benchmark adaptive proposal engine generating at most 3 non-intrusive recommendations, strictly requiring `userConfirmed: true`, with 90-day dismissal cooldown.
- **Verification Hardening & Dense Embeddings**: 384-dimensional dense embeddings (`all-MiniLM-L6-v2`) in proof retrieval memory with cosine similarity, complete archive SHA-256 roundtrip, and append-only hash-chain tamper-evidence.
- **Structural AST Diff Engine**: Lean 4 AST declaration parser distinguishing signature modifications (`epistemic_invalidation`) from proof-only alterations (`non_breaking`).
- **Unified Cross-Artifact Search Engine**: Sub-millisecond `MiniSearch` indexing 5 corpora (files, evidence, proofs, chat, notebooks) with snippet generation and match highlights.
- **Token Vault & Security Middleware**: Dedicated Token Vault (`data/tokens.json`) with opaque 32-byte base64 token validation, in-memory sliding-window rate limiting (100 req/min general, 30 req/min MCP), and CORS origin enforcement.
- **Security Observability**: Standalone security event logger emitting `auth_denied`, `rate_limited`, and `bypass_attempt` without leaking raw token values in logs.

### Changed
- **SemVer Justification**: Bumped minor version from `2.0.0` to `2.1.0` reflecting the addition of non-breaking features (Phase 13 ResultEnvelope, Notebook, Config Discovery, Diff, and Search) while maintaining strict backward-compatibility across all verification contracts.
- Consolidated cumulative test runner to execute 161 test suites (235 cumulative sub-tests) with 100% pass rate.

### Security
- Added CI test bypass guard restricting `X-Polyglot-Test-Secret` strictly to `NODE_ENV === "test"` and `ALLOW_CI_BYPASS === "true"`. Attempts in production return HTTP 401 and log a security alert.
- Feature-gated 8 optional engines (`LeanBeam`, `Mathesis`, `LP2`, `TreeThink`, `OTel Browser`, `OTel Node`, `Yjs`, `Paperproof`) returning HTTP 503 `FEATURE_DISABLED` when off.

## [2.0.0] - 2026-10-15

### Added
- Multi-kernel verification engine supporting 6-kernel paranoid pipeline, Tier 5 cold storage proof cache, and Archon Horizonal blueprint DAG.
- Lungo multi-language export runner and LeanCert numerical bounds checker.

## [1.1.0] - 2026-09-01

### Added
- Dual-runtime browser-based code studio for Python 3.14 and Lean 4.
- Monaco editor integration with synchronized diagnostic highlights and terminal emulator.
