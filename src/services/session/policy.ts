/**
 * Consolidated Session Management Policy (Phase 13.9.1, Task 12 — A2 Reconciliation)
 *
 * Epistemic & Operational Architecture:
 * Polyglot Code Studio operates two complementary, non-overlapping session subsystems:
 *
 * 1. Server VFS Project Session Manager (server/src/services/session-manager.ts):
 *    - Manages on-disk workspace file systems and Lake build artifacts in `projects_store/`.
 *    - Long-lived (72h TTL) with persistent pinned session exemptions.
 *
 * 2. Client Notebook Kernel Session Manager (src/services/notebook/session-manager.ts):
 *    - Manages in-memory Pyodide / WASM worker sessions and Monaco interactive state.
 *    - Short-lived (30 min idle TTL) with user concurrency caps.
 */

export interface ServerSessionPolicy {
  /** Maximum uncompressed bytes allocated per workspace session (500 MB) */
  readonly perSessionBytes: number;
  /** Global aggregate quota across all workspace sessions on host (10 GB) */
  readonly aggregateBytes: number;
  /** Inactivity TTL before unpinned session files are subject to LRU eviction (72 hours) */
  readonly ttlHours: number;
  /** Maximum number of simultaneous workspace directories tracked (1,000) */
  readonly maxSessions: number;
  /** Whether pinned sessions are exempt from TTL and LRU eviction (true) */
  readonly pinnedExemptFromTtl: boolean;
  /** Interval in milliseconds between background storage cleanup runs (1 hour) */
  readonly cleanupIntervalMs: number;
}

export interface NotebookSessionPolicy {
  /** Maximum active concurrent notebook sessions allowed per user (5) */
  readonly maxSessionsPerUser: number;
  /** Global hard cap on simultaneous in-memory notebook worker sessions (20) */
  readonly maxSessionsTotal: number;
  /** Idle timeout in milliseconds before an inactive notebook kernel is terminated (30 minutes) */
  readonly idleTtlMs: number;
  /** Whether long-term pinned session exemptions are supported in the notebook kernel (false) */
  readonly pinnedSupported: boolean;
}

/**
 * Server VFS Project Storage Policy constants.
 */
export const SESSION_POLICY: ServerSessionPolicy = Object.freeze({
  perSessionBytes: 500 * 1024 * 1024,        // 500 MB per workspace session
  aggregateBytes: 10 * 1024 * 1024 * 1024,   // 10 GB aggregate host storage limit
  ttlHours: 72,                              // 72 hours
  maxSessions: 1_000,                        // 1,000 maximum sessions
  pinnedExemptFromTtl: true,                 // Pinned sessions are permanent
  cleanupIntervalMs: 60 * 60 * 1000,         // 1 hour cleanup cycle
});

/**
 * Client Notebook Kernel Session Policy constants.
 */
export const NOTEBOOK_POLICY: NotebookSessionPolicy = Object.freeze({
  maxSessionsPerUser: 5,                     // 5 concurrent sessions per user
  maxSessionsTotal: 20,                      // 20 total active kernels
  idleTtlMs: 30 * 60 * 1000,                 // 30 minutes idle TTL
  pinnedSupported: false,                    // In-memory workers do not support pinning
});
