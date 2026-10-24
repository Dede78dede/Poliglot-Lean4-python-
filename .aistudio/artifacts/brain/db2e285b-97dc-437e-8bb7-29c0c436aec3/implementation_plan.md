# Phase 10.9 — Consolidation, Protocol Unification & Architectural Coherence

This phase consolidates Polyglot Code Studio's architecture following eight phases of rapid capability expansion (Phases 10.2–10.8). Operating under a strict **"no new runtime feature, no new container, no new dependency"** contract, Phase 10.9 eliminates structural debt, unifies core protocols, and establishes a regression-proof baseline across all subsystems to prepare the codebase for Phase 11. The sole new endpoint introduced is `GET /api/v1/health/ready`.

***

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your Phase 1 clarifications, the implementation enforces:
> 1. **Subtle Status Bar Health Indicator with Diagnostic Popover**: Real-time aggregate readiness (`ready`, `degraded`, `not_ready`) surfaced via an unboxed monospace status indicator in the bottom bar, expanding into a container-level latency and toolchain health popover.
> 2. **Expandable RFC 9457 Problem Details for Verification Diagnostics**: User-friendly alerts with expandable technical details (RFC 9457 problem type URI, correlation ID, retryable status, and diagnostic trace) on bridge or kernel errors.
> 3. **Tab-Local Feature Flag Overrides with IndexedDB Persistence**: The unified `FeatureFlagRegistry` maintains tab-local experiment isolation by default, persists user toggles into `polyglot-feature-flags` IndexedDB, and exposes an instant reset-to-defaults control.

***

## 1. Overview & Core Concept

- **What It Delivers**:
  - **Authoritative Pre-Consolidation Baseline (`reports/phase-10.9-baseline.json`)**: Formally typed Zod/TypeScript snapshot capturing all 9 containers, 11 Lean toolchains, 26 feature flags, 12 bridge services, 10 external stores, and 6 IndexedDB databases.
  - **Unified Feature Flag Registry (`FeatureFlagRegistry`)**: Single source of truth consolidating 26 scattered flags across runtime, tooling, experiment, and policy categories with tab-local state and IndexedDB persistence.
  - **Unified RFC 9457 Error Taxonomy (`ERROR_REGISTRY` & `BridgeError`)**: Typed catalog of 30 error codes mapped to HTTP status codes, URI problem types, and user messages. All 12 bridge services standardized to throw `BridgeError` with correlation IDs.
  - **Unified External Store Base (`ExternalStoreBase<TSnapshot>`)**: Shared foundational class for all 10 `useSyncExternalStore` registries with opt-in `BroadcastChannel` multi-tab synchronization (enabled for global command/server registries, disabled for tab-local token budgets).
  - **Unified Container Readiness (`GET /api/v1/health/ready`)**: Aggregate health orchestrator monitoring critical (`femev-runner`, `kimina`, `pantograph`) and non-critical containers with standardized `/healthz` and `/readyz` probes.
  - **Formal Toolchain Policy (`TOOLCHAIN_POLICY`)**: Rigorous matrix documenting all 11 pinned Lean toolchain bindings and upstream commit hashes.
  - **Consolidated ZIP Security Matrix (`ZIP_LIMITS`)**: Single immutable constants definition and an 11-test security suite covering path traversal (CVE-2018-1002200), zombie ZIPs (CVE-2026-0866), and decompression bombs.
  - **IndexedDB Schema Migration Framework**: Version tracking (`DATABASE_VERSIONS`) across 6 browser databases with ordered `MigrationStep` execution and automated rollback hooks.
  - **System Lifecycle & Structured Logging**: Coordinated graceful shutdown handling (SIGTERM/SIGINT) with work checkpointing, and structured JSON logging with pervasive correlation ID tracking.
  - **Bundle Budget CI Gate & Migration Guide**: Automated bundle size threshold enforcement (+10% main chunk gate) and detailed rollback instructions (`docs/phase-10.9-migration.md`).
- **Target Users**: Mathematicians and formal verification engineers requiring rock-solid stability, deterministic reproducibility, and zero silent failures.
- **Key Value**: Guarantees architectural integrity, eliminates cross-service protocol drift, and ensures all 40+ verification test suites remain passing.

***

## 2. User Experience & Visual Design

