/**
 * Notebook Session Manager (Phase 13 / Phase 13.9, Task 05)
 *
 * Manages native notebook kernel sessions with strict:
 * - Quota enforcement: Max active concurrent sessions per user / global quota
 * - TTL enforcement: Inactive sessions expire after idleTTLms
 * - Safe termination and variable disposal
 */

import { NOTEBOOK_POLICY } from '../session/policy';

export { NOTEBOOK_POLICY };

export interface NotebookSession {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: number;
  lastActiveAt: number;
  status: 'active' | 'idle' | 'terminated';
  cellExecutionCount: number;
  metadata?: Record<string, unknown>;
}

export interface SessionManagerOptions {
  readonly maxSessionsPerUser?: number;
  readonly maxTotalSessions?: number;
  readonly sessionIdleTtlMs?: number;
}

export class NotebookSessionManager {
  private readonly sessions = new Map<string, NotebookSession>();
  private readonly maxSessionsPerUser: number;
  private readonly maxTotalSessions: number;
  private readonly sessionIdleTtlMs: number;

  constructor(options?: SessionManagerOptions) {
    this.maxSessionsPerUser = options?.maxSessionsPerUser ?? NOTEBOOK_POLICY.maxSessionsPerUser;
    this.maxTotalSessions = options?.maxTotalSessions ?? NOTEBOOK_POLICY.maxSessionsTotal;
    this.sessionIdleTtlMs = options?.sessionIdleTtlMs ?? NOTEBOOK_POLICY.idleTtlMs;
  }

  public createSession(userId: string, metadata?: Record<string, unknown>): NotebookSession {
    this.evictExpiredSessions();

    // Check total quota
    if (this.sessions.size >= this.maxTotalSessions) {
      throw new Error(`QUOTA_EXCEEDED: Global notebook session limit of ${this.maxTotalSessions} reached`);
    }

    // Check user quota
    let userActiveCount = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status !== 'terminated') {
        userActiveCount++;
      }
    }

    if (userActiveCount >= this.maxSessionsPerUser) {
      throw new Error(`QUOTA_EXCEEDED: User session limit of ${this.maxSessionsPerUser} reached for user '${userId}'`);
    }

    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const session: NotebookSession = {
      id,
      userId,
      createdAt: now,
      lastActiveAt: now,
      status: 'active',
      cellExecutionCount: 0,
      metadata: metadata ? { ...metadata } : undefined,
    };

    this.sessions.set(id, session);
    return session;
  }

  public getSession(id: string): NotebookSession | undefined {
    const session = this.sessions.get(id);
    if (!session || session.status === 'terminated') return undefined;

    // Check TTL
    if (Date.now() - session.lastActiveAt > this.sessionIdleTtlMs) {
      session.status = 'terminated';
      return undefined;
    }

    return session;
  }

  public touchSession(id: string): boolean {
    const session = this.getSession(id);
    if (!session) return false;
    session.lastActiveAt = Date.now();
    session.cellExecutionCount++;
    session.status = 'active';
    return true;
  }

  public terminateSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.status = 'terminated';
    this.sessions.delete(id);
    return true;
  }

  public evictExpiredSessions(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.status === 'terminated' || now - session.lastActiveAt > this.sessionIdleTtlMs) {
        session.status = 'terminated';
        this.sessions.delete(id);
        evicted++;
      }
    }
    return evicted;
  }

  public getActiveSessionCount(): number {
    this.evictExpiredSessions();
    return this.sessions.size;
  }

  public clear(): void {
    this.sessions.clear();
  }
}

export const notebookSessionManager = new NotebookSessionManager();
