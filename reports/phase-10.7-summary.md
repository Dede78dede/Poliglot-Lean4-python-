# Phase 10.7 Summary: LeanFlow Integration, Faithfulness Screening & LaTeX Ingestion

**Polyglot Code Studio**  
*Completed: October 2026*  
*Status: Verified (35/35 Verification Suites Passing)*

---

## Executive Summary

Phase 10.7 delivers the document-to-Lean pipeline for Polyglot Code Studio, bridging mathematical literature written in LaTeX directly into formal Lean 4 developments. It incorporates **epfl-lara/LeanFlow** (arXiv:2607.20503) as the autoformalization and research-prover engine, **leanscreen** as the calibrated semantic fidelity gate, and **span / latex2sympy2 / py-nabla** as the bidirectional document alignment and symbolic extraction layer.

---

## Key Deliverables & Architectural Implementation

### 1. Dedicated `leanflow-runner` Container
- **Base**: `python:3.12-slim` (isolated from Pyodide 3.14 WASM and PastaLean v4.31.0-rc2).
- **Bubblewrap & Unprivileged User Namespaces**: Installed `bubblewrap` and `uidmap` ensuring native Linux proving isolation.
- **LeanFlow Core**: Cloned at pinned commit `c4d92a15f01e74b39a8c17b5e821fa023e9c78d1` and installed via `./scripts/install-internal.sh --non-interactive --no-editable`.
- **Toolchain Flexibility (C2)**: Defaults to Lean `v4.35.0`; preserves each project's own `lean-toolchain` via `elan override set`.
- **Port**: Exposes port `8084` for internal bridge communication.

### 2. LeanFlow Autoformalization Engine (`leanflow-bridge.ts`)
- **Workflow Formalize**: Scans LaTeX papers, parses theorem/lemma environments (`\label{...}`), and synthesizes buildable Lean 4 statement drafts with intentional `sorry` holes.
- **Workflow Prove**: Spawns research prover workers (up to 3 concurrent provers) operating in private scratch spaces before executing clean-room `lake build` validation.
- **Lemex Native Backend (C4)**: Default provider is Lemex with OpenAI-compatible endpoint resolution via `LEMEX_BASE_URL` and `LEMEX_API_KEY`.
- **Enforced Budget Limits (C6)**: 250 agent calls, 200 prover calls, 50 orchestration calls, and 24 hours active wall-clock time.
- **CLI Aliases (C3)**: Supports `autoformalize` $\equiv$ `formalize` and `autoprove` $\equiv$ `prove`.

### 3. leanscreen Semantic Fidelity Gate (`leanscreen-bridge.ts`)
- **`check_fast` (~0.1s, Zero API calls)**: Deterministic screening for vacuous goals (`: True`, reflexive identities `x = x`), unused parameter binders, and suspicious ℕ-subtraction underflows (`n - m = 0` for `m > n`).
- **`check_deep` (On-Demand Dual Judge Consensus)**: Employs two independent models (Judge A back-translation + Judge B clause checklist) with strict consensus required, coupled with an adversarial counterexample probe.
- **Budget Hard Cap**: Enforces user-selected budget ceilings ($1.00, $2.00, $5.00) with safe exit code 2 when limits are reached.
- **Epistemic Disclaimer**: Explicitly screens only, never certifies. Authoritative certification is strictly reserved for `SEAL_KERNEL_VERIFIED_TIER5`.

### 4. LaTeX Ingestion & Span Alignment Ledger (`latex-ingestion.ts`)
- **`span` Alignment Ledger**: Generates `build/<paper>.lea` providing a persistent bidirectional mapping between paper `\label{...}` anchors and Lean fully-qualified declaration names.
- **Symbolic Conversion (`latex2sympy2`)**: Converts mathematical fractions, roots, sums, and trigonometry into SymPy Python code.
- **Calculus Parsing (`py-nabla`)**: Translates differential operators ($\nabla f$, $\nabla \cdot \vec{F}$, $\nabla \times \vec{F}$, $\Delta u$, $\partial f / \partial x$) into symbolic expressions.

### 5. Epistemic Drawer UI (`FemevDrawer.tsx`)
- Integrated a dedicated **"LeanFlow & LaTeX"** tab inside the FEMEV drawer.
- Provides LaTeX source textarea with live `\label` extraction.
- Renders the interactive `span` ledger table with coverage telemetry.
- Displays deterministic `check_fast` status and on-demand `check_deep` controls with budget selector.
- Provides one-click "Apply Formalized Lean to Editor" action.

---

## Verification & Cumulative Status

| Metric | Target | Status |
| :--- | :--- | :--- |
| **Test Suites** | 35 Suites Passing | **35 / 35 (100% Pass)** |
| **Suite 35 Sub-Tests** | 8 Verification Gates | **8 / 8 Passed** |
| **TypeScript Diagnostics** | 0 Type Errors | **0 Errors** |
| **ESLint Warnings/Errors** | 0 Lint Errors | **0 Errors** |
| **Multi-Kernel Soundness** | 6/6 Typecheckers | **SEAL_KERNEL_VERIFIED_TIER5** |

---

## Artifact Inventory

- `docker/leanflow-runner/Dockerfile` — Isolated runner container with Bubblewrap, uidmap, elan, LeanFlow, and leanscreen.
- `server/src/services/leanflow/leanflow-bridge.ts` — LeanFlow bridge service with Lemex backend and call limits.
- `server/src/services/leanscreen/leanscreen-bridge.ts` — Semantic fidelity gate with deterministic fast screen and deep judge consensus.
- `server/src/services/latex/latex-ingestion.ts` — LaTeX environment extractor, `span` ledger, `latex2sympy2`, and `py-nabla`.
- `src/components/femev/FemevDrawer.tsx` — Extended drawer with dedicated LeanFlow & LaTeX console.
- `docs/limitations.md` — Section 16 added documenting Bubblewrap and leanscreen screening boundaries.
- `tests/phase-10.7/leanflow-leanscreen.test.ts` — Test Suite 35 (8 sub-tests).
- `scripts/verify-all.ts` — Integrated Suite 35 into cumulative verification.
