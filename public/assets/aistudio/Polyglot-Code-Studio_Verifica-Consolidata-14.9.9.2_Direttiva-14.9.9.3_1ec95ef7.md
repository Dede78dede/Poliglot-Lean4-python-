# Polyglot Code Studio — Verifica Consolidata Post-Esecuzione Phase 14.9.9.2 e Direttiva di Remediation Phase 14.9.9.3

**Documento operativo definitivo per Google Studio** · Versione 1.0 · 2026-11-11
**Repository**: `Dede78dede/Poliglot-Lean4-python-` (branch `main`)
**Commit auditato**: `4d129163b9ccd445d160bd80e9dcea6601b851e6` (parent: `469b03ba77a399f695f844e921898fe8279ec478`)
**Oggetto del commit**: `refactor: harden verification consensus and lazy imports` — 47 file, +3.233 / −522 righe

---

## 0. Come usare questo documento

Questo documento è il prodotto della fusione di **tre flussi indipendenti**:

1. **Sign-off di completamento** prodotto dall'esecuzione Google Studio (Gemini) — `reports/14.9.9.2-final-signoff.md`, che dichiara "APPROVED / READY FOR MERGE";
2. **Audit parallelo esterno** (team indipendente) — verdetto "NOT APPROVED", 5 difetti P0, gap P1/P2;
3. **Verifica indipendente nostra** — ispezione statica punto-per-punto **più esecuzione reale** dei gate sul commit auditato (verify-all, verify-extended, contracts:check, arch:check, arch:check-epistemic-authority, seal-integrity-sweep, misura bundle, PoC della redazione PII).

Struttura: §§1–9 = relazione di verifica (cosa è vero, cosa è falso, con evidenza riproducibile); §10 = **direttiva operativa di remediation (Phase 14.9.9.3)** da eseguire in Google Studio; §11 = criteri di accettazione del nuovo sign-off; §12 = regole vincolanti globali; appendici = tracciatura completa.

**Lettura minima per l'esecutore**: §§1, 3, 5, 6, 10, 11, 12.

---

## 1. Sintesi esecutiva

**Verdetto consolidato: NOT APPROVED — HOLD RELEASE.** Il sign-off "APPROVED / READY FOR MERGE" della Phase 14.9.9.2 **deve essere revocato**.

Tre ordini di motivi, tutti verificati direttamente sul codice al commit `4d12916`:

1. **L'autorità epistemica non è contenuta.** Esiste ancora un percorso applicativo raggiungibile (`src/services/verification/multi-kernel-verifier.ts` → `src/services/femev/femev-engine.ts`) che **fabbrica un consenso a 6 kernel e emette `SEAL_KERNEL_VERIFIED_TIER5` senza eseguire nessun kernel**, e memorizza `verified: true` nello stato FEMEV. Un secondo emettitore (`adjudicateHybridConsensus`, esportata da `server/src/services/verification/hybrid-adjudicator.ts`) certifica `confirmed_valid` + Tier 5 su evidenze **costruite dal chiamante**. Una terza sorgente (`src/services/document/ro-crate.ts:54`) emette il letterale del sigillo nei documenti RO-Crate esportati. I tre gate epistemici (check-epistemic-authority, seal-integrity-sweep, regola depcruise) sono **tutti verdi nel nostro run eseguito** perché hanno punti ciechi strutturali (§6).
2. **Il dual-engine "reale" non esiste.** `kimina-backend` e `lean-runner` sono la **stessa immagine** (`docker/lean-runner/Dockerfile`); il runner espone solo `POST /build` (Lake), mentre il client proxy usa il protocollo Kimina (`/api/check` → fallback `/verify`): contratti incompatibili. In più il `baseUrl` di default del proxy è `http://localhost:8000` (porta del Lake runner), non quella del servizio Kimina (8082): la catena è rotta anche a livello di configurazione. La rotta `/api/v1/lean/consensus` non invoca alcun motore ma dichiara `enginesConsulted: ['kimina','lake']`. La directory di progetto della sessione **non è condivisa** con il container runner, che quindi costruisce silenziosamente la propria `/workspace` invece del progetto inviato.
3. **I numeri del sign-off non sono accurati.** I sub-test **eseguiti** sono **325** (225 suite 134–172 + 100 suite 173–194), non 392: il "303" è un conteggio *cumulativo storico* (suite 1–172) stampato dal runner, l'"89" è una stringa hard-coded mentre i check reali sono 100 (la suite 187 ha 8 casi, non 5). Le suite **passano tutte** (verificato con esecuzione) ma diversi test sono **tautologici** (187.7, 187.8, 192.5 verificano oggetti locali, mai la rotta/config reale) e la suite 184 **scrive su un file di produzione** senza isolamento. ADR-019 è contraddittoria (180 giorni nel testo ADR che *respinge esplicitamente* i 90 giorni; 90 giorni dichiarati in sign-off e INDEX). Il report bundle citato (`bundle-post-14.9.9.2.json`) non è committato; 3 delle 5 metriche ADR-017 sono dichiarate ma mai applicate; la redazione PII **lascia passare** header di autorizzazione non standard (PoC eseguito: `x-custom-auth` non redatto).

**Cosa funziona davvero** (§9): il contenimento sincrono di `adjudicate()` (fail-closed reale), il rifiuto HTTP 400 delle evidenze client sulla rotta consensus, la parità Zod↔Pydantic (`contracts:check` verde, schemi reali in `schemas/contracts.json`), la misura bundle effettiva (main 28,84 KB ≤ 180; total JS 199,77 KB ≤ 290), l'igiene della radice del repo, il lazy loading resiliente dei 5 pannelli, la regola depcruise `no-tools-in-production`.

**Azione richiesta**: eseguire la **Phase 14.9.9.3** (§10) nell'ordine W0→W12. Nessun rilascio, nessun merge, nessuna certificazione finché W0–W4 non sono chiusi con evidenza riproducibile. Fino a quel momento ogni verdetto resta `unconfirmed`, `verified: false`, senza sigilli.

---

## 2. Perimetro, fonti e metodologia

| Voce | Valore |
|---|---|
| Commit auditato | `4d129163b9ccd445d160bd80e9dcea6601b851e6` (`main`, GitHub sincronizzato) |
| Parent | `469b03ba77a399f695f844e921898fe8279ec478` (base della direttiva 14.9.9.2) |
| Diff | 47 file, +3.233 / −522 |
| Perimetro dichiarato Phase 14.9.9.2 | Search infrastructure (ogrep/semcode), Verification Authority Containment, Residual Gap Closure; Phase 15 esclusa |
| Ambiente di verifica | Clone read-only del commit; `node_modules` presenti; nessuna modifica di contenuto ai sorgenti (solo bit di modo da chmod durante l'esecuzione delle suite) |

**Comandi effettivamente eseguiti da noi** (tutti exit 0 se non indicato):

| Comando | Esito | Note |
|---|---|---|
| `npx tsx scripts/verify-all.ts` | PASS | 225 righe "✓ N.M" stampate a runtime; il riepilogo dice "303 cumulative sub-tests" (suite 1–172) |
| `npx tsx scripts/verify-extended.ts` | PASS (1.832 ms) | 100 righe "✓ N.M" a runtime; riepilogo hard-coded "89 sub-tests" |
| `npm run contracts:check` | PASS | "Zod and Pydantic schemas are in full sync" |
| `npm run arch:check` | PASS (exit 0) | warning cosmetico depcruise su TypeScript ≥7 |
| `npm run arch:check-epistemic-authority` | PASS | "Sole certifying authority is hybrid-adjudicator.ts:264" — **con il bypass P0-1 attivo** |
| `./scripts/seal-integrity-sweep.sh` | PASS | "0 violations" — **con il bypass P0-1 attivo** |
| PoC redazione (`redactSensitiveData`) | LEAK dimostrato | `x-custom-auth` trasmesso integro (§8.4) |
| `sha256sum` su `tools/codeindex/generate.ts` e file vuoto | digest confrontati | §8.2 |

**Limiti della verifica**: non abbiamo eseguito build Docker/Compose né avviato i servizi (coerenti con l'audit parallelo); le conclusioni su runner/Compose sono statiche ma con riscontri incrociati su file e configurazioni. Il claim "tsc --noEmit / lint / build puliti" del sign-off **non è stato rieseguito** e resta non dimostrato in questa relazione (né lo era nell'audit parallelo).

---

## 3. Verdetto consolidato sulle tre fonti

| Fonte | Verdetto | Valutazione di accuratezza |
|---|---|---|
| Sign-off Gemini (`reports/14.9.9.2-final-signoff.md`) | **Respinto** | Affermazioni materialmente più forti di quanto il codice supporti: "APPROVED / READY FOR MERGE" (r. 7) senza commit SHA, link CI, versioni tool o output catturati; conteggi test errati (392 vs 325 eseguiti; 89 vs 100; 5 vs 8 per la suite 187); TTL dichiarato 90 giorni contro ADR-019 che dice 180; report bundle citato ma non committato; claim "universal masking" smentito dal PoC |
| Audit parallelo esterno | **Confermato in toto** | Ogni asserzione verificata (i suoi P0-1…P0-5 e §4.1–5.3) è risultata VERA con evidenza file:riga. Due stime conservative corrette dall'esecuzione: sub-test reali 100 (audit: "almeno 92"); i test **passano** se eseguiti (l'audit non li aveva eseguiti) — il problema è la significatività, non l'esito |
| Questa verifica | — | Aggiunge: causa radice dei punti ciechi dei gate (§6), `baseUrl` proxy errato (§5.3), conteggi runtime esatti, cronologia Git del file token (§8.4), terzo emettitore `ro-crate.ts` (§5.1), side-effect chmod delle suite (§7.1) |

