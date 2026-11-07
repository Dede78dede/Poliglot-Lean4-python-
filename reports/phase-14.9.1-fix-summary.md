# Phase 14.9.1 Fix Summary — Bundle Reduction & Epistemic Authority Reconciliation

**Date**: 2026-11-06  
**Auditor / Lead Architect**: Senior Software Architect & Lead Verification Auditor  
**Status**: APPROVED & FULLY RECONCILED (GO)  

---

## 1. FIX-A (D2): Bundle Reduction to Meet 260 KB Total JS Gzip Budget

### Overview
In Phase 14 review, D2 was blocked due to an overrun where total client JS gzip was 274.63 KB against a strict 260.00 KB budget (+14.63 KB overrun). FIX-A eliminated this overrun without raising budgets or dropping features.

### Root Cause Analysis
1. **Accidental Development Mode Bundling**: In `vite.config.ts`, `define: { 'process.env': {} }` had clobbered `process.env.NODE_ENV === 'production'` checks across React, React-DOM, and React Aria, causing Vite to bundle development runtimes with verbose warnings and owner stacks. Corrected to `'process.env.NODE_ENV': JSON.stringify('production')`.
2. **Rolldown Chunk Grouping**: Implemented Vite 8 native `build.rolldownOptions.output.codeSplitting.groups` with priority ordering (`react-vendor` priority 30, `aria-vendor` priority 20, `zod-vendor` priority 15, `monaco-vendor` priority 10, `icons-vendor` priority 5).
3. **Route-Level Code Splitting**: Applied `React.lazy` and `React.Suspense` to all non-landing routes (`NotebookPanel`, `FEMEVView`, `RecommendationsPanel`, `DesignSystemShowcase`, and `CommandPalette`).
4. **Direct Lucide Imports**: Subpath imports (`lucide-react/dist/esm/icons/*`) on the main entry eliminated barrel overhead.

### Metrics Before vs After (FIX-A)

| Metric | Phase 14 Initial (`bundle-post-14.json` prior) | Phase 14.9.1 Reconciled | Delta (Δ) | Budget Ceiling | Verdict | Margin |
|---|---|---|---|---|:---:|---|
| **Main Entry Gzip** | 172.24 KB | **31.96 KB** | **-140.28 KB (-81.4%)** | ≤ 180.00 KB | **PASS** | +148.04 KB |
| **Total Client JS Gzip** | 274.63 KB | **216.92 KB** | **-57.71 KB (-21.0%)** | ≤ 260.00 KB | **PASS** | +43.08 KB |
| **Max Single Chunk Gzip** | 172.24 KB | **66.06 KB** | **-106.18 KB** | ≤ 80.00 KB | **PASS** | +13.94 KB |
| **Emitted Route Chunks** | 0 dynamic | **5 route chunks** | **+5 chunks** | ≥ 3 chunks | **PASS** | Active code-splitting |

### Suite 170 Result
`tests/phase-14/suite-170-bundle-budget.test.ts`: **6/6 passed** (100%).

---

## 2. FIX-B (D4): Epistemic Authority & Single Certifier for SEAL_KERNEL_VERIFIED_TIER5

### Overview
In Phase 14 review, D4 identified that three production sites outside `server/src/services/verification/hybrid-adjudicator.ts` returned `verified: true` or `SEAL_KERNEL_VERIFIED_TIER5` as an ungrounded outcome. FIX-B refactored all three offending sites to enforce single-source-of-truth certification.

### Epistemic Authority Refactoring Table (4+2 Sites)

