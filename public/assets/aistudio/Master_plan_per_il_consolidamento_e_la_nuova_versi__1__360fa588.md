# Master plan per il consolidamento e la nuova versione di Polyglot Code Studio

**Destinatari:** team di sviluppo parallelo, architettura, QA, sicurezza, Lean e release engineering  
**Stato:** proposta operativa per approvazione e pianificazione  
**Repository:** `Dede78dede/Poliglot-Lean4-python-`  
**Baseline:** branch `main`, commit `296a69d16095adcd2dab26d3225332547af725c2`  
**Lingua di lavoro:** italiano; nomi di moduli, API e simboli mantengono la forma del codice  
**Metodo finora:** audit statico; nessuna build, test, richiesta HTTP o avvio Docker è stato eseguito  
**Stime:** sprint e taglie relative, senza date; da dimensionare dopo assegnazione del team e chiusura delle decisioni di prodotto

## Mandato al team

Portare il repository a una release funzionante, completa rispetto al perimetro approvato, coerente fra codice, UI, API, runner, test e documentazione, riproducibile e sicura da distribuire. Il team deve prima dimostrare quali moduli sono raggiungibili e affidabili, poi correggere e integrare i flussi selezionati; non deve assumere che una funzione sia pronta perché il relativo file, report o claim documentale esiste.

**Priorità inderogabile:** finché i percorsi di verifica non invocano davvero un checker Lean autorevole e non propagano un risultato verificabile, nessuna UI, API, automazione, ledger, certificato o documento deve rappresentare quel risultato come `verified`, `kernelVerified`, “certificato” o equivalente. Demo, simulazione, fallback, euristica, build riuscita e kernel verification sono stati diversi.

Il documento è un piano eseguibile, non un’autorizzazione a modificare il repository. Prima dell’implementazione il product owner e il lead tecnico devono approvare perimetro, scelte architetturali e acceptance gates. Questo piano incorpora i rilievi già emersi; la lettura completa di tutti i moduli e la validazione runtime sono ancora da completare.

## Sintesi tecnica della baseline

L’inventario sul commit di riferimento conta 728 file tracciati. Le aree più ampie sono `src/` (270 file, circa 49.600 righe), `server/` (73 file, circa 11.700 righe), `tests/` (121 file, circa 11.100 righe), `docs/` (89 file) e `reports/` (86 file). Le righe totali includono documentazione, report, lockfile e SBOM e non vanno interpretate come LOC di codice.

Le analisi precedenti descrivono un prodotto con shell React/TypeScript, runtime Python previsto in Pyodide/Web Worker, API Express, route per progetti/proof/notebook, proxy Kimina, runner Lean/Lake, tool MCP/AI, contratti Zod/Pydantic, test e deployment Compose. Tuttavia, il wiring e lo stato operativo non risultano coerenti con tutte le funzionalità dichiarate.

### Finding consolidati e priorità

| Priorità | ID | Evidenza statica del commit | Rischio e intervento immediato |
|---|---|---|---|
| **P0** | F-01 UI non certificante | `src/main.tsx` monta solo `App`. `App.tsx` produce dopo 400 ms un risultato statico `verified: true`, indipendente dal testo, e mostra il badge `SEAL_KERNEL_VERIFIED_TIER5`. | Rimuovere/isolare il successo dimostrativo; nessun badge o risultato di verifica fino a una risposta reale del servizio approvato. |
| **P0** | F-02 Auto-Prove euristico | `ProofCoordinator.runDuper/runAesop/runPantograph` scelgono tattiche tramite `goal.includes`; `verifyWithKernel` fa controlli lessicali/regex; i rami possono emettere `kernelVerified: true` e certificati con campi/seal costanti. | Disabilitare il claim certificante finché un prover e il kernel Lean reale non convalidano goal, contesto e proof term. |
| **P0** | F-03 Runner build non dimostrato | Dockerfile Lean mostra un HTTP server stub che risponde `200` a ogni path; non mostra `/build` o `lake build`. `LeanProjectRunner` assegna `exitCode=0` se il campo manca. | Rifiutare risposte incomplete; implementare/collegare un runner Lake reale e testarlo in un ambiente isolato. |
| **P1** | F-04 Flusso snippet non montato nel server standard | `lean-executor` chiama `/api/v1/lean/execute`; `createLeanRouter` esiste ma non compare nel bootstrap `server.ts`, usato da `npm run dev/start`. | Approvare e montare esplicitamente le route supportate; non dichiarare reachable le factory non collegate. |
| **P1** | F-05 Progetto non condiviso al runner | Il backend scrive in una session directory locale e invia il path; nel Compose mostrato il runner non monta quella directory. | Decidere upload controllato oppure volume condiviso con mapping/permessi espliciti. |
| **P1** | F-06 Verifica `sorry`/obligation non strutturale | `verification-formula.ts` rileva theorem/lemma/example con regex e cerca diagnostica testuale di `sorry`, non esegue un audit indipendente delle dipendenze della prova. | Basare lo stato su output strutturato della compilazione Lean; separare kernel acceptance e policy sugli assiomi. |
| **P1** | F-07 Router documentati non tutti montati | `server.ts` monta un sottoinsieme; le factory Lean, AI/chat e health/readiness non risultano nel bootstrap esaminato. | Inventariare API canoniche e montarle o rimuovere/dichiarare fuori perimetro; considerare possibili launcher esterni non inclusi. |
| **P1** | F-08 Parità contratti non dimostrata | Zod, `schemas/contracts.json`, generator e Pydantic convivono; schema JSON contiene placeholder e un check esaminato simula la validazione Python. | Scegliere una fonte canonica; generare e confrontare validatori reali su fixture condivise. |
| **P1** | F-09 CI/report non equivalenti alle dichiarazioni | `verify-all.ts` esegue un sottoinsieme delle suite; alcuni report sono snapshot versionati e non dimostrano il commit corrente. | Mappare suite→job, collegare gate obbligatori, generare report per commit/run e rimuovere test tautologici. |
| **P1** | F-10 Distribuzione incoerente | Compose punta a un Dockerfile root non presente nell’inventario; runner, porte, reti, toolchain e documentazione non sono allineati. | Validare un deploy pulito dopo aver corretto build context, immagini, volume, API e health. |
| **P2** | F-11 Health/readiness statiche | `/api/health` restituisce stato e feature hard-coded; healthcheck Lean verifica la toolchain ma non la capacità `/build`. | Separare liveness da readiness e collegare la readiness alle dipendenze che rendono il servizio realmente pronto. |
| **P2** | F-12 Sicurezza per default | CORS non applica allowlist se configurazione assente; rate limiting precede auth; MCP è un confine separato; runner espone porte host nel Compose. | Definire threat model, CORS fail-closed, limiti separati pre/post auth e runner non pubblicato all’host. |
| **P2** | F-13 Documentazione e feature status | README, changelog, stato architetturale e report divergono su toolchain, conteggi, fase e “ready”. | Una matrice di stato unica, generata o verificata in CI, deve distinguere codice presente, raggiungibile, attivo e testato. |

