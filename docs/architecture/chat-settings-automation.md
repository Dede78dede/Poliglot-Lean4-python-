# Architecture: LLM Chat, Settings System & Autonomous Automations

**Phase**: 11.0.2  
**Last verified**: 2026-10-29  
**Status**: APPROVED & IMPLEMENTED  

---

## 1. Conversational AI Architecture (`ChatStore` & SSE Engine)

Polyglot Code Studio's conversational AI subsystem embeds mathematical and formal theorem proving assistants directly into the workbench without external third-party SDK lock-in.

```
+-----------------------------------------------------------------------------------+
| Side Panel: ChatPanel (React + Tailwind)                                          |
| +-------------------------+ +---------------------------------------------------+ |
| | Sessions Drawer (240px) | | Thread: Virtualized Message List                  | |
| | - Session LIFO list     | |   - System / User / Assistant Bubbles             | |
| | - Title inline rename   | |   - Collapsible Tool Call Cards (Duration, JSON)  | |
| | - Model / Provider tags | |   - Proposed Diff Blocks (Monaco DiffEditor)      | |
| +-------------------------+ +---------------------------------------------------+ |
|                             | Composer: Multi-line, Slash hints, Drag-Drop VFS  | |
+-----------------------------+-----------------------------------------------------+
                                      | (REST / SSE)
                                      v
+-----------------------------------------------------------------------------------+
| Server Routes: /api/v1/chat/*                                                     |
| - POST /completions (text/event-stream Server-Sent Events)                        |
| - GET/POST/DELETE /sessions                                                       |
| - Autonomous Guardrails Evaluator (Max 50 tools, Max 10 edits, Destructive Gate)   |
|                                     |
|                                     v
| AiProviderRegistry (14 Providers) & MCP Client Gateway                           |
| - Provider Strategy: Gemini, Claude, GPT, DeepSeek, Leanstral, Axle, Zero-AI, etc.|
+-----------------------------------------------------------------------------------+
```

### 1.1 Server-Sent Events (SSE) Streaming Protocol
Chat completions use standard HTTP Server-Sent Events (`text/event-stream`):
- `data: {"type": "token", "content": "..."}`: Real-time token streaming with sub-50ms latency.
- `data: {"type": "tool_start", "toolName": "...", "args": {...}}`: Initiates a collapsible tool call block.
- `data: {"type": "tool_result", "toolName": "...", "result": {...}, "durationMs": 120}`: Completes tool call execution.
- `data: {"type": "diff", "path": "...", "original": "...", "modified": "..."}`: Triggers an interactive Diff Proposal card.
- `data: {"type": "done"}`: Terminates stream cleanly.

### 1.2 Tool Call Blocks & Epistemic Separation
Tool calls are rendered as collapsible status cards in the UI displaying:
- Tool name, category icon, and formatted invocation arguments.
- Execution duration in milliseconds.
- Result payload summary or error details.
- **Epistemic Invariant**: Speculative or conversational tools NEVER generate the `SEAL_KERNEL_VERIFIED_TIER5` token; formal proof status is solely certified by the independent multi-kernel verifier (`femevEngine` / Lean 4 kernel).

### 1.3 Interactive Diff Previews
File modification suggestions emit structured diff payloads. Clicking **Inspect Diff** opens the Monaco `DiffEditor` instance configured in Sprint 11.0.1, supporting side-by-side and inline visual comparisons before user acceptance.

### 1.4 Autonomous Guardrails
When `ENABLE_AGENTIC_AUTOMATION=true` and autonomous mode is active:
- Hard limit of **50 tool calls** per session.
- Hard limit of **10 file edits** per session.
- Destructive operations (`deleteFile`, `emptyTrash`, `clearTokens`) are strictly gated and require explicit interactive confirmation tokens.
- Breaching guardrails emits RFC 9457 problem `AUTONOMOUS_GUARDRAIL_EXCEEDED` (HTTP 429).

---

## 2. Settings Architecture (Zod Schema & IndexedDB Engine)

Workspace configuration follows a Single Source of Truth (SSOT) pattern combining local storage reactivity with server synchronization.

