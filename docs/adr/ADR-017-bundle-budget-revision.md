# ADR-017 — Bundle Budget Revision & Optimization Architecture for Phase 15 Activation Waves

**Status**: Accepted  
**Date**: 2026-11-08  
**Decisori**: Architecture Review Board (ARB), Frontend Lead, Lead Quality Engineer  
**Related**: ADR-016 (Phase 15 Scope), reports/bundle-methodology.md  

---

## 1. Context

During Phase 14.9.1 FIX-A, the client application bundle was successfully optimized to **216.92 KB total client JS gzip** (under the 260.00 KB budget cap) and **31.96 KB main entry gzip** (under the 180.00 KB budget cap). The measured initial load bundle was recorded at **174.06 KB gzip**, with the largest single chunk measuring **68.38 KB gzip** (`react-vendor`).

ADR-016 defines four sequential activation waves (W1–W4) for currently gated features:
- **W1**: OpenTelemetry Browser SDK (`ENABLE_OTEL_BROWSER`) & Node SDK (`ENABLE_OTEL_NODE`)
- **W2**: LeanBeam bridge (`ENABLE_LEAN_BEAM`)
- **W3**: Mathesis (`ENABLE_MATHESIS`), LP2 (`ENABLE_LP2`), TreeThink (`ENABLE_TREETHINK`)
- **W4**: Yjs collaborative editing (`ENABLE_YJS_COLLABORATION`)

Cumulative asset size growth across these waves, if unaddressed or monolithic, would threaten the existing caps:
- Estimated O1 (chunk max) impact: up to +28 KB cumulatively (risk of exceeding 80 KB).
- Estimated O2 (initial load) impact: up to +33 KB cumulatively (risk of exceeding 200 KB).

Without an intentional code-splitting, tree-shaking, and budget governance strategy, the repository would encounter false budget alarms or risk monolithic bundle bloat.

---

## 2. Decision

The Architecture Review Board approves the following revised bundle budget and architectural constraints:

### 2.1 Revised Budget Limits
| Budget Metric | Previous Ceiling | Revised Ceiling (Phase 15 Baseline) | Rationale |
|:---|:---:|:---:|:---|
| **O1 — Max Single Chunk Gzip** | 80.00 KB | **100.00 KB** | Accommodates rich AST tooling, client telemetry, and Yjs CRDT primitives within dedicated vendor chunks. |
| **O2 — Initial Load Gzip** | 200.00 KB | **220.00 KB** | Protects initial interactive time (TTI) while absorbing essential core runtime telemetry. |
| **O3 — Chunk Sum Discrepancy** | 0.50 KB | **0.50 KB** (Unchanged) | Enforces strict mathematical accounting consistency between chunk sum and total JS. |
| **Total Client JS Gzip** | 260.00 KB | **290.00 KB** | Ample headroom for all 7 gated features across W1–W4. |
| **Main Entry Gzip** | 180.00 KB | **180.00 KB** (Unchanged) | Main entry remains decoupled via dynamic route-level `React.lazy()` imports. |

### 2.2 Mandatory Code-Splitting Discipline
1. **Dynamic Lazy Loading**: Every feature gated under `ENABLE_*` that introduces UI or non-critical client logic must be loaded via dynamic `React.lazy()` + `Suspense` or dynamic `import()`.
2. **Exclusion from Initial Load (O2)**: Feature-gated non-critical routes (Notebook, Mathesis, TreeThink, LeanBeam, Collab panels) are isolated into dedicated asynchronous chunks and do not inflate O2.
3. **Rolldown Chunk Grouping**: Vite 8 / Rolldown `codeSplitting.groups` priorities ensure vendor libraries (`@opentelemetry/*`, `yjs`, etc.) form isolated chunks rather than leaking into `index.js`.
4. **Vite Define Tree-Shaking**: In production builds, feature flags evaluated as compile-time constants allow dead-code elimination of disabled modules.

---

## 3. Consequences

### Positive
- Prevents artificial CI failures during planned Phase 15 activation waves.
- Preserves sub-35 KB main entry size while enabling robust client capabilities.
- Enforces per-wave measurement of tree-shaking and chunk margins.

### Negative
- Requires strict adherence to lazy loading; any synchronous import of heavy gated libraries into `src/App.tsx` or `src/main.tsx` will be flagged by CI.

---

## 4. Verification & CI Tooling
The updated budget limits are codified in `scripts/measure-bundle.ts` and validated via automated test suites.
