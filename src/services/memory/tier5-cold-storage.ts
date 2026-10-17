import * as fflate from 'fflate';
import type { Project, ProjectFile } from '../../types/projects';
import type {
  ColdStorageMetadata,
  ColdStorageSnapshot,
  Tier5ColdStorageStats,
} from '../../types/memory';
import { computeSha256 } from '../storage/hash-utils';

const COLD_DB_NAME = 'polyglot_studio_cold_storage';
const COLD_STORE_BLOBS = 'cold_blobs'; // Keyed by contentSha256
const COLD_STORE_META = 'cold_metadata'; // Keyed by snapshot id
const COLD_DB_VERSION = 1;

function openColdDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in current environment'));
      return;
    }
    const req = indexedDB.open(COLD_DB_NAME, COLD_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(COLD_STORE_BLOBS)) {
        db.createObjectStore(COLD_STORE_BLOBS, { keyPath: 'sha256' });
      }
      if (!db.objectStoreNames.contains(COLD_STORE_META)) {
        db.createObjectStore(COLD_STORE_META, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Computes canonical content-addressable SHA-256 hash for a set of project files:
 * - Sorts file paths alphabetically
 * - Normalizes line endings (\r\n -> \n)
 */
export async function computeCanonicalProjectHash(
  files: readonly { readonly path: string; readonly content: string }[],
): Promise<string> {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const canonicalContent = sortedFiles
    .map((f) => `${f.path}:${f.content.replace(/\r\n/g, '\n')}`)
    .join('\n---\n');
  return computeSha256(canonicalContent);
}

/**
 * Tier 5: Persistent Cold Storage.
 * Creates compressed tar.gz/zip snapshots using fflate and enforces
 * content-addressable SHA-256 deduplication (deduplicating redundant identical projects).
 */
export class Tier5ColdStorage {
  // In-memory fallback / cache for fast lookups & test environments
  private readonly memoryBlobs = new Map<string, Uint8Array>();
  private readonly memoryMeta = new Map<string, ColdStorageMetadata>();

  /**
   * Compresses project files using fflate, computes content SHA-256,
   * and deduplicates storage if content hash already exists.
   */
  async archiveProject(project: Project): Promise<ColdStorageMetadata> {
    const archiveFiles: Record<string, Uint8Array> = {};
    let rawSizeBytes = 0;

    // Serialize project files into fflate structure
    for (const file of project.files) {
      const encoded = fflate.strToU8(file.content);
      archiveFiles[file.path] = encoded;
      rawSizeBytes += encoded.byteLength;
    }

    // Canonical deterministic content hash based on project files (sorted paths and normalized line endings)
    const contentSha256 = await computeCanonicalProjectHash(project.files);

    // Add manifest.json to snapshot
    const manifestJson = JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      projectType: project.type,
      isPinned: Boolean(project.isPinned),
      contentSha256,
      fileCount: project.files.length,
    });
    const manifestBytes = fflate.strToU8(manifestJson);
    archiveFiles['manifest.json'] = manifestBytes;
    rawSizeBytes += manifestBytes.byteLength;

    // Fast compact compression via fflate (level 6 gzip)
    const compressedPayload = fflate.zipSync(archiveFiles, { level: 6 });
    const compressedSizeBytes = compressedPayload.byteLength;

    // Check if duplicate hash exists in cold storage
    const isAlreadyStored = await this.hasBlob(contentSha256);
    const snapshotId = crypto.randomUUID();

    const compressionRatio =
      rawSizeBytes > 0
        ? Math.max(0, Number(((1 - compressedSizeBytes / rawSizeBytes) * 100).toFixed(1)))
        : 0;

    const metadata: ColdStorageMetadata = {
      id: snapshotId,
      projectId: project.id,
      projectName: project.name,
      contentSha256,
      rawSizeBytes,
      compressedSizeBytes,
      bytesStored: isAlreadyStored ? 0 : compressedSizeBytes,
      compressionRatio,
      createdAt: new Date().toISOString(),
      fileCount: project.files.length,
      isPinned: Boolean(project.isPinned),
      isDeduplicated: isAlreadyStored,
    };

    // Store payload ONLY if not already present (Content-Addressed Deduplication)
    if (!isAlreadyStored) {
      await this.saveBlob(contentSha256, compressedPayload);
    }

    // Always record metadata reference
    await this.saveMetadata(metadata);

    return metadata;
  }

  /**
   * Restores a Project from a Cold Storage Snapshot
   */
  async restoreProject(snapshotIdOrSha256: string): Promise<Project> {
    let metadata = this.memoryMeta.get(snapshotIdOrSha256);
    if (!metadata) {
      const allMeta = await this.listMetadata();
      metadata = allMeta.find(
        (m) => m.id === snapshotIdOrSha256 || m.contentSha256 === snapshotIdOrSha256,
      );
    }

    if (!metadata) {
      throw new Error(`Cold storage snapshot "${snapshotIdOrSha256}" not found.`);
    }

    const compressedPayload = await this.getBlob(metadata.contentSha256);
    if (!compressedPayload) {
      throw new Error(`Cold storage payload blob "${metadata.contentSha256}" is missing.`);
    }

    // Decompress with fflate
    const unzipped = fflate.unzipSync(compressedPayload);
    const files: ProjectFile[] = [];

    let projectName = metadata.projectName;
    let projectType: Project['type'] = 'lean4';
    let isPinned = metadata.isPinned;

    for (const [filePath, fileBytes] of Object.entries(unzipped)) {
      const content = fflate.strFromU8(fileBytes);
      if (filePath === 'manifest.json') {
        try {
          const manifest = JSON.parse(content) as {
            projectName?: string;
            projectType?: Project['type'];
            isPinned?: boolean;
          };
          if (manifest.projectName) projectName = manifest.projectName;
          if (manifest.projectType) projectType = manifest.projectType;
          if (manifest.isPinned !== undefined) isPinned = manifest.isPinned;
        } catch {
          // ignore manifest parse err
        }
        continue;
      }

      const lang: ProjectFile['language'] = filePath.endsWith('.py')
        ? 'python'
        : filePath.endsWith('.lean')
        ? 'lean4'
        : filePath.endsWith('.md')
        ? 'markdown'
        : filePath.endsWith('.json')
        ? 'json'
        : filePath.endsWith('.toml')
        ? 'toml'
        : 'text';

      files.push({
        path: filePath,
        content,
        language: lang,
        isDirty: false,
      });
    }

    return {
      id: metadata.projectId,
      name: projectName,
      type: projectType,
      files,
      createdAt: metadata.createdAt,
      updatedAt: new Date().toISOString(),
      isPinned,
    };
  }

  private async hasBlob(sha256: string): Promise<boolean> {
    if (this.memoryBlobs.has(sha256)) return true;
    try {
      const db = await openColdDb();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(COLD_STORE_BLOBS, 'readonly');
        const req = tx.objectStore(COLD_STORE_BLOBS).get(sha256);
        req.onsuccess = () => resolve(Boolean(req.result));
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  private async saveBlob(sha256: string, data: Uint8Array): Promise<void> {
    this.memoryBlobs.set(sha256, data);
    try {
      const db = await openColdDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(COLD_STORE_BLOBS, 'readwrite');
        const req = tx.objectStore(COLD_STORE_BLOBS).put({ sha256, data });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }

  private async getBlob(sha256: string): Promise<Uint8Array | null> {
    const memory = this.memoryBlobs.get(sha256);
    if (memory) return memory;
    try {
      const db = await openColdDb();
      return new Promise<Uint8Array | null>((resolve) => {
        const tx = db.transaction(COLD_STORE_BLOBS, 'readonly');
        const req = tx.objectStore(COLD_STORE_BLOBS).get(sha256);
        req.onsuccess = () => {
          const res = req.result as { sha256: string; data: Uint8Array } | undefined;
          resolve(res?.data ?? null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async saveMetadata(meta: ColdStorageMetadata): Promise<void> {
    this.memoryMeta.set(meta.id, meta);
    try {
      const db = await openColdDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(COLD_STORE_META, 'readwrite');
        const req = tx.objectStore(COLD_STORE_META).put(meta);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }

  async listMetadata(): Promise<readonly ColdStorageMetadata[]> {
    try {
      const db = await openColdDb();
      return new Promise<ColdStorageMetadata[]>((resolve) => {
        const tx = db.transaction(COLD_STORE_META, 'readonly');
        const req = tx.objectStore(COLD_STORE_META).getAll();
        req.onsuccess = () => {
          const list = (req.result as ColdStorageMetadata[]) ?? [];
          for (const m of list) this.memoryMeta.set(m.id, m);
          resolve(list);
        };
        req.onerror = () => resolve(Array.from(this.memoryMeta.values()));
      });
    } catch {
      return Array.from(this.memoryMeta.values());
    }
  }

  async getStats(): Promise<Tier5ColdStorageStats> {
    const allMeta = await this.listMetadata();
    const uniqueHashes = new Set<string>();
    let totalRawBytes = 0;
    let totalCompressedBytes = 0;
    let deduplicatedSavingsBytes = 0;

    for (const m of allMeta) {
      totalRawBytes += m.rawSizeBytes;
      if (!uniqueHashes.has(m.contentSha256)) {
        uniqueHashes.add(m.contentSha256);
        totalCompressedBytes += m.compressedSizeBytes;
      } else {
        // Redundant byte savings achieved via deduplication
        deduplicatedSavingsBytes += m.compressedSizeBytes;
      }
    }

    return {
      snapshotCount: allMeta.length,
      uniqueHashesCount: uniqueHashes.size,
      totalRawBytes,
      totalCompressedBytes,
      deduplicatedSavingsBytes,
    };
  }
}

export const tier5ColdStorage = new Tier5ColdStorage();