```
+-------------------------------------------------------------+
| SettingsModal (Ctrl+,)                                      |
| - 12 Categories Navigation                                  |
| - Unified Instant Search Filter                             |
| - Immediate Reactive Apply with 5s Undo Toast               |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| SettingsStore extends ExternalStoreBase                     |
| - Reactive snapshot via useSyncExternalStore                |
| - Multi-tab synchronization (BroadcastChannel)              |
| - Strict Zod Runtime Validation (SettingsSchema)            |
+-------------------------------------------------------------+
            |                                      |
            v                                      v
+-----------------------+              +-----------------------+
| Local IndexedDB       |              | Express Server Sync   |
| 'polyglot_settings'   |              | GET/PUT /api/v1/      |
| Versioned Schema v3   |              | settings              |
+-----------------------+              +-----------------------+
```

### 2.1 12 Configuration Categories
Settings are partitioned into:
1. `editor`: Font size, tab size, word wrap, sticky scroll, bracket colorization.
2. `appearance`: Theme, density, side panel position.
3. `runtime`: Pyodide WASM version, Lean toolchain, container health polling.
4. `ai`: Enabled AI providers, active provider, model selections, pricing matrix.
5. `flags`: 45 typed feature flags across all 11 phases.
6. `mcp`: Server enabled state, port, bearer auth, active tools.
7. `toolchain`: Available Lean 4 versions matrix.
8. `keybindings`: Customizable key command map.
9. `chat`: Default provider, system prompt, autonomous tool limit, auto-archive idle threshold.
10. `memory`: L1-L5 cache sizes and retention policies.
11. `privacy`: Telemetry disabling, local storage policy.
12. `advanced`: Log level, debug mode, scheduled maintenance workflows.

### 2.2 Zod Runtime Validation & Schema Migration
All settings mutations are validated via `SettingsSchema.parse()`. Unknown or malformed fields return `SETTINGS_VALIDATION_FAILED` (HTTP 422). Schema evolution is handled via deterministic version migrations in `IndexedDB` with backward-compatible default fallback.

### 2.3 5-Second Undo Toast
When a setting is changed, the previous snapshot is retained in memory. A temporary toast component allows instant one-click rollback within 5,000 milliseconds.

---

## 3. Automation Architecture & Consent Model

Polyglot Code Studio automations operate under strict human-in-the-loop consent principles.

```
+---------------------------------------------------------------------------------+
| Automation Coordinator                                                          |
|                                                                                 |
| [Auto-Archive Service]           [Scaffolding Engine]    [Scheduled Workflows]  |
| - Inactivity Tracker (24h)       - 8 Templates           - Nightly Proof Check  |
| - Ignore Filter (.lake, git,..)  - RO-Crate metadata     - Weekly FIFO Archive  |
| - Non-intrusive Toast Proposal   - Project Scaffolder    - Weekly Audit         |
+---------------------------------------------------------------------------------+
                                       |
                                       v
                    +------------------------------------+
                    | Human-In-The-Loop Consent Gate     |
                    | "Accept & Archive" / "Dismiss"     |
                    +------------------------------------+
```

### 3.1 LLM-Driven Auto-Archive
- Automatically proposes a snapshot when workspace is inactive for `autoArchiveIdleHours` (default 24h).
- Excludes volatile artifacts: `.lake/`, `__pycache__/`, `.git/`, `node_modules/`, and `.trash/`.
- **Consent Model**: Never archives without user acceptance via toast action.

### 3.2 Research-Grade Project Scaffolding
- Supports 8 standard templates (4 Python, 3 Lean, 1 Dual-Runtime Hybrid).
- Packages all templates with `ro-crate-metadata.json` (RO-Crate 1.1 standard).
- Emits RFC 9457 error `SCAFFOLD_TEMPLATE_NOT_FOUND` on invalid template identifier.

### 3.3 Scheduled Maintenance Workflows (Opt-In)
- **Nightly Proof Check**: Automated verification pass at 02:00 local time.
- **Weekly Archive**: Creates periodic snapshot adhering to a 4-snapshot FIFO retention quota.
- **Weekly Dependency Audit**: Validates `lakefile.toml` and `requirements.txt` against upstream toolchain updates.
- Workflows are strictly opt-in and configurable under `Settings > Advanced`.

---

*Last verified: 2026-10-29*
