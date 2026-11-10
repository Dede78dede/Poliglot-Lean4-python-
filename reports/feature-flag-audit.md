# Feature Flag Governance and Ownership Audit

**Milestone**: Phase 14.9.9.1 (Window 2)  
**Total Registered Flags**: 62  
**Status**: 100% Compliant (All 62 flags annotated with squad owners, phases, categories, behaviors when off, and expiry horizons)

---

## 1. Executive Summary

As codified in ADR-016 and the Feature Flag Governance standard (Milestone M7), every feature flag in Polyglot Code Studio must be registered in `src/services/flags/feature-flag-registry.ts` with strict metadata:
- **Squad Owner**: Designates the engineering team responsible for lifecycle and deprecation.
- **Phase**: Architecture phase where the flag was introduced.
- **Category**: One of `runtime`, `tooling`, `experiment`, `policy`.
- **Behavior When Off**: Guaranteed fail-closed behavior (`503` service unavailable, `404` route not found, or `noop`).
- **Expiry Horizon**: Upper threshold date by which the flag must be either stabilized into core or removed.

---

## 2. Complete Inventory of Registered Flags (62 Total)

| Flag Name | Default | Phase | Category | Owner | Behavior When Off | Expiry Date |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ENABLE_FEMEV` | `false` | 10.5 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_PASTALEAN` | `false` | 10.6 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_LUNGO` | `false` | 10.6 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_LEANFLOW` | `false` | 10.7 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_LEANSCREEN` | `false` | 10.7 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_LATEX_INGESTION` | `false` | 10.7 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_LEANCERT` | `false` | 10.8 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_NUMPYSPEC` | `false` | 10.8 | tooling | squad-tooling | 503 | 2027-12-31 |
| `ENABLE_NERODIA` | `false` | 10.8 | tooling | squad-tooling | 503 | 2027-12-31 |
| `ENABLE_PROVEPY` | `false` | 10.8 | tooling | squad-tooling | 503 | 2027-12-31 |
| `ENABLE_LEAN_FMT` | `false` | 10.8 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_HERON` | `false` | 10.8 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_VERSO` | `false` | 10.8 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_LEAN_FINDER_V2` | `true` | 10.8 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_LEANSEARCH_V2` | `true` | 10.8 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_LEANEXPLORE` | `true` | 10.8 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_CRAMF` | `false` | 10.8 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_LEAN_ATLAS` | `false` | 10.8 | tooling | squad-tooling | 404 | 2027-12-31 |
| `ENABLE_MCP_SERVER` | `false` | 10.3 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_MCP_HTTP_TRANSPORT` | `false` | 10.3 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_ARCHON_HORIZON` | `false` | 10.3 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_LEAN_RESERVOIR` | `true` | 10.3 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_DUPER` | `false` | 8 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_LEANSAGE` | `false` | 8 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_PYODIDE_BUILD` | `false` | 10.1 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_PAPERPROOF` | `false` | 10.9.5 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_MATHESIS` | `false` | 10.9.5 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_EDUCATIONAL_MODE` | `false` | 10.9.5 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_UNIFIED_SEARCH` | `true` | 10.9.7 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_LSPEC_CI_TEMPLATE` | `false` | 10.9.7 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_MCP_DISCOVER` | `true` | 10.10 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_MCP_STATELESS` | `true` | 10.10 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_TOOL_SEARCH` | `false` | 10.10 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_MCP_GATEWAY` | `false` | 10.10 | experiment | squad-experiment | 503 | 2027-12-31 |
| `ENABLE_SKILL_BUNDLES` | `false` | 10.10 | tooling | squad-tooling | noop | 2027-12-31 |
| `ENABLE_DEEPSEEK_KIMI_MINIMAX` | `false` | 10.10 | experiment | squad-experiment | 503 | 2027-12-31 |
| `ENABLE_ACTIVITY_BAR` | `true` | 11.0.1 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_FILE_MANAGER` | `true` | 11.0.1 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_DIFF_VIEWER` | `true` | 11.0.1 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_CONTEXT_ENGINE` | `false` | 11.0.1 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_LLM_CHAT` | `false` | 11.0.2 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_SETTINGS_UI` | `true` | 11.0.2 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_AGENTIC_AUTOMATION` | `false` | 11.0.2 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_PROJECT_SCAFFOLDING` | `true` | 11.0.2 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_LEAN_BEAM` | `false` | 11.1 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_WORKSPACE_ARCHIVE` | `true` | 11.2 | runtime | squad-runtime | 503 | 2027-12-31 |
| `ENABLE_PAPERPROOF_PLAYBACK` | `false` | 11.2 | tooling | squad-tooling | 404 | 2027-12-31 |
| `ENABLE_OTEL_BROWSER` | `false` | 11.2 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_OTEL_NODE` | `false` | 11.2 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_YJS_COLLABORATION` | `false` | 11.2 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_REACT_COMPILER` | `false` | 11.3 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_VIRTUALIZED_LISTS` | `true` | 11.3 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_PROOF_REUSE` | `true` | 12 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_PROPOSAL_LOOP` | `false` | 12 | experiment | squad-experiment | 503 | 2027-12-31 |
| `ENABLE_TRANSLATION_FIDELITY` | `true` | 12 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_LP2` | `false` | 12 | experiment | squad-experiment | 503 | 2027-12-31 |
| `ENABLE_TREETHINK` | `false` | 12 | experiment | squad-experiment | noop | 2027-12-31 |
| `ENABLE_RESULT_ENVELOPE` | `true` | 13 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_CONTRACT_PARITY` | `true` | 13 | runtime | squad-runtime | noop | 2027-12-31 |
| `ENABLE_NOTEBOOK` | `true` | 13 | runtime | squad-runtime | 404 | 2027-12-31 |
| `ENABLE_CONFIG_MANAGER` | `true` | 13 | runtime | squad-runtime | noop | 2027-12-31 |
| `PIPELINE_STRICT_GOALS` | `false` | 10.5 | policy | squad-core | noop | 2027-12-31 |
