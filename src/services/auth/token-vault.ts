/**
 * Local Token Vault (Phase 13.9, Task 03 + Full RBAC Session Extension)
 *
 * Implements persistent token storage, opaque 32-byte base64 generation,
 * SHA-256 constant-time hash validation, expiration enforcement, RBAC roles,
 * rotation, and revocation without hardcoded default secrets.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { securityEvents } from './security-events';
import { APP_ROLES, isValidAppRole, type AppRole } from './roles';

export interface StoredTokenRecord {
  readonly id: string;
  readonly name: string;
  readonly tokenHash: string; // SHA-256 hash in hex
  readonly createdAt: string;
  readonly userId?: string;
  readonly role?: AppRole;
  readonly baseRole?: AppRole;
  readonly authType?: 'session' | 'api-key';
  readonly expiresAt?: string;
  readonly revokedAt?: string;
  readonly lastUsedAt?: string;
}

export interface CreateTokenOptions {
  readonly userId?: string;
  readonly role?: AppRole;
  readonly baseRole?: AppRole;
  readonly authType?: 'session' | 'api-key';
  readonly expiresInMs?: number;
}

export interface TokenValidationResult {
  readonly valid: boolean;
  readonly tokenId?: string;
  readonly userId?: string;
  readonly role?: AppRole;
  readonly baseRole?: AppRole;
  readonly expiresAt?: string;
  readonly expired?: boolean;
}

export class TokenVault {
  private readonly storagePath: string;
  private tokens: Map<string, StoredTokenRecord> = new Map();

  constructor(storagePath = path.resolve('data/tokens.json')) {
    this.storagePath = storagePath;
    this.loadFromStorage();
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken.trim(), 'utf-8').digest('hex');
  }

  private loadFromStorage(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        const list = JSON.parse(data) as StoredTokenRecord[];
        this.tokens.clear();
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && typeof item.id === 'string' && typeof item.tokenHash === 'string') {
              this.tokens.set(item.id, item);
            }
          }
        }
        this.ensureEnvBootstrapToken();
      } else {
        this.initDefaultStorage();
      }
    } catch {
      this.initDefaultStorage();
    }
  }

  private saveToStorage(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.tokens.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch {
      // Best-effort in read-only / test environments
    }
  }

  public ensureEnvBootstrapToken(): void {
    const envBootstrap = process.env.POLYGLOT_BOOTSTRAP_TOKEN?.trim();
    if (!envBootstrap) return;
    const tokenHash = this.hashToken(envBootstrap);
    const existing = this.tokens.get('env-bootstrap');
    if (existing && existing.tokenHash === tokenHash && !existing.revokedAt) {
      return;
    }
    this.tokens.set('env-bootstrap', {
      id: 'env-bootstrap',
      name: 'Environment Bootstrap Token',
      tokenHash,
      createdAt: new Date().toISOString(),
      userId: 'env-admin',
      role: APP_ROLES.ADMIN,
      baseRole: APP_ROLES.ADMIN,
      authType: 'api-key',
    });
    this.saveToStorage();
  }

  private initDefaultStorage(): void {
    this.tokens.clear();
    this.ensureEnvBootstrapToken();
    this.saveToStorage();
  }

  /**
   * Generates a new opaque 32-byte base64 token and stores its SHA-256 hash.
   */
  public createToken(
    name: string,
    id = `token-${Date.now()}-${randomBytes(4).toString('hex')}`,
    options: CreateTokenOptions = {}
  ): { id: string; rawToken: string; expiresAt?: string } {
    const rawToken = randomBytes(32).toString('base64');
    const tokenHash = this.hashToken(rawToken);
    const createdAt = new Date().toISOString();
    const expiresAt =
      typeof options.expiresInMs === 'number' && options.expiresInMs > 0
        ? new Date(Date.now() + options.expiresInMs).toISOString()
        : undefined;

    this.tokens.set(id, {
      id,
      name,
      tokenHash,
      createdAt,
      userId: options.userId,
      role: options.role ?? APP_ROLES.ADMIN,
      baseRole: options.baseRole ?? options.role ?? APP_ROLES.ADMIN,
      authType: options.authType ?? 'api-key',
      ...(expiresAt ? { expiresAt } : {}),
    });

    this.saveToStorage();
    return { id, rawToken, expiresAt };
  }

  /**
   * Validates a raw Bearer token against stored hashes using timingSafeEqual.
   */
  public validateToken(rawToken: string): TokenValidationResult {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false };
    }

    const testHashHex = this.hashToken(rawToken);
    const testHashBuffer = Buffer.from(testHashHex, 'hex');
    const now = Date.now();

    for (const record of this.tokens.values()) {
      if (record.revokedAt) continue;

      const recordBuffer = Buffer.from(record.tokenHash, 'hex');
      if (testHashBuffer.length === recordBuffer.length && timingSafeEqual(testHashBuffer, recordBuffer)) {
        if (record.expiresAt && Number.isFinite(Date.parse(record.expiresAt)) && now > Date.parse(record.expiresAt)) {
          return {
            valid: false,
            tokenId: record.id,
            userId: record.userId,
            expired: true,
          };
        }

        const role = isValidAppRole(record.role) ? record.role : APP_ROLES.ADMIN;
        const baseRole = isValidAppRole(record.baseRole) ? record.baseRole : role;
        return {
          valid: true,
          tokenId: record.id,
          userId: record.userId ?? record.id,
          role,
          baseRole,
          expiresAt: record.expiresAt,
        };
      }
    }

    return { valid: false };
  }

  /**
   * Updates active session role for an existing non-revoked token.
   */
  public updateTokenRole(id: string, nextRole: AppRole): boolean {
    const existing = this.tokens.get(id);
    if (!existing || existing.revokedAt) return false;
    this.tokens.set(id, {
      ...existing,
      role: nextRole,
    });
    this.saveToStorage();
    return true;
  }

  /**
   * Rotates a token: revokes old token and generates a new one preserving role/owner metadata.
   */
  public rotateToken(id: string): { id: string; newRawToken: string; expiresAt?: string } {
    const existing = this.tokens.get(id);
    if (!existing) {
      throw new Error(`Token with ID ${id} not found in Token Vault.`);
    }

    this.tokens.set(id, {
      ...existing,
      revokedAt: new Date().toISOString(),
    });

    securityEvents.emitTokenLifecycle('token_rotated', id);

    const newId = `${id}-rotated-${Date.now()}`;
    const created = this.createToken(existing.name, newId, {
      userId: existing.userId,
      role: existing.role,
      baseRole: existing.baseRole,
      authType: existing.authType,
      expiresInMs: existing.expiresAt ? Math.max(60_000, Date.parse(existing.expiresAt) - Date.now()) : undefined,
    });
    return { id: newId, newRawToken: created.rawToken, expiresAt: created.expiresAt };
  }

  /**
   * Revokes an existing token by ID.
   */
  public revokeToken(id: string): boolean {
    const existing = this.tokens.get(id);
    if (!existing) return false;

    this.tokens.set(id, {
      ...existing,
      revokedAt: new Date().toISOString(),
    });

    this.saveToStorage();
    securityEvents.emitTokenLifecycle('token_revoked', id);
    return true;
  }

  public revokeTokensForUser(userId: string): number {
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const [id, record] of this.tokens.entries()) {
      if (record.userId === userId && !record.revokedAt) {
        this.tokens.set(id, { ...record, revokedAt: nowIso });
        securityEvents.emitTokenLifecycle('token_revoked', id);
        count++;
      }
    }
    if (count > 0) {
      this.saveToStorage();
    }
    return count;
  }

  public listTokens(userId?: string): readonly Omit<StoredTokenRecord, 'tokenHash'>[] {
    return Array.from(this.tokens.values())
      .filter((record) => (!userId ? true : record.userId === userId))
      .map(({ tokenHash: _omit, ...rest }) => rest);
  }
}

export const tokenVault = new TokenVault();
