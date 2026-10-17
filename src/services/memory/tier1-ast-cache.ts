import type { Tier1CacheStats } from '../../types/memory';

export const DEFAULT_TIER1_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

interface CacheEntry<T> {
  readonly value: T;
  readonly byteSize: number;
}

/**
 * Tier 1: In-Memory AST, Diagnostics & Goal State Cache.
 * Backed by an O(1) LRU Map with strict 50 MB memory ceiling and eviction policy.
 */
export class Tier1AstCache {
  private readonly maxBytes: number;
  private currentBytes = 0;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor(maxBytes: number = DEFAULT_TIER1_MAX_BYTES) {
    this.maxBytes = maxBytes;
  }

  private estimateByteSize(value: unknown): number {
    if (typeof value === 'string') {
      return value.length * 2;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return 8;
    }
    if (value instanceof Uint8Array) {
      return value.byteLength;
    }
    try {
      const json = JSON.stringify(value);
      return (json ? json.length : 100) * 2;
    } catch {
      return 256;
    }
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    // Refresh LRU order: delete and re-insert at tail
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits += 1;
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  set<T>(key: string, value: T, customBytes?: number): void {
    const byteSize = customBytes ?? this.estimateByteSize(value);

    // If existing entry, subtract its previous size
    const existing = this.cache.get(key);
    if (existing) {
      this.currentBytes -= existing.byteSize;
      this.cache.delete(key);
    }

    // Evict least-recently-used items from the head if adding this exceeds limit
    while (this.currentBytes + byteSize > this.maxBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      const oldestEntry = this.cache.get(oldestKey);
      if (oldestEntry) {
        this.currentBytes -= oldestEntry.byteSize;
      }
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, byteSize });
    this.currentBytes += byteSize;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= entry.byteSize;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): Tier1CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? Number((this.hits / totalRequests).toFixed(3)) : 0;

    return {
      entries: this.cache.size,
      totalBytes: Math.max(0, this.currentBytes),
      maxBytes: this.maxBytes,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }
}

export const tier1AstCache = new Tier1AstCache();
