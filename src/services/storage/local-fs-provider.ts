import type { Project, ProjectFile } from '../../types/projects';
import type {
  StorageResult,
  SyncStatusResult,
  FileDiffSummary,
} from '../../types/storage';
import type { IStorageProvider } from './storage-provider.types';
import { computeSha256 } from './hash-utils';
import { ZIP_EXPORT_EXCLUSIONS } from '../zip-validator';

// Standard ignore patterns for local project folders
const IGNORED_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.lake', '.vscode', '.idea']);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function detectLanguage(path: string): ProjectFile['language'] {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.lean')) return 'lean4';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.toml')) return 'toml';
  return 'text';
}

export class LocalFileSystemProvider implements IStorageProvider {
  readonly id = 'local-fs';
  readonly name = 'Local File System';
  readonly targetType = 'local' as const;

  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private directoryName: string | null = null;
  // Map of path -> last known SHA-256 hash when saved or loaded
  private savedFileHashes = new Map<string, string>();

  /**
   * Checks whether the File System Access API is supported in the current environment.
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
    );
  }

  getDirectoryName(): string | null {
    return this.directoryName;
  }

  hasDirectoryHandle(): boolean {
    return this.directoryHandle !== null;
  }

  /**
   * Prompts user to pick a local folder using File System Access API.
   * Verifies readwrite permission.
   */
  async promptSelectDirectory(): Promise<StorageResult<{ folderName: string }>> {
    if (!LocalFileSystemProvider.isSupported()) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'File System Access API is not supported in this browser. Please use ZIP Import/Export fallback.',
        },
      };
    }

    try {
      const picker = (window as unknown as {
        showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker;

      const handle = await picker({ mode: 'readwrite' });
      const hasPerm = await this.verifyPermission(handle, true);

      if (!hasPerm) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Write permission was not granted to the selected folder.',
          },
        };
      }

      this.directoryHandle = handle;
      this.directoryName = handle.name;
      this.savedFileHashes.clear();

      return {
        success: true,
        data: { folderName: handle.name },
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Folder selection was canceled by the user.',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Failed to select directory',
        },
      };
    }
  }

  /**
   * Explicitly checks and requests read/readwrite permissions.
   */
  async verifyPermission(
    handle: FileSystemHandle,
    readWrite: boolean = true,
  ): Promise<boolean> {
    const options = { mode: readWrite ? 'readwrite' : 'read' };
    const queryable = handle as unknown as {
      queryPermission?: (opts: { mode: string }) => Promise<'granted' | 'denied' | 'prompt'>;
      requestPermission?: (opts: { mode: string }) => Promise<'granted' | 'denied'>;
    };

    if (queryable.queryPermission) {
      const status = await queryable.queryPermission(options);
      if (status === 'granted') return true;
    }

    if (queryable.requestPermission) {
      const status = await queryable.requestPermission(options);
      return status === 'granted';
    }

    return true;
  }

  /**
   * Reads all valid files recursively from the currently attached directory handle.
   */
  async readProjectFromDirectory(): Promise<StorageResult<Project>> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'No local folder selected' },
      };
    }

    const hasPerm = await this.verifyPermission(this.directoryHandle, false);
    if (!hasPerm) {
      return {
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Read permission not granted' },
      };
    }

    try {
      const files: ProjectFile[] = [];
      await this.scanDirectory(this.directoryHandle, '', files);

      const hasLean = files.some((f) => f.language === 'lean4' || f.path === 'lakefile.lean');
      const hasPy = files.some((f) => f.language === 'python');
      const projectType = hasLean && hasPy ? 'mixed' : hasLean ? 'lean4' : 'python';

      // Record baseline hashes for sync status
      this.savedFileHashes.clear();
      for (const file of files) {
        const hash = await computeSha256(file.content);
        this.savedFileHashes.set(file.path, hash);
      }

      const project: Project = {
        id: crypto.randomUUID(),
        name: this.directoryName ?? 'Local Project',
        type: projectType,
        files,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { success: true, data: project };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Error reading directory files',
        },
      };
    }
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    result: ProjectFile[],
  ): Promise<void> {
    const iterable = (dirHandle as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    }).values();

    for await (const entry of iterable) {
      if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
        continue;
      }

      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        await this.scanDirectory(entry as FileSystemDirectoryHandle, entryPath, result);
      } else if (entry.kind === 'file') {
        const isExcluded = ZIP_EXPORT_EXCLUSIONS.some((exc) => entryPath.includes(exc));
        if (isExcluded) continue;

        const fileHandle = entry as FileSystemFileHandle;
        const fileObj = await fileHandle.getFile();
        if (fileObj.size > 5_000_000) {
          // Skip individual files > 5MB to preserve IDE performance
          continue;
        }

        const text = await fileObj.text();
        result.push({
          path: entryPath,
          content: text,
          language: detectLanguage(entryPath),
          isDirty: false,
        });
      }
    }
  }

  /**
   * Saves the project files to the selected local directory.
   */
  async saveProject(
    project: Project,
  ): Promise<StorageResult<{ savedAt: string; versionOrSha?: string }>> {
    if (!this.directoryHandle) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'No local folder selected to save to' },
      };
    }

    const hasPerm = await this.verifyPermission(this.directoryHandle, true);
    if (!hasPerm) {
      return {
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Write permission not granted' },
      };
    }

    try {
      for (const file of project.files) {
        // Exclude unwanted files
        const isExcluded = ZIP_EXPORT_EXCLUSIONS.some((exc) => file.path.includes(exc));
        if (isExcluded) continue;

        const segments = file.path.replace(/\\/g, '/').replace(/^\/+/, '').split('/');
        let currentDir = this.directoryHandle;

        // Traverse / create subdirectories
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i]!;
          currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
        }

        // Write file
        const fileName = segments[segments.length - 1]!;
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await (fileHandle as unknown as {
          createWritable: () => Promise<FileSystemWritableFileStream>;
        }).createWritable();

        await writable.write(file.content);
        await writable.close();

        // Update hash
        const hash = await computeSha256(file.content);
        this.savedFileHashes.set(file.path, hash);
      }

      const now = new Date().toISOString();
      return {
        success: true,
        data: { savedAt: now },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Error writing to directory',
        },
      };
    }
  }

  /**
   * Checks synchronization status and computes diff summary.
   */
  async checkSyncStatus(project: Project): Promise<SyncStatusResult> {
    if (!this.directoryHandle) {
      return {
        status: 'disconnected',
        diffs: [],
        message: 'No local folder connected',
      };
    }

    const diffs: FileDiffSummary[] = [];
    let hasUncommitted = false;

    for (const file of project.files) {
      const currentHash = await computeSha256(file.content);
      const savedHash = this.savedFileHashes.get(file.path);

      if (!savedHash) {
        diffs.push({
          path: file.path,
          status: 'added',
          localHash: currentHash,
        });
        hasUncommitted = true;
      } else if (savedHash !== currentHash) {
        diffs.push({
          path: file.path,
          status: 'modified',
          localHash: currentHash,
          remoteHash: savedHash,
        });
        hasUncommitted = true;
      } else {
        diffs.push({
          path: file.path,
          status: 'unchanged',
          localHash: currentHash,
          remoteHash: savedHash,
        });
      }
    }

    return {
      status: hasUncommitted ? 'uncommitted' : 'synced',
      diffs,
      message: hasUncommitted ? 'Unsaved local changes' : 'Synchronized with local folder',
    };
  }

  disconnect(): void {
    this.directoryHandle = null;
    this.directoryName = null;
    this.savedFileHashes.clear();
  }
}

export const localFsProvider = new LocalFileSystemProvider();