| Site & Location | Before Classification | Before Behavior | After Classification | After Behavior (Refactored) |
|:---|:---:|:---|:---:|:---|
| `server/src/services/verification/hybrid-adjudicator.ts:264` | **CERTIFYING** | Dual-engine consensus mints `badge: 'SEAL_KERNEL_VERIFIED_TIER5'` on Kimina + Lake agreement + allowlist. | **CERTIFYING (SOLE AUTHORITY)** | Unchanged. Sole authorized certifier in the system. |
| `server/src/services/mcp/lean-lsp-mcp-client.ts:162` | **CERTIFYING (Offending)** | Returned `{ success: true, data: { verified: true, seal: 'SEAL_KERNEL_VERIFIED_TIER5' } }` on heuristic check. | **TRANSPORTING / PREFLIGHT** | Refactored to delegate to `hybridAdjudicator.adjudicate()`. Maps to `ProofOutcome` (`transport`, `preflight`, or `unavailable`). Zero `verified: true`. |
| `src/services/mcp/lean-lsp-client.ts:193` | **CERTIFYING (Offending)** | Browser stub echoed `{ verified: true, seal: 'SEAL_KERNEL_VERIFIED_TIER5' }`. | **UNAVAILABLE STUB** | Refactored to return `{ kind: 'unavailable', reason: 'client_stub' }` with message "Verification requires the server adjudicator." |
| `src/services/mcp/mcp-server.ts:418` | **CERTIFYING (Offending)** | Returned `{ committed: true, kernelSeal: 'SEAL_KERNEL_VERIFIED_TIER5' }` unconditionally on proof proposal confirmation. | **CONDITIONAL TRANSPORT** | Refactored to call `hybridAdjudicator.adjudicate()`. `kernelSeal` is `SEAL_KERNEL_VERIFIED_TIER5` only when certified; otherwise `null`. `committed` decoupled from certification. |
| `src/services/mcp/mcp-server.ts:147` | **METADATA** | Static capability schema in `polyglot_get_engine_status`. | **METADATA** | Unchanged. Static capability declaration. |
| `server/src/services/lungo/lungo-bridge.ts:111` | **TRANSPORTING / METADATA** | Ingested Lungo BIR claim records carry proof metadata. | **TRANSPORTING / METADATA** | Unchanged. Transport metadata only. |

### Invariant Enforcements
1. **Type Module**: Introduced `ProofOutcome` discriminated union in `src/types/proof-outcome.ts` (re-exported in `server/src/types/proof-outcome.ts`) with exactly one `certified` variant containing literal `'SEAL_KERNEL_VERIFIED_TIER5'`.
2. **Static Invariant Tests**: Added `tests/phase-14/suite-171-epistemic-authority.test.ts` asserting:
   - 171.1: Zero `verified: true` in `server/src/services/mcp/lean-lsp-mcp-client.ts` (PASS).
   - 171.2: Zero `verified: true` in `src/services/mcp/lean-lsp-client.ts` (PASS).
   - 171.3: No `kernelSeal: 'SEAL_KERNEL_VERIFIED_TIER5'` in `mcp-server.ts` without preceding adjudicator call (PASS).
   - 171.4: Only `hybrid-adjudicator.ts` in `server/src/` has both `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5` (PASS).
   - 171.5: `ProofOutcome` has exactly one certified variant (PASS).
   - 171.6: Unconfirmed adjudication call returns `kind: 'preflight'` and no seal (PASS).
3. **ADR 015 Update**: Section 5 updated with the Epistemic Authority Matrix and governance rule: "Adding a new emitter requires an ADR and a test that asserts the new site does not certify."

### Suite 171 Result
`tests/phase-14/suite-171-epistemic-authority.test.ts`: **6/6 passed** (100%).

---

## 3. Overall Gate Verdict

| Gate Domain | Requirement | Actual Status | Verdict |
|---|---|:---:|:---:|
| **D2 (Bundle Budget)** | Main ≤ 180 KB, Total JS ≤ 260 KB, max chunk ≤ 80 KB | Main 31.96 KB, Total JS 216.92 KB, max chunk 66.06 KB | **GO** |
| **D4 (Epistemic Authority)** | Single certifier (`hybrid-adjudicator.ts`), zero unauthorized emitters | 3 offending sites refactored, ADR 015 codified | **GO** |
| **Type Safety** | Clean compilation across all modules | `npx tsc --noEmit` exit 0 (0 errors) | **GO** |
| **Cumulative Test Suite** | 100% pass across all suites | Suites 1–171 (297 sub-tests): 100% PASS | **GO** |

**OVERALL PHASE 14.9.1 VERDICT: GO — ALL CRITICAL BLOCKERS CLOSED. PHASE 15 CAN OPEN.**
