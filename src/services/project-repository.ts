import * as fflate from 'fflate';
import type { Project, ProjectFile } from '../types/projects';
import { ProjectSchema } from '../types/projects';
import { ZIP_EXPORT_EXCLUSIONS } from './zip-validator';

const REPO_DB_NAME = 'polyglot_studio_projects';
const REPO_STORE_NAME = 'saved_projects';
const REPO_DB_VERSION = 1;

function openRepoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(REPO_DB_NAME, REPO_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(REPO_STORE_NAME)) {
        db.createObjectStore(REPO_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class ProjectRepository {
  private readonly memoryRepo = new Map<string, Project>();

  async listProjects(): Promise<Project[]> {
    try {
      const db = await openRepoDb();
      return new Promise<Project[]>((resolve, reject) => {
        const tx = db.transaction(REPO_STORE_NAME, 'readonly');
        const store = tx.objectStore(REPO_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as unknown[]).map((raw) => ProjectSchema.parse(raw));
          for (const p of list) this.memoryRepo.set(p.id, p);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.memoryRepo.values());
    }
  }

  async getProject(id: string): Promise<Project | null> {
    const cached = this.memoryRepo.get(id);
    if (cached) return cached;

    try {
      const db = await openRepoDb();
      return new Promise<Project | null>((resolve, reject) => {
        const tx = db.transaction(REPO_STORE_NAME, 'readonly');
        const store = tx.objectStore(REPO_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          if (!req.result) {
            resolve(null);
            return;
          }
          const p = ProjectSchema.parse(req.result);
          this.memoryRepo.set(id, p);
          resolve(p);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    this.memoryRepo.set(project.id, project);

    try {
      const db = await openRepoDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(REPO_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REPO_STORE_NAME);
        const req = store.put(project);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }

  async deleteProject(id: string): Promise<void> {
    this.memoryRepo.delete(id);

    try {
      const db = await openRepoDb();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(REPO_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REPO_STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Memory fallback active
    }
  }

  exportProjectAsZip(project: Project): Blob {
    const zipData: fflate.Zippable = {};
    const encoder = new TextEncoder();

    for (const file of project.files) {
      // Check exclusion list
      const isExcluded = ZIP_EXPORT_EXCLUSIONS.some((exc) => file.path.includes(exc));
      if (isExcluded) continue;

      // Robust path normalization (POSIX format, no leading slashes, no backslashes)
      const cleanPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const pathSegments = cleanPath.split('/').filter(Boolean);
      if (pathSegments.length === 0) continue;

      let currentLevel: any = zipData;

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]!;
        if (i === pathSegments.length - 1) {
          // File data as Uint8Array
          currentLevel[segment] = encoder.encode(file.content);
        } else {
          currentLevel[segment] = currentLevel[segment] ?? {};
          currentLevel = currentLevel[segment];
        }
      }
    }

    const zippedBytes = fflate.zipSync(zipData, { level: 6 });
    return new Blob([zippedBytes], { type: 'application/zip' });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const projectRepository = new ProjectRepository();
