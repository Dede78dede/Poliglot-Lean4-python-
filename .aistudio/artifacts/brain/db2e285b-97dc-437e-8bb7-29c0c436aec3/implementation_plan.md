# Phase 14.9.9.2: Verification Authority Containment, Runtime Prerequisite Repair, and Search Infrastructure

This plan establishes the comprehensive engineering execution roadmap for Phase 14.9.9.2 of the Polyglot Code Studio (`Dede78dede/Poliglot-Lean4-python-`). It addresses three stop-ship P0 verification defects, repairs broken runtime prerequisites (Lake runner build handler, toolchain resolution, deployment coherence), establishes CI execution parity across all 194 test suites, aligns bundle budgets to ADR-017 with blocking gates, implements an isolated developer search and code index foundation, and produces an honest codebase reality map.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The three core architecture choices have been confirmed and incorporated into the implementation plan as follows:

- **Confirmed Decision 1 (Runtime Prerequisite — Defect C3)**: Implement a minimal real Lake runner HTTP handler in `docker/lean-runner/` responding to `POST /build`. The handler spawns `lake build`, enforces execution timeouts, captures standard output, standard error, and explicit integer exit codes, preventing `LakeProcessExecutionError` crashes while guaranteeing authentic execution evidence.
- **Confirmed Decision 2 (Static Code Index Strategy — §5.3)**: Implement a project-owned generator under `tools/codeindex/` emitting deterministic, line-oriented JSON/JSONL index artifacts (`index.json`, `files.jsonl`, `symbols.jsonl`, `texts.jsonl`) with content-hashed freshness checking. This eliminates third-party npm supply-chain exposure from unverified upstream packages.
- **Confirmed Decision 3 (Token Store Hygiene — G-H1)**: Rotate all 34 token records in `data/tokens.json` via the supported CLI tool, commit a sanitized synthetic template, and add the live credential file to `.gitignore` so public repositories store zero unrotated or test tokens.

---

## 1. Overview & Core Concept

- **What It Does**: Hardens the formal verification boundary so that proof seals (`verified: true`, `SEAL_KERNEL_VERIFIED_TIER5`) can only ever be minted by server-orchestrated, dual-engine execution (Kimina and Lake), rejecting all client-forged evidence and eliminating synthetic shortcuts. In parallel, it repairs runtime infrastructure prerequisites so Lean builds can genuinely execute, brings developer search and context-packing tools into strictly isolated local workspaces, and establishes complete CI testing and bundle budget enforcement.
- **Target Audience / Persona**: Formal verification engineers, mathematicians, and systems developers relying on machine-checked Lean 4 theorem proving who require infallible epistemic guarantees and zero false-positive verifications.
- **Key Value**: Guarantees epistemic integrity: no heuristic string matching, missing exit code, or client-supplied payload can forge a mathematical proof certification.

---

## 2. User Experience & Visual Design

Polyglot Code Studio features a high-density, developer-focused dual-theme IDE and verification dashboard engineered under the principles of WCAG AA compliance and zero-pill typographic discipline.

### Key User Flows
1. **Verification Request & Stream**: The user enters Lean 4 source into the editor. Preflight syntax analysis runs client-side to catch syntax errors and unproven terms without claiming kernel certification. The server orchestrates dual-engine verification and streams back genuine engine evidence.
2. **Epistemic Result Presentation**: When verification completes, the interface renders explicit status badges:
   - Certified: `accentSuccess` green with verification seal metadata and verified axioms.
   - Numeric Bounds: `NUMERIC_CERTIFICATE_UNVERIFIED` amber indication distinguishing numerical bounds from kernel proofs.
   - Syntax/Unavailable: Quiet muted gray indicating preflight-only validation without false claims.
3. **Developer Search & Context Packing (CLI/Local)**: Developers navigate codebase structure via `.codeindex/` and package context for LLM review via `tools/context/pack.sh`, with guaranteed exclusion from production builds.

