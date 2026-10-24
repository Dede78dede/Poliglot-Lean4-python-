# Phase 10.2 Summary — Leanstral 1.5 Default Policy & Native Lean LSP MCP Foundation

**Polyglot Code Studio**  
*Date: October 19, 2026*  
*Status: COMPLETED & VERIFIED (30/30 Test Suites Passing, 100%)*

---

## 1. Executive Summary

Phase 10.2 establishes **Leanstral 1.5** (119B/6.5B active MoE, Apache-2.0) as the primary default tactic synthesizer for Polyglot Code Studio whenever configured, integrates dual self-hosted serving profiles (vLLM and Ollama/llama.cpp), and deploys a native Model Context Protocol (MCP) client interfacing directly with `lean-lsp-mcp` (PyPI) and `rust-lean-mcp` (Rust).

All Phase 10.1 completion review observations have been resolved and verified with automated test suites.

---

## 2. Completed Milestones & Deliverables

### Milestone 1 — Phase 10.1 Completion Verification
- **Task V10.1-1 (Suite 29 Sub-tests)**:
  - Strict rejection of obsolete `pyemscripten_2025_0` ABI with exact diagnostic explanation.
  - Offline snapshot fallback on network timeout (1ms abort signal simulation).
  - Strict conditional gating of `PyodideBuildConfirmationModal` (`ENABLE_PYODIDE_BUILD=true` AND tier `'build-required'`).
- **Task V10.1-2 (Runtime Wheel Installation Test)**:
  - Automated offline worker wheel installation test (`pydantic_core-2.27.2-cp314-cp314-pyemscripten_2026_0_wasm32.whl`) passing in CI without prerelease flags or network access.
- **Task V10.1-3 (Snapshot Registry Size & Coverage)**:
  - 383 packages indexed across Green (15), Blue (29), Purple (3), Cyan (300), and Yellow (36) tiers.
  - Gzipped size: **6.05 KB** (utilizing only 7.6% of the 80 KB budget).
- Verified in `reports/phase-10.1-completion-verification.md`.

### Milestone 2 — Leanstral-First AI Provider Policy
- **Policy Implementation**: `resolveDefaultProvider(env)` prioritizes `leanstral` if `LEANSTRAL_ENDPOINT` is configured, then `axle` if `AXLE_API_KEY` is present, defaulting to `no-ai` (deterministic heuristics) only when unconfigured.
- **Dual Serving Profiles**:
  - **Profile A (vLLM)**: High-concurrency production serving with `--tensor-parallel-size 4`, 200K context, and MARLIN NvFp4 backend on DGX/A100 hardware. Automatically detected for endpoints containing `/v1/`.
  - **Profile B (Ollama / llama.cpp)**: Workstation developer serving quantized GGUF models (`Q4_K_M`) over `/api/generate`.
- **UI Integration**: StatusBar displays active provider status (`Leanstral 1.5 (MoE)` vs `Pantograph (Local)`).

### Milestone 3 — Native Lean LSP MCP Client
- **Transport Strategy**: `StdioMcpTransport` default subprocess execution, with transparent fallback to `HttpMcpTransport` (Streamable-HTTP) and `SseMcpTransport` (Server-Sent Events) supporting `LEAN_LSP_MCP_TOKEN` bearer authentication.
- **Full 26-Tool Execution Matrix**:
  - File Analysis & Diagnostics (3): `lean_file_outline`, `lean_diagnostic_messages`, `lean_declaration_file`.
  - Proof State & Goals (4): `lean_goal`, `lean_term_goal`, `lean_proof_tree`, `lean_verify_kernel`.
  - Code Intelligence (5): `lean_hover_info`, `lean_completions`, `lean_run_code`, `lean_multi_attempt`, `lean_dependency_graph`.
  - Semantic & External Search (6): `lean_local_search`, `lean_leansearch`, `leansearch_leandex`, `lean_loogle`, `lean_leanfinder`, `lean_state_search`.
  - Tactics, Premise & Repair (3): `lean_hammer_premise`, `lean_tactic_suggest`, `lean_proof_repair`.
  - Build & Maintenance (2): `lean_build`, `lean_clean`.
  - Widgets, Profiling & Batch (3): `lean_widget_render`, `lean_profiler_inspect`, `lean_batch_eval`.
- **Security & Safety Invariants**:
  - Token-bucket rate limiter enforcing 3 requests / 30 seconds on external search tools (`lean_leansearch`, `leansearch_leandex`, `lean_loogle`, `lean_leanfinder`, `lean_state_search`).
  - Input sanitization gate reusing `validateProofSearchQuery` rejecting illegal control characters, oversized payloads (>10k chars), and unbalanced delimiters.
  - Mandatory kernel verification: `lean_verify_kernel` rejects `sorry`/`admit` and certifies complete formal proofs with `SEAL_KERNEL_VERIFIED_TIER5`.

### Milestone 4 — UI MCP Inspector Drawer & Architecture Specification
- **`McpToolsDrawer.tsx`**: Slide-over drawer with real-time transport telemetry, category filtering, search, parameter schema inspection, and test tool invocation.
- **`useSyncExternalStore` Bridge**: Reactively synchronizes MCP client connection state and transport type with zero unneeded re-renders.
- **`docs/mcp-architecture.md`**: Comprehensive architectural documentation covering system topology, transports, the 26-tool matrix, security invariants, and groundwork for Phase 10.3 (MCP Server Hub).

### Milestone 5 — Test Suite 30 & Verification Audit
- Added Test Suite 30 to `scripts/verify-all.ts` validating:
  - 30.1 Leanstral-First Policy Resolution
  - 30.2 Dual Serving Profiles (vLLM & Ollama/llama.cpp)
  - 30.3 MCP Client Stdio Transport Lifecycle & useSyncExternalStore Snapshot
  - 30.4 Streamable-HTTP and SSE Transport Fallback with Bearer Token
  - 30.5 Full 26-Tool Matrix Declaration, Categories, and Schema Validation
  - 30.6 External Search Rate-Limiting (Token Bucket: 3 req / 30s)
  - 30.7 Query Sanitization Gate Reusing validateProofSearchQuery
  - 30.8 Mandatory Kernel Verification Certification on Proof State Extraction
- **Verification Results**:
  - `npx tsx scripts/verify-all.ts`: **30/30 suites PASSED (100%)**
  - `npm run lint` (`tsc --noEmit`): **0 errors**
  - `npm run build`: **Success (1.77s)**