Questi finding sono evidenze statiche dai file esaminati. I rischi relativi a runner, API non montate e deployment vanno confermati contro l’intero inventory di launcher/manifest e poi con test controllati; non sono qui presentati come risultati runtime.

## Regole tecniche non negoziabili

### 1. Verifica formale e semantica degli stati

Una prova è verificata solo se la dichiarazione e il proof term sono stati elaborati da Lean e accettati dal kernel nel contesto previsto. Il manuale Lean distingue parsing, macro expansion, elaborazione, kernel checking e compilazione; un `lake build` riuscito è un’evidenza operativa utile, ma non prova che la formalizzazione rifletta l’intento informale [1] [2] [3].

Usare stati espliciti, ad esempio `queued`, `running`, `compiled`, `verified`, `simulated`, `fallback`, `heuristic`, `failed`, `timed_out`, `unavailable`, con discriminante tipizzato e provenance. Il modello concreto va approvato, ma nessun booleano generato lato UI può concedere autorità certificante. Una risposta mancante, JSON invalido, processo non avviato, timeout o exit code assente deve fallire chiuso o restare non verificata.

Audit di proof trust separato dal build: il kernel può accettare una proof che dipende da assiomi. Per dichiarazioni sensibili, il team deve definire una policy di assiomi ammessi e usare strumenti Lean per ispezionare le dipendenze transitivamente, non una ricerca regex su `sorry`; compilazione riuscita non equivale a “nessun assioma” [1]. Le conclusioni Lean devono riportare toolchain, manifest, target, file/goal e output del job.

### 2. UI collegata ai risultati reali

Il pulsante di esecuzione deve inviare il valore corrente del buffer al servizio approvato e mostrare il risultato ricevuto, non generare il successo. Per textarea controllata, React richiede che `value` sia sincronizzato con l’`onChange` che aggiorna lo stato; il modello di UI deve distinguere submitting/success/error in base agli eventi e risultati effettivi [4] [5].

La UI deve rendere il fallimento visibile, recuperabile e accessibile. Annunciare status e messaggi non interrompenti senza spostare il focus; usare `alert` soltanto per messaggi importanti e non farlo scomparire prima che possa essere letto. Tutte le azioni devono essere utilizzabili da tastiera; se è dichiarato `popstate`, il back/forward deve sincronizzare URL e view. `pushState` da solo non genera `popstate` [6] [7] [8] [9].

### 3. Runner Lean e isolamento

Il runner deve implementare una API esplicita e versionata, invocare Lean/Lake per un target determinato e restituire uno schema strutturato con exit code esplicito, stdout/stderr, durata, versione runtime e identificatore del job. `lean-toolchain` e `lake-manifest.json` devono essere trattati come input versionati; Lake documenta il manifest come risoluzione delle versioni di dipendenze e raccomanda di versionarlo quando serve riproducibilità [3] [10].

Il team deve passare i file al runner con upload controllato o volume Compose condiviso allo stesso path; validare percorsi e limiti; eseguire il container con permessi minimi, senza privilegi o porte host non necessarie. In Docker Compose, i servizi si raggiungono per nome e porta container; i named volumes possono essere montati in più container; `service_healthy` aiuta l’ordine di avvio ma non sostituisce i retry durante il runtime [11] [12] [13]. Il probe del container deve testare la funzione/ready state richiesta, non solo la presenza della toolchain [14].

### 4. Contratti TypeScript/Python

