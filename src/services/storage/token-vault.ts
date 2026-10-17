import type { EncryptedVaultPayload } from '../../types/storage';

const VAULT_STORAGE_KEY = 'polyglot_token_vault_v1';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

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

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passphrase and salt
 * using PBKDF2 with 100,000 iterations and SHA-256.
 */
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
  // Node.js fallback (Web Crypto available on global crypto)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  throw new Error('SubtleCrypto is not available in current environment');
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array as any) as Uint8Array;
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(array as any) as Uint8Array;
  }
  throw new Error('crypto.getRandomValues is not available');
}

export class TokenVault {
  // Ephemeral in-memory decrypted token cache during active session
  private activeToken: string | null = null;

  /**
   * Encrypts a sensitive string (e.g. GitHub PAT or OAuth token)
   * using PBKDF2-derived AES-GCM-256.
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
   * Throws if passphrase is wrong or payload is corrupted.
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

  /**
   * Saves encrypted payload to local storage.
   */
  saveEncryptedPayload(payload: EncryptedVaultPayload): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(payload));
    }
  }

  /**
   * Retrieves encrypted payload from local storage if one exists.
   */
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

  /**
   * Checks whether an encrypted vault currently exists on disk/localStorage.
   */
  hasStoredVault(): boolean {
    return this.getStoredPayload() !== null;
  }

  /**
   * Checks if an active token is currently cached in memory for this session.
   */
  getActiveToken(): string | null {
    return this.activeToken;
  }

  /**
   * Sets in-memory active token (session-only).
   */
  setActiveToken(token: string | null): void {
    this.activeToken = token;
  }

  /**
   * Locks the vault: clears in-memory decrypted token.
   */
  lock(): void {
    this.activeToken = null;
  }

  /**
   * Completely clears both local storage vault and in-memory cache.
   */
  clear(): void {
    this.activeToken = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(VAULT_STORAGE_KEY);
    }
  }
}

export const tokenVault = new TokenVault();
