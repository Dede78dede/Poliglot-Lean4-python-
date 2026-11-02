# Architecture: lean-beam Speculative Tactic Execution

**Phase**: 11.1  
**Last verified**: 2026-10-29  
**Status**: APPROVED & IMPLEMENTED  

---

## 1. Architectural Overview & Process Model

Polyglot Code Studio embeds `leanprover/lean-beam` as a local broker owned directly by the Node/Express backend process via stdio JSON-RPC 2.0.

```
+-----------------------------------------------------------------------------------+
| Polyglot Code Studio (Browser Frontend)                                           |
|                                                                                   |
| ChatPanel.tsx (/probe)  <--->  Monaco Editor Context (path, ver, line, col)       |
|          |                                                                        |
|          v                                                                        |
| Speculative Probe Card: [Goals Before] <---> [Goals After] + [Apply Tactic]      |
+-----------------------------------------------------------------------------------+
                                       |
                                       v REST / SSE (/api/v1/proof/probe)
+-----------------------------------------------------------------------------------+
| Polyglot Backend Service (Node.js / Express)                                      |
|                                                                                   |
| McpServer: polyglot_probe_tactic & polyglot_propose_proof (mcp-server.ts)         |
|                                      |                                            |
|                                      v                                            |
| LeanBeamClient (src/services/mcp/lean-beam-client.ts)                             |
|                                      |                                            |
|                   +------------------+------------------+                         |
|                   | JSON-RPC 2.0 (MCP 2026-07-28 stdio) |                         |
|                   v                                     v                         |
|      lean-beam-mcp Subprocess               LRU Workspace Manager (Max 3)         |
|      (~/.local/bin/lean-beam-mcp)           (Evicts via lean-beam release)        |
+-----------------------------------------------------------------------------------+
                                       |
                                       v IPC
+-----------------------------------------------------------------------------------+
| Lean 4 LSP Server (Lean FRO Beam Plugin)                                          |
| Toolchain: v4.34.0-rc1 (femev-runner)                                             |
| In-memory AST evaluation: runAt, runAtHandle, runWith, runWithLinear, todo        |
| Zero file mutation | Zero lakefile modification                                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Protocol Conformance: MCP 2026-07-28

The client and broker conform to the latest standard Model Context Protocol (MCP 2026-07-28):
1. **Stateless Operations**: Each request transmits complete document version and positional context (`path`, `version`, `line`, `character`, `text`).
2. **Public Cache TTL**: `server/discover` and `tools/list` responses are cached with a 1-hour TTL.
3. **Deprecation of In-Band Logging**: Real-time broker telemetry and debug traces are directed to `stderr` rather than in-band notifications.
4. **Header Contracts**: All JSON-RPC messages include `Mcp-Method` and `Mcp-Name` descriptors where required.

---

## 3. Tool Surface & Permission Annotations

The integration exposes 5 curated tools (safe) and advertises 74 projected tools (total 79 tools):
- `lean_run_at`: `permission: 'safe'`, `readOnlyHint: true`, `destructiveHint: false`.
- `lean_run_at_handle`: `permission: 'safe'`, `readOnlyHint: false`, `destructiveHint: false`.
- `lean_run_with`: `permission: 'safe'`, `readOnlyHint: false`, `destructiveHint: false`.
- `lean_run_with_linear`: `permission: 'safe'`, `readOnlyHint: false`, `destructiveHint: false`.
- `lean_todo`: `permission: 'safe'`, `readOnlyHint: true`, `destructiveHint: false`.
- 11 `ctx_*` context tools (`ctx_compose`, `ctx_explore`, `ctx_knowledge`, `ctx_callgraph`, etc.).

---

## 4. Epistemic Discipline Invariant

A fundamental tenet of Polyglot Code Studio's epistemic architecture is that speculative tactic probing NEVER certifies formal truth:
- `goalsAfter: []` in a probe result signifies that Lean's elaboration engine speculatively closed the goal in temporary memory.
- It **never** promotes a theorem declaration to `formally-proven`.
- Authoritative certification is exclusively granted by the multi-kernel paranoid verifier (`femevEngine`) issuing the cryptographic token `SEAL_KERNEL_VERIFIED_TIER5`.

---

## 5. Feature Flags & Safe Rollback Matrix

| State | Flag Value | Behavior |
|---|---|---|
| **Default (Safe)** | `ENABLE_LEAN_BEAM=false` | `polyglot_probe_tactic` returns 404 / `FEATURE_DISABLED`; `/api/v1/proof/probe` returns 404; candidate tactics in `polyglot_propose_proof` bypass speculative pre-screening. |
| **Active** | `ENABLE_LEAN_BEAM=true` | Full speculative execution enabled across ChatPanel, MCP tools, and proof proposal pipeline. |
| **Broker Failure** | Broker offline | Emits RFC 9457 `LEAN_BEAM_UNAVAILABLE` (HTTP 503, retryable). |
| **Toolchain Mismatch** | Unqualified toolchain | Emits RFC 9457 `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` (HTTP 422, non-retryable). |

---

*Last verified: 2026-10-29*