Scegliere una sola fonte canonica. Proposta da validare in uno spike: JSON Schema Draft 2020-12 come formato neutrale condiviso, dal quale derivare i modelli/validatori runtime; alternativa accettabile: modelli Pydantic canonici con JSON Schema di validazione generato e TypeScript derivato. Non mantenere tre schemi manuali indipendenti.

Pydantic genera JSON Schema e distingue schema di validazione da quello di serializzazione; strict mode e `extra` vanno configurati deliberatamente. JSON Schema distingue campo richiesto da nullable e consente proprietà extra per default; fixture comuni devono coprire queste divergenze [15] [16] [17]. La parità va dimostrata invocando i validator reali TS e Python sugli stessi payload, non con test simulati. Pyodide esegue il runtime nel Web Worker attraverso messaggi; versionare protocollo, correlazione richiesta/risposta, cancellazione, timeout e teardown [18] [19].

### 5. Sicurezza, CI e provenienza

CORS è una policy del browser, non autenticazione o autorizzazione; configurarlo esplicitamente e fallire chiuso in produzione. Proteggere ogni route sul server, inventariare versioni/route esposte, limitare consumo risorse e distinguere liveness da readiness [20] [21] [22] [23]. Le soglie e l’ordine rate-limit/auth dipendono dal threat model: definire un limite pre-auth per IP e quote per identità autenticata solo dopo che l’identità è stabilita; non lasciare che la policy venga determinata accidentalmente dall’ordine middleware.

La CI deve rendere visibili e obbligatori i job concordati; matrix supportate e artifact devono essere legati a commit e run. Proteggere workflow con permessi minimi, lockfile delle actions o SHA completi verificati, revisioni dei workflow e OIDC a scope ristretto se si usano credenziali cloud [24] [25]. Il framework NIST SSDF raccomanda misure per verificare integrità del software rilasciato e proteggere informazioni di verifica/provenance [26].

## Architettura target proposta (decisione da approvare)

```text
Browser
  ├─ App shell / router / provider / workspace
  ├─ Editor + notebook
  ├─ Execution state machine e contratti versionati
  └─ Python: client → Web Worker Pyodide → result/error

API Express
  ├─ route registry/versionata → authN/authZ → rate limit → validation → handler
  ├─ session/workspace API
  ├─ Lean verification API (snippet) — provider esplicito e stato simulated separato
  └─ Lean project build API → queue/job → runner isolato

Runner Lean isolato
  ├─ riceve workspace con trasferimento controllato
  ├─ toolchain e dipendenze pin
  ├─ esegue Lake/Lean con timeout/resource limits
  ├─ emette risultato strutturato e provenance
  └─ readiness verifica la capacità essenziale, non una risposta generica

Quality/release
  ├─ validator TS/Python su fixture condivise
  ├─ unit/integration/E2E/Python/Lean e test negativi
  └─ release gate sul commit/artifact esatto con report e provenienza
```

Questo diagramma è una proposta di destinazione, non una descrizione dell’implementazione attuale. Il team deve decidere se Kimina `/verify` e Lake `/build` restano due prodotti distinti o se uno è l’unico percorso supportato per la UI; l’interfaccia non deve confondere verifica di snippet, compilazione di progetto, simulator e fallback.

## Organizzazione dei team paralleli

Assegnare una persona responsabile (owner) e almeno un reviewer per workstream. Il lead d’integrazione mantiene API/ADR e blocca drift fra branch. Non avviare sviluppo parallelo contro contratti incompatibili: prima chiudere le decisioni G0, poi lavorare con interfacce versionate e fixture condivise.

| Workstream | Responsabilità | Deliverable proprio | Dipendenza/integrazione |
|---|---|---|---|
| WS-A — Product/architettura | Perimetro release, runtime supportati, stato feature, ADR, route canoniche | Matrice feature/stato, decision log, API/system diagrams | Sblocca tutti; decisioni in G0/G1. |
| WS-B — Lean trust & Auto-Prove | ProofCoordinator, evaluator, policy assiomi, stato certificato, prover veri o disable | Modello di verifica, adapter reali o feature disabilitata, test negativi Lean | Richiede WS-A; prima del badge UI o del rilascio formale. |
| WS-C — Lean runner/platform | Dockerfile/Compose, endpoint build/ready, workspace transfer, toolchain e risorse | Runner riproducibile, protocollo job e readiness | Coordinato con WS-B e WS-D; non deve esporre porte non necessarie. |
| WS-D — API/backend | Bootstrap, registry delle route, auth, rate limit, sessioni, error contract | API effettivamente montate e documentate | Contratti approvati da WS-A e payload runner da WS-C. |
| WS-E — Frontend/workspace | Root App, provider, editor, routing, result state, error/accessibility | Percorso verticale UI→executor→result senza simulazione confondente | Contratto endpoint WS-D; semantica di verifica WS-B. |
| WS-F — Python/contratti | Pyodide worker, lifecycle, schema canonico, generatori/validatori | Protocollo worker e parity TS/Python misurabile | ADR WS-A; interfaccia con UI WS-E. |
| WS-G — QA/CI/release | Inventario test, test behaviorali/E2E, gate, report/artifact, branch protection | Test strategy, matrice job, release checks con provenance | Riceve interfacce congelate; collabora con tutti. |
| WS-H — Security/operations | Threat model, CORS, MCP boundary, secrets, reti/volumi, logging, runbook | Security review e checklist deploy | Input da WS-C/D; blocca release su P0/security gates. |
| WS-I — Documentazione | README, guide, changelog, roadmap, feature status, troubleshooting | Docs coerenti con codice e gate reali | Aggiorna dopo ogni merge; non certifica capacità da report storico. |

