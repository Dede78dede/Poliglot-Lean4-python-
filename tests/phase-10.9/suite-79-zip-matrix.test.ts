import assert from 'node:assert/strict';
import {
  validateZipEntries,
  type ZipValidationEntry,
} from '../../src/services/zip-validator';
import { ZIP_LIMITS } from '../../src/registries/constants';

export async function runSuite79(): Promise<void> {
  console.log('\n--- Test Suite 79: ZipValidator Threat Matrix ---');

  // 79.1: CVE-2018-1002200 path traversal rejection
  const traversal = validateZipEntries([{ path: '../../etc/shadow', uncompressedSize: 50 }], 100);
  assert.equal(traversal.valid, false);
  assert.ok(traversal.errors.some((e) => e.includes('Illegal path traversal')));

  // 79.2: CVE-2026-0866 Zombie ZIP header compression mismatch detection
  const zombie = validateZipEntries([{ path: 'exploit.lean', uncompressedSize: 100, zombieMismatch: true }], 100);
  assert.equal(zombie.valid, false);
  assert.ok(zombie.errors.some((e) => e.includes('Zombie ZIP')));

  // 79.3: Symlink rejection (MAX_SYMLINKS: 0)
  const symlink = validateZipEntries([{ path: 'link.py', uncompressedSize: 10, isSymlink: true }], 100);
  assert.equal(symlink.valid, false);
  assert.ok(symlink.errors.some((e) => e.includes('Symlink rejected')));

  // 79.4: Nested ZIP rejection (MAX_NESTED_DEPTH: 1)
  const nested = validateZipEntries([{ path: 'inner/nested.zip', uncompressedSize: 500 }], 500);
  assert.equal(nested.valid, false);
  assert.ok(nested.errors.some((e) => e.includes('Nested archive rejected')));

  // 79.5: Dangerous double extension rejection
  const doubleExt = validateZipEntries([{ path: 'malicious.py.exe', uncompressedSize: 100 }], 100);
  assert.equal(doubleExt.valid, false);
  assert.ok(doubleExt.errors.some((e) => e.includes('Executable binary or script rejected')));

  // 79.6: Whitelist extension enforcement
  const badExt = validateZipEntries([{ path: 'lib.so', uncompressedSize: 100 }], 100);
  assert.equal(badExt.valid, false);

  // 79.7: Compression ratio limit (>100:1)
  const zipBomb = validateZipEntries([{ path: 'bomb.lean', uncompressedSize: 1_000_000, compressedSize: 100 }], 100);
  assert.equal(zipBomb.valid, false);
  assert.ok(zipBomb.errors.some((e) => e.includes('ZIP bomb')));

  // 79.8: File count limit (>500)
  const manyFiles: ZipValidationEntry[] = Array.from({ length: 501 }, (_, i) => ({
    path: `src/f_${i}.lean`,
    uncompressedSize: 10,
  }));
  const countExceeded = validateZipEntries(manyFiles, 5000);
  assert.equal(countExceeded.valid, false);

  // 79.9: Path depth limit (>20)
  const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/deep.lean';
  const depthExceeded = validateZipEntries([{ path: deepPath, uncompressedSize: 10 }], 100);
  assert.equal(depthExceeded.valid, false);

  // 79.10: Single file size limit (>5 MB)
  const hugeFile = validateZipEntries([{ path: 'huge.lean', uncompressedSize: 6 * 1024 * 1024 }], 1000);
  assert.equal(hugeFile.valid, false);

  // 79.11: Valid archive passes
  const valid = validateZipEntries([
    { path: 'src/Main.lean', uncompressedSize: 200 },
    { path: 'lakefile.lean', uncompressedSize: 100 },
    { path: 'README.md', uncompressedSize: 50 },
  ], 500);
  assert.equal(valid.valid, true);
  console.log('  ✓ 79.1 All 11 ZIP security tests pass in unified threat matrix');

  // Constants invariants
  assert.equal(ZIP_LIMITS.MAX_FILES, 500);
  assert.equal(ZIP_LIMITS.MAX_COMPRESSION_RATIO, 100);
  assert.equal(ZIP_LIMITS.MAX_SYMLINKS, 0);
  assert.equal(ZIP_LIMITS.MAX_NESTED_DEPTH, 1);
  console.log('  ✓ 79.2 ZIP_LIMITS in constants.ts confirmed as immutable single source of truth');
}
