# Polyglot Code Studio (Lean 4 + Python)

Ambiente integrato e reattivo per l'esecuzione, la verifica formale e l'orchestrazione ibrida tra **Lean 4** (kernel formale / dimostrazioni assistite) e **Python** (calcolo numerico ad alte prestazioni e generazione di testimoni).

---

## 1. Architettura di Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     BROWSER RUNTIME                                          │
│                                                                                              │
│  ┌───────────────────────────────┐        ┌──────────────────────────────────────────────┐  │
│  │ Project & Workspace Manager   │        │ Hybrid Interaction Pipeline Orchestrator     │  │
│  │ • Multi-file tree explorer    │        │ • Step-by-step pipeline execution            │  │
│  │ • Monaco editor & dirty tabs  │        │ • JSON bridge & witness validation           │  │
│  │ • Pinned session persistence  │        │ • Discriminated results: Python vs Lean 4    │  │
│  └──────────────┬────────────────┘        └──────────────────────┬───────────────────────┘  │
│                 │                                                │                          │
│                 ▼                                                ▼                          │
│  ┌───────────────────────────────┐        ┌──────────────────────────────────────────────┐  │
│  │ Pyodide Client-side Runtime   │        │ ZipValidator (Ingestion Security)            │  │
│  │ • Web Worker isolation        │        │ • 50MB max total, 5MB max file               │  │
│  │ • 30s timeout guard           │        │ • 500 file limit, 100:1 bomb ratio limit     │  │
│  │ • MEMFS direct mount          │        │ • Path traversal CVE-2018-1002200 blocker    │  │
│  └───────────────────────────────┘        └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                 │ HTTP / SSE Stream
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      EXPRESS BACKEND                                         │
│                                                                                              │
│  ┌───────────────────────────────┐        ┌──────────────────────────────────────────────┐  │
│  │ SessionManager (VFS Storage)  │        │ Lean 4 Adaptive Runner & Lake Build Engine   │  │
│  │ • 500 MB per-session quota    │        │ • Production real Lake build                 │  │
│  │ • 10 GB aggregate quota (O1)  │        │ • Tree-sitter / Regex syntax fallback        │  │
│  │ • 72h default TTL             │        │ • SSE real-time build streaming              │  │
│  │ • Pinned session exemption    │        │ • Strategy B: SSE Fallback Event             │  │
│  └───────────────────────────────┘        └──────────────────────┬───────────────────────┘  │
│                                                                  │                          │
│                                                                  ▼                          │
│                                           ┌──────────────────────────────────────────────┐  │
│                                           │ 5-Term Formal Verification Formula Evaluator │  │
│                                           │ verified ⟺ exitCode = 0                      │  │
│                                           │          ∧ contains_proof_obligation         │  │
│                                           │          ∧ ¬hasSorry                         │  │
│                                           │          ∧ ¬hasError                         │  │
│                                           │          ∧ ¬simulated                        │  │
│                                           └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Semantica Rigorosa di Verifica Formale (`verified`)

In Lean 4, la veridicità di una prova matematica non può basarsi sul solo exit code del compilatore (ad esempio, comandi diagnostici come `#check Nat` o `#eval 42` escono con codice 0 ma non verificano alcun teorema).

La piattaforma calcola lo stato `verified: boolean` secondo la formula formale a 5 termini implementata in `server/src/services/verification-formula.ts`:

$$\text{verified} \iff (\text{exitCode} = 0) \land \text{contains\_proof\_obligation} \land (\neg\text{hasSorry}) \land (\neg\text{hasError}) \land (\neg\text{simulated})$$

### Dettaglio dei Termini:
1. **`exitCode === 0`**: Il processo di compilazione Lake/Lean è terminato con successo.
2. **`contains_proof_obligation`**: Il codice deve contenere almeno una dichiarazione di prova formale (`theorem`, `lemma` o `example`). Direttive puramente esplorative (`#check`, `#eval`, `#print`) o definizioni non vincolate (`def foo : Nat := 42`) restituiscono tassativamente `verified: false`.
3. **`¬hasSorry`**: Assenza di assiomi provvisori o dimostrazioni incomplete (`sorry`, `declaration uses 'sorry'`).
4. **`¬hasError`**: Assenza di messaggi diagnostici con severità `error` o `fail`.
5. **`¬simulated`**: Nessun fallback sintattico o simulatore può attestare una verifica formale (`simulated: true` implica sempre `verified: false`).