Adhering strictly to the **Science, Space & Biotech** visual design constitution and zero-pill discipline:
- **Palette**: Deep space obsidian canvas (`#070A0F`), structural slate panels (`#0E1420`), crisp hairline borders (`#1E293B`), laser cyan accents (`#06B6D4`), telemetry emerald (`#10B981`), and warning amber (`#F59E0B`).
- **Typographic System**: Neo-grotesque interface labels (`Plus Jakarta Sans`) paired with strict tabular monospace figures (`font-mono tabular-nums`, `JetBrains Mono`) for all latencies, timestamps, error codes, and correlation IDs.
- **Aggregate Readiness Status Bar Indicator**:
  - Embedded in the persistent bottom status bar.
  - Displays state: `● SYSTEM READY` (emerald), `▲ SYSTEM DEGRADED (1 non-critical down)` (amber), or `■ SYSTEM NOT READY` (rose).
  - Clicking opens an unboxed diagnostic popover detailing individual container latencies, active toolchains, and restart policies.
- **RFC 9457 Error Diagnostic View**:
  - Plain, unboxed warning banner with a clear human-readable explanation.
  - Expandable `[TECHNICAL DETAILS]` tray revealing problem type URI, machine error code, HTTP status, and correlation ID with one-click copy.
- **Feature Flag Manager Drawer**:
  - Tabular layout with category filters (`Runtime`, `Tooling`, `Search`, `Blueprint`, `Infrastructure`, `Policy`).
  - Distinctive toggle switches, phase badges, and a `[RESET ALL TO DEFAULTS]` action.

***

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Typed Baseline JSON Contract (Refinement R1)**:
  - *Chosen Approach*: Emit `reports/phase-10.9-baseline.json` validated against TypeScript interface `Phase109Baseline`.
  - *Why*: Establishes an unforgeable baseline contract so any unplanned structural drift is detected and rejected.
- **Decision 2: Opt-In Multi-Tab Sync via BroadcastChannel (Refinement R2)**:
  - *Chosen Approach*: `ExternalStoreBase` supports `multiTabSync: boolean`. Global registries (`CommandRegistry`, `McpServerRegistry`, `StatusBarRegistry`) set `true`; experiment-specific stores (`TokenBudgetManager`, `AiProviderRegistry`) set `false`.
  - *Why*: Prevents cross-tab interference during simultaneous exploratory proving sessions while keeping global UI state consistent.
- **Decision 3: Consolidated ZIP Matrix & Security Hardening (Refinement R3)**:
  - *Chosen Approach*: Consolidate all upload constraints into `ZIP_LIMITS` and test against a comprehensive 11-point threat matrix.
  - *Why*: Protects self-hosted instances from malicious archives without fragmenting quota definitions across frontend and backend.
- **Decision 4: Explicit Rollback Plans in Migration Documentation (Refinement R4)**:
  - *Chosen Approach*: Author `docs/phase-10.9-migration.md` providing step-by-step rollback strategies for every refactored service.
  - *Why*: Guarantees zero regression risk across 10 store migrations and 12 bridge updates.

***

## 4. Technical Architecture & System Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POLYGLOT CODE STUDIO                               │
│       Phase 10.9: Consolidation, Protocol Unification & Coherence          │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Top Ribbon: Feature Flag Drawer     │  Bottom Status Bar: Health Popover   │
└──────────────────┬───────────────────┴───────────────────▲──────────────────┘
                   │                                       │
                   │ State & Health Queries                │ GET /api/v1/health/ready
                   ▼                                       │
┌──────────────────────────────────────────────┐           │
│           CORE PROTOCOL REGISTRIES           │           │
│  - FeatureFlagRegistry (26 flags + IDB)      ├───────────┤
│  - ERROR_REGISTRY (30 codes, RFC 9457)       │           │
│  - TOOLCHAIN_POLICY (11 pinned versions)     │           │
│  - ExternalStoreBase (Opt-in BroadcastSync)  │           │
└──────────────────────┬───────────────────────┘           │
                       │                                   │
                       │ Correlation ID & Error Handling   │
                       ▼                                   │
