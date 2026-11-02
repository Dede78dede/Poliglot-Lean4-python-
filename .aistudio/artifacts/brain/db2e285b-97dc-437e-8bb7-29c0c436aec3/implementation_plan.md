# Phase 13 — Unified Result Contracts, Contract Parity, Native Notebook, Config Discovery & Verification Hardening

Phase 13 closes three fundamental structural debts in Polyglot Code Studio: (1) fragmenting `Result<T>` implicit contracts across 18 bridge services; (2) manual TS↔Python contract synchronization; and (3) lack of a persistent interactive notebook execution mode. It introduces a unified `ResultEnvelope<T>` discriminated union, automated contract parity verification, an isolated native notebook engine, evidence-driven config proposals, and verification hardening.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions were confirmed through Phase 1 clarification:

- **Confirmed Decision 1 (Notebook Workspace)**: Dedicated full-screen route `/notebook` with dual editor-output layout, featuring cell-level execution, persistent Python globals across cells, and session export/import.
- **Confirmed Decision 2 (Dense Embeddings Upgrade)**: Dense embeddings upgrade (`all-MiniLM-L6-v2` via `@huggingface/transformers` web worker with `minSimilarity ≥ 0.90` and HNSW indexing) will be implemented directly in Sprint 13.5 with worker offloading, upgrading the Phase 12 Dice similarity engine.
- **Confirmed Decision 3 (Cross-Artifact Search Scope)**: Full unified corpus indexed by `MiniSearch` worker across workspace files, evidence entries, formal proofs, chat threads, and notebooks.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  - **`ResultEnvelope<T>`**: Standardized discriminated union on `ok: boolean` with RFC 9457 `SerializedBridgeError`, correlation ID propagation, and non-breaking `withEnvelope()` wrapper across 18 bridge services.
  - **Contract Parity**: Automated pipeline exporting Zod v4 schemas to JSON Schema with explicit `discriminator: { propertyName }` and compiling to Pydantic v2 BaseModels with strict validation and round-trip verification.
  - **Native Notebook Mode**: Client-side interactive Python cells running inside a dedicated `notebook.worker` that persists globals across cell executions, provides cell timeout recovery without kernel death, and serializes to IndexedDB (`polyglot-notebooks`) and `.ipynb`.
  - **Config Manager**: 3-signal discovery engine (Hardware RAM/VRAM, Usage patterns, Benchmark baselines) presenting up to 3 evidence-backed configuration proposals with mandatory explicit user confirmation (zero auto-application).
  - **Verification Hardening**: Mutation testing harness (nightly Stryker/mutmut, minimal PR diff configuration), meta-scan for flaky/slow/dead tests, integrity checks, and AST-level structural diffing for Lean 4 using `tree-sitter-lean`.
- **Target Audience**: Mathematicians and Python developers requiring interactive notebook exploration, reliable dual-language contracts, and provable formal verification without unexpected runtime failures.
- **Epistemic Invariant**: **Only `SEAL_KERNEL_VERIFIED_TIER5` certifies truth.** No envelope, notebook cell, contract parity check, or config proposal can grant certified status.

---

## 2. User Experience & Visual Design

- **Dedicated Notebook Route (`/notebook`)**:
  - Full-width workspace canvas adhering to SaaS dashboard guidelines with breadcrumbs: `Workspace / Notebook / [Session Title]`.
  - Dual-column or vertical stack layout: cell code editor on the left/top, real-time output and stdout/stderr on the right/bottom.
  - Cell header with execution order `[In 1]`, duration badge with tabular numerals (`142ms`), run button, and cell deletion.
  - Global notebook toolbar: `Run All`, `Restart Kernel` (with explicit confirmation), `Export .ipynb`, `Export .polyglot-notebook`, and kernel status indicator (`Ready`, `Running Cell 2`, `Kernel Restarted`).
- **Settings Recommendations Panel (`RecommendationsPanel.tsx`)**:
  - Clean card surface inside Settings modal presenting up to 3 pending proposals.
  - Each proposal displays title, evidence-based rationale (e.g., `Detected 8 GB RAM and 6.2 GB VRAM`), confidence badge, and explicit action buttons (`Apply`, `Dismiss`, `Do not show again`).
  - No "Apply All" affordance to prevent accidental configuration shifts.
- **Structural Diff Viewer (`DiffViewer.tsx`)**:
  - Mode toggle: `Line` (Monaco DiffEditor) vs `Structural` (AST node-level tree diff) vs `Semantic` (Kernel equivalence check).
  - Highlighting added/removed/modified theorem signatures, lemma binders, and tactic blocks with unboxed metadata tags.
