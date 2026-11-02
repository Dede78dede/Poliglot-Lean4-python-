import type { EncryptedVaultPayload } from '../../types/storage';
import { PROVIDER_CAPABILITIES_MAP, type ProviderAuthScheme } from '../ai/providers/provider-capabilities';

export const VAULT_STORAGE_KEY = 'polyglot_token_vault_v1';
export const MULTI_SECRET_STORAGE_KEY = 'polyglot_multi_secrets_vault_v1';
export const SECRET_AUDIT_LOG_KEY = 'polyglot_secret_audit_log_v1';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

export interface SecretMetadata {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastAccessedAt?: number;
  // Phase 10.10 extensions
  readonly authScheme?: ProviderAuthScheme;
  readonly additionalHeaders?: Readonly<Record<string, string>>;
  readonly pricing?: {
    readonly inputUsdPerMillion: number;
    readonly outputUsdPerMillion: number;
  };
}

export interface SecretAuditEntry {
  readonly timestamp: number;
  readonly secretId: string;
  readonly providerId: string;
  readonly action: 'store' | 'access' | 'rotate' | 'delete';
  readonly success: boolean;
}

export interface StoredEncryptedSecret {
  readonly metadata: SecretMetadata;
  readonly payload: EncryptedVaultPayload;
}

function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuf(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  subtle: SubtleCrypto,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(passphrase);

  const baseKey = await subtle.importKey(
    'raw',
    rawKey as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  throw new Error('SubtleCrypto is not available in current environment');
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    return (window.crypto.getRandomValues as (arr: Uint8Array) => Uint8Array)(array);
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return (crypto.getRandomValues as (arr: Uint8Array) => Uint8Array)(array);
  }
  throw new Error('crypto.getRandomValues is not available');
}