**Regola d’integrazione:** branch dei workstream possono avanzare in parallelo solo dopo che le interfacce coinvolte sono approvate. Tutti i merge passano da un integration branch/build pulito; non assumere che una suite superata su branch separati certifichi le loro combinazioni.

## Roadmap di fasi e sprint senza date

Le stime sono relative, con sprint pianificati indicativamente di due settimane; non sono promesse di calendario. `S` = lavoro circoscritto, `M` = più moduli o un flusso integrato, `L` = rischio tecnico/integrazione elevato. Le dimensioni vanno riviste dopo discovery e spike.

### Fase 0 — Baseline e audit integrale (Sprint 0, L)

**Parallelo:** WS-A inventario e decisioni prodotto; WS-G mappa suite/CI; WS-H mappa superficie e deployment; reviewer tecnici assegnati ai pacchetti B–J della Parte 1.

**Step:** congelare commit/ambiente; generare manifest di tutti i file; leggere tutti i moduli e gli entrypoint; tracciare ogni claim pubblico a implementazione e test; ricostruire import graph, route mounts e dipendenze; identificare generated/archived/artifacts; aggiornare finding con evidenza, owner e test mancante.

**Deliverable:** registro file con stato `NON LETTO/IN CORSO/LETTO/REVISIONATO/VERIFICATO`; diagrammi runtime reali; matrice feature (presente, montata, attiva, testata, release-supported); inventory API; threat model; decision log.

**Gate G0:** ogni file tracciato è assegnato oppure escluso con motivazione; P0 confermati/richiesti di verifica; scope della nuova versione e moduli fuori perimetro sono approvati; nessun test è dichiarato passato se non eseguito sul commit registrato.

### Fase 1 — Decisioni architetturali e contratti di fiducia (Sprint 1, M)

**Parallelo:** WS-A approva target UI, runtime e API; WS-B definisce autorità Lean; WS-D specifica routes/auth/error; WS-F propone schema canonico; WS-G traduce requisiti in test plan; WS-I prepara matrice claim/stato.

**Step:** scegliere significato di `verified`; distinguere snippet vs project build; definire result envelope/errore e provenance; stabilire toolchain e assiomi ammessi; fissare quali feature vanno nella prima release.

**Deliverable:** ADR architetturali, OpenAPI/contratti versionati (se REST è il target), schema status result, threat model aggiornato, matrice di supporto e piano di test.

**Gate G1:** nessun workstream implementa interfacce concorrenti; firme API, stati e semantics sono approvati; tutte le attestazioni certificanti appartengono a un’autorità designata.

### Fase 2 — Rimozione delle false attestazioni e verifica Lean autorevole (Sprint 2–3, L)

**Parallelo controllato:** WS-B implementa/invoca prover+Lean o disabilita Auto-Prove; WS-C costruisce runner Lake reale; WS-G implementa test negativi con mock e prepara test d’integrazione; WS-I elimina claim non supportati. WS-E può eliminare badge/demo ma attende result contract prima di collegare verificatore.

**Step:** rimuovere `verified=true` locale; rinominare/disabilitare metodi euristici; far eseguire Lake/Lean con target esplicito; associare sorgente, context, toolchain e manifest; rifiutare risposte incomplete o runner stub; definire audit assiomi separato e policy `sorryAx`/assiomi custom; certificati derivati da evidence reali, non da hash presentato come firma.

**Deliverable:** runner operativo e confinato; result schema; provenance; policy di trust; test con theorem corretto/falso, `sorry`, `admit`, no obligation, mismatch, timeout, output minimo/malformato e backend assente.

**Gate G2 — Bloccante:** solo un job Lean/Lake realmente eseguito e un risultato strutturato valido possono produrre verified; tutti gli esiti incerti falliscono chiuso; test negativi superano; UI/demo non esibisce certificazione. Per analisi assiomi usare il tooling Lean previsto e mantenere distinta l’accettazione del kernel dall’audit delle dipendenze [1] [2] [3].

### Fase 3 — API montate e verticale UI→API→runner (Sprint 3–4, L)

**Parallelo:** WS-D monta le route approvate; WS-E collega editor/provider/executor e stati; WS-C integra API runner/workspace; WS-G aggiunge integration tests; WS-H verifica accessi e rete.

**Step:** allineare `server.ts` ai router previsti; collegare il client Lean; decidere l’iniezione Kimina; implementare trasferimento sicuro file; fare sì che l’UI mostri provenance e errori; testare URL, history, retry, timeout e `failed`.

**Deliverable:** un flusso Lean verticale di riferimento dimostrabile da UI all’esito; route manifest; build-stream corretto o claim rimosso; health/readiness reali.

**Gate G3:** path chiamato dalla UI è montato e autenticato secondo policy; un input valido/invalid produce output distinti del backend; nessuna route va in fallback SPA per errore di wiring; stato UI e URL coerenti. Health/readiness e modalità real/simulator sono distinguibili.

### Fase 4 — Python worker e contratti cross-language (Sprint 4–5, M/L)