- **Unified Cross-Artifact Search Modal**:
  - `Cmd+Shift+F` command palette modal searching across files, evidence items, proof certificates, chat logs, and notebook cells with instant (<50ms) MiniSearch ranking.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: `ResultEnvelope<T>` Discriminant on `ok: boolean` (not `success`)**:
  - *Chosen Approach*: Standard Rust/TypeScript Result monad `{ ok: true, value: T } | { ok: false, error: SerializedBridgeError }`.
  - *Why*: Eliminates ambiguity; TypeScript narrows `value` only after `if (res.ok)` is checked, preventing property access bugs.
- **Decision 2: Explicit Discriminator in `z.toJSONSchema()`**:
  - *Chosen Approach*: Override callback injecting `discriminator: { propertyName }` for `z.discriminatedUnion()`.
  - *Why*: Zod v4 emits `oneOf` with `const` literals by default without the OpenAPI `discriminator` object; without it, `datamodel-code-generator` fails to generate Pydantic v2 `Discriminator` models.
- **Decision 3: Isolated `notebook.worker` vs `pyodide.worker`**:
  - *Chosen Approach*: Create a dedicated `notebook.worker` that maintains a persistent Python namespace, leaving `pyodide.worker` with its strict terminate-on-timeout policy for one-shot scripts and `/probe`.
  - *Why*: Prevents long-running notebook sessions from being interrupted by one-shot execution timeouts, while ensuring cell timeouts in the notebook do not wipe user variables.
- **Decision 4: MiniSearch over FlexSearch**:
  - *Chosen Approach*: ~7 KB bundle, 0.89 ms search latency, indexed in a dedicated `search.worker.ts`.
  - *Why*: Polyglot's typical workspace corpus (<10,000 documents) runs faster and uses less memory in MiniSearch, without the 20 KB bundle overhead of FlexSearch.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 POLYGLOT CODE STUDIO                                    │
