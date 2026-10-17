import { z } from 'zod';
import type { Project, ProjectFile } from './projects';

export interface Tier1CacheStats {
  readonly entries: number;
  readonly totalBytes: number;
  readonly maxBytes: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
}

export interface Tier2BufferStats {
  readonly dirtyFilesCount: number;
  readonly dirtyFilePaths: readonly string[];
  readonly lastSyncTimestamp: number | null;
  readonly isSyncPending: boolean;
}

export interface Tier3StorageStats {
  readonly projectCount: number;
  readonly totalFiles: number;
  readonly estimatedSizeBytes: number;
}

export interface Tier4ServerStats {
  readonly activeSessions: number;
  readonly pinnedSessions: number;
  readonly ttlHours: number;
}

export interface ColdStorageMetadata {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly contentSha256: string;
  readonly rawSizeBytes: number;
  readonly compressedSizeBytes: number;
  readonly compressionRatio: number;
  readonly createdAt: string;
  readonly fileCount: number;
  readonly isPinned: boolean;
  readonly isDeduplicated?: boolean;
  readonly bytesStored?: number;
}

export interface ColdStorageSnapshot {
  readonly metadata: ColdStorageMetadata;
  readonly compressedPayload: Uint8Array;
}

export interface Tier5ColdStorageStats {
  readonly snapshotCount: number;
  readonly uniqueHashesCount: number;
  readonly totalRawBytes: number;
  readonly totalCompressedBytes: number;
  readonly deduplicatedSavingsBytes: number;
}

export interface FiveTierStatus {
  readonly tier1AstCache: Tier1CacheStats;
  readonly tier2InteractiveBuffer: Tier2BufferStats;
  readonly tier3ClientStore: Tier3StorageStats;
  readonly tier4ServerWorkspace: Tier4ServerStats;
  readonly tier5ColdStorage: Tier5ColdStorageStats;
}