┌──────────────────────────────────────────────┐           │
│            12 BRIDGE SERVICES                │           │
│  (FEMEV, PastaLean, Lungo, LeanFlow,         │           │
│   leanscreen, LeanCert, Heron, LSpec,        ├───────────┘
│   doc-gen4, Verso, LeanArchitect, CRAMF)     │
│   All throw BridgeError with correlation IDs │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           CONTAINER ORCHESTRATION            │
│  9 Containers with /healthz & /readyz probes │
│  Standardized docker-compose depends_on      │
└──────────────────────────────────────────────┘
```

### Components to Implement:

1. **Baseline Snapshot (Section 0)**:
   - `src/types/phase-10.9-baseline.ts`: Zod-validated baseline interfaces.
   - `reports/phase-10.9-baseline.json`: Authoritative pre-consolidation snapshot.
2. **Unified Feature Flags (Section 1)**:
   - `src/services/flags/feature-flag-registry.ts`: Typed registry with 26 flags, env reading, IndexedDB persistence, and `useSyncExternalStore`.
   - `.env.example`: Regenerated single source of truth.
3. **Unified Error Taxonomy (Section 2)**:
   - `src/services/errors/error-registry.ts`: 30 typed error codes with RFC 9457 problem types.
   - `src/services/errors/bridge-error.ts`: Base `BridgeError` with correlation ID and freeze details.
   - `docs/reference/error-codes.md`: Generated error documentation.
4. **Unified External Store Base (Section 3)**:
   - `src/services/stores/external-store-base.ts`: Base class with memoized snapshot caching and opt-in `BroadcastChannel` synchronization.
   - Migration of 10 external stores to extend `ExternalStoreBase`.
5. **Unified Health & Readiness (Section 4)**:
   - `src/services/health/health-service.ts`: Container readiness checking service.
   - `server/src/routes/health.ts`: `GET /api/v1/health/ready` aggregate endpoint.
   - `docker-compose.yml`: Standardized healthchecks (`/healthz`, `/readyz`) and `depends_on: { condition: service_healthy }`.
6. **Unified Toolchain Policy (Section 5)**:
   - `src/services/toolchains/toolchain-policy.ts`: Definition of all 11 toolchain bindings.
   - `docs/architecture/toolchain-matrix.md`: Canonical toolchain matrix documentation.
7. **Consolidated ZIP Security Matrix (Section 6)**:
   - `src/registries/constants.ts` & `src/services/archive/zip-validator.ts`: Immutable `ZIP_LIMITS` reference.
   - `tests/phase-10.9/zip-validator-matrix.test.ts`: Complete 11-test security suite.
8. **IndexedDB Schema Versioning (Section 7)**:
   - `src/services/storage/schema-migration.ts`: Migration runner supporting 6 databases and rollback definitions.
   - `docs/architecture/indexeddb-migrations.md`: Phase 11 forward migration strategy.
9. **Nomenclature, Lifecycle & Structured Logging (Section 8)**:
   - `docs/architecture/nomenclature.md`: Canonical casing rules and alias cleanup.
   - `src/services/lifecycle/graceful-shutdown.ts`: SIGTERM/SIGINT handlers with timeout management.
   - `src/services/logging/logger.ts`: Structured JSON logger with correlation ID injection.
10. **Bundle Budget & Migration Guide (Sections 9 & 10)**:
    - `.github/workflows/ci.yml`: Bundle visualizer and budget gate (+10% main chunk cap).
    - `docs/phase-10.9-migration.md`: Per-section rollback guide.
    - `docs/phase-11-deferred.md`: Explicitly deferred items for Phase 11.
11. **Verification Test Suites 74–83 (Appendices A1 & A2)**:
    - Suite 74: Unified Feature Flag Registry (5 sub-tests)
    - Suite 75: Unified Error Taxonomy (5 sub-tests)
    - Suite 76: Unified External Store Base (4 sub-tests)
    - Suite 77: Unified Container Health (4 sub-tests)
    - Suite 78: Unified Toolchain Policy (3 sub-tests)
    - Suite 79: ZipValidator Matrix (5 sub-tests)
    - Suite 80: IndexedDB Schema Versioning (4 sub-tests)
    - Suite 81: Nomenclature, Shutdown & Logging (4 sub-tests)
    - Suite 82: Bundle Budget & Env Regeneration (3 sub-tests)
    - Suite 83: Migration Guide & Rollback (3 sub-tests)
    - Integrated into `scripts/verify-all.ts` (50 total suites).
    - Summary report in `reports/phase-10.9-summary.md`.