### Visual Identity & Theme Tokens
- **Canvas & Surfaces**: Dominant dark canvas (`#0d1117`), structural panels (`#161b22`), and popover overlays (`#21262d`). Dual-theme light mode is supported via semantic token pairs.
- **Typography**: Clean monospace (`JetBrains Mono`, `tabular-nums`) for code, mathematical terms, and diagnostic metrics; crisp sans (`Plus Jakarta Sans`) for navigation and structural labels.
- **Color Accent Discipline (60-30-10)**: 60% neutral canvas, 30% structural panels/hairline borders (`#30363d`), 10% semantic status accents (`#3fb950` success, `#d29922` warning, `#f85149` error).
- **Anti-Slop Restraint**: No fake telemetry tickers, no arbitrary percentage scoreboards, no floating pill tags, no code-comment titles. All metadata is presented as clean, unboxed text separated by subtle typographic bullets (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removal of Synchronous `adjudicate()` Shortcut (Defect A)**
  - *Chosen Approach*: Reduce `HybridAdjudicator.adjudicate()` to return a typed non-certifying outcome (`verified: false`, `seal: null`), and update calling MCP adapters to reflect unconfirmed state. All Tier 5 certifications must route through `adjudicateHybridConsensus()`.
  - *Why*: Eliminates the vulnerability where substring checks and missing exit codes synthesize formal proof seals.
  - *Alternatives Considered*: Retaining the method for local testing was rejected because it violates Invariant 1 (epistemic authority).
- **Decision 2: Elimination of Caller-Supplied Evidence in `/api/v1/lean/consensus` (Defect B)**
  - *Chosen Approach*: Remove `kiminaEvidence` and `lakeEvidence` from the consensus request schema. The server must initiate, observe, and validate engine execution directly.
  - *Why*: Prevents untrusted HTTP clients from minting verification seals with arbitrary JSON payloads.
- **Decision 3: Isolated `tools/` Architecture Barrier**
  - *Chosen Approach*: All developer search (`ogrep`, `semcode`), static indexing (`codeindex`), and context packing (`Repomix`) reside under `tools/` with strict `.dependency-cruiser.cjs` rules banning imports from `src/` and `server/src/`.
  - *Why*: Guarantees developer utilities never bloat client bundles, alter production runtime, or expose unauthenticated endpoints.

---

## 4. Technical Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTTP / MCP Client Entry                         │
│   (Submits Lean 4 source code & request intent; NO forged evidence)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/v1/lean/consensus
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Server-Side Consensus Route                       │
│    - Validates source digest using canonical SHA-256                   │
│    - Binds execution to unique server-generated requestId              │
│    - Rejects client-supplied engine evidence                           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
     ┌────────────────────────────┐    ┌───────────────────────────┐
     │   Kimina Execution Proxy   │    │    Lake Project Runner    │
     │  - Real HTTP / Client      │    │  - Resolved Toolchain     │
     │  - Exit code validation    │    │  - POST /build to Runner  │
     │  - Axiom extraction        │    │  - Integer exitCode check │
     └──────────────┬─────────────┘    └─────────────┬─────────────┘
                    │ KiminaEvidence                 │ LakeEvidence
                    └───────────────┬────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Hybrid Adjudicator (adjudicateHybridConsensus)            │
│  - Sole Epistemic Authority (hybrid-adjudicator.ts:264)                │
│  - 5-Term Formula: exitCode===0 ∧ proof_obligation ∧ ¬sorry ∧ ¬error  │
│  - Dual-Engine Matching: sourceDigest, requestId, environment, policy  │
│  - Issues: confirmed_valid ⟺ verified: true, SEAL_KERNEL_VERIFIED_TIER5│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Client Transport & UI Badging Layer                    │
│    - Transports server verdict verbatim                                │
│    - Zero secondary seal synthesis or client-side overrides            │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│               ISOLATED DEVELOPER TOOLING BARRIER (tools/)               │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│   │   tools/search   │   │ tools/codeindex  │   │  tools/context   │   │
│   │ (ogrep, semcode) │   │ (owned generator)│   │ (Repomix wrapper)│   │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘   │
│       ▲ STRICT DEPENDENCY-CRUISER BAN: src/** & server/** CANNOT IMPORT │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Sequential Execution Windows (Windows 0–4)

### Window 0: Stop-Ship Verification Authority Containment & Runtime Prerequisite Repair
- **Remediate Defect A (`hybrid-adjudicator.ts`)**:
  - Deprecate or replace `HybridAdjudicator.adjudicate()` so it never issues `verified: true` or `SEAL_KERNEL_VERIFIED_TIER5`. Return typed `unconfirmed` outcome with `verified: false` and `seal: null`.
  - Replace fake digest `Buffer.from(source).toString('hex').slice(0, 32)` with cryptographic `crypto.createHash('sha256').update(source).digest('hex')`.
  - Update `mcp-server.ts` and `lean-lsp-mcp-client.ts` to consume the non-certifying outcome.
- **Remediate Defect B (`server/src/routes/lean.ts`)**:
  - Remove `kiminaEvidence` and `lakeEvidence` from `ConsensusRequestSchema`.
  - Prohibit client evidence injection; require server-side dual-engine resolution.
  - Return HTTP 400 if client attempts to pass evidence fields.
- **Remediate Defect C1 (`server/src/services/lean-project-runner.ts`)**:
  - Remove `const current = 'v4.8.0'` hardcode. Dynamically resolve toolchains against `AVAILABLE_LEAN_TOOLCHAINS` (v4.28.0 to v4.35.0-rc4) from `lean-toolchain` or container capability.
- **Remediate Defect C2 (`docker-compose.yml`)**:
  - Provide a valid build context/Dockerfile for `studio` service and reconcile the `kimina-backend` service definition.
- **Remediate Defect C3 (`docker/lean-runner/Dockerfile`)**:
  - Implement a minimal real HTTP handler in the runner container that processes `POST /build`, spawns `lake build`, captures exit code, stdout, stderr, and returns structured JSON with an explicit integer `exitCode`.
- **Negative & Integration Tests**:
  - Test forged evidence injection rejection.
  - Test missing/undefined exit code failure (`exitCode === undefined` fails closed).
  - Test toolchain mismatch detection without spurious v4.8.0 failures.
  - Run `npm run arch:check-epistemic-authority` and `./scripts/seal-integrity-sweep.sh` (0 violations).

### Window 1 Part A: Baseline, CI, Flags, Rate Limits, Redaction, and Repository Hygiene
- **Establish Baseline & CI Execution Parity**:
  - Update `.github/workflows/ci.yml` to execute both `scripts/verify-all.ts` (suites 134–172) and `scripts/verify-extended.ts` (suites 173–194).
  - Transform the CI bundle check into a blocking gate reading fresh build metrics.
- **Feature Flag Audit Integration Test (Suite 192)**:
  - Implement `tests/phase-14/suite-192-feature-flag-audit.test.ts` validating all 62 registered flags dynamically against `feature-flag-registry.ts` and `reports/feature-flag-audit.md`.
- **Ratify Flag TTL Policy (ADR-019)**:
  - Create `docs/adr/ADR-019-feature-flag-ttl-policy.md` ratifying grandfathering of existing flags to 2027-12-31 and 180-day max TTL for new flags.
- **Deterministic Rate-Limit Burst Tests (Suite 193)**:
  - Implement `tests/phase-14/suite-193-rate-limiting.test.ts` testing the actual configured limiters (100 req/60s general API, 30 req/60s MCP) using deterministic fake clocks.
- **Recursive Redaction in Logging & Telemetry (Suite 194)**:
  - Harden `server/src/services/telemetry/security-events.ts` to recursively redact tokens of any length, Authorization headers, Cookies, and nested secret fields.
  - Implement `tests/phase-14/suite-194-redaction-logging.test.ts`.
- **Repository Hygiene (G-H1)**:
  - Delete empty root files: `subfolder`, `theorem`, `file.lean`.
  - Rotate tokens in `data/tokens.json`, commit template, and gitignore live file.
  - Update `README.md` §7 (test suite count) and §8 (authentic bridge classification).
  - Reconcile port maps across `health-service.ts`, `docker-compose.yml`, and Kimina proxy.
  - Update `.gitignore` with `.codeindex/`, `.ogrep/`, and `reports/context/`.
- **Contract Export Repair (G-H2)**:
  - Fix `json-schema-exporter.ts` so `npm run contracts:generate` outputs populated schemas in `schemas/contracts.json`.
  - Pass `npm run contracts:check`.

### Window 1 Part B: Design System, Bundle Budget, Verification Facade, Document Governance
- **Design System Audit & Repair (G-P13)**:
  - Audit `src/theme/tokens.ts` and `docs/architecture/design-system.md` against real component paths and tested WCAG AA contrast values.
- **Bundle Measurement Alignment (G-P14)**:
  - Align `scripts/measure-bundle.ts` with ADR-017 ratified caps:
    - O1: Single JS chunk $\le$ 100.00 KB.
    - O2: Initial-load assets $\le$ 220.00 KB.
    - O3: Discrepancy $\le$ 0.50 KB.
    - Total JS gzip $\le$ 290.00 KB.
    - Main entry gzip $\le$ 180.00 KB.
  - Generate fresh report at `reports/bundle-post-14.9.9.2.json`.
- **Verification Facade Audit (G-P17)**:
  - Document that `src/services/verification/verification-formula.ts` is a syntax-only preflight facade and preserve backwards compatibility for existing imports.
- **Document Source-of-Truth Allocation (G-P18)**:
  - Update `docs/INDEX.md` formalizing the rule: `docs/adr/` owns decision history, `docs/architecture/` owns current operational state, `reports/` owns dated evidence snapshots.

### Window 2: Isolated Developer Search Foundation
- **Hard Architectural Boundary**:
  - Create directories: `tools/search/`, `tools/codeindex/`, `tools/context/`.
  - Update `.dependency-cruiser.cjs` with a strict blocking rule forbidding `src/**` and `server/src/**` from importing `tools/**`.
- **Allowlist & MCP Hardening**:
  - Create `tools/search/allowlist.json` registering approved tool identities, schemas, description hashes, and permissions.
  - Verify `ogrep` and isolate under local virtual environment; isolate `semcode` locally with read-only tokens and localhost binding.
  - Ensure zero auto-discovery in `server.ts`.

### Window 3: Static Code Index & Honest Codebase Map
- **Project-Owned Code Index Generator**:
  - Implement `tools/codeindex/generate.ts` producing `index.json`, `files.jsonl`, `symbols.jsonl`, and `texts.jsonl`.
  - Implement content-hashed freshness checker `tools/codeindex/check.sh`.
- **Honest Codebase Map (`docs/architecture/codebase-map.md`)**:
  - Document the verification architecture boundary.
  - Catalogue dormant vs wired UI components (Monaco `EditorPane`, `WorkspaceGrid`, `FemevDrawer` dormant; `App.tsx` live textarea).
  - Document authentic HTTP bridges vs local mock heuristics.
  - Document mounted vs unmounted routes and testing realities.

### Window 4: Context Packing, Documentation Index & Final Sign-Off
- **Repomix Context Packing Wrapper**:
  - Create `tools/context/pack.sh` pinning Repomix with Secretlint security checks enabled, writing exclusively to gitignored `reports/context/`.
- **Documentation Synchronization**:
  - Synchronize `docs/INDEX.md`, `README.md`, and `CHANGELOG.md` under `[Unreleased]`.
  - Maintain `package.json` version at `2.3.0`.
- **Final Sign-Off Report**:
  - Compile `reports/14.9.9.2-final-signoff.md` documenting all gate criteria, test counts, bundle sizes, seal integrity passes, and risk registers.

---

## 6. Verification & Acceptance Criteria

```bash
# Baseline & Code Quality
npm run lint
npx tsc --noEmit
npm run arch:check
npm run arch:check-epistemic-authority

# Seal Integrity Sweep
./scripts/seal-integrity-sweep.sh

# Contract Schema Check
npm run contracts:check

# Strict Flag Expiry
npm run check-flag-expiry:strict

# Complete Verification Suites (194 suites total)
npm test
npm run test:extended

# Build & ADR-017 Bundle Gate
npm run build
npm run bundle:measure

# Developer Tooling Isolation
grep -rn "from.*tools/" src/ server/src/ --include="*.ts" --include="*.tsx" && echo "VIOLATION" || echo "OK"
bash tools/codeindex/check.sh
```
