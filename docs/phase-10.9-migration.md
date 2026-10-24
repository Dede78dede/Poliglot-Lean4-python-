# Phase 10.9 Migration Guide & Rollback Plans

**Polyglot Code Studio — Architectural Consolidation**  
*Covers Sections 1 through 9*

---

## 1. Section 1: Unified Feature Flag Registry

- **What Changed**: Consolidates 26 scattered feature flags into `src/services/flags/feature-flag-registry.ts`. Regenerated `.env.example`. Overrides stored in `polyglot-feature-flags` IndexedDB.
- **Why**: Eliminates scattered string literals and unverified flags across codebases.
- **Rollback Plan**:
  - Code: Revert `src/services/flags/feature-flag-registry.ts`.
  - Storage: Clear object store in IndexedDB (`polyglot-feature-flags`) using `featureFlagRegistry.reset()`.
  - Fallback: Hardcode legacy defaults via environment variables.
- **Verification**: Confirmed by **Test Suite 74**.

---

## 2. Section 2: Unified Error Taxonomy (RFC 9457)

- **What Changed**: Consolidates 30 error codes in `src/services/errors/error-registry.ts` and standardizes `BridgeError` in `src/services/errors/bridge-error.ts`.
- **Why**: Eliminates ad-hoc string throws (`throw new Error('...UNAVAILABLE')`) and ensures consistent user messaging.
- **Rollback Plan**:
  - Code: Standard `git revert` on bridge service files.
  - Backward Compatibility: `ERROR_REGISTRY` retains all legacy error codes as identical string values.
- **Verification**: Confirmed by **Test Suite 75**.

---

## 3. Section 3: Unified External Store Base

- **What Changed**: `ExternalStoreBase<TSnapshot>` introduces opt-in `BroadcastChannel` synchronization (Refinement R2) across 10 `useSyncExternalStore` registries.
- **Why**: Eliminates copy-pasted `cachedSnapshot` and `listeners` boilerplate across stores.
- **Rollback Plan**:
  - Individual store rollback: Change `class MyStore extends ExternalStoreBase` back to standalone class.
  - Runtime disable: Toggle `multiTabSync: false` in constructor options.
- **Verification**: Confirmed by **Test Suite 76**.

---

## 4. Section 4: Unified Container Health & Readiness

- **What Changed**: `HealthService` (`src/services/health/health-service.ts`), `GET /api/v1/health/ready`, and standardized `/healthz` & `/readyz` probes in `docker-compose.yml`.
- **Why**: Provides automated aggregate status (`ready`, `degraded`, `not_ready`) across all 9 containers.
- **Rollback Plan**:
  - Remove `GET /api/v1/health/ready` route from `server.ts`.
  - Revert `docker-compose.yml` healthcheck blocks to legacy container configuration.
- **Verification**: Confirmed by **Test Suite 77**.

---

## 5. Section 5: Unified Toolchain Policy

- **What Changed**: Formalized 11 Lean 4 toolchains in `src/services/toolchains/toolchain-policy.ts` and `docs/architecture/toolchain-matrix.md`.
- **Why**: Prevents toolchain collisions across containers (e.g. PastaLean v4.31.0 vs LeanCert v4.32.0 vs Lungo v4.34.1 vs Paranoid v4.35.0).
- **Rollback Plan**:
  - Revert policy file. Existing containers retain their individual pinned Dockerfile images.
- **Verification**: Confirmed by **Test Suite 78**.

---

## 6. Section 6: ZipValidator Threat Matrix

- **What Changed**: Sourced `ZIP_LIMITS` from `src/registries/constants.ts` and consolidated 11 security checks (CVE-2018-1002200, CVE-2026-0866, symlinks, nested archives) in `src/services/zip-validator.ts`.
- **Why**: Prevents ZIP bomb exploits and directory traversal without duplicating limits.
- **Rollback Plan**:
  - Revert `src/services/zip-validator.ts` to legacy commit.
- **Verification**: Confirmed by **Test Suite 79**.

---

## 7. Section 7: IndexedDB Schema Versioning

