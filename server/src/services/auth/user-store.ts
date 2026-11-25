/**
 * Persistent User & RBAC Account Store
 *
 * Uses per-user CSPRNG salts and Node.js scrypt password derivation
 * stored safely in data/users.json (gitignored).
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  APP_ROLES,
  isValidAppRole,
  type AppRole,
  type PublicUserAccount,
} from '../../../../src/services/auth/roles';

interface StoredUserRecord {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: AppRole;
  readonly passwordSalt: string;
  readonly passwordHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt?: string;
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const DUMMY_SALT = '00112233445566778899aabbccddeeff';
const DUMMY_HASH = scryptSync('polyglot-dummy-timing-guard', DUMMY_SALT, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString('hex');

export class UserStore {
  private readonly storagePath: string;
  private users: Map<string, StoredUserRecord> = new Map();

  constructor(storagePath = path.resolve('data/users.json')) {
    this.storagePath = storagePath;
    this.loadFromStorage();
  }

  private hashPassword(password: string, saltHex: string): string {
    return scryptSync(password, saltHex, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString('hex');
  }

  private verifyPasswordHash(password: string, saltHex: string, expectedHashHex: string): boolean {
    const derived = scryptSync(password, saltHex, SCRYPT_KEYLEN, SCRYPT_PARAMS);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (derived.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(derived, expected);
  }

  private toPublicUser(record: StoredUserRecord): PublicUserAccount {
    return {
      id: record.id,
      username: record.username,
      displayName: record.displayName,
      role: record.role,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.lastLoginAt ? { lastLoginAt: record.lastLoginAt } : {}),
    };
  }

  private loadFromStorage(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        this.users.clear();
        return;
      }
      const raw = fs.readFileSync(this.storagePath, 'utf-8');
      const parsed = JSON.parse(raw) as StoredUserRecord[];
      this.users.clear();
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.id === 'string' && typeof item.username === 'string' && isValidAppRole(item.role)) {
            this.users.set(item.id, item);
          }
        }
      }
    } catch {
      this.users.clear();
    }
  }

  private saveToStorage(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.users.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch {
      // Best-effort in read-only test contexts
    }
  }

  public isBootstrapRequired(): boolean {
    return !Array.from(this.users.values()).some((u) => u.role === APP_ROLES.ADMIN);
  }

  public countUsers(): number {
    return this.users.size;
  }

  public listUsers(): readonly PublicUserAccount[] {
    return Array.from(this.users.values()).map((u) => this.toPublicUser(u));
  }

  public getUserById(id: string): PublicUserAccount | null {
    const found = this.users.get(id);
    return found ? this.toPublicUser(found) : null;
  }

  public getUserByUsername(username: string): PublicUserAccount | null {
    const normalized = username.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === normalized) {
        return this.toPublicUser(u);
      }
    }
    return null;
  }

  public bootstrapAdmin(input: {
    username: string;
    displayName?: string;
    password: string;
  }): PublicUserAccount {
    if (!this.isBootstrapRequired()) {
      throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
    }
    return this.createUser({
      username: input.username,
      displayName: input.displayName ?? 'Workspace Administrator',
      password: input.password,
      role: APP_ROLES.ADMIN,
    });
  }

  public createUser(input: {
    username: string;
    displayName?: string;
    password: string;
    role: AppRole;
  }): PublicUserAccount {
    const username = input.username.trim();
    if (username.length < 2 || username.length > 64 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new Error('INVALID_USERNAME');
    }
    if (!input.password || input.password.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }
    if (!isValidAppRole(input.role)) {
      throw new Error('INVALID_ROLE');
    }

    const normalized = username.toLowerCase();
    for (const existing of this.users.values()) {
      if (existing.username.toLowerCase() === normalized) {
        throw new Error('USERNAME_ALREADY_EXISTS');
      }
    }

    const id = `usr-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(input.password, salt);
    const now = new Date().toISOString();

    const record: StoredUserRecord = {
      id,
      username,
      displayName: (input.displayName ?? username).trim() || username,
      role: input.role,
      passwordSalt: salt,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, record);
    this.saveToStorage();
    return this.toPublicUser(record);
  }

  public authenticate(username: string, password: string): PublicUserAccount | null {
    const normalized = username.trim().toLowerCase();
    let matched: StoredUserRecord | undefined;
    for (const record of this.users.values()) {
      if (record.username.toLowerCase() === normalized) {
        matched = record;
        break;
      }
    }

    if (!matched) {
      // Constant-time mitigation against username enumeration timing side-channels
      this.verifyPasswordHash(password || '', DUMMY_SALT, DUMMY_HASH);
      return null;
    }

    if (!this.verifyPasswordHash(password, matched.passwordSalt, matched.passwordHash)) {
      return null;
    }

    const updated: StoredUserRecord = {
      ...matched,
      lastLoginAt: new Date().toISOString(),
    };
    this.users.set(updated.id, updated);
    this.saveToStorage();
    return this.toPublicUser(updated);
  }

  public updateUserRole(userId: string, newRole: AppRole): PublicUserAccount {
    if (!isValidAppRole(newRole)) {
      throw new Error('INVALID_ROLE');
    }
    const existing = this.users.get(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }
    if (existing.role === APP_ROLES.ADMIN && newRole !== APP_ROLES.ADMIN) {
      const adminCount = Array.from(this.users.values()).filter((u) => u.role === APP_ROLES.ADMIN).length;
      if (adminCount <= 1) {
        throw new Error('CANNOT_DEMOTE_LAST_ADMIN');
      }
    }
    const updated: StoredUserRecord = {
      ...existing,
      role: newRole,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    this.saveToStorage();
    return this.toPublicUser(updated);
  }

  public deleteUser(userId: string): boolean {
    const existing = this.users.get(userId);
    if (!existing) return false;
    if (existing.role === APP_ROLES.ADMIN) {
      const adminCount = Array.from(this.users.values()).filter((u) => u.role === APP_ROLES.ADMIN).length;
      if (adminCount <= 1) {
        throw new Error('CANNOT_DELETE_LAST_ADMIN');
      }
    }
    this.users.delete(userId);
    this.saveToStorage();
    return true;
  }
}

export const userStore = new UserStore();