**Concordiamo e rafforziamo la raccomandazione dell'audit**: ogni verdetto di proof resta esplicitamente `unconfirmed`, `verified: false`, senza sigillo, finché tutti i percorsi produttori di certificati non sono non-falsificabili e un percorso dual-engine posseduto dal server non è dimostrato end-to-end.

---

## 4. Matrice di verifica delle asserzioni del sign-off

Legenda: VERIFICATO = confermato con evidenza; PARZIALE = vero con riserve materiali; FALSO = smentito dall'evidenza.

| # | Asserzione del sign-off | Esito | Evidenza (commit `4d12916`) |
|---|---|---|---|
| 1 | "npm test suite 134–172: 303/303 (100%)" | **PARZIALE** | Runner PASS; sub-test eseguiti 225; "303" è cumulativo storico suite 1–172 (include 78 check non eseguiti in questo run). Header del runner stesso documenta 224 |
| 2 | "test:extended suite 173–194: 89/89 (100%)" | **PARZIALE** | Runner PASS; check reali 100; "89" è stringa hard-coded (`verify-extended.ts:81`); header non aggiornato ("74 sub-tests", suite 187 "5 sub-tests" vs 8 reali) |
| 3 | "Cumulativo 392/392 su 61 suite" | **FALSO** | Eseguiti 325 (225+100). Le 61 suite sono corrette (39+22 import) |
| 4 | "seal-integrity-sweep: 0 violazioni" | VERIFICATO (ma non significativo) | Eseguito: 0 violazioni **con il bypass P0-1 attivo** — la lista file è fissa e non include multi-kernel-verifier/femev/ro-crate (§6) |
| 5 | "arch:check 0 violazioni" | VERIFICATO | Exit 0 (nostro run) |
| 6 | "check-epistemic-authority: unico certificatore hybrid-adjudicator.ts:264" | **FALSO** come invariante | Il check passa ma scandaglia **solo `server/src/`**; `src/services/verification/multi-kernel-verifier.ts` emette Tier 5 fuori dal suo campo (§5.1, §6) |
| 7 | "contracts:check parità completa" | VERIFICATO | Nostro run: sync completo; `schemas/contracts.json` 420 righe/11 schemi |
| 8 | "check-flag-expiry:strict: 62 flag validi, 0 scaduti" | **PARZIALE** | Linter verde ma: data hard-coded `2026-11-08`, `--strict` non parsed, CI lo invoca **senza** `--strict`, nessun enforcement TTL (né 90 né 180 giorni) (§7.2) |
| 9 | "bundle:measure Main 28,84 KB, Total 199,77 KB — PASS" | VERIFICATO | `reports/bundle-post-14.json` (fase "14.9.9.2", ts 2026-11-11T12:12:08Z): main 28,84; total JS 199,77; initialLoad 132,18. Ma il file citato `bundle-post-14.9.9.2.json` **non è committato** e 3 metriche ADR-017 non sono applicate (§7.3) |
| 10 | "tsc --noEmit / lint / build: 0 errori" | NON VERIFICATO | Non rieseguito né da noi né dall'audit parallelo; nessun log/arteatto allegato al sign-off |
| 11 | "suite 192: valida ADR-019 90-day TTL" | **FALSO** | ADR-019 dice **180 giorni** e respinge esplicitamente l'alternativa a 90 (§7.2); suite 192 non valida alcun TTL, verifica solo `expiresAt > now` |
| 12 | "194: universal token masking / redazione" | **FALSO** come "universal" | PoC: `x-custom-auth: Basic …` trasmesso **non redatto**; il test 194.2 non asserisce quella chiave pur dichiarandola redatta nel messaggio di successo (§7.4) |
| 13 | "Eliminati file spuria alla radice (subfolder, theorem, file.lean)" | VERIFICATO | Cancellati in `4d12916` (`--diff-filter=D`); presenti `data/tokens.template.json` e gitignore per `data/tokens.json` |
| 14 | "Tool search allowlist con checksum" | **FALSO** | `ogrep.sh`/`semcode.sh` **inesistenti**; digest codeindex in allowlist = hash del **file vuoto** (`e3b0c442…b855`) vs reale `260f20c2…475c`; repomix 0 occorrenze nel lockfile (§8.1) |
| 15 | "codeindex: 608 file / 1.738 simboli / 74.921 righe, checker pass" | NON RIPRODUCIBILE | `.codeindex/` gitignored: artefatti assenti dall'albero; checker campiona i primi 25 file (non "10 casuali" come dichiara) e non rileva aggiunte/cancellazioni (§8.2) |
| 16 | "consensus route: evidenze client rifiutate" | VERIFICATO | HTTP 400 su `kiminaEvidence`/`lakeEvidence` (`lean.ts` ~r.93–103). Ma la risposta fissa dichiara `enginesConsulted: ['kimina','lake']` senza consultare nulla (§5.2) |
| 17 | "Defect A contenuto: adjudicate() fail-closed" | VERIFICATO | `hybrid-adjudicator.ts:328–343` ritorna sempre `unconfirmed`/`verified:false`/`seal:null` (§9) |

---

## 5. Findings P0 — blocchi release (tutti verificati firsthand)

### 5.1 P0-1 — Il multi-kernel verifier fabbrica sei esiti kernel e emette un certificato Tier 5

**File**: `src/services/verification/multi-kernel-verifier.ts` (invariato nel diff 14.9.9.2)

- `verifyParanoid()` itera sei nomi kernel hard-coded (`leanchecker`, `nanoda`, `lean4lean`, `con-leche`, `con-ron`, `leanchecker-hardened`) e **appende `status: 'passed'` con durate fisse (42/32/28 ms) e descrizioni predefinite** senza eseguire alcun checker (r. ~280–317). L'unico controllo sulle prove incomplete è `code.includes('sorry') || code.includes('admit')` — substring **case-sensitive**: `Sorry`/`Admit` maiuscoli eludono il gate (r. ~251–261).
- Costruisce quindi un `KernelVerificationCertificate` con `seal: 'SEAL_KERNEL_VERIFIED_TIER5'`, `zeroSorryVerified: true`, `kernelCheckPassed: true`, `multiKernelStatus: 'consensus'`, 6 kernel, 0 disaccordi (r. ~332–366).
- `verifyMultiKernel()` mappa il successo sintetico in **`verified: true`** e propaga il certificato (r. ~132–176).
- `generateExtendedCertificate()` è un **metodo pubblico** che accetta teorema/proof/toolchain/kernel/signer dal chiamante, calcola un hash a 32 bit rolling (`hash << 5`), lo padda a 64 caratteri con `'a'` e **restituisce direttamente un certificato Tier 5 completo** con `zeroSorryVerified: true` (r. ~182–224).
- **Percorso raggiungibile**: `src/services/femev/femev-engine.ts:375` invoca `verifyMultiKernel()` e allo stato applicativo memorizza `verified: true` + `phase4Certificate` (r. ~398–405).
- **I test codificano la fabbricazione come comportamento atteso**: `tests/phase-10.5/femev-soundness.test.ts` (33.1) asserisce `verified === true` e `multiKernelStatus === 'consensus'` sul percorso simulato.
- **Terzo emettitore correlato**: `src/services/document/ro-crate.ts:54` emette il letterale `seal: 'SEAL_KERNEL_VERIFIED_TIER5'` nei documenti RO-Crate quando `config.kernelVerified` è impostato — un sigillo in metadati di export non prodotto dall'autorità certificante.

