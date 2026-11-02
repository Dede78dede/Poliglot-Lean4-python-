# How-To: Real-Time CRDT Collaboration with Yjs & Hocuspocus

Polyglot Code Studio provides peer-to-peer real-time document collaboration using Yjs Conflict-Free Replicated Data Types (CRDTs), Hocuspocus server, and Monaco bindings.

*Last verified: 2026-10-29*

---

## 1. Enabling Collaboration

Real-time collaboration is disabled by default to keep the main bundle lightweight and avoid unnecessary background sockets:
1. Enable `ENABLE_YJS_COLLABORATION=true` in `.env` or **Settings > Feature Flags**.
2. When enabled, Monaco lazy-loads `y-monaco@0.1.6` and connects to the Hocuspocus WebSocket gateway at `/ws/collaboration-yjs`.
3. When disabled, Monaco operates with zero overhead and zero bundle bloat.

---

## 2. Authentication & Security

- Upstream Hocuspocus library is clean and secure (CVE-2026-24772 affects OpenProject's deployment only).
- Every connection requires token authentication via `onAuthenticate({ token })`. Invalid tokens are rejected immediately with `HOCUSPOCUS_AUTH_FAILED`.
- CORS origin allowlists enforce strict origin matching.

---

## 3. Snapshot Persistence & Compaction

- Collaborative document state is automatically snapshotted on disk to `.collab/{docId}.yjs`.
- If collaborators disconnect or the server restarts, document history resumes seamlessly from the snapshot.
- Update compaction automatically triggers after 50 buffer mutations to minimize storage overhead.

---

## 4. Epistemic Boundary

Collaborative text edits are synchronized character changes:
- Co-editing a proof script does not validate theorems.
- Only the Lean 4 kernel with `SEAL_KERNEL_VERIFIED_TIER5` can verify formal correctness.
