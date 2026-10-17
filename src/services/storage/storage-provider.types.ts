import type { Project, ProjectFile } from '../../types/projects';
import type { StorageResult, StorageTarget, SyncStatusResult } from '../../types/storage';

export interface StorageProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly type: Project['type'];
  readonly fileCount: number;
  readonly lastModified: string;
}

export interface IStorageProvider {
  readonly id: string;
  readonly name: string;
  readonly targetType: StorageTarget['type'];

  // Query operations (CQS - reads state, no side-effects)
  checkSyncStatus(project: Project): Promise<SyncStatusResult>;
  listProjects?(): Promise<StorageResult<readonly StorageProjectSummary[]>>;
  readProject?(identifier: string): Promise<StorageResult<Project>>;

  // Command operations (CQS - mutates state / saves)
  saveProject(project: Project): Promise<StorageResult<{ savedAt: string; versionOrSha?: string }>>;
  deleteProject?(identifier: string): Promise<StorageResult<void>>;
}
