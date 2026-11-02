/**
 * File & Archive Preview Service (Sprint 11.0.1, File Manager)
 *
 * Inspects archive metadata without extraction and resolves preview metadata for VFS files.
 */

import { archiveService, type ArchivePreviewResult } from './archive-service';

export type FilePreviewKind =
  | 'text'
  | 'code'
  | 'markdown'
  | 'json'
  | 'archive'
  | 'binary';

export interface FilePreviewInfo {
  readonly path: string;
  readonly name: string;
  readonly kind: FilePreviewKind;
  readonly extension: string;
  readonly sizeBytes: number;
  readonly lineCount?: number;
  readonly language?: string;
  readonly isArchive: boolean;
  readonly archivePreview?: ArchivePreviewResult;
}

export class PreviewService {
  public resolveFileInfo(path: string, content?: string | Uint8Array): FilePreviewInfo {
    const name = path.split('/').pop() ?? path;
    const dotIndex = name.lastIndexOf('.');
    const ext = dotIndex !== -1 ? name.substring(dotIndex).toLowerCase() : '';

    let kind: FilePreviewKind = 'text';
    let language: string | undefined;

    if (ext === '.py') {
      kind = 'code';
      language = 'python';
    } else if (ext === '.lean') {
      kind = 'code';
      language = 'lean4';
    } else if (ext === '.json') {
      kind = 'json';
      language = 'json';
    } else if (ext === '.md') {
      kind = 'markdown';
      language = 'markdown';
    } else if (ext === '.zip' || ext === '.tar' || ext === '.gz') {
      kind = 'archive';
    }

    let sizeBytes = 0;
    let lineCount: number | undefined;
    let archivePreview: ArchivePreviewResult | undefined;

    if (content) {
      if (typeof content === 'string') {
        const encoder = new TextEncoder();
        sizeBytes = encoder.encode(content).byteLength;
        lineCount = content.split('\n').length;
      } else {
        sizeBytes = content.byteLength;
        if (kind === 'archive') {
          archivePreview = archiveService.previewArchive(content);
        }
      }
    }

    return Object.freeze({
      path,
      name,
      kind,
      extension: ext,
      sizeBytes,
      lineCount,
      language,
      isArchive: kind === 'archive',
      archivePreview,
    });
  }

  public previewArchiveBytes(bytes: Uint8Array): ArchivePreviewResult {
    return archiveService.previewArchive(bytes);
  }
}

export const previewService = new PreviewService();