**Impatto**: la rimozione del percorso sincrono `HybridAdjudicator.adjudicate()` NON ha stabilito un unico certificatore. Un percorso applicativo prominente produce certificati multi-kernel e `verified: true` senza invocare alcun kernel. Questo da solo invalida i claim "P0 remediated", "sole certifier" e "all gates passed".

**Chiusura richiesta** (→ W0, W1): disabilitare/rimuovere la generazione sintetica di stati kernel e la factory pubblica di certificati; risultato esplicitamente non-certificante finché processi di check reali e isolati non restituiscono evidenza verificabile; evidenza vincolata a digest esatti di sorgente/contesto/toolchain/immagine, request ID ed exit status; riscrivere i test 33.x come test negativi ("nessuna esecuzione motore → nessun certificato"); aggiungere un test end-to-end con adapter reali oppure mantenere la feature non disponibile e senza sigilli; rimuovere il letterale seal da ro-crate.ts.

### 5.2 P0-2 — Una seconda adjudicator esportata certifica evidenze costruite dal chiamante

**File**: `server/src/services/verification/hybrid-adjudicator.ts`, `server/src/routes/lean.ts`

- Contenimento reale: `HybridAdjudicator.adjudicate()` ritorna **sempre** `unconfirmed`/`verified:false`/`seal:null` (r. 328–343).
- Ma la funzione **separatamente esportata** `adjudicateHybridConsensus(req, kimina, lake)` ritorna `confirmed_valid`, `verified: true`, badge `SEAL_KERNEL_VERIFIED_TIER5` quando entrambe le evidenze fornite hanno `outcome: 'accepted'` e gli audit assiomativi passano (r. ~197–281). Guardie esistenti: solo `simulated` e `unavailable`.
- Il predicato `evaluateComparability()` (r. ~118–161) confronta `sourceDigest` (obbligatorio) ma: **non vincola** requestId (né tra motori né verso la richiesta), contractVersion, exitCode, digest di manifest/immagine/ambiente; i confronti su `contextDigest`, `toolchain`, `targetIds` scattano **solo se entrambi i campi opzionali sono presenti**. `EngineEvidence.exitCode` è `number | null` (r. 63–77) e **non gate mai** la certificazione.
- La rotta `/api/v1/lean/consensus` rifiuta `kiminaEvidence`/`lakeEvidence` con HTTP 400 (r. ~93–103) e per le altre richieste risponde fisso `unconfirmed`/`verified:false`/`seal:null` — **ma** dichiara `enginesConsulted: ['kimina','lake']` (r. ~131–142) senza aver consultato alcun motore: sovrastima epistemica in un campo pensato per l'onestà.
- La protezione della rotta non copre altri eventuali chiamatori della funzione esportata né realizza il confine "esecuzione-e-adjudication posseduta dal server" richiesto dalla direttiva.

**Chiusura richiesta** (→ W2): unico punto di certificazione = servizio interno server-owned che avvia e valida **entrambi** i motori reali per una richiesta canonica; costruttori di evidenza e adjudicator non invocabili da handler/client; rifiuto di campi di binding assenti/disuguali e di ogni exit code non intero/diverso da zero; finché non esiste, nessuna certificazione e `enginesConsulted: []`.

### 5.3 P0-3 — "Kimina backend" è l'immagine del runner Lake e non può servire il contratto Kimina

**File**: `docker-compose.yml`, `docker/lean-runner/server.js`, `server/src/services/kimina-client-proxy.ts`

- `kimina-backend` (porte `8082:8080`) e `lean-runner` (`8000:8080`) hanno **entrambi** `build: context: ./docker/lean-runner, dockerfile: Dockerfile` (r. ~50–62 e ~64–80): stessa immagine.
- Il server del runner espone solo `GET /health`, `GET /readyz`, `GET /` e **`POST /build`** che esegue `lake build` (r. 14–23, 35–78, 84–85).
- `KiminaClientProxy` invia `POST {baseUrl}/api/check` con body `{id, code, timeout}` e, su 404, fallback `POST {baseUrl}/verify` con body Kimina `{codes:[{custom_id, proof}], infotree_type, timeout}` (r. ~155–187). **Nessuno dei due endpoint esiste sul runner**: contratto incompatibile.
- **Aggiunta nostra**: il `baseUrl` di default del proxy è `http://localhost:8000` (r. 136, 149) — cioè la porta pubblicata del **Lake runner**, non quella di `kimina-backend` (8082). La catena "dual engine" è rotta anche a livello di configurazione: ogni chiamata finisce nel fallback al simulatore locale.
- La rotta consensus attuale risponde fisso in modo non-certificante senza invocare i motori: la remediation "real dual-engine" dichiarata **non è presente**.

**Chiusura richiesta** (→ W3, W4): backend Kimina-compatibile reale e adapter dedicato; test del contratto esatto app→servizio; dimostrazione che entrambi i motori eseguono la stessa richiesta; altrimenti disabilitare la certificazione consensus e descrivere onestamente il servizio come runner Lake.

### 5.4 P0-4 — La directory progetto non è condivisa con il runner; endpoint di build non sicuro

**File**: `server/src/services/lean-project-runner.ts`, `docker-compose.yml`, `docker/lean-runner/server.js`, `docker/lean-runner/Dockerfile`

- L'app scrive i file del progetto in `sessionDir` sul filesystem dell'host/server (r. ~65–72) e invia al runner `POST /build` con `projectPath: sessionDir` (r. ~139–150).
- Compose **non monta** alcuna directory di sessione/workspace nei container runner (solo `mathlib-cache`): il `projectPath` non esiste nel container e il runner **usa silenziosamente `process.cwd()`** (server.js r. 35–37), costruendo la propria `/workspace` invece del progetto inviato.
- Lo stesso endpoint: accetta `projectPath` arbitrari esistenti, **nessuna autenticazione**, nessuna validazione di contenimento, buffer request/stdout/stderr **illimitati** (r. 23–50); `spawn('lake', ['build'], { timeout: 120000 })` — `timeout` **non è un'opzione supportata** da `child_process.spawn`, quindi il timeout dichiarato non è applicato (r. 40–44); porte pubblicate su host senza bind a loopback (`0.0.0.0` implicito, server in ascolto su `0.0.0.0`); immagine eseguita come **root** (nessuna direttiva `USER`); installer Elan da URL "moving" (`…/elan/master/elan_init.sh`, Dockerfile r. ~23); base image `ubuntu:22.04` per tag, non per digest.

**Chiusura richiesta** (→ W3): workspace per-request ristretta condivisa via upload/mount controllato; canonizzazione e vincolo dei path sotto la workspace; autenticazione delle chiamate; porte in loopback o interne; cap su body/output/risorse; timeout esplicito con kill del gruppo di processo; esecuzione non-root; pin di base image, toolchain e installer per digest.

### 5.5 P0-5 — Toolchain richieste e installate divergono

**File**: `server/src/config/lean-runner-config.ts`, `docker/lean-runner/Dockerfile`, `docker/lean-runner/server.js`

- L'app accetta **8** toolchain (`AVAILABLE_LEAN_TOOLCHAINS`: v4.28.0, v4.31.0, **v4.31.0-rc2**, **v4.32.2**, v4.33.1, **v4.34.1**, v4.35.0-rc4, **v4.35.0**).
- Il Dockerfile ne installa **4** (v4.28.0, v4.31.0, v4.33.1, v4.35.0-rc4; r. 27–31) e `server.js` espone le stesse 4 con default fisso `v4.35.0-rc4` (r. 6–8), **ignorando la toolchain richiesta** nel payload.
- Quattro versioni accettate dall'app non sono installate; la validazione lato app di un allowlist non è evidenza che il runner abbia installato/usato quella toolchain.

**Chiusura richiesta** (→ W4): un'unica fonte di verità generata/validata per toolchain installate e accettate; rifiuto in caso di mismatch; risposta con versione effettivamente usata e digest immagine; binding dell'evidenza a entrambi.

---

## 6. Causa radice — perché tutti i gate erano verdi con il bypass attivo

