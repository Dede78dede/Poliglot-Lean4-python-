# Native Lean LSP Model Context Protocol (MCP) Architecture

**Polyglot Code Studio — Phase 10.2 Architectural Specification**  
*Document Version: 1.0.0 (October 2026)*  
*Conforms to Model Context Protocol (MCP) specification and Lean 4 Language Server Protocol (LSP).*

---

## 1. Executive Summary & Core Motivation

Polyglot Code Studio integrates a native **Lean LSP Model Context Protocol (MCP)** client designed to give local LLMs (specifically **Leanstral 1.5** MoE and deterministic provers) rich, bidirectional, structured access to the Lean 4 compiler, language server, and theorem discovery ecosystem.

Traditional AI-assisted theorem proving treats the language compiler as a black-box evaluator invoked only at the end of proof synthesis. The MCP architecture shifts this paradigm into an interactive loop:
- The AI reasoning agent queries compiler proof state, term types, and diagnostic trees at intermediate tactic positions.
- The agent searches Mathlib, LeanSearch, and Loogle dynamically while adhering to token-bucket rate limits.
- Mandatory Lean 4 kernel certification (`zero-sorry`) guarantees that no AI suggestion is committed to production without formal verification.

---

## 2. System Architecture & Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Polyglot Code Studio (Client)                      │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐  │
│   │   Monaco / Editor   │   │  MCP Tools Drawer    │   │ Lean Infoview   │  │
│   └──────────┬──────────┘   └──────────┬───────────┘   └────────┬────────┘  │
│              │                         │                        │           │
│              ▼                         ▼                        ▼           │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │            useSyncExternalStore / McpClientManager               │     │
│     └────────────────────────────────┬────────────────────────────────┘     │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Lean LSP MCP Client Engine                             │
│                                                                             │
│   ┌────────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│   │ Sanitization Gate      │  │ Rate Limiter       │  │ Kernel Verifier  │  │
│   │ validateProofSearch    │  │ 3 req / 30s        │  │ zero-sorry check │  │
│   └──────────┬─────────────┘  └─────────┬──────────┘  └────────┬─────────┘  │
│              │                          │                      │            │
│              └──────────────────────────┼──────────────────────┘            │
│                                         │                                   │
│   ┌─────────────────────────────────────┴───────────────────────────────┐   │
│   │                       Multi-Transport Engine                        │   │
│   │                                                                     │   │
│   │   [1] Stdio Subprocess (Default)                                    │   │
│   │       ├── Command: uvx lean-lsp-mcp OR rust-lean-mcp               │   │
│   │       └── Standard I/O newline-delimited JSON-RPC 2.0               │   │
│   │                                                                     │   │
│   │   [2] Streamable-HTTP Fallback                                      │   │
│   │       ├── POST /mcp/tools/call                                      │   │
│   │       └── Header: Authorization: Bearer <LEAN_LSP_MCP_TOKEN>        │   │
│   │                                                                     │   │
│   │   [3] SSE Fallback                                                  │   │
│   │       ├── GET /mcp/events (Server-Sent Events)                      │   │
│   │       └── POST /mcp/messages                                        │   │
│   └─────────────────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       External Lean 4 Infrastructure                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ lean-lsp-mcp (PyPI / project-numina) OR rust-lean-mcp (LarsenClose) │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Lake Toolchain · Lean 4 Server (lean --server) · Lean Kernel        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Transports & Connection Lifecycle

The client implements the `McpTransport` abstraction with three concrete strategies:

### 3.1. Stdio Transport (Default)
- **Use Case**: Local development, desktop workstations, and standard self-hosted containers.
- **Process Spawning**:
  - Python/uv: `uvx lean-lsp-mcp` (or configured via `LEAN_LSP_MCP_COMMAND`).
  - Rust: `rust-lean-mcp` native binary.
