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
2. **`contains_proof_obligation`**: Il codice deve contenere almeno una dichiarazione di prova (`theorem`, `lemma` o `example`). Direttive puramente esplorative (`#check`, `#eval`, `#print`) restituiscono tassativamente `verified: false`.
3. **`¬hasSorry`**: Assenza di assiomi provvisori o dimostrazioni incomplete (`sorry`, `declaration uses 'sorry'`).
4. **`¬hasError`**: Assenza di messaggi diagnostici con severità `error` o `fail`.
5. **`¬simulated`**: Nessun fallback sintattico o simulatore può attestare una verifica formale (`simulated: true` implica sempre `verified: false`).

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
