/**
 * Polyglot Workspace Archive Format Definition (.polyglot) (Sprint 11.2.1, Task WA1)
 *
 * Defines the deterministic archive schema, manifest format, and section layouts.
 * Adheres strictly to Manifesto: no any, no enum, discriminated unions, frozen objects.
 */

export const POLYGLOT_ARCHIVE_VERSION = '1.0.0';

export interface PolyglotManifestFileEntry {
  readonly path: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface PolyglotManifest {
  readonly schemaVersion: '1.0.0';
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly createdAt: string; // ISO 8601
  readonly appVersion: string; // from package.json
  readonly gitRef?: string;
  readonly files: readonly PolyglotManifestFileEntry[];
  readonly integrity: {
    readonly algorithm: 'sha256';
    readonly checksumFile: 'SHA256SUMS';
  };
}

export interface PolyglotArchiveLayout {
  readonly manifest: PolyglotManifest;
  readonly sections: {
    readonly vfs: string; // 'vfs/'
    readonly settings: string; // 'settings/polyglot-settings.json'
    readonly flags: string; // 'flags.json'
    readonly audit: string; // 'audit/polyglot-audit-log.json'
    readonly bibliography: string; // 'bibliography/bibliography.json'
    readonly blueprint: string; // 'blueprint/dag.json'
    readonly collaboration?: string; // 'collaboration/' (optional)
    readonly checksums: string; // 'SHA256SUMS'
  };
}

export interface WorkspaceExportOptions {
  readonly workspaceId: string;
  readonly workspaceName?: string;
  readonly includeCollaboration?: boolean;
  readonly gitRef?: string;
}

export interface WorkspaceExportResult {
  readonly archivePath: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly fileCount: number;
  readonly manifest: PolyglotManifest;
}

export interface WorkspaceInspectResult {
  readonly valid: boolean;
  readonly manifest?: PolyglotManifest;
  readonly fileCount: number;
  readonly totalSizeBytes: number;
  readonly sections: readonly string[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface WorkspaceRestoreOptions {
  readonly archivePath: string;
  readonly targetWorkspaceId?: string;
  readonly dryRun?: boolean; // defaults to true for safety
  readonly conflictPolicy?: 'fail' | 'overwrite' | 'rename'; // defaults to 'fail'
}

export interface WorkspaceRestoreResult {
  readonly applied: boolean;
  readonly dryRun: boolean;
  readonly workspaceId: string;
  readonly stagedPath?: string;
  readonly restoredFilesCount: number;
  readonly conflicts: readonly string[];
  readonly warnings: readonly string[];
}

export const MAX_WORKSPACE_ARCHIVE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export function isArchiveVersionSupported(version: string): boolean {
  if (!version) return false;
  const major = parseInt(version.split('.')[0] || '0', 10);
  return major <= 1;
}

