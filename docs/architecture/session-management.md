# Session Management Architecture & Shared Policy

**Phase**: 13.9.1 (Task 12 — A2 Reconciliation)  
**Status**: ACTIVE  
**Updated**: 2026-11-04  

---

## 1. Overview & Dual Subsystem Architecture

Polyglot Code Studio implements two distinct, complementary session subsystems designed for orthogonal layers of the application stack. They are **not alternatives**, but specialized engines with clear boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       POLYGLOT SESSION ARCHITECTURE                         │
├──────────────────────────────────────────┬──────────────────────────────────┤
│ Server VFS Project SessionManager        │ Client Notebook SessionManager   │
│ (server/src/services/session-manager.ts) │ (src/services/notebook/...)      │
├──────────────────────────────────────────┼──────────────────────────────────┤
│ Scope: On-disk workspace filesystem      │ Scope: In-memory Pyodide/WASM    │
│ Target: Lake build artifacts, .olean     │ Target: Monaco cells, variables  │
│ Location: projects_store/<session-id>/   │ Location: Browser WebWorker      │
│ TTL: 72 hours (sliding inactivity)       │ TTL: 30 minutes (idle timeout)   │
│ Quota: 500 MB per workspace              │ Quota: 5 active sessions / user  │
│ System Limit: 10 GB host storage limit   │ System Limit: 20 active kernels  │
│ Pinned Support: YES (permanent)          │ Pinned Support: NO (ephemeral)   │
└──────────────────────────────────────────┴──────────────────────────────────┘
```

---

## 2. Policy Single Source of Truth (`src/services/session/policy.ts`)

Both managers extract their configuration from the frozen policy definitions in `src/services/session/policy.ts`:

### Server VFS Session Policy (`SESSION_POLICY`)
- **`perSessionBytes` (500 MB)**: Max uncompressed byte allocation for Lean source files and compilation artifacts within a single project.
- **`aggregateBytes` (10 GB)**: Global safety cap across all active workspaces on the server to prevent disk exhaustion.
- **`ttlHours` (72 hours)**: Automatic cleanup removes unpinned sessions after 3 days of inactivity.
- **`maxSessions` (1,000)**: Maximum concurrent tracked workspace directories with LRU eviction.
- **`pinnedExemptFromTtl` (`true`)**: Sessions marked as pinned (via `POST /api/v1/projects/lean/session/:id/pin`) are permanently immune to TTL expiration and LRU eviction.
- **`cleanupIntervalMs` (1 hour)**: Background sweeper periodicity.

### Client Notebook Session Policy (`NOTEBOOK_POLICY`)
- **`maxSessionsPerUser` (5)**: Concurrency guard preventing single users from spinning up unbounded WASM workers.
- **`maxSessionsTotal` (20)**: Host-wide concurrency cap on active browser notebook workers.
- **`idleTtlMs` (30 minutes)**: Inactive notebook kernels release WebWorker resources and variable state after 30 minutes.
- **`pinnedSupported` (`false`)**: Notebook kernels are in-memory computation instances and cannot be pinned across restarts.

---

## 3. Interaction & Lifecycle Flow

```
[User initiates Project Workspace]
           │
           ▼
Server VFS SessionManager
(Allocates projects_store/<id>, watches 500 MB quota, enforces 72h TTL)
           │
           ├────────────────────────────┐
           ▼                            ▼
[Lake Build / Lean Server]    [User opens Native Notebook]
                                        │
                                        ▼
                           NotebookSessionManager
                           (Allocates kernel, watches 5 sessions/user, 30m TTL)
                                        │
                                        ▼
                           [Isolated notebook.worker.ts]
```
