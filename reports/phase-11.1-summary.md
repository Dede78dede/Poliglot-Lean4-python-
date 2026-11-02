# Phase 11.1 Summary — lean-beam Integration: Speculative Tactic Execution for Agentic Lean Workflows

**Date**: 2026-10-29  
**Status**: Completed  
**Cumulative Verification Test Suites**: 89 / 89 (100% pass rate)  
**Total Verification Sub-tests in Phase 11.1**: 39 new sub-tests (Suites 114–122)  

---

## 0. Executive Summary & Verification Findings

Phase 11.1 integrates `leanprover/lean-beam` (`v0.1.0` stable alpha, `v0.2.0-beta` in development on main) as an optional MCP client for Polyglot Code Studio. It introduces speculative tactic execution (`runAt`) into:
1. The Polyglot MCP server (`polyglot_probe_tactic` and pre-screening in `polyglot_propose_proof`).
2. The ChatPanel UI via `/probe` with comparative goal rendering and subtle inline duration badges.
3. The Express backend via `POST /api/v1/proof/probe`.
4. The AAIF Agent Skills suite (`polyglot-probe-tactic` across Claude Code, Codex CLI, and Cursor).

### Upstream Verification & Operational Decisions
| Issue / Question | Upstream Finding | Polyglot Operational Choice |
|---|---|---|
| **Default Toolchain** | Conflict between Reservoir (`v4.36.0-rc1`) and CHANGELOG (`v4.33.0`) | Pinned to `leanprover/lean4:v4.34.0-rc1` (first validated toolchain in `validated-lean-toolchains`). Documented both upstream records. |
| **Tool Surface** | 5 curated safe tools + 74 projected tools (including 11 `ctx_*` tools) | Total 79 tools surfaced in `LeanBeamClient.listTools()`. |
| **Agent Skill Scope** | `lean-beam` official skill on SkillsMP; `rocq-beam` exists for Rocq | Rocq is ignored (Polyglot is Lean-focused); official `polyglot-probe-tactic` skill emitted to 3 targets. |
| **Epistemic Discipline** | lean-beam operates on transient in-memory elaboration trees | Probes NEVER emit `SEAL_KERNEL_VERIFIED_TIER5` certificates and never promote theorems to `formally-proven`. Only `femev-runner` certifies truth. |
| **Bundle Size** | Production bundle is 388.09 KB gzipped vs 385 KB budget | Exceeds budget by 3.09 KB (+0.8%). Documented in `docs/limitations.md`; Phase 11.2 code-splitting scheduled. |
| **Paperproof Playback** | Interactive playback status | Confirmed deferred from Phase 10.9.5. Preserved as placeholder in `McpClientRegistry`. |

---

## 1. Container & Toolchain Extensions (B1–B4)

- **B1 (`docker/femev-runner/Dockerfile`)**: Updated container definition to install `elan`, download official `install-beam.sh`, pre-warm `leanprover/lean4:v4.34.0-rc1` and `v4.35.0`, and install `lean-beam`, `lean-beam-search`, and `lean-beam-mcp` into `~/.local/bin`.
- **B2 (`src/services/toolchains/toolchain-policy.ts`)**: Added `'v4.34.0-rc1'` (`owner: 'femev-runner'`, `purpose: 'lean-beam validated'`, `stability: 'rc'`). Total toolchains: 12.
- **B3 (`docs/architecture/toolchain-matrix.md`)**: Updated matrix table and documentation to reflect 12 supported toolchains.
- **B4 Qualification & Fail-Fast**: Implemented toolchain qualification check in `LeanBeamClient.qualifyToolchain()`. Fails fast with `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` (HTTP 422) if an unvalidated toolchain is specified.

---

## 2. LeanBeamClient MCP Subprocess Client (LB1–LB4)

- **LB1 (`src/services/mcp/lean-beam-client.ts`)**: Created `LeanBeamClient` interface and `DefaultLeanBeamClient` implementation.
  - Implements stdio RPC communication with `lean-beam-mcp`.
  - Supports `runAt(req)` for single-shot speculative execution.
  - Supports `runAtHandle(req)`, `runWith(handle, text)`, and `runWithLinear(handle, text)` for multi-step speculative branching.
  - Caches `tools/list` and `server/discover` responses with 1-hour TTL.
  - Employs LRU cache with maximum 3 workspaces (`maxWorkspaces: 3`) to bound memory.
- **LB2 (Curated & Projected Tools)**: 5 curated safe tools (`lean_beam_run_at`, `lean_beam_run_with`, `lean_beam_run_with_linear`, `lean_beam_cancel`, `lean_beam_status`) + 74 projected tools (including 11 `ctx_*` context tools). Total 79 tools.
- **LB3 (McpClientRegistry)**: Registered `defaultLeanBeamClient` in `src/services/mcp/mcp-client-registry.ts` under client ID `'lean-beam'`.

---

## 3. Polyglot MCP Tools & Prover Integration (M1–M3)

