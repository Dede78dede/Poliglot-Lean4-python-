import { computeSha256 } from './hash-utils';

export const APP_CACHE_VERSION = '1.1.0';
export const DEFAULT_HTTP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface HttpCacheEntry<T = unknown> {
  readonly version: string;
  readonly data: T;
  readonly status: number;
  readonly expiresAt: number;
  readonly createdAt: number;
  readonly isPrivate: boolean;
}

export interface CachedFetchResult<T = unknown> {
  readonly data: T;
  readonly fromCache: boolean;
  readonly cacheKey: string;
}

/**
 * Cache API layer for HTTP requests with Versioning, Vary: Authorization,
 * and status/header filtering.
 */
export class HttpCacheService {
  private readonly appVersion: string;
  private readonly defaultTtlMs: number;
  // In-memory backing store for cross-environment safety (works in Node.js test runner & browser)
  private readonly memoryStore = new Map<string, HttpCacheEntry>();

  constructor(appVersion: string = APP_CACHE_VERSION, defaultTtlMs = DEFAULT_HTTP_CACHE_TTL_MS) {
    this.appVersion = appVersion;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Derives a deterministic cache key adhering to Vary: Authorization
   */
  async deriveCacheKey(url: string, requestHeaders?: Record<string, string>): Promise<string> {
    const authHeader = requestHeaders?.['Authorization'] || requestHeaders?.['authorization'];
    let authTag = 'public';

    if (authHeader) {
      // Fingerprint the authorization header to prevent cross-user leakage
      const authHash = await computeSha256(authHeader);
      authTag = `auth_${authHash.slice(0, 16)}`;
    }

    return `v${this.appVersion}:${url}:vary_${authTag}`;
  }

  /**
   * Retrieves an item from cache if valid, unexpired and matching version
   */
  async get<T>(url: string, requestHeaders?: Record<string, string>): Promise<T | null> {
    const key = await this.deriveCacheKey(url, requestHeaders);

    // 1. Try in-memory store
    const memEntry = this.memoryStore.get(key);
    if (memEntry) {
      if (memEntry.version !== this.appVersion || memEntry.expiresAt <= Date.now()) {
        this.memoryStore.delete(key);
        return null;
      }
      return memEntry.data as T;
    }

    // 2. Try native Cache API if present
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(`http_cache_v${this.appVersion}`);
        const res = await cache.match(key);
        if (res && res.ok) {
          const payload = (await res.json()) as HttpCacheEntry<T>;
          if (payload.version === this.appVersion && payload.expiresAt > Date.now()) {
            return payload.data;
          }
        }
      } catch {
        // Fall through
      }
    }

    return null;
  }

  /**
   * Sets an item into cache according to strict HTTP caching semantics:
   * - Never cache POST / mutations
   * - Never cache status >= 400
   * - Never cache responses with Cache-Control: no-store
   */
  async set<T>(
    url: string,
    data: T,
    status = 200,
    responseHeaders?: Record<string, string>,
    requestHeaders?: Record<string, string>,
    method = 'GET',
    ttlMs: number = this.defaultTtlMs,
  ): Promise<boolean> {
    // Rule 1: Never cache non-GET / non-HEAD requests
    if (method.toUpperCase() !== 'GET') {
      return false;
    }

    // Rule 2: Never cache error statuses (>= 400)
    if (status >= 400) {
      return false;
    }

    // Rule 3: Never cache responses with Cache-Control: no-store
    const cacheControl = responseHeaders?.['Cache-Control'] || responseHeaders?.['cache-control'] || '';
    if (cacheControl.toLowerCase().includes('no-store')) {
      return false;
    }

    const key = await this.deriveCacheKey(url, requestHeaders);
    const isPrivate = Boolean(requestHeaders?.['Authorization'] || requestHeaders?.['authorization']);
    const now = Date.now();

    const entry: HttpCacheEntry<T> = {
      version: this.appVersion,
      data,
      status,
      expiresAt: now + ttlMs,
      createdAt: now,
      isPrivate,
    };

    this.memoryStore.set(key, entry as HttpCacheEntry);

    // Save to Cache API if available
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(`http_cache_v${this.appVersion}`);
        const jsonResponse = new Response(JSON.stringify(entry), {
          headers: { 'Content-Type': 'application/json' },
        });
        await cache.put(key, jsonResponse);
      } catch {
        // Ignore cache write errors
      }
    }

    return true;
  }

  /**
   * Helper that checks cache first and executes network fetcher only on cache miss.
   * Caches results if status < 400 and Cache-Control is not no-store.
   */
  async cachedFetch<T>(
    url: string,
    networkFetcher: () => Promise<{ data: T; status: number; headers?: Record<string, string> }>,
    requestHeaders?: Record<string, string>,
    ttlMs: number = this.defaultTtlMs,
  ): Promise<CachedFetchResult<T>> {
    const cached = await this.get<T>(url, requestHeaders);
    const cacheKey = await this.deriveCacheKey(url, requestHeaders);

    if (cached !== null) {
      return { data: cached, fromCache: true, cacheKey };
    }

    const fetched = await networkFetcher();
    if (fetched.status < 400) {
      await this.set(
        url,
        fetched.data,
        fetched.status,
        fetched.headers,
        requestHeaders,
        'GET',
        ttlMs,
      );
    }

    return { data: fetched.data, fromCache: false, cacheKey };
  }

  /**
   * Invalidates all entries when app version changes or explicitly triggered
   */
  async invalidateAll(): Promise<void> {
    this.memoryStore.clear();
    if (typeof caches !== 'undefined') {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.startsWith('http_cache_')) {
            await caches.delete(k);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidates entries matching a specific version
   */
  async invalidateVersion(oldVersion: string): Promise<void> {
    for (const [key, item] of this.memoryStore.entries()) {
      if (item.version === oldVersion) {
        this.memoryStore.delete(key);
      }
    }
    if (typeof caches !== 'undefined') {
      try {
        await caches.delete(`http_cache_v${oldVersion}`);
      } catch {
        // Ignore
      }
    }
  }
}

export const httpCacheService = new HttpCacheService();
