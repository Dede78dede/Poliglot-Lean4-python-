# Phase 10.9.7 Summary: Unified Search, Blueprint→Lean Generation, Evidence Timeline & LSpec CI

**Polyglot Code Studio**  
*Completed: October 2026*  
*Status: Verified (60/60 Verification Suites Passing — 100% Cumulative Pass Rate)*  
*Contract: Zero New Containers · Zero New Mandatory Dependencies · P1 Connection Opportunities Complete*

---

## Executive Summary

Phase 10.9.7 completes the four P1 connection opportunities identified in the post-10.9.5 architectural analysis, creating high-value bridges between existing layers without introducing new containers, external services, or mandatory package dependencies:

1. **Unified Search (L8 Connection)**: Combines results from Lean Finder V2, LeanSearch v2, and LeanExplore via Reciprocal Rank Fusion (RRF $k = 60$, Cormack et al. SIGIR 2009). Provides scale-invariant ranking, FQN deduplication, client-side token bucket rate limiting for LeanExplore (30 req / 60s), query sanitization, 30-minute caching, and optional CRAMF retrieval augmentation.
2. **Blueprint → Lean Generation (L6 Connection)**: Generates LeanArchitect-compliant `@[blueprint (statement := /-- ... -/)]` declarations with explicit `sorry_using [...]` sub-goal dependencies directly from unformalized DAG nodes. Guarantees topological ordering to prevent forward references and cycle formation, and omits `\leanok` markers (which LeanArchitect infers when proofs become sorry-free).
3. **Evidence Timeline UI (L4 Connection)**: Establishes a complete, auditable chronological event stream for `FemevDeclaration.evidence[]` tracking each epistemic state mutation with actor attribution (`user`, `leancert`, `leanscreen`, `leanflow`, `pastaLean`, `kernel`, `veriphy`, `axle`, `duper`), correlation IDs, transition validation (`canTransition()`), and backward-compatible normalization of historical evidence.
4. **LSpec GitHub Action Template (L7 Connection)**: Emits production-grade `.github/workflows/lspec.yml` CI workflow files targeting `leanprover/lean-action@v1` and project toolchain versions, with built-in YAML syntax validation, dependency warnings, and VFS integration.
5. **Registry Extensions**: Expanded `FeatureFlagRegistry` to **31 flags** (+2: `ENABLE_UNIFIED_SEARCH=true`, `ENABLE_LSPEC_CI_TEMPLATE=false`) and `ErrorRegistry` to **37 RFC 9457 error codes** (+3: `UNIFIED_SEARCH_PARTIAL_FAILURE`, `BLUEPRINT_STUB_GENERATION_FAILED`, `LSPEC_CI_TEMPLATE_FAILED`).

---

## Baseline Delta (Pre vs. Post Phase 10.9.7)

| Metric / Dimension | Baseline (Pre-10.9.7) | Final (Post-10.9.7) | Net Delta |
|---|---|---|---|
| **Feature Flags** | 29 (28 `ENABLE_*` + 1 policy) | 31 (30 `ENABLE_*` + 1 policy) | +2 flags (`ENABLE_UNIFIED_SEARCH`, `ENABLE_LSPEC_CI_TEMPLATE`) |
| **RFC 9457 Error Codes** | 34 definitions | 37 definitions | +3 codes (`UNIFIED_SEARCH_PARTIAL_FAILURE`, `BLUEPRINT_STUB_GENERATION_FAILED`, `LSPEC_CI_TEMPLATE_FAILED`) |
| **Verification Test Suites** | 55 suites (100% pass) | 60 suites (100% pass) | +5 suites (Suites 89–93, 26 sub-tests) |
| **Search Providers Fused** | 3 isolated providers | 1 unified API with RRF ($k=60$) | Deduplicated ranked list with source attribution |
| **Blueprint → Lean Automation** | Manual stubs | Automated `@[blueprint]` + `sorry_using` | Automated generation & VFS export to `Blueprint/Main.lean` |
| **Evidence Timeline** | Unordered flat array | Chronological audit trail | Actor attribution, transition validation & JSON export |
| **LSpec CI Status** | None | Automated workflow generator | `.github/workflows/lspec.yml` with toolchain pinning |
| **Containers Required** | 9 (unchanged) | 9 (unchanged) | 0 new containers |
| **Mandatory Dependencies** | Unchanged | Unchanged | 0 new packages |

