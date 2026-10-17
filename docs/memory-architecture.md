# Architettura di Memoria a 5 Livelli & Ciclo di Vita (Polyglot Code Studio)

## 1. Tabella Sinottica dei 5 Livelli di Memoria

| Livello | Denominazione | Tecnologia & Allocazione | Lifecycle & Eviction Policy |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **AST & Diagnostics Cache** | In-Memory `LRUMap` (tetto 50 MB) | Pulizia O(1) LRU su superamento limite o chiusura file |
| **Tier 2** | **Interactive Buffer** | Monaco Editor Models + VFS dirty map | Reattivo; sincronizzazione debounced (300 ms) verso Tier 3 |
| **Tier 3** | **Client IndexedDB Store** | IndexedDB (`polyglot_studio_vfs`) | Offline-first persistente; quota gestita dal browser |
| **Tier 4** | **Server Session Workspace**| `/projects_store/{sessionId}` | TTL 72 ore; quote 500 MB per sessione; immunità per `isPinned: true` |
| **Tier 5** | **Persistent Cold Storage** | Snapshot `tar.gz` compresso con `fflate` | Compressione gzip compatta; deduplicazione tramite Content SHA-256 |

---

## 2. Politica di Promozione da Tier 4 a Tier 5 (Lifecycle Policy)

È stata adottata e implementata la strategia **Hybrid Lifecycle Policy**:

1. **Soglia di Inattività per Auto-Promozione ($N = 48$ ore)**:
   - Se una sessione non riceve richieste o modifiche per $48$ ore continue, il sistema genera automaticamente un archivio compresso e deduplicato in Tier 5 Cold Storage prima della scadenza del TTL del server.
2. **Soglia di Avviso all'80% del TTL ($57.6$ ore)**:
   - All'80% del TTL globale di 72 ore ($72 \times 0.8 = 57.6$ ore), se la sessione non è ancora stata archiviata, viene emesso un avviso UI all'utente:
     `Avviso di ciclo vitale: La sessione "<nome>" ha raggiunto l'80% del TTL (57.6h). Il progetto verrà archiviato a breve.`
3. **Promozione Manuale 1-Click (Sempre Disponibile)**:
   - L'utente può archiviare il progetto in Cold Storage in qualunque momento attraverso il pulsante dedicato nel `FiveTierMemoryDrawer` nella TopBar, senza attendere il decorso del tempo di inattività.
4. **Esenzione Assoluta per Sessioni Pinned (`isPinned: true`)**:
   - I progetti contrassegnati con `isPinned: true` (attivabile tramite icona spillo nel repository o nel drawer) sono formalmente esenti sia dall'auto-promozione forzata sia dall'eliminazione del TTL, garantendo la permanenza del workspace compilato Mathlib/Python su disco server.

---

## 3. Tabella di Routing Deterministica (`MemoryTierRouter`)

Il mapping tra tipo di dato e Tier autorevole è congelato in modo immutabile tramite `Object.freeze`:

```typescript
export const TIER_ASSIGNMENT: Readonly<Record<DataType, MemoryTier>> = Object.freeze({
  AST_DIAGNOSTICS: 'Tier1_AST',
  ACTIVE_EDITOR_BUFFER: 'Tier2_Buffer',
  VFS_PROJECT_SNAPSHOT: 'Tier3_ClientIndexedDB',
  SERVER_SESSION_WORKSPACE: 'Tier4_ServerWorkspace',
  COLD_STORAGE_ARCHIVE: 'Tier5_ColdStorage',
});
```

Il routing non viene mai inferito dinamicamente a runtime, ma risolto per via contrattuale e deterministica tramite `routeDataType(dataType: DataType)`.

---

## 4. Deduplicazione Content-Addressed via SHA-256

Tier 5 impiega un'impronta crittografica canonica calcolata ordinando alfabeticamente i percorsi dei file e normalizzando i contenuti:
- Se due progetti (o versioni identiche) hanno lo stesso contenuto canonico, `contentSha256` coincide esattamente.
- Il payload blob compresso viene memorizzato una sola volta nel database di cold storage.
- Lo snapshot secondario riceve il flag `isDeduplicated: true`, azzerando i byte ridondanti memorizzati su disco e tracciando i risparmi metrici nel drawer UI.