### Architettura Modulare a Due Livelli (ADR 014 & ADR 018):
- **Hybrid Adjudicator (Autorità Epistemica Unica)**: `server/src/services/verification/hybrid-adjudicator.ts:264` — è l'unica autorità certificante abilitata a rilasciare `verified: true` e `SEAL_KERNEL_VERIFIED_TIER5` sulla base della formula a 5 termini e del consenso dei kernel.
- **Pre-Flight Syntax Guard (Non-Certificante)**: `src/services/verification/preflight-syntax-guard.ts` — modulo client-side per screening rapido di igiene sintattica ($T_{\text{code}} \land T_{\text{sorry}} \land T_{\text{syntax}} \land T_{\text{toolchain}}$); non emette mai `verified: true` e opera senza alcun canale di bypass verso il kernel (ADR-018).

---

## 3. Gestione Sessioni Server e Meccanismo `pinned`

### Configurazione delle Quote e TTL
- **Default TTL**: Le sessioni temporanee hanno un TTL di **72 ore** dall'ultimo accesso (`TTL_HOURS: 72`).
- **Quota per Sessione**: Massimo **500 MB** (`SESSION_QUOTA_BYTES`).
- **Quota Aggregata di Sistema (O1)**: Massimo **10 GB** (`TOTAL_QUOTA_BYTES`) condivisi su tutte le sessioni attive.
- **Eviction**: Pulizia automatica oraria con LRU eviction in caso di superamento del limite massimo di 1.000 sessioni.

### Flag `pinned` (Residuo 1 Risolto)
Per progetti di grandi dimensioni o con dipendenze complesse (es. Mathlib):
- Gli utenti possono contrassegnare una sessione come **Pinned** tramite l'interfaccia Workspace / ProjectDrawer (`Pin` icon) o l'endpoint `POST /api/v1/projects/lean/session/:id/pin`.
- Le sessioni con `pinned: true` sono **esenti dalla pulizia TTL di 72 ore** e non vengono rimosse dall'algoritmo di LRU eviction.

---

## 4. Strategia di Streaming SSE e Fallback Sintattico

L'endpoint `GET /api/v1/projects/lean/build-stream` fornisce i log di build in tempo reale:
- **Strategia SSE B (Residuo 2 Risolto)**: Qualora il runner operi in modalità degradata (assenza del server Lean nativo), il server emette un evento SSE dedicato:
  ```http
  event: fallback
  data: {"fallback": true, "notice": "Running in simulated syntax fallback mode"}
  ```
- L'evento `complete` finale include anch'esso `{ fallback: true, verified: false, fallbackNotice: "..." }`, consentendo all'interfaccia client di mostrare il banner `⚠ FALLBACK`.

### Limiti del Fallback Sintattico
Il fallback sintattico (Tree-sitter / Regex) analizza unicamente la conformità strutturale del codice Lean 4:
- **Non esegue** il kernel logico formale di Lean 4.
- **Non risolve** gli import o le dipendenze Lake.
- **Non verifica** l'assenza di contraddizioni logiche.
- Restituisce sempre `verified: false` e `fallback: true`.

---

## 5. Gerarchia dei Limiti di Dimensione (O3)

I limiti applicati dalla piattaforma rispondono a specifici vettori operativi:
1. **Ingestione ZIP (`ZipValidator`)**:
   - Dimensione massima per singolo file decompressa: **5 MB** (`MAX_FILE_UNCOMPRESSED_BYTES`).
   - Dimensione totale decompressa: **50 MB** (`MAX_TOTAL_UNCOMPRESSED_BYTES`).
   - Numero massimo di file: **500** (`MAX_FILES`).
   - Rapporto massimo di compressione (anti ZIP bomb): **100:1**.
2. **Buffer di Esecuzione Interattiva (`InteractionStep`)**:
   - Dimensione massima del buffer sorgente per singolo step: **100.000 caratteri** (`MAX_CODE_LENGTH`).
3. **Regola di Precedenza**:
   - In fase di upload/archivio prevale il limite dei 5 MB per file.
   - In fase di invocazione RPC / orchestrazione a step prevale il limite di 100k caratteri per frammento eseguibile.

---

## 6. Prerequisiti di Build e Distribuzione (O2)

Per eseguire l'ambiente completo con supporto nativo per binding C/C++ (es. `tree-sitter`, `tree-sitter-lean`, `better-sqlite3`):

