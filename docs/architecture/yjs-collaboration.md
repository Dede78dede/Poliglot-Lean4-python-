# Architecture: Yjs CRDT Collaboration & Hocuspocus

*Last verified: 2026-10-29*

## 1. Overview & Components

Polyglot Code Studio implements peer-to-peer real-time document synchronization via:
- **Fastify Hocuspocus Gateway**: WebSocket server mounted on `/ws/collaboration-yjs`.
- **y-monaco Encapsulation**: Pinned adapter to `v0.1.6` (`MonacoYjsAdapter`) isolating third-party maintenance debt.
- **Snapshot Persistence**: Continuous state serialized to disk at `/workspaces/{id}/.collab/{docId}.yjs`.
- **Compaction**: State compacted after 50 buffer updates.

---

## 2. Security & CVE-2026-24772 Audit

- Upstream Hocuspocus library is clean and unaffected by CVE-2026-24772 (which was localized to OpenProject's custom deployment).
- Polyglot Code Studio enforces:
  - Strict token authentication via `onAuthenticate({ token })`.
  - Origin allowlists preventing cross-site WebSocket hijacking.

---

## 3. Bundle Impact & Lazy-Loading Strategy

- `ENABLE_YJS_COLLABORATION` defaults to `false`.
- When disabled, Monaco binds with zero bundle overhead and no-op handles.
- When enabled, CRDT libraries are dynamically loaded within the 250 KB lazy chunk budget.