**Parallelo:** WS-F analizza lifecycle worker e genera contratti; WS-E collega provider UI; WS-G crea corpus condiviso; WS-D integra envelope e schema API.

**Step:** audit di concurrency/pending requests e reset; protocollo Worker request-ID/response/error; cancel/timeout/teardown; scelta fonte canonica JSON Schema o Pydantic e spike generatore; eliminazione parity simulata; casi di serialization/strict mode/null/extra/tag.

**Deliverable:** protocollo worker documentato; schema versionato; generator deterministico; fixture condivise; validatori eseguiti realmente TS e Python; matrix browser/Pyodide supportata.

**Gate G4:** medesimi payload sono accettati/rifiutati con esiti concordi secondo le regole approvate; artifact generati puliti; richieste concorrenti non si sovrascrivono; fallimenti/timeout/worker termination sono visibili e non producono risultati stale. Pydantic strict e JSON Schema hanno semantiche da coprire esplicitamente [15] [16] [17] [18] [19].

### Fase 5 — Backend, security e runtime operativi (Sprint 5–6, M/L)

**Parallelo:** WS-D route/auth/rate limit; WS-H threat model/CORS/MCP/secrets; WS-C reti/volumi/images/health; WS-G test accesso e deployment; WS-I aggiorna procedure.

**Step:** allowlist route e middleware; auth vs rate-limit ordinati deliberatamente; health vs ready; CORS fail-closed; API error envelope; MCP come boundary distinta; rimozione porte runner host; volume/session security; graceful shutdown, readiness e limits.

**Deliverable:** API inventory; authZ matrix; configuration schema con startup validation; container Compose da checkout pulito; runbook incident/upgrade; security tests.

**Gate G5:** le route sono effettivamente protette; origin non approvato non ottiene CORS; rate limits pre-auth/post-auth seguono policy; runner non è pubblicato all’host; readiness fallisce quando dipendenza essenziale è down; segreti e risposte verbose non trapelano [20] [21] [22] [23] [24] [25] [26].

### Fase 6 — Consolidamento per tutti gli altri moduli (Sprint 6–8, L)

**Parallelo per domini, ciascuno con owner e test owner:** notebook; workspace/storage/VFS/GitHub; proof reuse/memory; AI/provider; MCP client/server/tools; collaboration/blueprint/Yjs; translation/diff/search/discovery/config; Femev/autocorrection; accessibilità e UI. Ogni dominio sceglie esplicitamente `INCLUDE`, `DISABLE` o `DEFER` per la release.

**Step comune per ciascun modulo:** leggere tutti i file assegnati; verificare caller/wiring, schema, stato e permission; collegare dipendenza esterna o impostare feature flag off; sostituire fixture/static output in UI; definire failure modes; aggiungere test comportamentali e di integrazione; aggiornare docs.

**Deliverable per modulo:** scheda di audit; call graph; feature status; contratto; test; dipendenze/config; finding chiusi o ticket con owner; change log.

**Gate G6:** nessun modulo fuori perimetro è accidentalmente presentato come ready; ogni modulo incluso è raggiungibile, permissioned, testato, osservabile e documentato; funzionalità non operative sono disabilitate o chiaramente etichettate.

### Fase 7 — CI, E2E e assurance (Sprint 8–9, M/L)

**Parallelo:** WS-G guida; ogni workstream rende il proprio job testabile; WS-H revisiona workflow; WS-I aggiorna le istruzioni per la riproduzione.

**Step:** ricostruire esattamente suite invocate; suddividere unit, component, API, Python, Lean, E2E, security; rimuovere test tautologici; gate mandatory; matrix di versioni supportate; report coverage per run/commit; pinning actions/permissions; mutation/fuzz se justified; flakiness policy.

**Deliverable:** pipeline verificabile; matrice suite→job; artifact/report con commit, workflow/run ID, command, toolchain, outcome; branch rules e release gates.

**Gate G7:** suite obbligatorie tutte invocate e passate; suite saltate sono segnalate; test deliberatamente rotti causano gate fail; report appartengono all’exact commit; action references e permissions sono conformi alla policy adottata [24] [25] [26].

### Fase 8 — Release candidate, docs e supporto (Sprint 10–11, M)

**Parallelo:** WS-A definisce release scope; WS-G produce evidenze; WS-H approva security/deploy; WS-I produce docs e changelog; WS-B/C/E/F chiudono regressioni.

**Step:** build pulita e deploy Compose; smoke tests; verifica route, runner e feature flag; report e SBOM/provenance secondo policy; aggiornamento README/change log/support matrix; rollback; triage bug non bloccanti.

**Deliverable:** release candidate e dossier di rilascio con commit/digest, gate, toolchain, limiti, deployment steps, issue residue con owner e scadenza.

**Gate G8 — Release:** zero finding P0 aperti; ogni P1 è chiuso o accettato esplicitamente dal product/security owner; UI/API non promettono funzionalità non eseguite; artifact è legato al commit; installazione documentata riproducibile; policy di supporto e rollback approvate [26].

## Backlog iniziale ordinato per valore/rischio

