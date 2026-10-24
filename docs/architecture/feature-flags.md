# Architecture Reference: Unified Feature Flag Registry

**Polyglot Code Studio — Phase 10.9 Architecture**  
*Single Source of Truth: `src/services/flags/feature-flag-registry.ts`*

---

## 1. Overview

Polyglot Code Studio manages 26 feature flags (25 `ENABLE_*` flags and 1 `PIPELINE_*` policy flag) through a single typed registry: `FeatureFlagRegistry`. 

### Key Invariants:
1. **Conservative Default Posture**: Experimental and resource-heavy subsystems default to `false`. Established, lightweight search and discovery utilities default to `true`.
2. **Tab-Local Scoping**: Feature flag state is tab-local by default (`multiTabSync: false`). This allows researchers and engineers to test distinct proving profiles or experimental bridges in parallel browser tabs without cross-polluting ongoing sessions.
3. **Persistent User Overrides**: User overrides made in the UI persist into IndexedDB (`polyglot-feature-flags`, store `overrides`) for the local device.
4. **Environment Precedence**: Environment variables at startup take precedence over code defaults.
5. **No Silent Drift**: Any `ENABLE_*` environment variable not registered in `FEATURE_FLAGS` emits a non-fatal `FEATURE_FLAG_UNKNOWN` diagnostic warning.

---

## 2. Catalog of Flags

| Flag Name | Default | Phase | Category | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ENABLE_FEMEV` | `false` | 10.5 | `runtime` | 6-kernel paranoid verification & epistemic state machine |
| `ENABLE_PASTALEAN` | `false` | 10.6 | `runtime` | Python $\to$ Lean 4 translation & AST bridge |
| `ENABLE_LUNGO` | `false` | 10.6 | `runtime` | Lean 4 $\to$ 6 target language compilation & verification export |
| `ENABLE_LEANFLOW` | `false` | 10.7 | `runtime` | LaTeX document formalization & automated research proving |
| `ENABLE_LEANSCREEN` | `false` | 10.7 | `runtime` | Semantic fidelity screening (check_fast & check_deep) |
| `ENABLE_LATEX_INGESTION` | `false` | 10.7 | `runtime` | LaTeX AST extraction & bidirectional span ledger |
| `ENABLE_LEANCERT` | `false` | 10.8 | `runtime` | Certified numerical verification (interval, Taylor, solver) |
| `ENABLE_LEAN_FINDER_V2` | `true` | 10.8 | `runtime` | Primary free semantic Mathlib search (`leanfinder.github.io`) |
| `ENABLE_LEANSEARCH_V2` | `true` | 10.8 | `runtime` | Secondary reasoning mode search (`leansearch.net`) |
| `ENABLE_LEANEXPLORE` | `true` | 10.8 | `runtime` | Multi-package read-only search (`leanexplore.com`) |
| `ENABLE_MCP_SERVER` | `false` | 10.3 | `runtime` | Native Lean LSP MCP Server Hub |
| `ENABLE_MCP_HTTP_TRANSPORT`| `false` | 10.3 | `runtime` | Streamable HTTP MCP transport |
| `ENABLE_LEAN_RESERVOIR` | `true` | 10.3 | `runtime` | Reservoir package registry integration |
| `ENABLE_NUMPYSPEC` | `false` | 10.8 | `tooling` | Formally verified NumPy matrix operations |
| `ENABLE_NERODIA` | `false` | 10.8 | `tooling` | Lean $\ge 4.33$ Python C-extension compiler |
| `ENABLE_PROVEPY` | `false` | 10.8 | `tooling` | Educational `@provable` decorator autoformalization |
| `ENABLE_LEAN_FMT` | `false` | 10.8 | `tooling` | Syntax formatter with conservative indent fallback |
| `ENABLE_HERON` | `false` | 10.8 | `tooling` | Heron AST linter & code refactor actions (`lean-fork/v4.31.0`) |
| `ENABLE_VERSO` | `false` | 10.8 | `tooling` | Verso Blueprint v4.33.0 graph generation |
| `ENABLE_LEAN_ATLAS` | `false` | 10.8 | `tooling` | 8-edge interactive DAG canvas viewer |
| `ENABLE_CRAMF` | `false` | 10.8 | `experiment` | Context-Retrieval Augmented Math Formalization (+29.9%) |
| `ENABLE_ARCHON_HORIZON` | `false` | 10.3 | `experiment` | Multi-agent prover swarm |
| `ENABLE_DUPER` | `false` | 8 | `experiment` | Duper automated first-order prover |
| `ENABLE_LEANSAGE` | `false` | 8 | `experiment` | LeanSage computer algebra integration |
| `ENABLE_PYODIDE_BUILD` | `false` | 10.1 | `experiment` | Dynamic PEP 783 WASM wheel compilation |
| `ENABLE_PAPERPROOF` | `false` | 10.9.5 | `runtime` | Paperproof interactive proof-tree playback and visualization |
| `ENABLE_MATHESIS` | `false` | 10.9.5 | `runtime` | Mathesis natural-language to Lean 4 autoformalization bridge |
| `ENABLE_EDUCATIONAL_MODE` | `false` | 10.9.5 | `tooling` | Educational mode templates (Robo, Lean4Game) in Lean Editor |
| `PIPELINE_STRICT_GOALS` | `false` | 10.5 | `policy` | Reject admitting unproven sorry holes in pipeline |
