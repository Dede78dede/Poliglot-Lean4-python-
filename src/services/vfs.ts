import type { ProjectFile } from '../types/projects';

const DB_NAME = 'polyglot_studio_vfs';
const STORE_NAME = 'project_files';
const DB_VERSION = 1;

export interface VfsEntry {
  readonly projectId: string;
  readonly path: string;
  readonly content: string;
  readonly language: ProjectFile['language'];
  readonly updatedAt: string;
}

export interface TreeNode {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly language?: ProjectFile['language'];
  readonly children?: TreeNode[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ['projectId', 'path'] });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class VirtualFileSystem {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // In-memory cache for fast lookups
  private readonly memoryCache = new Map<string, ProjectFile>();

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase();
    }
    return this.dbPromise;
  }

  async writeFile(projectId: string, file: ProjectFile): Promise<void> {
    const key = `${projectId}:${file.path}`;
    this.memoryCache.set(key, file);

    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry: VfsEntry = {
          projectId,
          path: file.path,
          content: file.content,
          language: file.language,
          updatedAt: new Date().toISOString(),
        };
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // In-memory fallback if IndexedDB is blocked
    }
  }

  async readFile(projectId: string, path: string): Promise<ProjectFile | null> {
    const key = `${projectId}:${path}`;
    const cached = this.memoryCache.get(key);
    if (cached) return cached;

    try {
      const db = await this.getDb();
      return new Promise<ProjectFile | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get([projectId, path]);
        req.onsuccess = () => {
          const res = req.result as VfsEntry | undefined;
          if (!res) {
            resolve(null);
            return;
          }
          const file: ProjectFile = {
            path: res.path,
            content: res.content,
            language: res.language,
          };
          this.memoryCache.set(key, file);
          resolve(file);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    const key = `${projectId}:${path}`;
    this.memoryCache.delete(key);

    try {
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete([projectId, path]);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback
    }
  }

  async listFiles(projectId: string): Promise<ProjectFile[]> {
    try {
      const db = await this.getDb();
      return new Promise<ProjectFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('projectId');
        const req = index.getAll(projectId);

        req.onsuccess = () => {
          const results = (req.result as VfsEntry[]).map((e) => ({
            path: e.path,
            content: e.content,
            language: e.language,
          }));
          for (const f of results) {
            this.memoryCache.set(`${projectId}:${f.path}`, f);
          }
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const inMem: ProjectFile[] = [];
      const prefix = `${projectId}:`;
      for (const [k, v] of this.memoryCache.entries()) {
        if (k.startsWith(prefix)) inMem.push(v);
      }
      return inMem;
    }
  }

  async clearProject(projectId: string): Promise<void> {
    const prefix = `${projectId}:`;
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.startsWith(prefix)) this.memoryCache.delete(key);
    }

    try {
      const files = await this.listFiles(projectId);
      const db = await this.getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const f of files) {
          store.delete([projectId, f.path]);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Memory fallback
    }
  }

  buildFileTree(files: readonly ProjectFile[]): TreeNode[] {
    const rootNodes: TreeNode[] = [];

    const getOrCreateDir = (nodes: TreeNode[], dirName: string, fullPath: string): TreeNode => {
      let found = nodes.find((n) => n.isDirectory && n.name === dirName);
      if (!found) {
        found = {
          name: dirName,
          path: fullPath,
          isDirectory: true,
          children: [],
        };
        nodes.push(found);
      }
      return found;
    };

    for (const file of files) {
      const parts = file.path.split(/[/\\]+/).filter(Boolean);
      let currentLevel = rootNodes;
      let pathAccum = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        pathAccum = pathAccum ? `${pathAccum}/${part}` : part;

        if (i === parts.length - 1) {
          // File
          currentLevel.push({
            name: part,
            path: file.path,
            isDirectory: false,
            language: file.language,
          });
        } else {
          // Directory
          const dirNode = getOrCreateDir(currentLevel, part, pathAccum);
          currentLevel = dirNode.children as TreeNode[];
        }
      }
    }

    // Sort: directories first, then alphabetical
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const n of nodes) {
        if (n.children) sortNodes(n.children);
      }
    };

    sortNodes(rootNodes);
    return rootNodes;
  }
}

export const vfs = new VirtualFileSystem();
