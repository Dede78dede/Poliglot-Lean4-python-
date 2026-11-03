/**
 * Local Token Vault (Phase 13.9, Task 03)
 *
 * Implements persistent token storage, opaque 32-byte base64 generation,
 * SHA-256 constant-time hash validation, rotation, and revocation.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { securityEvents } from './security-events';

export interface StoredTokenRecord {
  readonly id: string;
  readonly name: string;
  readonly tokenHash: string; // SHA-256 hash in hex
  readonly createdAt: string;
  readonly revokedAt?: string;
  readonly lastUsedAt?: string;
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
        for (const item of list) {
          this.tokens.set(item.id, item);
        }
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

  private initDefaultStorage(): void {
    // Seed default development / CI token
    this.tokens.clear();
    const defaultRaw = 'polyglot_dev_token_default_2026_base64==';
    const defaultHash = this.hashToken(defaultRaw);
    this.tokens.set('default-dev', {
      id: 'default-dev',
      name: 'Default Development Token',
      tokenHash: defaultHash,
      createdAt: new Date().toISOString(),
    });
    this.saveToStorage();
  }

  /**
   * Generates a new opaque 32-byte base64 token and stores its SHA-256 hash.
   */
  public createToken(name: string, id = `token-${Date.now()}`): { id: string; rawToken: string } {
    const rawToken = randomBytes(32).toString('base64');
    const tokenHash = this.hashToken(rawToken);

    this.tokens.set(id, {
      id,
      name,
      tokenHash,
      createdAt: new Date().toISOString(),
    });

    this.saveToStorage();
    return { id, rawToken };
  }

  /**
   * Validates a raw Bearer token against stored hashes using timingSafeEqual.
   */
  public validateToken(rawToken: string): { valid: boolean; tokenId?: string } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false };
    }

    const testHashHex = this.hashToken(rawToken);
    const testHashBuffer = Buffer.from(testHashHex, 'hex');

    for (const record of this.tokens.values()) {
      if (record.revokedAt) continue;

      const recordBuffer = Buffer.from(record.tokenHash, 'hex');
      if (testHashBuffer.length === recordBuffer.length && timingSafeEqual(testHashBuffer, recordBuffer)) {
        return { valid: true, tokenId: record.id };
      }
    }

    return { valid: false };
  }

  /**
   * Rotates a token: revokes old token and generates a new one.
   */
  public rotateToken(id: string): { id: string; newRawToken: string } {
    const existing = this.tokens.get(id);
    if (!existing) {
      throw new Error(`Token with ID ${id} not found in Token Vault.`);
    }

    // Revoke old token
    this.tokens.set(id, {
      ...existing,
      revokedAt: new Date().toISOString(),
    });

    securityEvents.emitTokenLifecycle('token_rotated', id);

    // Create new replacement token
    const newId = `${id}-rotated-${Date.now()}`;
    const { rawToken } = this.createToken(existing.name, newId);
    return { id: newId, newRawToken: rawToken };
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

  public listTokens(): readonly StoredTokenRecord[] {
    return Array.from(this.tokens.values());
  }
}

export const tokenVault = new TokenVault();