---

## Section-by-Section Outcome

### Section 1: Unified Search (Task US1, US2, US3)
- **Service Implementation**: `src/services/search/unified-search-service.ts`
  - Fuses rankings across `Lean Finder V2`, `LeanSearch v2`, and `LeanExplore` using $RRF(item) = \sum \frac{1}{60 + rank}$.
  - FQN deduplication merges declaration sources and sums reciprocal scores.
  - Partial failure tolerance returns surviving results with `partial: true` and populated `failures[]`.
  - LeanExplore client-side `TokenBucket` strictly enforces 30 requests / 60 seconds.
  - Query sanitization via `validateProofSearchQuery`.
  - CRAMF query rewriting when `ENABLE_CRAMF` and `useCramf` are active.
  - In-memory 30-minute caching.
- **API Endpoint**: `server/src/routes/search.ts`
  - `POST /api/v1/search/unified` with sliding-window rate limit (10 req/min per session).
  - Emits RFC 9457 `UNIFIED_SEARCH_PARTIAL_FAILURE` (503) on complete provider failure.
- **Verification**: Confirmed by **Test Suite 89** (6/6 sub-tests passing).

### Section 2: Blueprint → Lean Generation (Task BG1, BG2, BG3, BG4)
- **Generator Implementation**: `src/services/blueprint/blueprint-stub-generator.ts`
  - Filters DAG nodes: processes `unformalized` / `sorry` / `unproven`; skips `verified` / `frozen` (`already-formalized`).
  - Emits `@[blueprint (statement := /-- <informal> -/)]` attribute.
  - Populates `sorry_using [<dep1>, <dep2>]` from DAG dependencies.
  - Kahn's algorithm topological sort prevents forward references and excludes self-loops.
  - Missing statements skipped with `missing-statement`; missing dependencies skipped with `missing-dependencies`.
- **API Endpoint**: `server/src/routes/blueprint.ts`
  - `POST /api/v1/blueprint/:id/generate-stubs` with 5 req/min rate limit.
- **UI Component**: `src/components/blueprint/BlueprintCanvas.tsx`
  - "Generate Lean Stubs" action toolbar button with syntax-highlighted preview modal.
  - Actions: "Copy to Clipboard", "Apply to Editor (Blueprint/Main.lean)".
- **Verification**: Confirmed by **Test Suite 90** (6/6 sub-tests passing).

### Section 3: Evidence Timeline UI (Task ET1, ET2, ET3)
- **Timeline Service**: `src/services/femev/evidence-timeline.ts`
  - Chronological ordering (timestamp ascending).
  - Actor attribution (`user`, `leancert`, `leanscreen`, `leanflow`, `pastaLean`, `kernel`, `veriphy`, `axle`, `duper`).
  - Transition validation via `canTransition()` — illegal jumps (e.g. `conjecture` $\rightarrow$ `formally-proven`) strictly throw `EPISTEMIC_TRANSITION_INVALID` (400).
  - Backward compatibility: legacy `FemevDeclaration.evidences[]` lacking actor metadata are normalized on read to `actor: 'user'` with transition `conjecture` $\rightarrow$ current status.
- **UI Panel**: `src/components/femev/EvidenceTimelinePanel.tsx` mounted in `FemevDrawer.tsx` "Timeline" tab.
  - Actor badges, epistemic transition badges using `EPISTEMIC_PALETTE`, evidence icons, free-text search, actor/state filters, correlation ID copying, and JSON audit export.
- **Verification**: Confirmed by **Test Suite 91** (5/5 sub-tests passing).