Verificato con esecuzione: `arch:check-epistemic-authority` **passa** certificando "Sole certifying authority is hybrid-adjudicator.ts:264" e `seal-integrity-sweep.sh` **passa** con "0 violations" **mentre il P0-1 è attivo**. I punti ciechi sono strutturali, non occasionali:

1. **`scripts/check-epistemic-authority.ts` scandaglia solo `server/src/`** (r. ~31: `const serverSrcDir = path.join(rootDir, 'server/src')`). Tutto `src/` — dove sta `multi-kernel-verifier.ts` — è **fuori dal campo del check**. L'invariante "unico certificatore" è quindi verificato su metà codebase.
2. **`scripts/seal-integrity-sweep.sh` usa una lista fissa di 8 file** (`SECONDARY_BRIDGES`, r. 12–22): axle-repair, leancert, provepy, pastalean, lean-lsp-mcp-client, lean-lsp-client, preflight-syntax-guard, verification-formula. **Non contiene** multi-kernel-verifier, femev-engine, ro-crate (grep count = 0). I 5 invarianti sono grep di pattern letterali (`verified: true`, `SEAL_KERNEL_VERIFIED_TIER5`, import della formula, `certifyWithKernel`, `certificationTier: 'KERNEL_VERIFIED_TIER5'`): il certificato multi-kernel usa le chiavi `seal:`/`tier:`/`signatureSeal:` e la forma `verified: true` compare nel **tipo di ritorno**, eludendo tutti i pattern.
3. **Conseguenza architetturale**: l'invariante epistemico è implementato come *allowlist di file da controllare* invece che come *scandaglio esaustivo con allowlist dell'unico certificatore autorizzato* (deny-by-default). Qualunque nuovo emettitore aggiunto fuori dalla lista — presente o futuro — è invisibile ai gate.

Questa è la lezione centrale per la Phase 14.9.9.3: **un invariante di autorità si enforce con negazione di default sull'intero albero, non con l'enumerazione dei trasgressori noti.**

---

## 7. Findings P1 — Test, CI e governance

### 7.1 Conteggi sub-test errati e test tautologici

**Conteggi.** Verificato con esecuzione e conteggio statico (risultati identici):

| Runner | Sub-test dichiarati | Sub-test reali (eseguiti) | Origine dell'errore |
|---|---|---|---|
| verify-all (134–172) | 303 | **225** | "303" è il cumulativo storico "Suites 1–172" (include 78 check delle suite 1–133 non eseguiti in questo run); l'header del runner stesso documenta 224 |
| verify-extended (173–194) | 89 | **100** | `"…(89 sub-tests verified)"` è una stringa hard-coded (`verify-extended.ts:81`); header non aggiornato ("74 sub-tests"; "Suite 187 … 5 sub-tests" vs **8** reali 187.1–187.8) |
| Totale sign-off | 392 | **325** | — |

Il conteggio "61 suite" è invece corretto (39 + 22 import). **Le suite passano tutte** (exit 0, verify-extended in 1.832 ms): il problema non è l'esito ma la significatività e la resa dei numeri.

**Test tautologici o non significativi** (verificati riga per riga):
- **187.7** (`suite-187-negative-seal.test.ts:79–92`): costruisce un oggetto locale `forgedPayload` e asserisce che contenga le chiavi `kiminaEvidence`/`lakeEvidence` che vi ha appena inserito. **Non chiama mai la rotta HTTP**: zero valore di regressione sul containment reale.
- **187.8** (r. 94–100): itera un array locale di stringhe toolchain asserendo che non contengano `'4.8.0'`. Non ispeziona `AVAILABLE_LEAN_TOOLCHAINS`, né la configurazione del runner: il Defect C1 (hardcode v4.8.0) non è coperto da questo test.
- **192.2** (`suite-192-feature-flag-audit.test.ts:38–49`): "dynamic set equality" ridotto a `reportContent.includes(key)`: non valida metadati del report, duplicati o voci estranee.
- **192.5** (r. 67–78): il "drift validator" è una funzione locale a tre condizioni definita dentro il test — non testa il linter o il generatore di produzione.
- **187.3** (r. 34–45): stub locale che ritorna sempre false/null.

**Mutazione dell'albero di lavoro**:
- `suite-184-epistemic-authority.test.ts:36–47` esegue `fs.writeFileSync` su **`server/src/services/autocorrect/axle-repair.ts`** (file di produzione) e lo ripristina a fine test: nessuna copia isolata, nessuna verifica di ripristino; un fallimento intermedio lascia il file sporco.
- Osservato direttamente: dopo il nostro run delle suite, `git status` mostra decine di file con bit eseguibile modificati (mode 100644→100755, contenuto invariato) — effetto collaterale di chmod nello run. Conferma il rischio di eseguire le suite su un albero condiviso.

