# Phase 10.9.7 Migration Guide & Rollback Plans

**Polyglot Code Studio — Unified Search, Blueprint→Lean Generation, Evidence Timeline & LSpec CI**  
*Covers Sections 1 through 5 (P1 Connection Opportunities)*

---

## 1. Section 1: Unified Search (L8 Connection)

- **What Changed**:
  - Implemented `UnifiedSearchService` (`src/services/search/unified-search-service.ts`) combining Lean Finder V2, LeanSearch v2, and LeanExplore via Reciprocal Rank Fusion ($k = 60$).
  - Added FQN deduplication, 30-minute in-memory caching, and a 30 req / 60s client-side token bucket for LeanExplore.
  - Mounted Express endpoint `POST /api/v1/search/unified` with sliding-window session rate limiting (10 req/min).
  - Integrated optional CRAMF query rewriting when `ENABLE_CRAMF` is active.
- **Why**: Eliminates scattered, uncalibrated score comparisons across search tools, providing a single ranked list of Mathlib declarations.
- **Rollback Plan**:
  - Configuration: Set `ENABLE_UNIFIED_SEARCH="false"` in environment or feature flag registry.
  - Code: Revert `server/src/routes/search.ts` and unmount `/api/v1/search` from `server.ts`.
  - Fallback: Clients revert to querying `semanticSearchRegistry.searchWithFallback()` directly.
- **Verification**: Confirmed by **Test Suite 89**.

---

## 2. Section 2: Blueprint → Lean Generation (L6 Connection)

- **What Changed**:
  - Created `BlueprintStubGenerator` (`src/services/blueprint/blueprint-stub-generator.ts`) generating LeanArchitect-compliant `@[blueprint (statement := /-- ... -/)]` declarations with `sorry_using [...]` sub-goal dependencies.
  - Enforced topological ordering to guarantee zero forward references or self-loops.
  - Omitted `\leanok` markers (which LeanArchitect infers when declarations are sorry-free).
  - Mounted `POST /api/v1/blueprint/:id/generate-stubs` with 5 req/min session rate limiting.
  - Added "Generate Lean Stubs" action and code preview modal in `BlueprintCanvas.tsx`.
- **Why**: Bridges mathematical DAG planning directly to the Lean 4 proof environment.
- **Rollback Plan**:
  - Code: Remove "Generate Lean Stubs" button from `src/components/blueprint/BlueprintCanvas.tsx`.
  - API: Unmount `/api/v1/blueprint` route in `server.ts`.
  - Fallback: Formalizers write manual Lean 4 theorem declarations using the standard editor.
- **Verification**: Confirmed by **Test Suite 90**.

---

## 3. Section 3: Evidence Timeline UI (L4 Connection)

- **What Changed**:
  - Created `EvidenceTimelineService` (`src/services/femev/evidence-timeline.ts`) recording chronological, actor-attributed epistemic events.
  - Enforced transition validation via `canTransition(from, to)`, throwing `BridgeError('EPISTEMIC_TRANSITION_INVALID')` on illegal jumps.
  - Normalized legacy evidence records on read with `actor: 'user'` and transition from `'conjecture'` to current status.
  - Integrated `EvidenceTimelinePanel.tsx` inside the "Timeline" tab of `FemevDrawer.tsx`.
- **Why**: Provides an auditable mathematical proof trail tracing which automated assistant or verifier promoted a belief.
- **Rollback Plan**:
  - UI: Remove the "Timeline" tab button and panel from `src/components/femev/FemevDrawer.tsx`.
  - Storage: Underlying `FemevDeclaration.evidences[]` in `femevEngine` remain intact without breaking schema.
- **Verification**: Confirmed by **Test Suite 91**.

---

## 4. Section 4: LSpec GitHub Action Template (L7 Connection)

- **What Changed**:
  - Created `LSpecCiTemplateGenerator` (`src/services/lean-tooling/lspec-ci-template-generator.ts`) generating `.github/workflows/lspec.yml` with `actions/checkout@v4`, `leanprover/lean-action@v1`, and toolchain version resolution.
  - Mounted `POST /api/v1/projects/:id/lspec-ci-template` gated behind `ENABLE_LSPEC_CI_TEMPLATE`.
  - Created `LSpecPanel.tsx` with test runner and CI export actions.
- **Why**: Empowers mathematicians to publish reproducible CI configurations adhering to Reservoir 2026 standards.
- **Rollback Plan**:
  - Configuration: Set `ENABLE_LSPEC_CI_TEMPLATE="false"`.
  - Fallback: Developers manually create `.github/workflows/lspec.yml` using upstream templates.
- **Verification**: Confirmed by **Test Suite 92**.

---

## 5. Section 5: Registry Extensions

- **What Changed**:
  - `FeatureFlagRegistry`: Added `ENABLE_UNIFIED_SEARCH` (default: true) and `ENABLE_LSPEC_CI_TEMPLATE` (default: false), reaching 31 flags.
  - `ErrorRegistry`: Added `UNIFIED_SEARCH_PARTIAL_FAILURE` (503), `BLUEPRINT_STUB_GENERATION_FAILED` (500), and `LSPEC_CI_TEMPLATE_FAILED` (422), reaching 37 codes.
  - Synchronized `.env.example`, `docs/architecture/feature-flags.md`, and `docs/reference/error-codes.md`.
- **Why**: Single source of truth for all feature toggles and RFC 9457 error contracts.
- **Rollback Plan**:
  - Revert entries from `src/services/flags/feature-flag-registry.ts` and `src/services/errors/error-registry.ts`.
  - Regenerate `.env.example` and documentation files.
- **Verification**: Confirmed by **Test Suite 93**.