- **Environment**:
  - `LEAN_PROJECT_PATH`: Root directory of the Lean project containing `lakefile.lean`.
  - `LEAN_LOG_LEVEL`: Configurable logging level (`info`, `debug`, `warn`, `error`).
- **Framing**: UTF-8 newline-delimited JSON-RPC 2.0 payloads over standard input/output.

### 3.2. Streamable-HTTP Transport (Fallback)
- **Use Case**: Headless microservices, Kubernetes clusters, and containerized proof farms.
- **Endpoint**: Configurable via `LEAN_LSP_MCP_ENDPOINT` (e.g., `http://lean-cluster:8080/mcp`).
- **Authentication**: `Authorization: Bearer <LEAN_LSP_MCP_TOKEN>` header.

### 3.3. Server-Sent Events (SSE) Transport (Fallback)
- **Use Case**: Long-running proof sessions requiring push notifications for compiler progress, elaboration milestones, and background batch evaluations.
- **Connection**: HTTP GET stream for incoming events; synchronous HTTP POST for RPC method calls.

---

## 4. Full 26-Tool Execution Matrix

The client declares and dispatches the exact 26-tool matrix matching `lean-lsp-mcp` and `rust-lean-mcp`, organized across 7 functional categories:

| # | Tool Identifier | Category | External Search | Purpose & Input Summary |
|---|-----------------|----------|:---------------:|-------------------------|
| 1 | `lean_file_outline` | `file-analysis` | No | Retrieves structural AST outline of declarations, theorems, and imports. |
| 2 | `lean_diagnostic_messages` | `file-analysis` | No | Fetches compiler errors, warnings, and infos for a target file. |
| 3 | `lean_declaration_file` | `file-analysis` | No | Resolves file path and line location for a given declaration name. |
| 4 | `lean_goal` | `proof-state` | No | Extracts active tactic proof goals (hypotheses and target) at line/col. |
| 5 | `lean_term_goal` | `proof-state` | No | Extracts expected type of the sub-term at cursor position. |
| 6 | `lean_proof_tree` | `proof-state` | No | Generates hierarchical tactic proof step tree for proof navigation. |
| 7 | `lean_verify_kernel` | `proof-state` | No | **Mandatory Kernel Verification**: Executes clean Lean elaboration checking for `zero-sorry` compliance. |
| 8 | `lean_hover_info` | `code-intelligence` | No | LSP hover docstring and type signature for symbol at line/col. |
| 9 | `lean_completions` | `code-intelligence` | No | Contextual code completion candidates at cursor position. |
| 10 | `lean_run_code` | `code-intelligence` | No | Ephemeral evaluation of a Lean expression (`#eval` / `#check`). |
| 11 | `lean_multi_attempt` | `code-intelligence` | No | Evaluates multiple candidate tactic scripts in parallel sandbox. |
| 12 | `lean_dependency_graph` | `code-intelligence` | No | Calculates transitive module and import dependency DAG. |
| 13 | `lean_local_search` | `search` | No | Ripgrep-based symbol search across active local project files. |
| 14 | `lean_leansearch` | `search` | **Yes (Rate-limited)** | Natural-language semantic search across Mathlib via LeanSearch API. |
| 15 | `leansearch_leandex` | `search` | **Yes (Rate-limited)** | Hybrid BM25/Dense semantic retrieval over Lean Index. |
| 16 | `lean_loogle` | `search` | **Yes (Rate-limited)** | Type-directed search querying lemmas by input/output type pattern. |
| 17 | `lean_leanfinder` | `search` | **Yes (Rate-limited)** | Structural premise and lemma search across formal libraries. |
| 18 | `lean_state_search` | `search` | **Yes (Rate-limited)** | Retrieves relevant lemmas matching the current open proof goal state. |
| 19 | `lean_hammer_premise` | `tactics` | No | Ranks premise lemma candidates for automated hammer tactics. |
| 20 | `lean_tactic_suggest` | `tactics` | No | Computes candidate next tactics based on LSP goal structure. |
| 21 | `lean_proof_repair` | `tactics` | No | Analyzes broken tactic steps and proposes localized fixes. |
| 22 | `lean_build` | `build` | No | Executes `lake build` and returns compilation status and logs. |
| 23 | `lean_clean` | `build` | No | Cleans build artifacts (`lake clean`). |
| 24 | `lean_widget_render` | `widgets-profiling` | No | Renders UserWidget interactive HTML/React visual state. |
| 25 | `lean_profiler_inspect` | `widgets-profiling` | No | Inspects elaboration and heartbeats profiler metrics. |
| 26 | `lean_batch_eval` | `widgets-profiling` | No | Batch evaluates an array of formal propositions against kernel. |