| ID | Pri | Owner primario | Dipendenze | Risultato accettabile |
|---|---|---|---|---|
| M-01 | P0 | WS-E + WS-B | G1 | Nessun successo Lean locale fittizio; UI mostra unverified/unavailable fino a risultato reale. |
| M-02 | P0 | WS-B | G1, WS-C | Auto-Prove non può emettere `kernelVerified` senza elaborazione Lean/kernel effettiva. |
| M-03 | P0 | WS-C + WS-G | G1 | Runner implementa `/build`; no default success per exitCode mancante; test stub/empty/timeout/error. |
| M-04 | P0 | WS-B + WS-C | M-02/M-03 | `verified` è server-owned, tracciato a source/goal/toolchain/job; simulator/fallback non certificano. |
| M-05 | P1 | WS-D | G1 | Manifest routes e mount approvati; Lean/AI/chat/health presenti solo se supportati e protetti. |
| M-06 | P1 | WS-C + WS-D | M-03 | Trasferimento file isolato via upload o named volume; niente path implicito tra container. |
| M-07 | P1 | WS-F + WS-D | G1 | Una fonte di schema; generation deterministica; parity test TS/Pydantic effettiva. |
| M-08 | P1 | WS-E | M-01, M-05 | Provider/orchestrator/editor collegati; errore/loading/success/fallback accessibili e veritieri. |
| M-09 | P1 | WS-H + WS-D | G1 | CORS/auth/rate limit/MCP/health/readiness definiti e testati secondo threat model. |
| M-10 | P1 | WS-G | tutti gli stream | CI copre suite obbligatorie, E2E, Python, Lean; report run-specific; test tautologici rimossi. |
| M-11 | P1 | WS-C + WS-H | M-03/M-06 | Compose Dockerfile/build path corretto; runner interno; healthcheck funzionale; toolchain coerenti. |
| M-12 | P2 | WS-F + WS-E | M-07 | Worker Python gestisce request concurrency, timeout, cancellation, load/error e teardown. |
| M-13 | P2 | Owner di dominio | G0/G6 | MCP, AI, collaboration, storage, search, notebook e pannelli inclusi o disabilitati con stato coerente. |
| M-14 | P2 | WS-I + WS-A | G8 | README, changelog, status, toolchains, support matrix e runbook generati/riconciliati alla release. |

## Audit completo dei moduli: pacchetti di consegna

Questo è il piano di copertura del repository, non una dichiarazione che ogni file sia già stato letto. Ogni pacchetto deve chiudersi con elenco dei percorsi, intervalli letti, simboli, dipendenze, tests e finding; i confini possono essere suddivisi ulteriormente in più revisori.

| Pacchetto | Moduli/path | Controllo minimo per chiudere l’audit |
|---|---|---|
| A — Root/toolchain | `package.json`, lockfile, Vite, TS, Vitest, `.env.example`, `.gitignore`, pre-commit, metadata e entrypoints | Script realmente usati; versioni; build/test/deploy; variabili e default; configurazione condivisa vs artifact. |
| B — Frontend entry/state | `src/main.tsx`, `src/App.tsx`, `src/context/`, `src/hooks/`, `src/types/`, `src/workers/`, `src/middleware/` | Grafo mount/provider; URL/state; executor; workers/lifecycle; error/result states. |
| C — UI components | `src/components/`, `src/shared/`, `src/examples/`, `src/registries/`, `src/utils/`, CSS, `public/`, `assets/` | Per ogni pannello caller, feature flag, accessibility, dati demo vs live, permission e visibilità in root. |
| D — Frontend services | 155 moduli in `src/services/` (execution, verification, storage, proof, notebook, MCP/AI, discovery, search, collaboration, errors, autocorrection, translation e altro) | Import/caller graph; contratto; retry/error; stati real/simulated/fallback; uso reale; dipendenze esterne; test. |
| E — Express/API | `server.ts`, `server/src/routes/`, middleware, services, storage, upstream client | Route mount vs export; auth/rate limit/CORS; validation; status/error; ownership session; external API. |
| F — Contratti/Python | `schemas/`, `.py`, `pyproject.toml`, generatori/verificatori in `scripts/`, wrapper LeanCert | Source of truth; runtime validation; schema generation; compatibility; Python version; subprocess sandbox. |
| G — Lean formalization | `.lean`, `lakefile*`, manifests, toolchains, prover bridges, evaluator, templates/experiments, Lean Docker | Toolchain pin; Lake target/deps; kernel trust; assiomi/sorry policy; runner isolation; docs/code alignment. |
| H — Test/e2e | 121 file sotto `tests/`, fixture, `scripts/verify-all.ts`, archived test scripts | Test realmente invocati; coverage per rischio; test negativi; assertion indipendenti; flakiness; scope vs reports. |
| I — CI/supply chain | `.github/workflows/`, package locks, SBOM, dependency/audit reports | Trigger/permissions; required checks; SHA/action lock; artifact provenance; test matrix; report legati a SHA. |
| J — Deploy/security | `docker-compose*.yml`, `docker/`, gateway, security headers, token vault/secrets docs, storage | Build pulita; reachability/rete; host ports; volume/permissions; secrets; probes; resource limits; backup/rollback. |
| K — Documentazione/stato | 89 `docs/`, 86 `reports/`, README/CHANGELOG/backlog | Claim-to-code trace; versione/fase; report freshness; normativi vs obsoleti; onboarding e troubleshooting. |

