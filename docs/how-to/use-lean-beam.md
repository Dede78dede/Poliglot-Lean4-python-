# How-To: Speculative Tactic Execution via lean-beam

Polyglot Code Studio integrates `leanprover/lean-beam` as an optional local broker providing non-destructive speculative tactic evaluation directly within the editor and conversational prover.

---

## 1. Overview & Core Workflow

Speculative tactic execution allows you or an autonomous AI agent to evaluate tactic candidates against open Lean 4 goals without modifying the file on disk or touching your `lakefile.toml`.

1. **Activate the Feature Flag**: Ensure `ENABLE_LEAN_BEAM=true` in `.env` or through **Settings > Feature Flags**.
2. **Execute via `/probe` Slash Command**:
   - In the `ChatPanel` composer, type `/probe <tactic>` (for example: `/probe rfl` or `/probe omega`).
   - The system automatically resolves document position, line, and character from your active Monaco editor buffer.
   - A dedicated **Speculative Probe Card** renders in the chat log displaying:
     - Tactic code with an inline duration badge (`124ms`).
     - **Goals Before**: Hypotheses and obligations before execution.
     - **Goals After**: Remaining obligations or a green `"Solved"` confirmation.
3. **Apply or Reject**:
   - If the candidate succeeds, click **Apply this tactic** to insert it into your active document at the cursor position using standard Monaco VFS commands.
   - If the probe is invalid, the card renders in a subtle rose hairline border (`border-rose-900/60 bg-rose-950/20`) surfacing compiler diagnostics.

---

## 2. Broker Lifecycle & Subprocess Ownership

- `lean-beam-mcp` is spawned as a dedicated stdio subprocess by the Polyglot backend from `~/.local/bin/lean-beam-mcp`.
- The broker communicates using the stateless MCP 2026-07-28 protocol over stdio.
- **Toolchain Qualification**: lean-beam requires an exact toolchain fingerprint. The operational validated version in Polyglot Code Studio is `leanprover/lean4:v4.34.0-rc1`. If your project's `lean-toolchain` specifies an unvalidated version, the broker fails fast with RFC 9457 error `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` (HTTP 422).

---

## 3. Tool Surface (5 Curated + 74 Projected Tools = 79 Total)

### 5 Curated Safe Tools
| Tool Name | Permission | Description |
|---|---|---|
| `lean_run_at` | `safe` (`readOnlyHint: true`) | Evaluates tactic at line/character position without mutating the document. |
| `lean_run_at_handle` | `safe` (`destructiveHint: false`) | Evaluates tactic and mints a search tree handle for continuation. |
| `lean_run_with` | `safe` (`destructiveHint: false`) | Continues exploration from an existing search handle. |
| `lean_run_with_linear` | `safe` (`destructiveHint: false`) | Linearly extends a proof branch from an existing search handle. |
| `lean_todo` | `safe` (`readOnlyHint: true`) | Inspects unclosed proof obligations (`sorry`) in document range. |

### 74 Projected Tools
The broker advertises 74 projected tools across semantic navigation, code actions, save/sync operations, and 11 context orchestration tools (`ctx_*`):
- `ctx_compose`, `ctx_explore`, `ctx_knowledge`, `ctx_callgraph`, `ctx_graph`, `ctx_delta`, `ctx_execute`, `ctx_expand`, `ctx_overview`, `ctx_url_read`, `ctx_patch`.

---

## 4. Differences from Pantograph and Duper

- **Pantograph (`v0.3.19`)**: Operates as a persistent interactive proof engine maintaining explicit goal states for machine learning agents, running inside the `pantograph` container.
- **Duper**: An automated higher-order superposition prover invoked via `polyglot_lean_auto_prove`.
- **lean-beam**: A lightweight local broker that queries Lean LSP sessions speculatively without mutating source files. It is strictly observational and non-destructive.

---

## 5. Agent Skills & Official SkillsMP Integration