**Chiusura richiesta** (→ W5): integration test sulla rotta/servizio reale (es. supertest/fetch contro l'app montata) con asserzioni su status/body esatti, toolchain effettiva e assenza sigillo; conteggi derivati dai casi effettivi (mai stringhe); isolamento della suite 184 (copia temporanea + verifica ripristino); log CI come artefatto immutabile.

### 7.2 Governance feature flag — contraddizione normativa e linter non enforcement

- **ADR-019** (`docs/adr/ADR-019-feature-flag-ttl-policy.md`): Decisione n. 2 = TTL massimo **180 giorni** per i nuovi flag; l'alternativa a 90 giorni è **respinga esplicitamente** ("Rejected because deep mathematical toolchain integrations … require longer evaluation cycles"). Grandfathering dei 62 flag fino al 2027-12-31.
- **Sign-off** (r. 51, 101) e **`docs/INDEX.md:20`**: dichiarano la policy a **90 giorni**. Tre affermazioni normative, due valori incompatibili.
- **Percorso errato**: ADR-019 r. 10 punta a `src/config/feature-flag-registry.ts` — **inesistente**; il registro reale è `src/services/flags/feature-flag-registry.ts` (come usato da `scripts/check-flag-expiry.ts:13`).
- **Linter** (`scripts/check-flag-expiry.ts`): data corrente **hard-coded** `new Date('2026-11-08T00:00:00Z')` (r. 23–25); verifica solo `owner`, `behaviorWhenOff` e presenza in CHANGELOG dei flag scaduti (r. 23–61); **nessun controllo TTL** (né 90 né 180 giorni); `--strict` **non è parsed** (nessuna lettura di `process.argv` oltre il guard).
- **CI** (`.github/workflows/ci.yml:39–41`): invoca `npx tsx scripts/check-flag-expiry.ts` **senza** `--strict`. L'esistenza dello script npm `check-flag-expiry:strict` non rende strict la CI.
- `suite-192.4` non valida alcun TTL: verifica solo `expiresAt > now`.

**Chiusura richiesta** (→ W6): risolvere 90 vs 180 in **un** ADR approvato; correggere tutti i percorsi; implementare e testare l'enforcement effettivo di TTL e grandfathering; invocare il comando strict canonico in CI bloccante; data corrente esplicita (non congelata).

### 7.3 Bundle — metriche dichiarate ma non applicate; report non committato

- `scripts/measure-bundle.ts` dichiara 5 limiti ADR-017 (r. ~133–153): main ≤180, total JS ≤290, **max chunk ≤100**, **initial load ≤220**, **discrepanza contabile ≤0,50 KB**. `evaluateBundleBudget()` (r. ~57–74) ne applica **solo due** (main e total): le altre tre non possono far fallire alcun gate.
- "Initial load" = somma hard-coded di `index-*` + `react-vendor-*` + `aria-vendor-*`: **non** è la traversal del grafo statico dell'HTML emesso; l'inclusione di CSS/HTML non è definita in modo coerente.
- CI fallisce solo se `report.status !== "PASS"` (`ci.yml:45–59`): le metriche omesse non possono bloccare.
- Il sign-off cita `reports/bundle-post-14.9.9.2.json`: **assente dall'albero**. I dati reali sono in `reports/bundle-post-14.json` (fase "14.9.9.2", ts 2026-11-11T12:12:08Z): main 28,84 KB; total JS 199,77 KB; **initialLoad 132,18 KB**; CSS 16,57 KB; raw 666,32 KB. Lo script scrive sia `bundle-post-14.9.9.2.json` (default CLI) sia la copia canonica `bundle-post-14.json`: la prima non è stata committata.
- Il sign-off presenta "O2 = 199,77 KB": 199,77 è il **total JS**, non la metrica initial-load dello script (132,18). Terminologia da riconciliare.
- Nota positiva: la misura è **reale** (report fresco, fase corretta, margini ampi: main 16% del cap, total 69% del cap). Il problema è governance, non misurazione.

**Chiusura richiesta** (→ W7): enforcement byte-based di **tutte** le metriche ADR-017; initial load calcolato dal grafo HTML; contabilità pre-arrotondamento; test fixture per ogni soglia violata; report canonico generato dalla build nel run CI e committato con nome univoco; O2 ridefinito e documentato.

### 7.4 Redazione PII — PoC del leak e copertura dichiarata oltre la realtà

- `server/src/services/telemetry/security-events.ts`: `SENSITIVE_KEY_PATTERN` (r. 25) è una regex **per chiave esatta e ancorata** (`^(authorization|cookie|…|jwt)$`): la redazione è ricorsiva (array/oggetti, r. 27–52) e redige i parametri query nelle stringhe, ma **non matcha** chiavi come `x-custom-auth`, `X-Api-Key` con prefissi, o annidamenti con nomi composti.
- **PoC eseguito** (nostro run): payload `{headers: {authorization: 'Bearer xyz', 'x-custom-auth': 'Basic dXNlcjpwYXNzd29yZA==', host: 'polyglot.local'}}` → `authorization` = `[REDACTED]`, **`x-custom-auth` = `Basic dXNlcjpwYXNzd29yZA==` trasmesso integro (LEAK: true)**.
- `suite-194.2` (r. 34–48) crea proprio `x-custom-auth` ma **non asserisce mai** che sia redatto; il messaggio di successo dichiara "Standard and custom authorization keys are replaced with [REDACTED]" — affermazione falsa coperta da un test che non la verifica.
- I test ispezionano per lo più l'output diretto dell'helper e l'oggetto evento, non l'output serializzato del sink per tutti i valori sensibili.

**Chiusura richiesta** (→ W8): preferire un **allowlist di campi sicuri** ai bordi di logging (deny-by-default) oppure estendere il pattern a suffissi/substrings (`auth`, `key`, `token`, `secret`, `jwt`, `credential` in qualsiasi posizione); testare varianti arbitrarie di header di autorizzazione, payload annidati/error/query, record bufferizzati e output serializzato del sink; restringere le dichiarazioni alla policy effettivamente testata.

---

## 8. Findings P2 — Tool, indice, documentazione, segreti

### 8.1 Tool search — allowlist non autenticata, wrapper inesistenti, repomix non pinato

- `tools/search/allowlist.json` referenzia `tools/search/ogrep.sh` e `tools/search/semcode.sh`: **nessuno dei due esiste** (verificato). Né ogrep né semcode compaiono in `package.json`/`package-lock.json`.
- Il digest SHA-256 dichiarato per `codeindex` è `e3b0c442…b855` = **hash del file vuoto** (verificato: `printf '' | sha256sum` identico). L'hash reale di `tools/codeindex/generate.ts` è `260f20c2…475c`, quello di `check.sh` è `1bee33fa…7ea5`. Il catalogo **non autentica** il generatore dichiarato e nessun wrapper verifica i digest prima dell'invocazione.
- `tools/context/pack.sh:15–19` invoca `npx repomix` **senza versione**: repomix ha 0 occorrenze in package.json e lockfile → esecuzione di codice non pinato da rete a ogni run.
- L'allowlist è un catalogo JSON con `$schema` autoreferenziale a json-schema.org ma **nessuno schema** che validi identità/provenienza, artefatto immutabile, permessi, destinazioni di rete o stato di approvazione.
- Positivo: la regola depcruise `no-tools-in-production` è reale e corretta (`from: ^(src|server/src)` → `to: ^tools`, severity error) ed è in CI.

**Chiusura richiesta** (→ W9): marcare `disabled` i tool senza binari reali; pin di artefatto/commit e lock delle dipendenze (repomix come devDependency versione esatta); schema che validi il catalogo; verifica dei digest prima dell'invocazione; gate di esclusione dal bundle e revisione delle modifiche; registrazione di egress e gestione segreti.

### 8.2 Codeindex — checker debole e output non deterministico

- `tools/codeindex/check.sh:15–45`: il commento dice "Sample 10 random files" ma il codice verifica `lines[:25]` — i **primi 25** file di `files.jsonl`. Non rileva aggiunte/cancellazioni/rinomi, non valida simboli né hash dell'indice: **un indice stalcato può passare**.
- `tools/codeindex/generate.ts:173` incorpora `new Date().toISOString()` in `index.json`: l'output **non è byte-for-byte deterministico** tra run su input invariato.
- `.codeindex/` è gitignored: gli artefatti e i conteggi dichiarati ("608 file / 1.738 simboli / 74.921 righe / zero leak") **non sono riproducibili** dall'albero sincronizzato.

**Chiusura richiesta** (→ W10): check basato su inventario completo (manifest di tutti i file + hash di ogni output); test per aggiunte/rimozioni/rinomi e cambi di versione tool; separazione dei metadati volatili dal contenuto indicizzato.

### 8.3 Documentazione e sign-off — contraddizioni concrete

- `docs/INDEX.md:3` dichiara "Milestone: Phase 14.9.9.1" (stale); r. 20 etichetta ADR-019 "90-day"; r. 15 e 34 linkano `architecture/verification-formula.md` e `design-system/index.md` — **inesistenti** (verificato).
- `docs/architecture/codebase-map.md` referenzia 4 path **assenti dall'albero**: `src/services/python/pyodide.ts` (r. 16), `src/components/diff/` (r. 22), `src/services/vfs/` (r. 26), `src/components/toolbars/` (r. 28). Nomina `hybrid-adjudicator.ts` come unico certificatore (contraddetto da P0-1/P0-2).
- `reports/14.9.9.2-final-signoff.md:7` "APPROVED / READY FOR MERGE" **senza** commit SHA, link a run CI, versioni tool/runtime, output catturati o risultati machine-readable; più affermazioni contraddette dai sorgenti (§4).

**Chiusura richiesta** (→ W11): correggere link e percorsi; documentare il comportamento implementato (non quello inteso); riconciliare terminologia policy/bundle; nuovo sign-off vincolato a commit SHA + artefatti CI immutabili + elenco delle limitazioni residue (niente "PASS" su elementi non dimostrati).

### 8.4 Segreti — `data/tokens.json` nella cronologia Git

- Il file (7.296 byte) è stato **commitato** (introduzione storica; modifica in `2d0b87f` "test: add new user token to registry"; presente in `469b03b`) ed è stato **cancellato solo in `4d12916`** (verificato con `git log --all -- data/tokens.json` e `--diff-filter=D`).
- La cancellazione nell'albero corrente + gitignore **non rimuove il contenuto dalla cronologia raggiungibile**: ogni credenziale lì contenuta va considerata compromessa finché non è revocata/ruotata lato emittente. Nessuna evidenza di revoca è fornita.

**Chiusura richiesta** (→ W12): revoca/rotazione di tutti i token presenti storicamente; opzionalmente purge della cronologia (`git filter-repo`) con coordinazione del fork/clone; evidenza emitter-side nel nuovo sign-off.

### 8.5 Minori

- `src/App.tsx:47–59`: il fallback `(m.X || (m as any).default)` indebolisce il controllo del contratto di export (accettabile come hotfix; da tipizzare).
- La risposta fissa della rotta consensus con `enginesConsulted: ['kimina','lake']` (§5.2) è disonestà epistemica in un campo pensato per l'onestà.
- Header `verify-extended.ts:4` ("173 through 191") non aggiornato all'aggiunta delle suite 192–194.

---

## 9. Lavoro valido da preservare (tutto verificato firsthand)

Questi elementi della Phase 14.9.9.2 sono **reali e corretti** e vanno preservati nella remediation:

1. `HybridAdjudicator.adjudicate()` fail-closed sincrono (`hybrid-adjudicator.ts:328–343`): sempre `unconfirmed`/`verified:false`/`seal:null`; test 187.6 significativo.
2. Rotta `/api/v1/lean/consensus`: rifiuto HTTP 400 di `kiminaEvidence`/`lakeEvidence` (`lean.ts` ~93–103) con problem details RFC 9457 — containment reale a livello di rotta (da estendere, non da sostituire).
3. Parità contratti: `contracts:check` verde con sync completo Zod↔Pydantic; `schemas/contracts.json` ora sostanzioso (420 righe, 11 schemi).
4. Misura bundle reale: `reports/bundle-post-14.json` fase "14.9.9.2" — main 28,84 KB (16% del cap 180), total JS 199,77 KB (69% del cap 290), margini ampi.
5. Igiene repository: `subfolder`, `theorem`, `file.lean` cancellati in `4d12916`; `data/tokens.template.json` presente; `.gitignore` copre `data/tokens.json` e `.codeindex/`.
6. Fix runtime UI: `RecommendationsPanel` con export default; lazy loading resiliente su 5 pannelli dinamici in `App.tsx` — coerente con la risoluzione del `TypeError: Failed to fetch dynamically imported module`.
7. Rate limiting con clock iniettabile (limiti 100/60s generale, 30/60s MCP) — test istanziano il middleware direttamente (da integrare su rotte montate).
8. Regola depcruise `no-tools-in-production` reale e in CI.
9. CI estesa: verify-all + verify-extended + sweep + arch + epistemic + contracts + bundle gate — la struttura c'è, manca la sostanza su alcuni gate (§6, §7).
10. CHANGELOG con sezione `[Unreleased]` (r. 8).
11. Suite 193 (rate limiting) sostanzialmente ben costrotta; suite 192/194 utili ma da completare (§7.1, §7.4).

---

## 10. Direttiva di remediation — Phase 14.9.9.3 (per Google Studio)

**Perimetro**: chiudere i 5 P0 e i gap P1/P2 della Phase 14.9.9.2 al commit `4d12916`. **Fuori perimetro**: Phase 15, nuove feature, refactoring non richiesti.
**Base di partenza**: `main` @ `4d12916`. **Ordine di esecuzione**: W0→W12, tassativo. Ogni finestra dichiara i propri criteri di accettazione: sono vincolanti, non indicativi.
**Regola d'oro**: se un'azione non è completabile con evidenza riproducibile, la si dichiara aperta nel sign-off — mai "PASS" su elementi non dimostrati.

### W0 — Contenimento totale dei percorsi produttori di sigillo (P0-1) [PRIORITÀ MASSIMA]

1. `src/services/verification/multi-kernel-verifier.ts`: rimuovere la generazione sintetica di `status: 'passed'` in `verifyParanoid()`; `verifyMultiKernel()` e `verifyParanoid()` devono restituire un esito esplicitamente **non-certificante** (`verified: false`, `seal: null`, motivo "engine execution not available") finché non esistono checker reali isolati. Eliminare `generateExtendedCertificate()` o renderlo non esportato/non certificante.
2. `src/services/femev/femev-engine.ts:375–410`: nessuna memorizzazione di certificati/`verified: true` da percorsi simulati; la fase 4 FEMEV riporta `unconfirmed`.
3. `src/services/document/ro-crate.ts:54`: rimuovere il letterale `SEAL_KERNEL_VERIFIED_TIER5`; il campo formalVerification dei RO-Crate si popola solo da certificati ricevuti dall'autorità reale.
4. Riscrivere `tests/phase-10.5/femev-soundness.test.ts` (33.x) come **test negativi**: nessuna esecuzione motore → nessun certificato, nessun `verified: true`, nessun Tier 5 — attraverso servizio, API, MCP e UI.
5. Inventario esaustivo: grep codebase-wide di `SEAL_KERNEL_VERIFIED_TIER5`, `verified: true`, `certificationTier`, `signatureSeal`, `multiKernelStatus: 'consensus'` in `src/` + `server/src/` (esclusi test/fixture dichiarati) e chiusura di ogni occorrenza produttiva non autorizzata.

**Accettazione W0**: (a) Nessun percorso produttivo può produrre un certificato o `verified: true` senza esecuzione reale del motore — dimostrato con test negativi per via servizio/API/MCP/UI; (b) l'inventario delle occorrenze è allegato con esito per voce; (c) suite 33.x verdi nella nuova forma negativa.

### W1 — Invariante epistemico esaustivo (deny-by-default)

1. Riscrivere `scripts/check-epistemic-authority.ts`: scandaglio **esaustivo di `src/` e `server/src/`** (oggi solo `server/src/`); l'invariante diventa "nessun file all'infuori dell'autorità autorizzata contiene simultaneamente affermazioni di verifica positiva e sigilli" con **allowlist dell'autorità**, non lista dei trasgressori.
2. Riscrivere `scripts/seal-integrity-sweep.sh`: sostituire la lista fissa `SECONDARY_BRIDGES` con lo stesso principio (deny-all-tranne); includere i pattern `seal:`/`tier:`/`signatureSeal:`/`verified: true` su tutto l'albero produttivo.
3. Entrambi i gate devono **fallire oggi** (in presenza dei percorsi W0 non ancora chiusi) e **passare** dopo W0 — questa sequenza è essa stessa un test.

**Accettazione W1**: (a) i due gate eseguiti **prima** di W0 producono violazioni (prova del punto cieco chiuso); (b) dopo W0 passano; (c) un file canarino inserito con `SEAL_KERNEL_VERIFIED_TIER5` in una qualsiasi directory produttiva fa fallire entrambi i gate (test di iniezione).

### W2 — Adjudicator dual-engine non falsificabile (P0-2)

1. `adjudicateHybridConsensus()`: rimuovere l'export o limitarne l'invocabilità a un servizio interno server-owned; nessun handler di richiesta o codice client può passarvi evidenze.
2. Il predicato di comparabilità richiede, per certificare: requestId **identico** tra richiesta/kimina/lake, `contractVersion` della richiesta, `exitCode` **intero e = 0** per entrambi, `toolchain` e `sourceDigest` obbligatori e uguali, `contextDigest`/`targetIds` obbligatori (non più "solo se presenti"), binding a digest di immagine/manifest/policy quando introdotti in W3/W4.
3. Rotta `/api/v1/lean/consensus`: finché il servizio dual-engine reale non esiste, risposta `unconfirmed` con **`enginesConsulted: []`** e motivo esplicito.

**Accettazione W2**: (a) test negativi: evidenze con exitCode null/non-zero, requestId mismatch, campi opzionali assenti → mai `confirmed_valid`; (b) nessun import di `adjudicateHybridConsensus` fuori dal modulo di servizio server-side (verificato da depcruise); (c) la rotta non dichiara mai motori non consultati.

### W3 — Runner corretto e sicuro (P0-3, P0-4)

1. Workspace per-request: upload del progetto o mount condiviso ristretto; il runner costruisce **solo** quella directory; errore esplicito se assente (niente fallback a `process.cwd()`).
2. `docker/lean-runner/server.js`: canonizzazione e vincolo del path sotto la workspace; autenticazione delle chiamate (token di servizio); cap su body/stdout/stderr; **timeout effettivo** (timer + kill del gruppo di processo, non l'opzione `timeout` di spawn); risposta con toolchain **effettivamente usata** e digest immagine.
3. `docker-compose.yml`: porte in loopback (`127.0.0.1:8000:8080`) o rete interna senza pubblicazione; mount della workspace; **immagini distinte** per Kimina e Lake o, se Kimina non esiste, eliminazione del servizio `kimina-backend` e descrizione onesta del runner Lake.
4. Dockerfile: `USER` non-root; base image per **digest**; installer Elan pinato a commit/tag; toolchain per versione esatta.
5. Test del contratto: integration test app→runner con la stessa richiesta, verifica del progetto costruito (non della workspace di default).

**Accettazione W3**: (a) `POST /build` con projectPath fuori workspace → 4xx, nessuna esecuzione; (b) build di un progetto di test con `sorry` → exitCode ≠ 0 riportato fedelmente; (c) timeout enforcement dimostrato con processo lungamente bloccante; (d) `docker compose config` validato; (e) nessuna porta pubblicata su 0.0.0.0.

### W4 — Toolchain: un'unica fonte di verità (P0-5)

1. Generare/validare l'elenco toolchain installate dal Dockerfile verso `AVAILABLE_LEAN_TOOLCHAINS` (o viceversa) in un check CI bloccante: ogni valore accettato e non installato (oggi: v4.31.0-rc2, v4.32.2, v4.34.1, v4.35.0) va rimosso dall'allowlist o installato.
2. Il runner seleziona la toolchain richiesta per build e la riporta nella risposta insieme al digest immagine.
3. Risolvere il `baseUrl` di default del proxy Kimina (`localhost:8000` → servizio Kimina reale o disabilitazione esplicita del client con `unavailable`).

**Accettazione W4**: (a) check di coerenza toolchain verde e bloccante in CI; (b) risposta del runner include toolchain usata + digest; (c) nessun default che instrada il traffico Kimina sul runner Lake.

### W5 — Test che dimostrano contratti di produzione (P1 §7.1)

1. Sostituire 187.7 con un integration test reale sulla rotta (supertest/fetch): payload con `kiminaEvidence` → HTTP 400 + problem details; payload legittimo → `unconfirmed` con `enginesConsulted: []`.
2. Sostituire 187.8 con la verifica effettiva di `AVAILABLE_LEAN_TOOLCHAINS` (import reale, non array locale) + coerenza con il check W4.
3. Sostituire 192.5 con il test del linter/generatore di produzione; estendere 192.2 a parità insiemistica reale (presenze, duplicate, estranee).
4. Isolare la suite 184: copia del file in tmp, esecuzione, confronto ripristino (hash), fallimento se l'albero resta sporco.
5. Derivare **tutti** i conteggi dai casi eseguiti (nessuna stringa hard-coded); distinguere nel riepilogo "eseguiti in questo run" vs "cumulativi storici".
6. Allegare ai risultati l'output grezzo come artefatto CI.

**Accettazione W5**: (a) i nuovi test falliscono se il containment viene rimosso (mutazione di controllo); (b) i riepiloghi coincidono con il conteggio reale delle asserzioni (verificabile con `grep -c "✓"`); (c) run delle suite non lascia tracce (`git status` pulito, inclusi i bit di modo).

### W6 — Feature flag: una sola verità normativa (P1 §7.2)

1. Decidere 90 o 180 giorni in revisione formale di ADR-019; aggiornare ADR, INDEX e ogni riferimento in modo coerente.
2. Correggere il percorso del registro nell'ADR (`src/services/flags/feature-flag-registry.ts`).
3. Implementare nel linter: TTL massimo per i nuovi flag (data `createdAt` vs `expiresAt`), grandfathering fino al 2027-12-31, set completo di metadati obbligatori, data corrente (non hard-coded), parsing reale di `--strict`.
4. CI: invocare il comando strict canonico come gate bloccante.
5. Test del linter stesso (casi: flag scaduto tracciato/non tracciato, TTL violato, metadati mancanti).

**Accettazione W6**: (a) un fixture con TTL violato fa fallire il linter in strict; (b) ADR/INDEX/sign-off citano lo stesso numero di giorni; (c) CI log mostra il comando strict.

### W7 — Bundle: tutte le metriche ADR-017 enforced (P1 §7.3)

1. `evaluateBundleBudget()` applica le 5 metriche (main, total, max chunk, initial load, discrepanza contabile); test fixture per ciascuna soglia violata.
2. Initial load dal grafo statico dell'HTML emesso (traversal dei chunk raggiunti), CSS/HTML inclusi o esclusi in modo documentato e coerente.
3. Report canonico unico committato nel run CI (nome fase coerente, es. `reports/bundle-post-14.9.9.3.json`) + metodologia allineata; definizione di O2 riconciliata (initial load vs total JS) nel sign-off.
4. Contabilità pre-arrotondamento con soglia di discrepanza verificata.

**Accettazione W7**: (a) fixture con chunk > 100 KB o initial load > 220 KB porta lo status a FAIL e blocca la CI; (b) report presente nell'albero con fase corretta; (c) il numero citato come O2 nel sign-off coincide con la metrica omonima del report.

### W8 — Redazione PII a deny-by-default (P1 §7.4)

1. Sostituire l'allowlist di chiavi esatte con un modello deny-by-default (allowlist di campi sicuri) o pattern per suffisso/substring (`auth`, `token`, `key`, `secret`, `jwt`, `credential`, `password`, `cookie`) case-insensitive su ogni livello.
2. Test: varianti arbitrarie (`x-custom-auth`, `X-Api-Key`, `apikey`, annidamenti, error objects, query string), e asserzioni sul **sink serializzato** (console/buffer), non solo sull'helper.
3. Il messaggio dei test deve affermare solo ciò che è asserito.

**Accettazione W8**: (a) il PoC di questa relazione (`x-custom-auth`) ora restituisce `[REDACTED]`; (b) suite con casi generati (property-based sulle varianti di header) verdi; (c) nessun claim "universal" senza corrispondente asserzione.

### W9 — Provenienza dei tool (P2 §8.1)

1. `ogrep.sh`/`semcode.sh`: creare i wrapper reali (binari/versioni pinati) o marcarli `disabled` nell'allowlist.
2. Digest corretti e **verificati prima dell'invocazione** (il wrapper confronta lo SHA-256 del binario con il catalogo); catalogo validato da uno schema reale (identità, artefatto immutabile, permessi, egress, approvazione).
3. `pack.sh`: repomix come devDependency con versione esatta (niente `npx` scaricato a runtime); segreti esclusi dal pack (verifica sul contenuto).
4. Test: allowlist con digest errato → rifiuto; tool disabled → rifiuto.

**Accettazione W9**: (a) ogni tool attivo ha binario esistente + digest verificato; (b) tentativo di invocare un tool non in allowlist o con digest mismatch fallisce; (c) pack.sh esegue repomix dalla lockfile.

### W10 — Codeindex riproducibile (P2 §8.2)

1. `check.sh`: verifica su **inventario completo** (tutti i file indicizzati: esistenza + hash; rilevamento aggiunte/rimozioni/rinomi); nessun campionamento.
2. `generate.ts`: rimuovere i campi volatili dal contenuto deterministico (timestamp in un file separato o chiave ignorata dal confronto).
3. Test di determinismo: due run consecutivi su input invariato → output identici byte-per-byte.

**Accettazione W10**: (a) un file aggiunto/rimosso/modificato fa fallire il check; (b) determinismo dimostrato (hash di confronto); (c) rigenerazione verificata nel run CI con conteggi allegati.

### W11 — Documentazione veritiera (P2 §8.3)

1. `docs/INDEX.md`: fase corrente; link verificati (rimuovere o creare `verification-formula.md`, `design-system/index.md`); etichetta ADR-019 coerente con W6.
2. `docs/architecture/codebase-map.md`: rimuovere/correggere i 4 path fantasma (`pyodide.ts`, `components/diff/`, `services/vfs/`, `components/toolbars/`); la sezione "sole certifier" riflette lo stato implementato post-W0/W2.
3. Nuovo sign-off `reports/14.9.9.3-final-signoff.md`: commit SHA esatto, link run CI, versioni tool/runtime, output grezzi come artefatti, elenco **limitazioni residue** (per es. motori reali non disponibili → tutto `unconfirmed`), nessun "APPROVED" se W0–W4 non sono chiusi.

**Accettazione W11**: (a) link checker (o verifica manuale elencata) senza 404 interni; (b) il sign-off cita il commit e ogni claim rimanda a un artefatto verificabile.

### W12 — Segreti (P2 §8.4)

1. Revoca/rotazione di tutti i token presenti in `data/tokens.json` nella cronologia (introduzione → `4d12916^`), con evidenza emitter-side (o dichiarazione esplicita che i token erano fittizi **con prova del loro uso confinato a test**).
2. Se i token erano reali: purge della cronologia con `git filter-repo` + coordinazione (fork, clone, CI) — operazione distruttiva da eseguire solo con consenso del maintainer.

**Accettazione W12**: (a) evidenza di rotazione/revoca o classificazione documentata come fittizia; (b) se purge: nessun riferimento raggiungibile con `git log --all -- data/tokens.json`.

---

## 11. Criteri di accettazione per il nuovo sign-off (14.9.9.3)

Il sign-off è accettabile solo se identifica il commit esatto e collega evidenza CI immutabile che dimostri:

1. **Autorità**: tutti i percorsi certificabili enumerati; nessuna evidenza sintetica o caller-supplied può produrre sigilli; test negativi verdi via servizio/API/MCP/UI; gate W1 che falliscono su file canarino.
2. **Dual-engine o niente**: richieste reali Kimina e Lake sullo stesso progetto/digest con identità toolchain/immagine, exit code e audit assiomatici verificabili — oppure **tutti gli output esplicitamente non-certificanti** e `enginesConsulted` fedele.
3. **Runner**: workspace isolata per richiesta, autenticazione, binding loopback, timeout/output/risorse limitati, non-root, input di build pinnati — verificati con test.
4. **Test**: suite default+extended eseguite, conteggi coincidenti con i casi reali, comandi/versioni/output conservati; nessuno stub contato come integrazione; albero pulito dopo il run.
5. **Governance**: TTL flag enforced e strict in CI; tutte le metriche ADR-017 enforced e bloccanti; report bundle generato dalla build nel run CI con O2 riconciliato.
6. **Tool/indice**: identità e digest verificati, repomix pinnato, codeindex deterministico e completo, pack senza segreti.
7. **Documentazione**: percorsi e claim validati; sign-off con limitazioni residue esplicite al posto di "PASS" non dimostrati.
8. **Segreti**: rotazione/revoca o classificazione documentata (W12).

**Stato di partenza dichiarato**: Fino alla chiusura di W0–W4, ogni verdetto di verifica resta `unconfirmed`, `verified: false`, senza sigilli. Il sign-off 14.9.9.2 va rettificato da "APPROVED / READY FOR MERGE" a "NOT APPROVED — P0 authority and runner issues open; test/build gates not independently evidenced" (rettifica da includere in W11.3).

---

## 12. Regole vincolanti globali (valide per tutta l'esecuzione)

1. **Fail-closed universale**: ogni percorso che non può dimostrare esecuzione reale restituisce `unconfirmed`/`verified: false`/`seal: null` con motivo esplicito.
2. **Onestà epistemica**: nessun campo (`enginesConsulted`, badge, messaggi di test) afferma attività non svolte. Un test dichiara nel messaggio solo ciò che asserisce.
3. **Nessun nuovo sigillo**: durante la remediation non si introduce alcun nuovo produttore di `SEAL_KERNEL_VERIFIED_TIER5`; l'unico futuro certificatore è il servizio dual-engine server-owned di W2.
4. **Evidenza riproducibile**: ogni claim del sign-off rimanda a un artefatto (output CI, hash, commit SHA) riproducibile da terzi.
5. **Niente numeri hard-coded**: riepiloghi e conteggi derivati dall'esecuzione reale.
6. **Isolamento dei test che mutano l'albero**: copia temporanea, ripristino verificato, albero pulito a fine run (contenuto **e** bit di modo).
7. **Segreti**: mai valori reali in fixture/log/documenti; i file storici compromessi si trattano come esposti fino a revoca provata.
8. **Scope**: Phase 15 esclusa; nessuna feature nuova; ogni deviazione dalla direttiva va dichiarata nel sign-off con motivazione.

---

## Appendice A — Registro delle evidenze (verifica nostra, commit `4d12916`)

| # | Evidenza | Esito |
|---|---|---|
| A1 | `git show --stat 4d12916` | 47 file, +3.233/−522 (coerente con l'audit) |
| A2 | `git show 4d12916 --diff-filter=D --name-only` | cancellati: `data/tokens.json`, `file.lean`, `subfolder`, `theorem` |
| A3 | `git log --all -- data/tokens.json` | presente in c491071, e7319a2, 2d0b87f, 469b03b; cancellato in 4d12916; 7.296 byte nel parent |
| A4 | Runtime `verify-all` | PASS; 225 "✓ N.M"; riepilogo "303 cumulative sub-tests" (suite 1–172) |
| A5 | Runtime `verify-extended` | PASS in 1.832 ms; 100 "✓ N.M"; riepilogo hard-coded "89" |
| A6 | Conteggio statico suite 173–194 | 100 (173–191: 85; 192–194: 15; suite 187: 8) |
| A7 | `npm run contracts:check` | PASS — "Zod and Pydantic schemas are in full sync"; `schemas/contracts.json` 420 righe |
| A8 | `npm run arch:check` | PASS (exit 0) |
| A9 | `npm run arch:check-epistemic-authority` | PASS — "Sole certifying authority … :264" **con P0-1 attivo** |
| A10 | `./scripts/seal-integrity-sweep.sh` | PASS — "0 violations" **con P0-1 attivo** |
| A11 | Scope checker epistemico | scandaglia solo `server/src/` (r. ~31); grep `multi-kernel|femev|ro-crate` nello sweep = 0 |
| A12 | PoC `redactSensitiveData` | `authorization` → `[REDACTED]`; `x-custom-auth` → valore integro (LEAK) |
| A13 | `sha256sum tools/codeindex/generate.ts` | `260f20c290681c3e7c43525d4c3409fc6b3c4217d995b7a6c6532614936c475c` ≠ digest allowlist (`e3b0c442…` = hash file vuoto) |
| A14 | `sha256sum tools/codeindex/check.sh` | `1bee33facf9a4dc29b9a984d19ec9a54f529b9c6cd05c1b507ae452a50617ea5` |
| A15 | `ls tools/search/ogrep.sh semcode.sh` | inesistenti; `grep -c repomix package.json package-lock.json` = 0 |
| A16 | `reports/bundle-post-14.json` | fase "14.9.9.2", ts 2026-11-11T12:12:08Z; main 28,84 / total 199,77 / initialLoad 132,18 / CSS 16,57 |
| A17 | Toolchain | config app: 8 valori; Dockerfile/server.js: 4 (v4.28.0, v4.31.0, v4.33.1, v4.35.0-rc4); default fisso runner v4.35.0-rc4 |
| A18 | `KiminaClientProxy` | baseUrl default `http://localhost:8000` (r. 136, 149); endpoint `/api/check`→`/verify` (r. ~155–187) |
| A19 | Runner | solo `POST /build` + health; fallback `process.cwd()` (r. 35–37); `spawn({timeout: 120000})` opzione non supportata (r. 40–44); ascolto `0.0.0.0`; nessun `USER` nel Dockerfile |
| A20 | Side-effect run suite | `git status` post-run: decine di mode-change 100644→100755 (contenuto invariato) |
| A21 | Sign-off | r. 7 "APPROVED / READY FOR MERGE"; nessun SHA/CI link; r. 51/101 "90-day" vs ADR-019 "180 days" |

## Appendice B — Riconciliazione con la direttiva 14.9.9.2 originale

Stato di ogni deliverable della direttiva al commit `4d12916`:

| Deliverable (finestra) | Stato | Nota |
|---|---|---|
| Igiene radice (W0): subfolder/theorem/file.lean, tokens.template, gitignore, URL canonico | **DONE** | A2; `data/tokens.template.json` presente |
| Digest SHA-256 reali dei tool (W0e) | **NOT DONE** | Digest invalidi/empty-hash (A13); wrapper assenti (A15) |
| Test negativi aggiuntivi (W0f) | **PARTIAL** | 187.6 significativo; 187.7/187.8 tautologici (§7.1) |
| Verification authority containment (W1) | **PARTIAL** | adjudicate() fail-closed + rotta 400 reali; P0-1/P0-2 residui (§5) |
| Fallback dichiarati codeix/semcode (W2) | **NOT DONE** | Nessuna decisione di fallback documentata; semcode wrapper assente; codeindex con digest vuoto |
| Search infrastructure allowlist (W2) | **PARTIAL** | Catalogo presente ma non autenticato (§8.1) |
| Codebase map + INDEX (W3) | **PARTIAL** | Map con 4 path fantasma; INDEX stale con link rotti (§8.3) |
| CHANGELOG [Unreleased] (W4) | **DONE** | Presente (r. 8) |
| Sign-off finale (W4) | **PARTIAL/RESPINTO** | Prodotto ma materialmente sovrastimato (§4) |
| Suite 192–194 | **DONE con riserve** | 193 buona; 192.5 locale; 194 con gap redazione (§7.1, §7.4) |
| measure-bundle + estensione CI | **DONE con riserve** | Misura reale; 3 metriche non enforced; report 14.9.9.2 non committato (§7.3) |
| Regola depcruise no-tools-in-production | **DONE** | Regola reale e in CI |
| Tools codeindex generate/check | **DONE con riserve** | Checker debole, output non deterministico (§8.2) |
| Context pack (pack.sh + README) | **DONE con riserve** | repomix non pinato (§8.1) |
| Fix runtime UI (RecommendationsPanel, lazy) | **DONE** | Verificati in `App.tsx:47–59` e componente |
| Dual-engine reale (obiettivo W1 direttiva) | **NOT DONE** | P0-3/P0-4/P0-5 (§5.3–5.5) |

---

**Fine del documento.** Verdetto consolidato: **NOT APPROVED — HOLD RELEASE**; eseguire Phase 14.9.9.3 (W0→W12) con le regole vincolanti del §12; nuovo sign-off solo secondo i criteri del §11.