- **What Changed**: `SchemaMigrationManager` (`src/services/storage/schema-migration.ts`) tracks 6 database versions (`DATABASE_VERSIONS`) and requires reversible `MigrationStep` definitions.
- **Why**: Ensures future database migrations (such as bibliography enhancements in Phase 11) execute without data loss.
- **Rollback Plan**:
  - Call `schemaMigrationManager.rollbackStep(db, step)` to restore previous schema.
- **Verification**: Confirmed by **Test Suite 80**.

---

## 8. Section 8: Nomenclature, Lifecycle & Structured Logging

- **What Changed**: Canonical casing documented in `docs/architecture/nomenclature.md`, `GracefulShutdownManager` in `src/services/lifecycle/graceful-shutdown.ts`, and `StructuredLogger` in `src/services/logging/logger.ts`.
- **Why**: Standardizes log ingestion and ensures in-flight LeanFlow and Lungo runs checkpoint safely on SIGTERM.
- **Rollback Plan**:
  - Disable signal listeners via `gracefulShutdownManager` detachment.
- **Verification**: Confirmed by **Test Suite 81**.

---

## 9. Section 9: Bundle Budget & CI Gates

- **What Changed**: `.github/workflows/ci.yml` adds budget checks (+10% main chunk cap, +5% total gzipped cap).
- **Why**: Prevents frontend bundle bloat as new visualization tools are loaded.
- **Rollback Plan**:
  - Remove the Bundle Budget CI step from `.github/workflows/ci.yml`.
- **Verification**: Confirmed by **Test Suite 82**.

---

## 10. Section 10: Epistemic Status Unification & Integrity Invariants

- **What Changed**: Unified 6 epistemic states (`conjecture`, `heuristically-validated`, `faithfulness-screened`, `numerically-verified`, `formally-proven`, `refuted`) in `src/types/epistemic-status.ts` and managed via `FemevOrchestrator` (`src/services/femev/femev-orchestrator.ts`).
- **Why**: Eliminates conflicting confidence scales between FEMEV, leanscreen, and LeanCert. Enforces that direct promotion from `conjecture` to `formally-proven` is forbidden, and requires `SEAL_KERNEL_VERIFIED_TIER5` for proof seals.
- **Rollback Plan**:
  - Revert `src/services/femev/femev-orchestrator.ts` and `src/types/epistemic-status.ts`.
  - Fall back to legacy 4-phase `FemevEngine` declarations.
- **Verification**: Confirmed by **Test Suite 85**.

---

## 11. Section 11: Selective Integrations (Feature-Flagged)

- **What Changed**: Introduced `AutoformalizationRouter` (`src/services/formalization/autoformalization-router.ts`), `MathesisProvider` (`src/services/formalization/mathesis-provider.ts`), `PaperproofClient` (`src/services/femev/paperproof-client.ts`), and `EducationalService` (`src/services/education/educational-templates.ts`).
- **Why**: Unifies translation and autoformalization pipelines under a Strategy pattern with clean fallback routing, keeping experimental features disabled by default.
- **Rollback Plan**:
  - Set `ENABLE_PAPERPROOF="false"`, `ENABLE_MATHESIS="false"`, and `ENABLE_EDUCATIONAL_MODE="false"`.
  - Remove route `/api/v1/femev/:id/paperproof` from `server.ts`.
- **Verification**: Confirmed by **Test Suite 86**.

---

## 12. Section 12: Python Scientific Stack Audit & Round-Trip

- **What Changed**: Audited Pyodide 314.0.7 for the 5 core packages (`numpy`, `sympy`, `mpmath`, `z3-solver`, `scipy`) in `docs/reference/python-scientific-stack.md` and verified PastaBench 10-problem round-trip translation in `tests/phase-10.9.5/round-trip.test.ts`.
- **Why**: Guarantees Python WASM execution integrity while preserving the asymmetric trust model (Python generates empirical evidence; Lean verifies proofs).
- **Rollback Plan**:
  - Revert `docs/reference/python-scientific-stack.md` and round-trip tests.
  - Retain existing `PythonDependencyResolver` validation.
- **Verification**: Confirmed by **Test Suite 87**.
