const DB_NAME = 'polyglot_session_data';
const STORE_NAME = 'interaction_data';
const DB_VERSION = 1;

export interface SessionDataStore {
  readonly sessionId: string;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  list(): Promise<readonly string[]>;
  clear(): Promise<void>;
}

function openDataDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['sessionId', 'key'] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDBSessionDataStore implements SessionDataStore {
  public readonly sessionId: string;
  private readonly memoryFallback = new Map<string, unknown>();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async get(key: string): Promise<unknown> {
    if (this.memoryFallback.has(key)) {
      return this.memoryFallback.get(key);
    }

    try {
      const db = await openDataDb();
      return new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get([this.sessionId, key]);
        req.onsuccess = () => {
          const val = req.result ? req.result.value : undefined;
          resolve(val);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.memoryFallback.get(key);
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    this.memoryFallback.set(key, value);

    try {
      const db = await openDataDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({
          sessionId: this.sessionId,
          key,
          value,
          updatedAt: Date.now(),
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }

  async list(): Promise<readonly string[]> {
    try {
      const db = await openDataDb();
      return new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const matching = (req.result as { sessionId: string; key: string }[])
            .filter((r) => r.sessionId === this.sessionId)
            .map((r) => r.key);
          resolve(matching);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.memoryFallback.keys());
    }
  }

  async clear(): Promise<void> {
    this.memoryFallback.clear();
    try {
      const db = await openDataDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result as [string, string][];
          for (const k of keys) {
            if (k[0] === this.sessionId) store.delete(k);
          }
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }
}
