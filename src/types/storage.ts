import { z } from 'zod';
import type { Project, ProjectFile } from './projects';

/**
 * Storage provider target discriminated union.
 */
export type StorageTarget =
  | {
      readonly type: 'local';
      readonly folderName: string;
      readonly hasWritePermission: boolean;
    }
  | {
      readonly type: 'github';
      readonly owner: string;
      readonly repo: string;
      readonly branch: string;
      readonly repoUrl: string;
    }
  | {
      readonly type: 'indexeddb';
    }
  | {
      readonly type: 'zip-download';
    };

/**
 * Synchronization status representation.
 */
export type SyncStatus =
  | 'synced'
  | 'uncommitted'
  | 'syncing'
  | 'conflict'
  | 'error'
  | 'disconnected';

export interface FileDiffSummary {
  readonly path: string;
  readonly status: 'added' | 'modified' | 'deleted' | 'unchanged';
  readonly localHash: string;
  readonly remoteHash?: string;
}

export interface SyncStatusResult {
  readonly status: SyncStatus;
  readonly diffs: readonly FileDiffSummary[];
  readonly lastSyncedAt?: string;
  readonly message?: string;
}

/**
 * Storage Operation Result Discriminated Union
 */
export type StorageResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: StorageError };

export interface StorageError {
  readonly code:
    | 'PERMISSION_DENIED'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'VALIDATION_FAILED'
    | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details?: unknown;
}

/**
 * GitHub Device Flow Data Contracts
 */
export const GitHubDeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  expires_in: z.number(),
  interval: z.number().default(5),
});
export type GitHubDeviceCodeResponse = z.infer<typeof GitHubDeviceCodeResponseSchema>;

export const GitHubTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_uri: z.string().optional(),
});
export type GitHubTokenResponse = z.infer<typeof GitHubTokenResponseSchema>;

/**
 * GitHub Commit Details
 */
export interface GitHubCommitPayload {
  readonly message: string;
  readonly files: readonly ProjectFile[];
  readonly branch?: string;
}

export interface GitHubCommitResult {
  readonly commitSha: string;
  readonly commitUrl: string;
  readonly branch: string;
  readonly filesCommitted: number;
}

/**
 * Encrypted Vault Payload (Web Crypto PBKDF2 + AES-GCM)
 */
export interface EncryptedVaultPayload {
  readonly version: 1;
  readonly kdf: 'PBKDF2';
  readonly iterations: number;
  readonly cipher: 'AES-GCM-256';
  readonly saltHex: string;
  readonly ivHex: string;
  readonly ciphertextHex: string;
}