export class TokenVault {
  // Ephemeral in-memory decrypted token cache during active session
  private activeToken: string | null = null;
  // Multi-secret store in-memory (mirrored to localStorage when available)
  private readonly secretStore = new Map<string, StoredEncryptedSecret>();
  // Local audit log (never transmitted over network)
  private readonly auditLog: SecretAuditEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(MULTI_SECRET_STORAGE_KEY);
        if (raw) {
          const list: StoredEncryptedSecret[] = JSON.parse(raw);
          for (const item of list) {
            this.secretStore.set(item.metadata.id, item);
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }

  private persistMultiSecrets(): void {
    if (typeof localStorage !== 'undefined') {
      const list = Array.from(this.secretStore.values());
      localStorage.setItem(MULTI_SECRET_STORAGE_KEY, JSON.stringify(list));
    }
  }

  private recordAudit(secretId: string, providerId: string, action: SecretAuditEntry['action'], success: boolean): void {
    const entry: SecretAuditEntry = {
      timestamp: Date.now(),
      secretId,
      providerId,
      action,
      success,
    };
    this.auditLog.push(entry);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SECRET_AUDIT_LOG_KEY, JSON.stringify(this.auditLog.slice(-100)));
      } catch {
        // storage overflow guard
      }
    }
  }

  public getAuditLog(): readonly SecretAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Encrypts a sensitive string using PBKDF2-derived AES-GCM-256.
   */
  async encrypt(secret: string, passphrase: string): Promise<EncryptedVaultPayload> {
    if (!passphrase || passphrase.length < 4) {
      throw new Error('Master passphrase must be at least 4 characters');
    }

    const subtle = getSubtleCrypto();
    const salt = getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
    const iv = getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

    const key = await deriveAesKey(passphrase, salt, subtle);
    const encoder = new TextEncoder();
    const encodedSecret = encoder.encode(secret);

    const ciphertextBuf = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      encodedSecret as unknown as BufferSource,
    );

    const payload: EncryptedVaultPayload = {
      version: 1,
      kdf: 'PBKDF2',
      iterations: PBKDF2_ITERATIONS,
      cipher: 'AES-GCM-256',
      saltHex: bufToHex(salt),
      ivHex: bufToHex(iv),
      ciphertextHex: bufToHex(ciphertextBuf),
    };

    this.activeToken = secret;
    return payload;
  }

  /**
   * Decrypts an encrypted payload using the provided passphrase.
   */
  async decrypt(payload: EncryptedVaultPayload, passphrase: string): Promise<string> {
    const subtle = getSubtleCrypto();
    const salt = hexToBuf(payload.saltHex);
    const iv = hexToBuf(payload.ivHex);
    const ciphertext = hexToBuf(payload.ciphertextHex);

    const key = await deriveAesKey(passphrase, salt, subtle);

    try {
      const decryptedBuf = await subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        ciphertext as unknown as BufferSource,
      );
      const decoder = new TextDecoder();
      const plainText = decoder.decode(decryptedBuf);
      this.activeToken = plainText;
      return plainText;
    } catch {
      throw new Error('Decryption failed: Incorrect master passphrase or corrupted vault data');
    }
  }

  // --- Extended Multi-Secret Support (Phase 10.4) ---

  /**
   * Stores a named secret for a provider, encrypted with PBKDF2 + AES-GCM-256.
   */
  async storeSecret(
    providerId: string,
    secret: string,
    passphrase: string,
    optionsOrLabel?: string | {
      label?: string;
      authScheme?: ProviderAuthScheme;
      additionalHeaders?: Readonly<Record<string, string>>;
      pricing?: { inputUsdPerMillion: number; outputUsdPerMillion: number };
    },
  ): Promise<string> {
    const id = `sec_${providerId}_${Date.now()}`;
    const payload = await this.encrypt(secret, passphrase);

    const opts = typeof optionsOrLabel === 'string' ? { label: optionsOrLabel } : (optionsOrLabel ?? {});
    const defaultCaps = PROVIDER_CAPABILITIES_MAP[providerId];

    const metadata: SecretMetadata = {
      id,
      providerId,
      label: opts.label ?? `${providerId} API Key`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authScheme: opts.authScheme ?? defaultCaps?.authScheme,
      additionalHeaders: opts.additionalHeaders,
      pricing: opts.pricing ?? (defaultCaps ? {
        inputUsdPerMillion: defaultCaps.pricingUsdPerMillionInput,
        outputUsdPerMillion: defaultCaps.pricingUsdPerMillionOutput,
      } : undefined),
    };

    this.secretStore.set(id, { metadata, payload });
    this.persistMultiSecrets();
    this.recordAudit(id, providerId, 'store', true);
    return id;
  }

  /**
   * Calculates estimated USD cost for input and output token usage against provider pricing.
   */
  calculateCostUsd(providerId: string, tokensIn: number, tokensOut: number): number {
    const meta = this.listSecrets().find((s) => s.providerId === providerId);
    const pricing = meta?.pricing ?? (PROVIDER_CAPABILITIES_MAP[providerId] ? {
      inputUsdPerMillion: PROVIDER_CAPABILITIES_MAP[providerId]!.pricingUsdPerMillionInput,
      outputUsdPerMillion: PROVIDER_CAPABILITIES_MAP[providerId]!.pricingUsdPerMillionOutput,
    } : { inputUsdPerMillion: 0, outputUsdPerMillion: 0 });

    const cost = ((tokensIn * pricing.inputUsdPerMillion) + (tokensOut * pricing.outputUsdPerMillion)) / 1_000_000;
    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  /**
   * Returns metadata only for all configured secrets (NO plaintext).
   */
  listSecrets(): readonly SecretMetadata[] {
    return Array.from(this.secretStore.values()).map((s) => ({ ...s.metadata }));
  }

  /**
   * Retrieves and decrypts a secret by its secret ID or provider ID.
   */
  async getSecret(idOrProviderId: string, passphrase: string): Promise<string> {
    let entry = this.secretStore.get(idOrProviderId);
    if (!entry) {
      entry = Array.from(this.secretStore.values()).find(
        (s) => s.metadata.providerId === idOrProviderId,
      );
    }

    if (!entry) {
      this.recordAudit(idOrProviderId, idOrProviderId, 'access', false);
      throw new Error(`Secret not found: ${idOrProviderId}`);
    }

    try {
      const plain = await this.decrypt(entry.payload, passphrase);
      // update lastAccessedAt in metadata
      const updatedMeta: SecretMetadata = {
        ...entry.metadata,
        lastAccessedAt: Date.now(),
      };
      this.secretStore.set(entry.metadata.id, {
        metadata: updatedMeta,
        payload: entry.payload,
      });
      this.persistMultiSecrets();
      this.recordAudit(entry.metadata.id, entry.metadata.providerId, 'access', true);
      return plain;
    } catch (err) {
      this.recordAudit(entry.metadata.id, entry.metadata.providerId, 'access', false);
      throw err;
    }
  }

  /**
   * Rotates a secret's value with new plaintext and re-encrypts it.
   */
  async rotateSecret(idOrProviderId: string, newSecret: string, passphrase: string): Promise<void> {
    let entry = this.secretStore.get(idOrProviderId);
    if (!entry) {
      entry = Array.from(this.secretStore.values()).find(
        (s) => s.metadata.providerId === idOrProviderId,
      );
    }

    if (!entry) {
      this.recordAudit(idOrProviderId, idOrProviderId, 'rotate', false);
      throw new Error(`Secret not found: ${idOrProviderId}`);
    }

    const newPayload = await this.encrypt(newSecret, passphrase);
    const updatedMeta: SecretMetadata = {
      ...entry.metadata,
      updatedAt: Date.now(),
    };

    this.secretStore.set(entry.metadata.id, {
      metadata: updatedMeta,
      payload: newPayload,
    });
    this.persistMultiSecrets();
    this.recordAudit(entry.metadata.id, entry.metadata.providerId, 'rotate', true);
  }

  /**
   * Deletes a secret from storage.
   */
  async deleteSecret(idOrProviderId: string): Promise<boolean> {
    let targetId = idOrProviderId;
    if (!this.secretStore.has(idOrProviderId)) {
      const found = Array.from(this.secretStore.values()).find(
        (s) => s.metadata.providerId === idOrProviderId,
      );
      if (found) targetId = found.metadata.id;
    }

    const existed = this.secretStore.delete(targetId);
    if (existed) {
      this.persistMultiSecrets();
      this.recordAudit(targetId, idOrProviderId, 'delete', true);
    } else {
      this.recordAudit(idOrProviderId, idOrProviderId, 'delete', false);
    }
    return existed;
  }

  // --- Original Single-Token Legacy Compat Methods ---

  saveEncryptedPayload(payload: EncryptedVaultPayload): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(payload));
    }
  }

  getStoredPayload(): EncryptedVaultPayload | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version === 1 && parsed.ciphertextHex && parsed.saltHex && parsed.ivHex) {
        return parsed as EncryptedVaultPayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  hasStoredVault(): boolean {
    return this.getStoredPayload() !== null || this.secretStore.size > 0;
  }

  getActiveToken(): string | null {
    return this.activeToken;
  }

  setActiveToken(token: string | null): void {
    this.activeToken = token;
  }

  lock(): void {
    this.activeToken = null;
  }

  clear(): void {
    this.activeToken = null;
    this.secretStore.clear();
    this.auditLog.length = 0;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(VAULT_STORAGE_KEY);
      localStorage.removeItem(MULTI_SECRET_STORAGE_KEY);
      localStorage.removeItem(SECRET_AUDIT_LOG_KEY);
    }
  }
}

export const tokenVault = new TokenVault();