│                                                                                         │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌────────────────────────┐  │
│  │   Monaco Studio IDE   │   │  Notebook View (/notebook│   │ Settings / Proposals   │  │
│  │  (Dual Lean 4/Python) │   │ (Interactive Cells/State)│   │ (3-Signal Discovery)   │  │
│  └───────────┬───────────┘   └────────────┬─────────────┘   └───────────┬────────────┘  │
│              │                            │                             │               │
│              ▼                            ▼                             ▼               │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          Unified ResultEnvelope<T> Layer                          │  │
│  │      { ok: true, value, correlationId } | { ok: false, error, correlationId }      │  │
│  └────────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                           │                                             │
│       ┌───────────────────────────────────┼───────────────────────────────────┐         │
│       ▼                                   ▼                                   ▼         │
│  ┌─────────────────────────┐ ┌─────────────────────────┐ ┌───────────────────────────┐  │
│  │  18 Bridge Services     │ │  notebook.worker (WASM) │ │  search.worker (MiniSearch)│  │
│  │  - ProofReuseService    │ │  - Persistent globals   │ │  - Files, evidence, chat  │  │
│  │  - ProposalLoop         │ │  - Pyodide runtime      │ │  - Proofs, notebooks      │  │
│  │  - TranslationGate      │ │  - Safe cell timeout    │ │  - Fast client search     │  │
│  │  - PastaLean / Lungo    │ │  - .ipynb export/import │ │  - Off-main-thread index  │  │
│  └────────────┬────────────┘ └────────────┬────────────┘ └─────────────┬─────────────┘  │
│               │                           │                            │                │
│               ▼                           ▼                            ▼                │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Tier 3 Persistence (IndexedDB)                             │  │
│  │        polyglot-notebooks · polyglot-search-index · polyglot-config-dismissed     │  │
│  └────────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Express API & Contract Boundary                         │  │
│  │   /api/v1/contracts/parity-check · /api/v1/config/proposals · /api/v1/notebook    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Sprint Breakdown

#### Sprint 13.1 — Unified `ResultEnvelope<T>` (Suite 149, 6 Sub-tests)
1. **Contract Definitions (`src/shared/contracts/result-envelope.ts`)**:
   - `SerializedBridgeError` conforming to RFC 9457 `ProblemDetails`.
   - `ResultEnvelope<T>` discriminated union on `ok: boolean`.
   - `VoidEnvelope` with explicit `value: null`.
   - `serializeBridgeError(error, correlationId)` and `unwrapEnvelope(envelope)` helpers.
2. **`withEnvelope()` Wrapper (`src/shared/contracts/with-envelope.ts`)**:
   - Intercepts calls, handles `BridgeError` and unforeseen exceptions gracefully with proper correlation IDs.
3. **Bridge Migration**:
   - Migrate 18 bridge services to return `ResultEnvelope<T>`.
4. **HTTP Serialization & Validation**:
   - Routes serialize envelopes directly, mapping `ok: false` to `error.httpStatus`.

#### Sprint 13.2 — Contract Parity: Zod v4 → JSON Schema → Pydantic v2 (Suite 150, 6 Sub-tests)
1. **JSON Schema Exporter (`src/services/contracts/json-schema-exporter.ts`)**:
   - Native `z.toJSONSchema()` with override injecting `discriminator: { propertyName }` for `ZodDiscriminatedUnion`.
   - Strict ban on `z.union()` for boundary schemas.
2. **Pydantic Generation Script (`scripts/generate-pydantic.py`)**:
   - Uses `datamodel-code-generator` without `--reuse-model` (preventing bug #3092).
   - Generates `schemas/generated_contracts.py` with `strict=True` and `extra='forbid'`.
3. **Parity Check Workflow & API (`server/src/routes/contracts.ts`)**:
   - Endpoint `POST /api/v1/contracts/parity-check` testing bidirectional validation of 10 boundary fixtures.

#### Sprint 13.3 — Native Notebook (Monaco + Pyodide, `notebook.worker`) (Suite 151, 6 Sub-tests)
1. **Isolated Worker (`src/workers/notebook.worker.ts`)**:
   - Persistent globals across cells (`import numpy as np` in cell 1 remains available in cell 2).
   - Cell timeout handling without killing user variables.
   - Explicit `RESTART_KERNEL` action returning `variablesLost: true`.
2. **Data Model & IndexedDB (`src/types/notebook.ts`)**:
   - `Notebook` and `NotebookCell` entities persisted in `polyglot-notebooks`.
   - Import/export for `.ipynb` and `.polyglot-notebook`.
3. **UI Implementation (`src/components/notebook/NotebookPanel.tsx` & `/notebook` Route)**:
   - Full-screen notebook workspace with cell execution, per-cell outputs, tabular duration badges, and status bar indicator.

#### Sprint 13.4 — Config Manager: Preset + Discovery + Proposal (Suite 152, 5 Sub-tests)
1. **Config Manager Core (`src/services/config/config-manager.ts`)**:
   - Evaluates Hardware (RAM, WebGPU VRAM), Usage (probe frequency, search frequency), and Benchmarks (cold load, INP).
   - Generates at most 3 sorted proposals with confidence ratings and numeric evidence.
   - Enforces `applyProposal(id, userConfirmed: true)` literal requirement (zero auto-apply).
   - 90-day dismissal persistence in `localStorage`.
2. **API & UI (`server/src/routes/config.ts` & `RecommendationsPanel.tsx`)**:
   - Integrated into Settings modal with individual apply/dismiss actions.

#### Sprint 13.5 — Verification Hardening & Dense Embeddings (Suite 153, 5 Sub-tests)
1. **Integrity Tests (`tests/phase-13/suite-153-integrity.test.ts`)**:
   - Archive SHA-256 round-trip, contract parity, hash-chain ledger, audit logs, and proof reuse certificate consistency.
2. **Dense Embeddings Worker Integration**:
   - Offloads `all-MiniLM-L6-v2` embedding generation to worker with HNSW fallback and `minSimilarity ≥ 0.90`.
3. **Mutation Testing & Meta-Scan Workflows**:
   - `.github/workflows/mutation.yml` (nightly Stryker/mutmut) and `.github/workflows/meta-scan.yml` (flaky/slow/dead tests).

#### Sprint 13.6 — Structural Diff & Cross-Artifact Search (Suite 154, 5 Sub-tests)
1. **Structural Diff Engine (`src/services/diff/structural-diff.ts`)**:
   - Uses `tree-sitter-lean` for AST-level semantic diffing of theorem bodies, binders, and proofs.
2. **Cross-Artifact Search Engine (`src/services/search/cross-artifact-search.ts` & `search.worker.ts`)**:
   - MiniSearch index over files, evidence, proofs, chat, and notebooks (<50ms query latency).

#### Cross-Cutting Integration (Suite 155, 5 Sub-tests)
- End-to-end integration across notebook execution, config proposals, ResultEnvelope unwrapping, contract parity, and kernel verification.
- Cumulative suite count: **186/186 suites passing (100%)**.

---

## 5. Verification Plan & Rollback Strategy

1. **Compilation & Type Check**: `npx tsc --noEmit` and `npm run lint`.
2. **Production Bundle Verification**: `npm run build` maintaining main bundle gzip $\le 180$ KB and total JS $\le 260$ KB.
3. **Test Suite Verification**: Run `npm test` verifying all 186 cumulative suites (1–148 regression suites + 149–155 new suites).
4. **Epistemic Audit**: Ensure no unverified declaration can achieve `SEAL_KERNEL_VERIFIED_TIER5`.
5. **Rollback Plan**:
   - Disable `ENABLE_RESULT_ENVELOPE` to fall back to `withEnvelope` compatibility shim.
   - Disable `ENABLE_CONTRACT_PARITY`, `ENABLE_NOTEBOOK`, and `ENABLE_CONFIG_MANAGER` via standard feature flag toggles.
