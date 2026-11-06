# Changelog

All notable changes to Polyglot Code Studio will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-05

### Added
- **Canonical Verification Protocol (`polyglot.verification.v1`) & ADR 015**: Codified immutable verification dispatch envelope, dual execution pathways (interactive Kimina snippet vs isolated Lake runner), and transitive foundational axiom allowlist (`propext`, `Classical.choice`, `Quot.sound`).
- **Hybrid Consensus Adjudication Engine**: Implemented `server/src/services/verification/hybrid-adjudicator.ts` with strict comparability predicates (source digest, context digest, toolchain digest) and binding consensus decision matrix (`confirmed_valid`, `confirmed_invalid`, `unconfirmed`).
- **Full Modular IDE Workspace Shell**: Assembled comprehensive workspace in `src/App.tsx` featuring `EditorTabsStore` with LIFO reopen stack (max 10 entries), split-view toggle, symbol `Breadcrumbs`, Ctrl+K `CommandPalette`, and live 3-zone `StatusBar` (`statusBarRegistry`).
- **Test Suites 166-168**:
  - Suite 166: Hybrid consensus adjudication, axiom policy violations, and process error types (7 sub-tests).
  - Suite 167: Worker request-ID correlation, concurrency duplicate guards, and security boundaries (6 sub-tests).
  - Suite 168: Modular IDE workspace shell, tab navigation, keyboard shortcuts, and WCAG 2.2 AA accessibility (6 sub-tests).
- **Expanded Cumulative Test Suite**: 168 test suites / 279 sub-tests achieving 100% pass rate.

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
