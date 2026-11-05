# Production Bundle Measurement Methodology & Historical Reconciliation

**Phase**: 13.9.1 (Task 13 — A3 Reconciliation)  
**Date**: 2026-11-04  
**Status**: APPROVED  

---

## 1. Measurement Methodology

The bundle size measurement script (`scripts/measure-bundle.ts`) enforces strict, reproducible accounting of client web application assets delivered to end users.

### Exact Scope
- **Target Directory**: `dist/assets/` plus the entry document `dist/index.html`.
- **Files Included**: Production client JavaScript (`.js`), CSS stylesheets (`.css`), and HTML (`.html`).
- **Files Excluded**:
  - Express server runtime (`server.ts`, `server/src/**`).
  - Python scripts and contracts (`schemas/**`, `tests/**`).
  - Development tools, source maps, and node modules.

### Compression & Metrics
- **Compression Algorithm**: Node.js `zlib.gzipSync` using default compression (level 6).
- **Unit of Measurement**: Kilobytes calculated as `gzipBytes / 1024`, rounded to 2 decimal places.
- **Main Entry Identification**: Identified via the glob pattern `dist/assets/index-*.js`.
- **Total JS Accounting**: The exact sum of all `.js` chunk files present in `dist/assets/`.

---

## 2. Historical Reconciliation (Phase 13 vs Phase 13.9)

| Metric | Phase 13 Baseline (`bundle-post-13.json`) | Phase 13.9 Gate (`bundle-post-13.9.json`) | Variance (Δ) | Budget Cap | Status |
|---|---|---|---|---|---|
| **Main Entry Gzip** | 159.30 KB | 154.32 KB | **-4.98 KB (-3.1%)** | ≤ 180.00 KB | **PASS** (+25.68 KB margin) |
| **Vendor Chunks Gzip** | 63.51 KB | 61.39 KB | **-2.12 KB (-3.3%)** | — | — |
| **Runtime Gzip** | 0.36 KB | 0.36 KB | **0.00 KB** | — | — |
| **Total Client JS Gzip** | 223.17 KB | 216.08 KB | **-7.09 KB (-3.2%)** | ≤ 260.00 KB | **PASS** (+43.92 KB margin) |
| **CSS Stylesheet Gzip** | 16.16 KB | 15.88 KB | **-0.28 KB** | — | — |

### Root Cause of Transition (159.30 KB → 154.32 KB)
The ~5 KB reduction between Phase 13 and Phase 13.9 is **an authentic code reduction**, not a measurement artifact:
1. **Dead-Code Elimination**: Removal of unused AST traversal paths in `structural-diff.ts` and dead branch elimination in `logger.ts`.
2. **Rolldown Chunk Deduplication**: Refinement of shared UI module imports in `src/shared/ui/` allowing Rolldown to merge micro-chunks into `react-aria-vendor` without duplicating helper closures.
3. **Apples-to-Apples Validity**: Both phases evaluated identical directory targets (`dist/assets`) with default gzip compression.

---

## 3. Reproduction & CI Workflow Integration

To measure and record bundle metrics locally:
```bash
npm run build
npm run bundle:measure
```

### Continuous Integration (GitHub Actions)
In `.github/workflows/ci.yml`, the `Bundle budget` step runs `npm run bundle:measure`. Per the confirmed architecture, budget overflows emit GitHub Actions warning annotations (`::warning::`) in pull request reviews without blocking CI merges, alerting engineers prior to deployment.