I file generati, i lockfile, SBOM e report vanno sottoposti a controlli di provenienza/diff e ai rispettivi parser, non conteggiati come “letti riga per riga” nel senso dei moduli sorgente. Il registro deve includere anche file binari e generated con la loro policy di esclusione o verifica.

## Test matrix e criteri di accettazione release

| Layer | Test necessari | Fallimento che deve bloccare |
|---|---|---|
| Lean proof trust | theorem corretto/falso; `sorry`; `admit`; nessun theorem; assiomi non ammessi; output invalido; risposta 200 stub; toolchain mismatch; timeout/unavailable. | Qualunque esito senza Lean reale risulta verified; exitCode mancante diventa 0; certificato non derivabile da evidence. |
| Runner/deploy | Build per servizio da clone pulito; upload/volume session; `/readyz`; Lake build target; Compose health; path traversal/session isolation. | Dockerfile mancante; health green con runner stub; service non vede file; porta runner esposta involontariamente. |
| API/security | Route inventory, auth anonimo/valido/invalid/scaduto, autorizzazione oggetto, rate-limit, CORS/preflight, MCP, error redaction, readiness. | Router previsto non montato/protetto; origin libero in prod; segreti/stack esposti; status readiness statico. |
| UI/component/E2E | Buffer corrente inviato; loading/success/error; real/simulated/fallback; keyboard, focus/status message, back-forward, refresh/deep link. | Badge non derivato da backend; errore invisibile; view/URL divergenti; azione solo pointer. |
| Python worker | Load runtime; package/import; concorrenza ID; errore; cancellazione; timeout; worker reset/cleanup; session persistence. | Request sovrascritta o risposta stale; lock UI; timeout non risolto; errore non serializzabile. |
| Contratti | Generation clean; meta-schema; same fixture Zod/TS/Pydantic; required/null/extra/tag/limits/aliases/serialization/number edge. | Parity simulata o divergence non documentata; schema artifact obsoleto. |
| MCP/AI/feature flags | Tool reale vs stub; consent; off/on; timeout/provider down; payload JSON; auth/limit; data governance. | Descrizione tool supera implementazione; code/data inviato senza consent richiesto; 503 incoerente. |
| CI/release | Ogni required job; failure injection; matrix; artifact sha/run id; code scanning; supply-chain; exact release commit. | Suite obbligatoria saltata; report stale promosso; artifact non legato a commit o workflow verificato. |

Test con API esterne, credenziali o costi devono avere provider mockabili in unit/integration e un test controllato in ambiente dedicato. Le prove Lean di release richiedono almeno un runner reale isolato e fixture negative; un simulatore è utile per UI e fallback, ma non è il gate di certificazione.

## Definition of Done per modulo e release

Un modulo è chiuso solo quando:

1. file e dipendenze assegnati all’audit integrale, con call graph e owner;
2. contratto input/output, stati/errori, limiti, timeout, auth e config definiti;
3. implementazione raggiungibile dal prodotto o esplicitamente disabilitata/deferred;
4. test reali del comportamento e casi negativi sono invocati in CI;
5. UI, API e docs non sovrastimano quello che il modulo fa;
6. sicurezza e privacy considerate in base al threat model;
7. report/test/artifact sono legati al commit, versione toolchain e run;
8. rollout/rollback e rischio residuo sono tracciati.

La release è pronta solo se i gate G0–G8 applicabili sono passati, tutti i P0 sono chiusi, non ci sono P1 critici non accettati, il deployment è ricostruibile e una release candidate è stata verificata sull’esatto commit. “Compila” non significa “funziona”; “test passa” non significa “test copre il rischio”; “documentato” non significa “montato”; “kernel ha accettato la prova” non dimostra da solo che la proposizione formalizzata sia l’intento informale.

## Governance del lavoro parallelo

- **Un issue = un finding o una unità di decisione.** Collegare ticket a evidenza e acceptance criteria di questo master plan.
- **No interface drift.** Prima di implementare route, result schema, worker protocol o runner API, aggiornare la specifica condivisa e assegnare un reviewer consumer.
- **Branch ownership.** Ogni workstream possiede cartelle/file espliciti; file condivisi come `server.ts`, contratti e `package.json` hanno un integration owner per evitare conflitti.
- **Test evidence obbligatoria.** Ogni PR indica command, ambiente, commit base, risultati e test saltati. Niente claim “100% pass” senza output della run.
- **Risk acceptance esplicita.** Il team non può accettare per implicito un falso badge Lean o un runner stub; il security/product owner deve documentare scope e mitigazioni per ogni eccezione.
- **Documentazione in coda al cambiamento.** Aggiornare README/status/changelog nella stessa release branch; archiviare i report storici come snapshot con SHA e data.
- **Decision gate.** Bloccare il workstream se upstream/provider/versioni non disponibili; non sostituire silenziosamente un test reale con mock/fallback.

## Decisioni aperte da chiudere al kick-off

