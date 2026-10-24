/**
 * Origin Private File System (OPFS) and Cache API Cache Layer for Pyodide WebAssembly assets.
 *
 * Requirements:
 * - Worker-only execution environment.
 * - Cache version is strictly bound to PYODIDE_VERSION. On version change, invalidates cache and re-fetches.
 * - Fallback chain: OPFS ➔ Cache API ➔ direct CDN fetch.
 * - Measures and logs load duration (target second load: < 500 ms).
 */

export const PYODIDE_VERSION = '314.0.7';
export const OPFS_PYODIDE_DIR = `pyodide_assets_v${PYODIDE_VERSION}`;
export const CACHE_API_NAME = `polyglot_pyodide_cache_v${PYODIDE_VERSION}`;

export interface CachedAssetResult {
  readonly data: Uint8Array;
  readonly source: 'opfs' | 'cache-api' | 'cdn';
  readonly durationMs: number;
}

export interface OpfsStorageAdapter {
  readFile(fileName: string, version: string): Promise<Uint8Array | null>;
  writeFile(fileName: string, data: Uint8Array, version: string): Promise<void>;
  invalidateVersion(oldVersion: string): Promise<void>;
}

// In-memory mock/fallback adapter for environments without native OPFS
export class MemoryOpfsAdapter implements OpfsStorageAdapter {
  private readonly store = new Map<string, { data: Uint8Array; version: string }>();

  async readFile(fileName: string, version: string): Promise<Uint8Array | null> {
    const item = this.store.get(fileName);
    if (item && item.version === version) {
      return item.data;
    }
    return null;
  }

  async writeFile(fileName: string, data: Uint8Array, version: string): Promise<void> {
    this.store.set(fileName, { data, version });
  }

  async invalidateVersion(oldVersion: string): Promise<void> {
    for (const [key, item] of this.store.entries()) {
      if (item.version === oldVersion) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Native Browser OPFS adapter (Worker-capable)
 */
export class BrowserOpfsAdapter implements OpfsStorageAdapter {
  private async getVersionDirectory(version: string): Promise<FileSystemDirectoryHandle | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      return null;
    }
    try {
      const root = await navigator.storage.getDirectory();
      const dirName = `pyodide_assets_v${version}`;
      return await root.getDirectoryHandle(dirName, { create: true });
    } catch {
      return null;
    }
  }

  async readFile(fileName: string, version: string): Promise<Uint8Array | null> {
    try {
      const dir = await this.getVersionDirectory(version);
      if (!dir) return null;

      const fileHandle = await dir.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  async writeFile(fileName: string, data: Uint8Array, version: string): Promise<void> {
    try {
      const dir = await this.getVersionDirectory(version);
      if (!dir) return;

      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writableHandle = fileHandle as unknown as {
        createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }>;
      };
      const writable = await writableHandle.createWritable();
      await writable.write(data);
      await writable.close();
    } catch {
      // Best-effort write
    }
  }

  async invalidateVersion(oldVersion: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      const dirName = `pyodide_assets_v${oldVersion}`;
      const removableRoot = root as unknown as {
        removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
      };
      await removableRoot.removeEntry(dirName, { recursive: true });
    } catch {
      // Ignored if directory doesn't exist
    }
  }
}

/**
 * Resolves a Pyodide asset using the OPFS ➔ Cache API ➔ CDN fallback chain.
 */
export async function fetchPyodideAssetWithFallback(
  fileName: string,
  cdnUrl: string,
  version: string = PYODIDE_VERSION,
  opfsAdapter?: OpfsStorageAdapter,
  fetchFn: typeof fetch = fetch,
): Promise<CachedAssetResult> {
  const startTime = performance.now();
  const adapter =
    opfsAdapter ??
    (typeof navigator !== 'undefined' && 'storage' in navigator && typeof navigator.storage?.getDirectory === 'function'
      ? new BrowserOpfsAdapter()
      : new MemoryOpfsAdapter());

  // 1. Check OPFS
  try {
    const opfsData = await adapter.readFile(fileName, version);
    if (opfsData) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        data: opfsData,
        source: 'opfs',
        durationMs,
      };
    }
  } catch {
    // Fall through to next tier
  }

  // 2. Check Cache API
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_API_NAME);
      const cachedResponse = await cache.match(cdnUrl);
      if (cachedResponse && cachedResponse.ok) {
        const buf = await cachedResponse.arrayBuffer();
        const data = new Uint8Array(buf);
        // Asynchronously populate OPFS for future loads
        void adapter.writeFile(fileName, data, version);
        const durationMs = Math.round(performance.now() - startTime);
        return { data, source: 'cache-api', durationMs };
      }
    } catch {
      // Fall through to CDN fetch
    }
  }

  // 3. Direct CDN Fetch
  const res = await fetchFn(cdnUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Pyodide asset "${fileName}" from ${cdnUrl}: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Store in OPFS for second-load speedup
  try {
    await adapter.writeFile(fileName, data, version);
  } catch {
    // Ignore storage quota failure
  }

  // Store in Cache API
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_API_NAME);
      const clonedResponse = new Response(data, {
        headers: { 'Content-Type': 'application/wasm' },
      });
      await cache.put(cdnUrl, clonedResponse);
    } catch {
      // Ignore cache failure
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  return { data, source: 'cdn', durationMs };
}

/**
 * Invalidates OPFS and Cache API storage for a specific Pyodide version.
 */
export async function invalidatePyodideCache(
  oldVersion: string,
  opfsAdapter?: OpfsStorageAdapter,
): Promise<void> {
  const adapter =
    opfsAdapter ??
    (typeof navigator !== 'undefined' && 'storage' in navigator && typeof navigator.storage?.getDirectory === 'function'
      ? new BrowserOpfsAdapter()
      : new MemoryOpfsAdapter());
  await adapter.invalidateVersion(oldVersion);
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(`polyglot_pyodide_cache_v${oldVersion}`);
    } catch {
      // Ignore
    }
  }
}