---

## 5. Security, Rate Limiting & Verification Invariants

### 5.1. Token-Bucket Rate Limiter on External Search
External search tools (`lean_leansearch`, `leansearch_leandex`, `lean_loogle`, `lean_leanfinder`, `lean_state_search`) query public community infrastructure.
- **Rule**: Maximum **3 requests per 30 seconds**.
- **Enforcement**: In-memory token bucket (`McpRateLimiter`).
- **Response upon exhaustion**:
  ```json
  {
    "success": false,
    "toolName": "lean_loogle",
    "rateLimited": true,
    "error": "RATE_LIMITED: External search rate limit reached (3 requests / 30s). Retry in 18s."
  }
  ```

### 5.2. Query Sanitization Gate
All search queries and tactical input strings are sanitized via `validateProofSearchQuery` before dispatch:
- Maximum length: 1,024 characters.
- Prohibited control sequences and malicious injection patterns rejected with descriptive validation errors.

### 5.3. Mandatory Kernel Verification
AI synthesis can suggest tactics, but **never** mark a proof verified on model confidence alone.
- Every proof candidate extracted or suggested must be certified through `lean_verify_kernel`.
- Proofs containing unelaborated holes, unproved obligations, or `sorry` are classified as incomplete.

---

## 6. Leanstral 1.5 Serving Profiles

When `LEANSTRAL_ENDPOINT` is configured, Polyglot Code Studio defaults to `LeanstralLocalProvider`. Two standard deployment profiles are supported:

### Profile A: vLLM High-Throughput (Production Server)
- **Hardware Target**: 4× NVIDIA A100 80GB (or single NVIDIA DGX Spark / GB10 with NVFP4A16 MARLIN backend).
- **vLLM Launch Command**:
  ```bash
  vllm serve mistralai/Leanstral-1.5-119B \
    --tensor-parallel-size 4 \
    --max-model-len 204800 \
    --dtype bfloat16 \
    --port 8000
  ```
- **Context Window**: 200,000 tokens recommended (up to 256K architectural maximum).
- **API Dialect**: OpenAI-compatible `/v1/completions` and `/v1/chat/completions`.

### Profile B: Ollama / llama.cpp (Workstation Developer)
- **Hardware Target**: Single workstation GPU (e.g. RTX 4090 24GB or Mac Studio Apple Silicon).
- **Model**: Quantized GGUF (`Q4_K_M` or reduced 12GB variant).
- **Ollama Launch Command**:
  ```bash
  ollama run leanstral-1.5:q4_k_m
  ```
- **Endpoint**: `http://localhost:11434/api/generate`.

---

## 7. Groundwork for Phase 10.3 (MCP Server Hub)

Phase 10.2 establishes the core contracts that enable Phase 10.3 to generalize into a multi-server MCP Hub:
1. **Dynamic Provider Registration**: `McpClientManager` registers servers with arbitrary transport configurations.
2. **Standardized Tool Declarations**: Tools expose standard JSON-schema parameters allowing automated Monaco command palette integration and LLM tool calling.
3. **Reactive UI Binding**: `useSyncExternalStore` integration in `McpToolsDrawer` demonstrates real-time connection telemetry without re-render penalties.
