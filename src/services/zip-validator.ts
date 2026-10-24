import { ZIP_LIMITS as CONSTANTS_ZIP_LIMITS } from '../registries/constants';

export const ZIP_LIMITS = Object.freeze({
  ...CONSTANTS_ZIP_LIMITS,
  MAX_TOTAL_UNCOMPRESSED_BYTES: CONSTANTS_ZIP_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES_MANUAL,
} as const);

export const GITHUB_IMPORT_LIMITS = Object.freeze({
  MAX_TOTAL_UNCOMPRESSED_BYTES: CONSTANTS_ZIP_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES_GITHUB,
  MAX_STREAM_BYTES: 500 * 1024 * 1024,
} as const);

export const ZIP_EXPORT_EXCLUSIONS = Object.freeze([
  '.lake/',
  '.lake',
  '__pycache__/',
  '__pycache__',
  '.git/',
  '.git',
  'node_modules/',
  'node_modules',
  '.venv/',
  '.venv',
  'dist/',
  'build/',
  '.DS_Store',
]);

export interface ZipValidationEntry {
  readonly path: string;
  readonly uncompressedSize: number;
  readonly compressedSize?: number;
  readonly isDirectory?: boolean;
  readonly isSymlink?: boolean;
  readonly zombieMismatch?: boolean;
}

export interface ZipValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly totalSize: number;
  readonly fileCount: number;
}

export interface ZipValidationOptions {
  readonly maxTotalUncompressedBytes?: number;
}

/**
 * Validates a ZIP archive structure against ZIP bomb, path traversal,
 * symlinks, nested archives, and file size quotas prior to extraction.
 */
export function validateZipEntries(
  entries: readonly ZipValidationEntry[],
  archiveByteLength: number,
  options?: ZipValidationOptions,
): ZipValidationResult {
  const errors: string[] = [];
  let totalUncompressedSize = 0;
  let fileCount = 0;
  const maxTotalBytes = options?.maxTotalUncompressedBytes ?? ZIP_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES;

  if (entries.length > ZIP_LIMITS.MAX_FILES) {
    errors.push(
      `File count (${entries.length}) exceeds the maximum limit of ${ZIP_LIMITS.MAX_FILES} files.`,
    );
  }

  for (const entry of entries) {
    const rawPath = entry.path.trim();

    // 0. Symlink and Zombie checks
    if (entry.isSymlink) {
      errors.push(`Symlink rejected in path: "${rawPath}" (MAX_SYMLINKS: 0).`);
      continue;
    }
    if (entry.zombieMismatch) {
      errors.push(`Zombie ZIP compression header mismatch detected: "${rawPath}" (CVE-2026-0866).`);
      continue;
    }

    // 1. Path traversal security checks (CVE-2018-1002200)
    if (rawPath.includes('..') || rawPath.startsWith('/') || rawPath.startsWith('\\')) {
      errors.push(`Illegal path traversal sequence detected in file path: "${rawPath}".`);
      continue;
    }
    if (rawPath.includes('\0')) {
      errors.push(`Null byte injection detected in path: "${rawPath}".`);
      continue;
    }

    // 2. Nested ZIP archive rejection
    if (rawPath.toLowerCase().endsWith('.zip') || rawPath.toLowerCase().endsWith('.tar.gz')) {
      errors.push(`Nested archive rejected: "${rawPath}" (MAX_NESTED_DEPTH: 1).`);
      continue;
    }

    const segments = rawPath.split(/[/\\]+/).filter(Boolean);
    if (segments.length > ZIP_LIMITS.MAX_PATH_DEPTH) {
      errors.push(`Path depth exceeds maximum allowed directory depth (${ZIP_LIMITS.MAX_PATH_DEPTH}): "${rawPath}".`);
      continue;
    }

    if (entry.isDirectory || rawPath.endsWith('/')) {
      continue;
    }

    fileCount++;
    totalUncompressedSize += entry.uncompressedSize;

    // 3. Per-file size check
    if (entry.uncompressedSize > ZIP_LIMITS.MAX_FILE_UNCOMPRESSED_BYTES) {
      errors.push(
        `File "${rawPath}" (${(entry.uncompressedSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum file size (${ZIP_LIMITS.MAX_FILE_UNCOMPRESSED_BYTES / (1024 * 1024)} MB).`,
      );
    }

    // 4. Compression ratio check (ZIP bomb mitigation)
    const compressed = entry.compressedSize ?? Math.max(1, archiveByteLength / entries.length);
    const ratio = entry.uncompressedSize / Math.max(1, compressed);
    if (ratio > ZIP_LIMITS.MAX_COMPRESSION_RATIO) {
      errors.push(
        `Abnormal compression ratio (${ratio.toFixed(0)}:1) detected in "${rawPath}". Suspicious ZIP bomb rejected.`,
      );
    }

    // 5. Extension whitelist & dangerous double extensions check
    const fileName = segments[segments.length - 1] ?? '';
    const lowerFileName = fileName.toLowerCase();

    // Check for dangerous double extensions (e.g. "exploit.py.exe", "file.lean.dll")
    const dangerousExtensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.sh', '.msi'];
    if (dangerousExtensions.some((ext) => lowerFileName.endsWith(ext))) {
      errors.push(`Executable binary or script rejected: "${rawPath}".`);
      continue;
    }

    const isSpecialAllowedFile =
      fileName === 'lakefile.lean' ||
      fileName === 'lean-toolchain' ||
      fileName === 'pyproject.toml' ||
      fileName === 'requirements.txt' ||
      fileName === 'README.md';

    const hasAllowedExt = ZIP_LIMITS.ALLOWED_EXTENSIONS.some((ext) =>
      lowerFileName.endsWith(ext),
    );

    if (!hasAllowedExt && !isSpecialAllowedFile && !fileName.startsWith('.')) {
      errors.push(`File extension in "${rawPath}" is not on the allowed source whitelist.`);
    }
  }

  // 6. Total uncompressed size check
  if (totalUncompressedSize > maxTotalBytes) {
    errors.push(
      `Total uncompressed project size (${(totalUncompressedSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of ${(maxTotalBytes / (1024 * 1024)).toFixed(0)} MB.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSize: totalUncompressedSize,
    fileCount,
  };
}