### Pacchetti di Sistema (Debian / Ubuntu / Docker)
```dockerfile
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

### Node.js & Lake
- **Node.js**: versione >= 20.x
- **Lean 4 / Lake**: `elan` con toolchain `leanprover/lean4:v4.16.0` (o versione specificata in `lean-toolchain`).

---

## 7. Verifica e Test Suite

Per eseguire la suite di verifica automatizzata a 9 suite (copertura 100%):
```bash
npm run test:verify
# oppure:
npx tsx scripts/verify-all.ts
```

---

## 8. Feature Status Matrix (Phase 13.9 Reconciled)

| Feature / Subsystem | Status | Engine / Provider | Gating & Policy |
|---|---|---|---|
| Dual-Runtime Monaco Editor | ready | Monaco + Pyodide 314.0.7 | Core UI |
| Formal Verification Formula | ready | 5-term Lean 4 evaluator | Non-bypassable kernel verification |
| Session & VFS Storage | ready | Memory + Disk SessionManager | 500MB quota / 72h TTL / pinned |
| Ingestion ZipValidator | ready | ZipValidator (CVE-2018-1002200 safe) | 50MB / 100:1 ratio limit |
| Unified Result Contract | ready | ResultEnvelope<T> (ok: boolean) | Mandatory on all 18 bridges |
| Boundary Contract Parity | ready | Zod v4 <-> JSON Schema <-> Pydantic v2 | extra='forbid', Discriminator('ok') |
| Native Notebook Workspace | ready | Persistent Pyodide Worker | Nbformat v4 (.ipynb) + .polyglot-notebook |
| Adaptive Config Discovery | ready | 3-signal ConfigManager | Requires userConfirmed: true / 90d cooldown |
| Proof Retrieval Memory | ready | Hybrid 384-dim dense + BM25 | minSimilarity >= 0.90 / Tier 5 cache |
| AX-PROVER Proposal Loop | ready | Compiler-guided repair (APOLLO K=1) | Bound budget / no tool spam |
| Translation Fidelity Gate | ready | Definitional ; rfl + 20 input differential | ENABLE_TRANSLATION_FIDELITY=true |
| Structural AST Diff | ready | Lean 4 declaration parser | Epistemic invalidation vs non-breaking |
| Cross-Artifact MiniSearch | ready | MiniSearch across 5 corpora | Sub-millisecond latency (< 1ms) |
| Token Vault & Bearer Auth | ready | Opaque 32-byte base64 TokenVault | CI bypass strictly test-only |
| API Rate Limiting | ready | In-memory sliding window (100 rpm) | 429 Retry-After + RFC headers |
| Security Observability | ready | Standalone security-events emitter | Zero token leakage in logs |
| MCP 2026-07-28 Server | ready | Stateless JSON-RPC at /mcp | Dedicated 30 rpm rate limit |
| LeanBeam Bridge | fallback | Client stub | Gated by ENABLE_LEAN_BEAM (off) |
| Mathesis Integration | fallback | Remote endpoint client | Gated by ENABLE_MATHESIS (off) |
| LP2 Transpiler | fallback | Lossy transpiler | Gated by ENABLE_LP2 (off) |
| TreeThink Inference | fallback | vLLM GPU engine | Gated by ENABLE_TREETHINK (off) |
| OpenTelemetry Browser | partial | Tracing bridge | Gated by ENABLE_OTEL_BROWSER (off) |
| OpenTelemetry Node | partial | Server trace bridge | Gated by ENABLE_OTEL_NODE (off) |
| Yjs Collaborative Editing | partial | Hocuspocus WebSocket | Gated by ENABLE_YJS_COLLABORATION (off) |
| Paperproof Visualizer | partial | Playback service | Gated by ENABLE_PAPERPROOF_PLAYBACK (off) |
| Proof-State Snapshotting | future | A2DR1/Lean_Snapshot | Deferred to Phase 14 pending release |
| Distributed Multi-pod Rate Limit | future | Redis sliding-window cluster | Architecture note / Phase 14 |

---

## 9. Python Development Standards

- **Formatting & Style**: PEP 8 compliance, 4-space indentation, max 88 chars (team standard), two blank lines between top-level definitions.
- **Toolchain**: `uv` for local development, `pip` for CI parity, `ruff format` and `ruff check --select E,F,I,UP,B,SIM`.
- **Type Checking**: PEP 484 type hints with `from __future__ import annotations`, `mypy --strict` (`disallow_untyped_defs = true`, `warn_return_any = true`).
- **Pydantic v2 Boundaries**: Strict models with `ConfigDict(strict=True, extra="forbid", validate_assignment=True, frozen=True)` and `Discriminator('ok')` with `Tag`.
- **Testing**: `pytest` with coverage `>= 80%` on touched files (`--cov=schemas --cov-fail-under=80`).

---

## 10. Phase 13 Contract Discipline

- **Single Bridge Return Shape**: All bridge services and verification modules strictly return `ResultEnvelope<T>` (`ok: true` with `value` or `ok: false` with `SerializedBridgeError`).
- **Error Registry Grounding**: All error representations conform to RFC 9457 Problem Details using registered codes from `src/services/errors/error-registry.ts`.
- **Automated Generation**: Boundary models in `schemas/generated_contracts.py` are strictly generated via `npm run contracts:generate` from `exportJsonSchema()`. Hand-editing contract logic is forbidden.

---

## 11. Security, Rate Limiting & Secret Handling

- **Authentication**: Protected API routes require `Authorization: Bearer <token>` validated against `TokenVault`.
- **CI Test Bypass Guard**: Header `X-Polyglot-Test-Secret: polyglot-ci-test-2026` is accepted **exclusively** when `process.env.NODE_ENV === "test"` AND `process.env.ALLOW_CI_BYPASS === "true"`. Any bypass attempt in `production` immediately yields HTTP 401 and emits a `bypass_attempt` security event.
- **Rate Limiting**: In-memory sliding-window limiter enforcing 100 requests/minute on standard endpoints and 30 requests/minute on `/mcp`. Exhaustion emits HTTP 429 with `Retry-After`.
- **Security Observability**: All security denials (401, 403, 429, bypass attempts) are logged via `src/services/auth/security-events.ts` without printing raw secret keys or tokens.

---

## 12. Phase 14 Canonical Verification Protocol & Hybrid Consensus

- **Canonical Verification Protocol (`polyglot.verification.v1`)**: Standardized JSON request and evidence envelope for formal verification dispatches (ADR 015).
- **Dual Pathways**:
  - Interactive snippet elaboration via authenticated Kimina server (`POST /api/v1/lean/execute` using `/api/check`).
  - Hermetic project repository compilation via isolated Lake runner (`POST /api/v1/projects/lean/build`).
- **Transitive Axiom Policy (`polyglot.axioms.standard.v1`)**: Enforces allowlist strictly restricted to `propext`, `Classical.choice`, and `Quot.sound`. Any custom axioms or `sorryAx` references forbid certification.
- **Hybrid Consensus Adjudicator**: Evaluates comparability (source digest, context digest, toolchain digest) and arbitrates between sub-engine evidence. Yields `confirmed_valid` (`SEAL_KERNEL_VERIFIED_TIER5`), `confirmed_invalid`, or `unconfirmed`.
- **Cumulative Verification Suite**: Baseline suites 1 through 172 (303 sub-tests) achieve 100% pass rate. Extended suites 173 through 191 (377 sub-tests) verified.

---

## 13. Phase 14.9.9.1 Epistemic Hardening & Phase 15 Scope

- **Milestone**: `14.9.9.1` (SemVer `2.3.0`).
- **Epistemic Isolation**: Strict static verification enforcing that `hybrid-adjudicator.ts:264` is the exclusive certifier (`npm run arch:check-epistemic-authority`).
- **ProofOutcome Discriminated Union**: Complete Zod ↔ Pydantic v2 contract parity across all 6 variants (`certified`, `numeric-certificate`, `transport`, `preflight`, `unavailable`, `metadata`).
- **Feature Flag Governance**: 62/62 registered flags assigned squad owners, fail-closed behaviors, and retirement dates (`npm run check-flag-expiry:strict`).
- **Supply Chain Security**: All 23 production dependencies pinned to exact versions; `npm ci --ignore-scripts` verified in CI.
- **Architectural Documentation**: Master indexes available in [`docs/INDEX.md`](docs/INDEX.md) and [`reports/INDEX.md`](reports/INDEX.md). Key ADRs: [ADR-016](docs/adr/ADR-016-phase-15-scope.md), [ADR-017](docs/adr/ADR-017-bundle-budget-revision.md), [ADR-018](docs/adr/ADR-018-removal-of-client-seal-path.md).
- **Phase 15 Roadmap**: 4 activation waves targeting 195 suites / 420 sub-tests under revised bundle budget ceilings (O1 $\le$ 100 KB, O2 $\le$ 220 KB, total $\le$ 290 KB).