1. Shell target: demo attuale o workspace/editor ricco? Quale diventa app pubblicata?
2. Runtime Lean ufficiale: Kimina `/verify`, Lake `/build`, o due percorsi con scopi e badge distinti?
3. Il runner build usa upload o volume condiviso? Come sono isolati i progetti e cancellate le sessioni?
4. Quale toolchain Lean, Mathlib/ProofWidgets e OS sono supportati e testati? Quali versioni escono dalla matrice?
5. Quale policy di assiomi è richiesta per le attestazioni e quali assiomi standard sono ammessi? Quando usare audit assiomi o checker secondari?
6. Quale schema è canonico: JSON Schema o Pydantic? Quale subset cross-runtime e quale dialect/versione?
7. Quali feature sono obbligatorie per la prima versione e quali vengono esplicitamente disabilitate/deferite?
8. Quale modello di deployment si supporta (dev, self-hosted, cloud)? Quali porte devono essere pubbliche? Come si gestiscono auth, reverse proxy e CORS?
9. Quali versioni browser/Node/Python/Docker sono supportate e su quali runner CI si possono fare test Lean reali?
10. Quali job diventano required checks e chi può firmare l’accettazione finale di release e residui di rischio?

## Documenti e sorgenti utilizzati

Questo master consolida la [relazione architetturale iniziale](ANALISI-ARCHITETTURALE.md), il [piano Parte 1](PIANO-ANALISI-E-SVILUPPO.md) e l’[audit Parte 2](AUDIT-PARTE-2-ENTRYPOINT-E-VERIFICA-LEAN.md). I tre documenti restano utili come dettaglio; in caso di divergenza operativa, il presente master definisce roadmap e priorità, mentre le evidenze puntuali restano tracciate nei report di audit al commit indicato.

Documenti interni confrontati: `README.md`, `docs/architecture/status.md`, `docs/tech-debt-backlog.md`, `docs/lean-dependencies.md`, `docs/proof-automation.md`, `reports/phase-14-consolidation-summary.md`, `package.json`, `server.ts`, `src/main.tsx`, `src/App.tsx`, `server/src/services/proof/proof-coordinator.ts`, `server/src/services/verification-formula.ts`, `server/src/services/lean-project-runner.ts`, `docker/lean-runner/Dockerfile`, `docker-compose.yml` e i moduli citati nei due audit.

## Riferimenti ufficiali consultati

Fonti consultate il 5 novembre 2026, salvo la versione/data specifica indicata. Le pagine “latest/stable” possono cambiare: per implementazione e audit il team deve annotare la versione effettiva della tecnologia e la data di consultazione. Le fonti supportano le best practice generali, non attestano lo stato del repository.

[1]: https://lean-lang.org/doc/reference/latest/ValidatingProofs/ "The Lean Language Reference - Validating a Lean Proof"
[2]: https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/ "The Lean Language Reference - Elaboration and Compilation"
[3]: https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/ "The Lean Language Reference - Lake"
[4]: https://react.dev/reference/react-dom/components/textarea "React - textarea"
[5]: https://react.dev/learn/reacting-to-input-with-state "React - Reacting to Input with State"
[6]: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html "W3C WAI - WCAG 2.2 Status Messages"
[7]: https://www.w3.org/WAI/ARIA/apg/patterns/alert/ "W3C WAI ARIA Authoring Practices - Alert Pattern"
[8]: https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html "W3C WAI - WCAG 2.2 Keyboard"
[9]: https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event "MDN - Window popstate event"
[10]: https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Managing-Toolchains-with-Elan/ "The Lean Language Reference - Managing Toolchains with Elan"
[11]: https://docs.docker.com/compose/how-tos/startup-order/ "Docker Docs - Control startup and shutdown order in Compose"
[12]: https://docs.docker.com/compose/how-tos/networking/ "Docker Docs - Networking in Compose"
[13]: https://docs.docker.com/engine/storage/volumes/ "Docker Docs - Volumes"
[14]: https://docs.docker.com/reference/dockerfile/ "Docker Docs - Dockerfile reference and HEALTHCHECK"
[15]: https://docs.pydantic.dev/latest/concepts/json_schema/ "Pydantic - JSON Schema"
[16]: https://docs.pydantic.dev/latest/concepts/strict_mode/ "Pydantic - Strict Mode"
[17]: https://json-schema.org/understanding-json-schema/reference/object "Understanding JSON Schema - Object"
[18]: https://pyodide.org/en/stable/usage/webworker.html "Pyodide 314.0.7 - Using Pyodide in a web worker"
[19]: https://pyodide.org/en/stable/usage/api/js-api.html "Pyodide 314.0.7 - JavaScript API"
[20]: https://expressjs.com/en/advanced/best-practice-security.html "Express - Production Best Practices: Security"
[21]: https://expressjs.com/en/resources/middleware/cors.html "Express cors middleware 2.8.6"
[22]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP API Security Top 10 - 2023"
[23]: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/ "Express - Health Checks and Graceful Shutdown"
[24]: https://docs.github.com/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions "GitHub Actions - Security hardening"
[25]: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow "GitHub Actions - Running variations of jobs"
[26]: https://csrc.nist.gov/pubs/sp/800/218/final "NIST SP 800-218 - Secure Software Development Framework Version 1.1"
[27]: https://docs.docker.com/engine/security/ "Docker Docs - Docker Engine security"
[28]: https://docs.docker.com/build/building/best-practices/ "Docker Docs - Building best practices"
[29]: https://docs.github.com/actions/automating-builds-and-tests/building-and-testing-python "GitHub Actions - Building and testing Python"
[30]: https://www.typescriptlang.org/docs/handbook/2/narrowing.html "TypeScript Handbook - Narrowing"
