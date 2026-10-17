import fs from 'fs/promises';
import path from 'path';

export const SESSION_CONFIG = Object.freeze({
  ID_FORMAT: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MAX_SESSIONS: 1_000,
  SESSION_QUOTA_BYTES: 500 * 1024 * 1024, // 500 MB per session
  TOTAL_QUOTA_BYTES: 10 * 1024 * 1024 * 1024, // 10 GB aggregate storage limit across all sessions (O1)
  TTL_HOURS: 72,                          // 3 days
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000,   // 1 hour
});

export interface SessionMetadata {
  readonly id: string;
  readonly createdAt: number;
  lastAccessedAt: number;
  totalBytes: number;
  fileCount: number;
  pinned: boolean; // Residuo 1: Long-term pinned sessions exemption from 72h TTL & LRU eviction
}

export class SessionManager {
  private readonly baseDir: string;
  private readonly sessions = new Map<string, SessionMetadata>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(baseDir = path.resolve(process.cwd(), 'projects_store')) {
    this.baseDir = baseDir;
    this.startPeriodicCleanup();
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // dir exists
    }
  }

  validateSessionId(sessionId: string): boolean {
    return SESSION_CONFIG.ID_FORMAT.test(sessionId);
  }

  getSessionPath(sessionId: string): string {
    if (!this.validateSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: "${sessionId}". Must be a valid UUID v4.`);
    }
    return path.join(this.baseDir, sessionId);
  }

  getSessionMeta(sessionId: string): SessionMetadata | null {
    return this.sessions.get(sessionId) ?? null;
  }

  setPinned(sessionId: string, pinned: boolean): boolean {
    const meta = this.sessions.get(sessionId);
    if (!meta) return false;
    meta.pinned = pinned;
    meta.lastAccessedAt = Date.now();
    return true;
  }

  getTotalBytesUsed(): number {
    let total = 0;
    for (const meta of this.sessions.values()) {
      total += meta.totalBytes;
    }
    return total;
  }

  async createOrTouchSession(sessionId: string, pinned = false): Promise<SessionMetadata> {
    const sessionPath = this.getSessionPath(sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    let meta = this.sessions.get(sessionId);
    const now = Date.now();

    if (!meta) {
      if (this.sessions.size >= SESSION_CONFIG.MAX_SESSIONS) {
        await this.evictOldestSession();
      }
      meta = {
        id: sessionId,
        createdAt: now,
        lastAccessedAt: now,
        totalBytes: 0,
        fileCount: 0,
        pinned,
      };
      this.sessions.set(sessionId, meta);
    } else {
      meta.lastAccessedAt = now;
      if (pinned) {
        meta.pinned = true;
      }
    }

    return meta;
  }

  async checkQuota(sessionId: string, additionalBytes: number): Promise<boolean> {
    const meta = this.sessions.get(sessionId);
    const currentBytes = meta?.totalBytes ?? 0;
    // Per-session quota check (500 MB)
    if (currentBytes + additionalBytes > SESSION_CONFIG.SESSION_QUOTA_BYTES) {
      return false;
    }
    // Global aggregate quota check (10 GB) - O1
    if (this.getTotalBytesUsed() + additionalBytes > SESSION_CONFIG.TOTAL_QUOTA_BYTES) {
      return false;
    }
    return true;
  }

  updateSessionBytes(sessionId: string, totalBytes: number, fileCount: number): void {
    const meta = this.sessions.get(sessionId);
    if (meta) {
      meta.totalBytes = totalBytes;
      meta.fileCount = fileCount;
      meta.lastAccessedAt = Date.now();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.validateSessionId(sessionId)) return;
    this.sessions.delete(sessionId);
    try {
      const sessionPath = path.join(this.baseDir, sessionId);
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch {
      // Ignore if already deleted
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const ttlMs = SESSION_CONFIG.TTL_HOURS * 60 * 60 * 1000;
    let pruned = 0;

    for (const [id, meta] of this.sessions.entries()) {
      // Pinned sessions are strictly exempt from TTL pruning
      if (meta.pinned) {
        continue;
      }
      if (now - meta.lastAccessedAt > ttlMs) {
        await this.deleteSession(id);
        pruned++;
      }
    }

    return pruned;
  }

  private async evictOldestSession(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, meta] of this.sessions.entries()) {
      // Pinned sessions are strictly exempt from LRU eviction
      if (meta.pinned) {
        continue;
      }
      if (meta.lastAccessedAt < oldestTime) {
        oldestTime = meta.lastAccessedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      await this.deleteSession(oldestId);
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, SESSION_CONFIG.CLEANUP_INTERVAL_MS);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const sessionManager = new SessionManager();
