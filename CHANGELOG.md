# Changelog

All notable changes to Polyglot Code Studio will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Python 3.11 Runtime Parity (PEP 484/585/604)**: Refactored `server/src/services/leancert/leancert_wrapper.py` from PEP 695 syntax (`type MethodKind` and generic function `[T]`) to `TypeAlias` and `TypeVar("T", int, float)`, ensuring clean execution across Python 3.10 and 3.11 without syntax errors.
- **Frontend Directive Remediation**: Removed non-standard module-level `"use memo"` directive in `src/App.tsx`, eliminating bundler compilation warnings in Rolldown / Vite.
- **Legacy Script Archival & PEP 257**: Moved temporary generator scripts `fix_suite103.py` and `generate_suites.py` to `scripts/archive/`, enriched with PEP 257 docstrings and `if __name__ == "__main__":` entry points; updated `pyproject.toml` tool overrides to exclude archive paths from strict audits.
- **WAI-ARIA Security Feedback**: Added `src/shared/ui/security-alert.tsx` and updated `error-boundary.tsx` to enforce `role="alert"` and `aria-live="assertive"` for instantaneous screen-reader announcement of rate-limiting and authorization events.

### Added
- **Autonomous Python Contract Runner**: Created `scripts/verify-python-contracts.py` using Python's standard library `unittest` (with fallback-safe Pydantic execution), validating AST compilation and contract parity without external pytest dependencies.
- **Suite 165 (Python Runtime Parity & Phase 14 Hardening)**: 5 sub-tests verifying Python 3.11 subprocess execution, unittest runner execution, archive script PEP 257 structure, directive cleanliness, and accessible ARIA live alert attributes.
- **Cumulative Test Verification**: Expanded cumulative test suite to 165 suites / 260 sub-tests at 100% pass rate.

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