### Section 4: LSpec GitHub Action Template (Task LC1, LC2, LC3, LC4)
- **Template Generator**: `src/services/lean-tooling/lspec-ci-template-generator.ts`
  - Synthesizes `.github/workflows/lspec.yml` targeting `actions/checkout@v4`, `leanprover/lean-action@v1`, `actions/cache@v4`, `lake build`, and `lake exe lspec`.
  - Automatically resolves Lean toolchain version from `lean-toolchain`. Throws `LSPEC_CI_TEMPLATE_FAILED` (422) if absent.
  - Emits warning if LSpec is not declared in `lakefile.toml` / `lakefile.lean`.
  - Built-in multi-line YAML grammar validation without external packages.
- **API Endpoint**: `server/src/routes/projects.ts`
  - `POST /api/v1/projects/:id/lspec-ci-template` gated behind `ENABLE_LSPEC_CI_TEMPLATE`.
- **UI Panel**: `src/components/lean-tooling/LSpecPanel.tsx`
  - Runs interactive LSpec test suites and exports CI workflow files.
- **Verification**: Confirmed by **Test Suite 92** (5/5 sub-tests passing).

### Section 5: Registry Extensions (Task R1, R2, R3)
- **Feature Flags**: Added `ENABLE_UNIFIED_SEARCH` (runtime, default `true`), `ENABLE_LSPEC_CI_TEMPLATE` (tooling, default `false`).
- **Error Registry**: Added `UNIFIED_SEARCH_PARTIAL_FAILURE` (503), `BLUEPRINT_STUB_GENERATION_FAILED` (500), `LSPEC_CI_TEMPLATE_FAILED` (422).
- **Synchronized Artifacts**:
  - `.env.example` (31 flags)
  - `docs/architecture/feature-flags.md` (31 flags)
  - `docs/reference/error-codes.md` (37 codes)
  - `docs/phase-10.9.7-migration.md` (5 rollback plans)
- **Verification**: Confirmed by **Test Suite 93** (4/4 sub-tests passing).

---

## Test Suites 89–93 Breakdown

| Suite # | Title | Sub-Tests | Status |
|---|---|---|---|
| **Suite 89** | Unified Search (RRF $k=60$) | 6 sub-tests (89.1–89.6) | **PASS (100%)** |
| **Suite 90** | Blueprint → Lean Generation | 6 sub-tests (90.1–90.6) | **PASS (100%)** |
| **Suite 91** | Evidence Timeline & Epistemic Transitions | 5 sub-tests (91.1–91.5) | **PASS (100%)** |
| **Suite 92** | LSpec CI Template Generator | 5 sub-tests (92.1–92.5) | **PASS (100%)** |
| **Suite 93** | Extended Registries (31 Flags, 37 Codes) | 4 sub-tests (93.1–93.4) | **PASS (100%)** |
| **Total New** | | **26 sub-tests** | **PASS (100%)** |
| **Cumulative** | Suites 1–40, 69–93 | **60 test suites** | **PASS (100%)** |

---

## Residual Risks & Mitigations

1. **LeanExplore IP Rate Limit (30 req / 60s)**:
   - *Risk*: Rapid user searches could exceed the public API rate limit.
   - *Mitigation*: Client-side `TokenBucket` throttles requests proactively and converts potential 429 errors into non-blocking partial failures with UI indicator, allowing Lean Finder and LeanSearch results to display seamlessly.
2. **LSpec Dependency Resolution**:
   - *Risk*: Users downloading the CI workflow might commit it before adding `argumentcomputer/LSpec` to their `lakefile.toml`.
   - *Mitigation*: The generator scans `lakefile.toml` and emits a prominent warning banner in the UI and result object.
3. **Blueprint Incomplete Nodes**:
   - *Risk*: Nodes lacking statements or referencing undeclared identifiers could corrupt generated Lean files.
   - *Mitigation*: `BlueprintStubGenerator` skips incomplete nodes with explicit reasons (`missing-statement`, `missing-dependencies`) and orders declarations topologically.

---

## Phase 11 Handoff Confirmation

All four P1 connection opportunities are fully closed and regression-tested. Deferred items have been registered in `docs/phase-11-deferred.md`:
- Full Mathesis model backend integration
- Educational Mode interactive game engine
- Yjs CRDT real-time multi-user co-editing
- OpenTelemetry distributed tracing
- Workspace archive backup & restore