Polyglot Code Studio ships the canonical `polyglot-probe-tactic` skill across Claude Code, Codex CLI, and Cursor (`.claude/skills/`, `.agents/skills/`, `.cursor/rules/`).

Optionally, you can also install the official upstream skill for external CLI agents:
```bash
npx add-skill ejgallego/lean-beam
```
*(Note: `rocq-beam` exists for the Rocq prover, but is out of scope for Polyglot Code Studio which focuses exclusively on Lean 4 and Python).*

---

## 6. Known Limitations & Edge Cases

- **`let rec`**: Recursive let bindings inside proof blocks are currently unsupported in speculative tactic evaluation.
- **`saveUnsupportedSetup`**: Batch setups using non-standard `moreLeanArgs` require offline pre-compilation.
- **Indentation Sensitivity**: Tactics evaluated with `runAt` must match the indentation level of the target proof block.
- **Handle Scope**: Search tree handles are process-local to the broker subprocess and cannot be shared across disparate LSP sessions.
- **Workspace Cap**: Enforced at a maximum of 3 active workspaces per broker process (~2 GB RSS each) with LRU eviction.

---

## 7. Procedura di Attivazione e 5 Verifiche Manuali (Deployment Personale)

Nel repository ufficiale, il flag `ENABLE_LEAN_BEAM` è disattivato di default (`ENABLE_LEAN_BEAM=false` in `.env.example`) in accordo con il Manifesto ("feature flags default false for experimental tools").

Per abilitarlo nel proprio deployment personale (`ENABLE_LEAN_BEAM=true` in `.env`), è obbligatorio eseguire prima le **5 verifiche manuali** (tempo stimato: 30–45 minuti):

### Verifica 1 — lean-beam nel Container
```bash
docker exec femev-runner lean-beam --version
# Atteso: 0.1.0 (o 0.2.0-beta)

docker exec femev-runner lean-beam ensure lean --hold
# Atteso: conferma toolchain v4.34.0-rc1 qualificata
```
*Se fallisce: non attivare. La toolchain operativa non è installata nel runner.*

### Verifica 2 — Progetto di Test su v4.34.0-rc1
```bash
mkdir /tmp/lean-test && cd /tmp/lean-test
echo "leanprover/lean4:v4.34.0-rc1" > lean-toolchain
lake init test && lake build
```
*Se il progetto target è su un'altra versione (es. v4.35.0), il broker emetterà fail-fast con `LEAN_BEAM_TOOLCHAIN_UNSUPPORTED` (HTTP 422).*

### Verifica 3 — Test End-to-End /probe nel Browser
1. Aprire Polyglot Code Studio e caricare il progetto `/tmp/lean-test`.
2. Impostare `ENABLE_LEAN_BEAM=true` in `.env` e riavviare il backend.
3. Aprire il **ChatPanel** (`Ctrl+Alt+C`) e digitare `/probe exact Nat.zero_le n`.
4. Verificare che la **Speculative Probe Card** mostri:
   - `Goals Before` a sinistra.
   - `Goals After` a destra (con badge `Solved` verde se il goal è chiuso).
   - Badge inline di latenza (`< 200ms`).
5. Cliccare **Apply this tactic** → la tattica viene inserita nel file tramite editor VFS (mai direttamente da lean-beam).
6. Verificare che il file sul disco non sia stato mutato durante l'esecuzione del probe.

### Verifica 4 — Memoria sotto Carico (LRU Cap)
```bash
# Con 1 workspace attivo
docker stats femev-runner --no-stream
# Atteso: RSS <= 3 GB (base + 1 workspace)

# Con 3 workspace (limite massimo LRU)
# Atteso: RSS <= 8 GB, non oltre
```
*Se RSS > 8 GB, ridurre il cap `maxWorkspaces` o incrementare la RAM del container host.*

### Verifica 5 — Bundle Size Gate
```bash
npm run build
# Atteso: bundle totale compresso <= 420 KB gzip
```

---

*Last verified: 2026-10-29*