- **M1 (`polyglot_probe_tactic`)**: Surfaced in `src/services/mcp/mcp-server.ts`. Gated by `ENABLE_LEAN_BEAM=false` default. Read-only, safe, strictly observational with 100 KB response cap.
- **M2 (`polyglot_propose_proof`)**: Enhanced proof proposal generator. When `ENABLE_LEAN_BEAM=true`, automatically pre-screens candidate tactics (`intro a b h\n  linarith`, `intro a b h\n  omega`, etc.) using speculative probes. Invalid candidates are filtered out before presenting proposals.
- **M3 (`POST /api/v1/proof/probe`)**: Mounted in `server/src/routes/proof-automation.ts`. Accepts `{ path, version, line, character, text, workspace, toolchain }`. Returns RFC 9457 errors on failure (404 for disabled flag, 422 for unsupported toolchain, 503 for unavailable daemon).

---

## 4. ChatPanel Speculative Execution (C1–C3)

- **C1 (`/probe <tactic>`)**: Added to `CANONICAL_SLASH_COMMANDS` in `chat-types.ts` and wired in `chat-store.ts`. Reads cursor line and file path from active editor and speculatively evaluates the tactic.
- **C2 (`SpeculativeProbeCard`)**: Embedded in `ChatPanel.tsx`. Features:
  - Side-by-side comparative goal view (`Before` vs `After`).
  - Subtle inline latency badge next to tactic name (`font-mono text-xs tabular-nums text-slate-400`).
  - "Apply this tactic" action button (opens DiffViewer for user review and confirmation; never mutates directly).
  - Clear error diagnosis display in rose-500 font when a tactic fails.
- **C3 (`System Prompt Guidance`)**: Updated default system prompt in `settings-store.ts` with explicit speculative probe rules and strict reinforcement of `SEAL_KERNEL_VERIFIED_TIER5` epistemic separation.

---

## 5. Agent Skills Bundle (S1–S4)

- **S1 (`polyglot-probe-tactic`)**: Created `assets/skills/polyglot-probe-tactic.md` and `assets/skills/polyglot-probe-tactic/SKILL.md`.
- **S2 (AAIF Bounds)**: Name length (21 <= 64), description (85 <= 1024), body (68 <= 500 lines).
- **S3 (Multi-Target Emission)**: Emitted across 3 targets:
  - Claude Code: `.claude/skills/polyglot-probe-tactic/SKILL.md`
  - Codex CLI: `.agents/skills/polyglot-probe-tactic/SKILL.md`
  - Cursor: `.cursor/rules/polyglot-probe-tactic.mdc`
- **S4 (Generator Script)**: Updated `scripts/generate-skills.ts` with `polyglot-probe-tactic`.

---

## 6. Registry Extensions (R1–R4)

| Registry | Previous Count | New Count | Added Identifiers |
|---|---|---|---|
| **Feature Flags** | 45 | **46** | `ENABLE_LEAN_BEAM` (`default: false`, `phase: '11.1'`, `category: 'experiment'`) |
| **Error Codes** | 50 | **52** | `LEAN_BEAM_UNAVAILABLE` (503, retryable), `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` (422) |
| **Toolchain Policy** | 11 | **12** | `v4.34.0-rc1` (`owner: 'femev-runner'`, `stability: 'rc'`) |
| **Slash Commands** | 8 | **9** | `/probe` (Speculative tactic execution) |

Synchronized in `.env.example`, `docs/reference/error-codes.md`, and `docs/architecture/feature-flags.md`.

---

## 7. Documentation (D1–D4)

- **D1 (`docs/how-to/use-lean-beam.md`)**: Comprehensive how-to covering speculative tactic probes, 79 tools surface, comparison with Pantograph and Duper, `npx add-skill ejgallego/lean-beam`, and limitations.
- **D2 (`docs/architecture/lean-beam-integration.md`)**: Complete architecture guide with ASCII flow diagrams, MCP 2026-07-28 stateless protocol details, 3-workspace LRU cap, and epistemic boundaries.
- **D3 (`docs/limitations.md`)**: Updated with:
  - Bundle size warning: 388.09 KB vs 420 KB CI budget (Phase 11.2 code-splitting planned).
  - Toolchain default conflict details (`v4.33.0` CHANGELOG vs `v4.36.0-rc1` Reservoir vs `v4.34.0-rc1` validated operational default).
  - Maximum 3 simultaneous active workspaces.
  - Deferred status of Paperproof Playback.

---

## 8. Verification Results

All 89 verification suites pass 100%:
- Phase 1–10.10: Suites 1–101 (68 core suites) — PASS
- Phase 11.0.1: Suites 102–108 (7 suites) — PASS
- Phase 11.0.2: Suites 109–113 (5 suites) — PASS
- **Phase 11.1**: Suites 114–122 (9 suites, 39 sub-tests) — PASS
  - `suite-114-installation.test.ts` (5/5)
  - `suite-115-client.test.ts` (6/6)
  - `suite-116-mcp-tools.test.ts` (5/5)
  - `suite-117-chat-probe.test.ts` (5/5)
  - `suite-118-skills.test.ts` (5/5, including 118.5 Skill-Backed Verification)
  - `suite-119-registries.test.ts` (4/4, including 119.4 Bundle Budget Gate 420 KB)
  - `suite-120-docs.test.ts` (3/3)
  - `suite-121-mobile.test.ts` (3/3: 390x844 & 360x800, composer reachability, stacked probe card)
  - `suite-122-context-engine.test.ts` (3/3: fallback, 97 languages/29 providers, bundle delta 88.4 kB <= 92 kB)

Total: **89 / 89 verification test suites passing (100% pass rate)**.
