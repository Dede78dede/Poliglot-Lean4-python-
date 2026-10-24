# Phase 10.4 Consolidated Architectural Decisions

**Polyglot Code Studio**  
*Date: October 20, 2026*  
*Status: Ratified & Implemented*

---

## 1. Summary of Architectural Decision Records (ADRs)

| ADR | Title | Decision Outcome | Status |
|---|---|---|---|
| **ADR-0001** | Pyodide WASM Engine | Browser-native Python 3.14 via Pyodide WebAssembly with OPFS caching | Accepted |
| **ADR-0002** | Kimina Lean Server | Local-first Lean 4 REPL server with deterministic simulation fallback | Accepted |
| **ADR-0003** | Five-Tier Memory Architecture | L1 Cache -> L2 Buffer -> L3 IndexedDB -> L4 OPFS -> L5 Deduplicated Zip | Accepted |
| **ADR-0004** | Biome vs ESLint | Biome for fast code formatting, TSC for strict type-checking | Accepted |
| **ADR-0005** | CMDK Command Palette | Lightweight accessible command palette with fuzzy search | Accepted |
| **ADR-0006** | AiProvider Strategy Pattern | Discriminated union strategy pattern; NoAiProvider offline default | Accepted |
| **ADR-0007** | Five-Level Auto-Correction | Deterministic L1 -> Loop L2 -> Speculative L3 -> Cloud L4 -> Certified L5 | Accepted |
| **ADR-0008** | Blueprint DAG Claims | Monotonic event-sourced shared ledger with 409 conflict detection | Accepted |
| **ADR-0009** | Navigation Foundation | WAI-ARIA roving tabindex, context key evaluation, and keybindings | Accepted |
| **ADR-0010** | Experimental Tool Flags | Default-false feature flag gating for all experimental extensions | Accepted |
| **ADR-0011** | Hybrid WebMCP vs Streamable-HTTP | Streamable-HTTP (spec 2026-07-28) primary; WebMCP polyfill fallback | Accepted |
| **ADR-0012** | Agent Sandbox Selection | `clawcontainer` (WebContainers WASM, MIT) over `wasmclaw` and `peerd` | Accepted |

---

## 2. Resource-Aware AI Profile Architecture

To guarantee inclusivity across developer workstations while supporting cutting-edge formal mathematics:
1. **Lite Profile (2 GB RAM, 0 GB VRAM)**:
   - For all legacy/budget machines.
   - Zero local AI models are loaded.
   - All non-AI editor features (Python Pyodide execution, syntax highlighting, Lake dependencies, RO-Crate metadata, Mathlib navigation) are **100% functional**.
   - Cloud free APIs (Gemini, Groq, NVIDIA NIM) can be toggled on optionally.
2. **Standard Profile (8 GB RAM + 6 GB VRAM)**:
   - **The realistic optimum for self-hosted developer laptops** (e.g. RTX 3060/4060 with 8 GB VRAM).
   - Runs a 7B-class Q4_K_M model consuming **6.2 GB VRAM with 8K KV cache**.
   - Sound formal synthesis guaranteed via the kernel verification gate.
3. **Full Profile (32 GB RAM + 78 GB VRAM)**:
   - Reserved for institutional compute nodes (4× A100 80GB or DGX Spark).
   - Serves Leanstral 1.5 119B/6.5B MoE with 200K/256K context.
   - **Explicit rule**: No configuration of the 119B model fits in 8 GB RAM.

---

## 3. Secret Management & Token Vault Policy

- **Encryption**: All API keys, GitHub tokens, and provider credentials are encrypted using PBKDF2 (100,000 iterations, SHA-256) and AES-GCM-256 before writing to local storage.
- **Zero-Knowledge**: Raw secret plaintext is never persisted unencrypted and is cleared upon session lock.
- **Local Audit Log**: Every secret creation, retrieval, rotation, and deletion is recorded in a local-only audit ledger (`polyglot_secret_audit_log_v1`). Zero network transmission.
- **Config Export**: `configRepository.exportConfig()` explicitly strips all secret keys, exporting only provider endpoints, models, rate limits, and safe references.

---

## 4. Token Budget Enforcement Policy

- Real-time token usage is recorded per provider on both prompt and generation tokens.
- Automatic notifications are dispatched at **80%** and **95%** daily limit consumption.
- Immediate call blocking (`BUDGET_EXHAUSTED`) is strictly enforced at **100%**.
- Quotas automatically reset at **00:00:00Z (UTC midnight)** daily and on the **1st of each calendar month**.
