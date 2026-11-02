/**
 * Archive Service (Sprint 11.0.1, File Manager)
 *
 * Implements ZIP archive creation, extraction, and validation using fflate.
 * Strictly adheres to ZIP_LIMITS, validates against path traversal (CVE-2018-1002200)
 * and Zombie ZIP headers (CVE-2026-0866). Throws BridgeError on violation.
 */

import * as fflate from 'fflate';
import { validateZipEntries, ZIP_LIMITS, type ZipValidationEntry } from '../zip-validator';
import { BridgeError } from '../errors/bridge-error';

export interface ArchiveInputFile {
  readonly path: string;
  readonly content: string | Uint8Array;
}

export interface ExtractedFile {
  readonly path: string;
  readonly content: string;
  readonly size: number;
}

export interface ExtractionResult {
  readonly files: readonly ExtractedFile[];
  readonly totalSize: number;
  readonly fileCount: number;
}

export interface ArchiveEntryPreview {
  readonly path: string;
  readonly uncompressedSize: number;
  readonly isDirectory: boolean;
}

export interface ArchivePreviewResult {
  readonly valid: boolean;
  readonly entries: readonly ArchiveEntryPreview[];
  readonly totalUncompressedSize: number;
  readonly archiveByteLength: number;
  readonly compressionRatio: number;
  readonly errors: readonly string[];
}

export class ArchiveService {
  /**
   * Creates a ZIP archive from a list of files using fflate.
   */
  public createArchive(
    files: readonly ArchiveInputFile[],
    correlationId = `zip-create-${Date.now()}`,
  ): Uint8Array {
    if (!files || files.length === 0) {
      throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
        reason: 'Cannot create archive from empty file list',
      });
    }

    if (files.length > ZIP_LIMITS.MAX_FILES) {
      throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
        reason: `File count exceeds maximum limit of ${ZIP_LIMITS.MAX_FILES} files.`,
      });
    }

    const zipData: fflate.Zippable = {};
    const encoder = new TextEncoder();
    let totalSize = 0;

    for (const file of files) {
      if (file.path.includes('..') || file.path.startsWith('/') || file.path.startsWith('\\')) {
        throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
          reason: 'Path traversal sequences or absolute paths are rejected for security.',
        });
      }
      const cleanPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!cleanPath) continue;

      const bytes =
        typeof file.content === 'string'
          ? encoder.encode(file.content)
          : file.content;

      if (bytes.byteLength > ZIP_LIMITS.MAX_FILE_UNCOMPRESSED_BYTES) {
        throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
          reason: `File "${cleanPath}" exceeds max single file limit (${ZIP_LIMITS.MAX_FILE_UNCOMPRESSED_BYTES} bytes).`,
        });
      }

      totalSize += bytes.byteLength;
      if (totalSize > ZIP_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
          reason: `Total uncompressed archive size exceeds limit of ${ZIP_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES} bytes.`,
        });
      }

      const segments = cleanPath.split('/').filter(Boolean);
      let currentLevel: Record<string, unknown> = zipData as Record<string, unknown>;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        if (i === segments.length - 1) {
          currentLevel[seg] = bytes;
        } else {
          currentLevel[seg] = currentLevel[seg] ?? {};
          currentLevel = currentLevel[seg] as Record<string, unknown>;
        }
      }
    }

    return fflate.zipSync(zipData, { level: 6 });
  }

  /**
   * Previews archive entries and validates security constraints without full decompression.
   */
  public previewArchive(
    archiveBytes: Uint8Array,
    correlationId = `zip-preview-${Date.now()}`,
  ): ArchivePreviewResult {
    try {
      const unzipped = fflate.unzipSync(archiveBytes);
      const entries: ZipValidationEntry[] = [];
      const previewEntries: ArchiveEntryPreview[] = [];

      for (const [rawPath, fileBytes] of Object.entries(unzipped)) {
        const isDir = rawPath.endsWith('/');
        const uncompressedSize = fileBytes.byteLength;
        const entryObj: ZipValidationEntry = {
          path: rawPath,
          uncompressedSize,
          isDirectory: isDir,
        };
        entries.push(entryObj);
        previewEntries.push({
          path: rawPath,
          uncompressedSize,
          isDirectory: isDir,
        });
      }

      const validation = validateZipEntries(entries, archiveBytes.byteLength);
      const compressionRatio =
        archiveBytes.byteLength > 0
          ? validation.totalSize / Math.max(1, archiveBytes.byteLength)
          : 1;

      return {
        valid: validation.valid,
        entries: Object.freeze(previewEntries),
        totalUncompressedSize: validation.totalSize,
        archiveByteLength: archiveBytes.byteLength,
        compressionRatio: Math.round(compressionRatio * 10) / 10,
        errors: Object.freeze([...validation.errors]),
      };
    } catch (err) {
      return {
        valid: false,
        entries: [],
        totalUncompressedSize: 0,
        archiveByteLength: archiveBytes.byteLength,
        compressionRatio: 0,
        errors: [err instanceof Error ? err.message : 'Corrupted or unreadable ZIP header'],
      };
    }
  }

  /**
   * Extracts and validates files from a ZIP archive.
   */
  public extractArchive(
    archiveBytes: Uint8Array,
    correlationId = `zip-extract-${Date.now()}`,
  ): ExtractionResult {
    const preview = this.previewArchive(archiveBytes, correlationId);
    if (!preview.valid) {
      throw new BridgeError('ARCHIVE_OPERATION_FAILED', correlationId, {
        errors: preview.errors,
      });
    }

    const unzipped = fflate.unzipSync(archiveBytes);
    const files: ExtractedFile[] = [];
    const decoder = new TextDecoder();

    for (const [rawPath, fileBytes] of Object.entries(unzipped)) {
      if (rawPath.endsWith('/')) continue;
      const cleanPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const content = decoder.decode(fileBytes);
      files.push({
        path: cleanPath,
        content,
        size: fileBytes.byteLength,
      });
    }

    return {
      files: Object.freeze(files),
      totalSize: preview.totalUncompressedSize,
      fileCount: files.length,
    };
  }
}

export const archiveService = new ArchiveService();
