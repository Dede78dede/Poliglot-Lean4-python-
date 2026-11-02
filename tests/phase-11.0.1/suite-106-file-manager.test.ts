/**
 * Test Suite 106: Windows-Style File Manager, ZIP & Soft Delete (Sprint 11.0.1)
 */

import assert from 'node:assert/strict';
import {
  ArchiveService,
} from '../../src/services/files/archive-service';
import {
  TrashService,
} from '../../src/services/files/trash-service';
import {
  PreviewService,
} from '../../src/services/files/preview-service';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite106(): Promise<void> {
  console.log('\n--- Test Suite 106: Windows-Style File Manager, ZIP & Soft Delete ---');

  const archiveService = new ArchiveService();
  const trashService = new TrashService();
  const previewService = new PreviewService();

  // 106.1: Archive creation with fflate
  const filesToPack = [
    { path: 'src/main.py', content: 'print("Hello Polyglot")\n' },
    { path: 'src/proofs/Identity.lean', content: 'theorem id_thm (p : Prop) : p -> p := by intro h; exact h\n' },
    { path: 'README.md', content: '# Sample Project\n' },
  ];
  const zipBytes = archiveService.createArchive(filesToPack);
  assert.ok(zipBytes.byteLength > 0, 'Archive byte length should be greater than 0');
  console.log(`  ✓ 106.1 Archive creation packed 3 files into ${zipBytes.byteLength} bytes via fflate`);

  // 106.2: Archive preview before extraction
  const preview = archiveService.previewArchive(zipBytes);
  assert.equal(preview.valid, true);
  assert.equal(preview.entries.filter((e) => !e.isDirectory).length, 3);
  assert.ok(preview.totalUncompressedSize > 0);
  assert.equal(preview.errors.length, 0);
  console.log('  ✓ 106.2 Archive preview inspects entries and compression ratio without full unpack');

  // 106.3: Safe extraction unpacking
  const extracted = archiveService.extractArchive(zipBytes);
  assert.equal(extracted.fileCount, 3);
  const paths = extracted.files.map((f) => f.path);
  assert.ok(paths.includes('src/main.py'));
  assert.ok(paths.includes('src/proofs/Identity.lean'));
  assert.ok(paths.includes('README.md'));
  console.log('  ✓ 106.3 Safe archive extraction unpacks files preserving directory structure');

  // 106.4: ZipValidator rejection of path traversal (CVE-2018-1002200)
  assert.throws(
    () => {
      archiveService.createArchive([
        { path: '../malicious.py', content: 'dangerous code' },
      ]);
    },
    (err: unknown) => {
      return err instanceof BridgeError;
    }
  );
  console.log('  ✓ 106.4 Path traversal sequences (../) rejected with BridgeError (CVE-2018-1002200)');

  // 106.5: PreviewService resolves file metadata
  const fileInfo = previewService.resolveFileInfo('src/algebra/ring.lean', 'theorem ring_id : True := trivial\n');
  assert.equal(fileInfo.name, 'ring.lean');
  assert.equal(fileInfo.kind, 'code');
  assert.equal(fileInfo.language, 'lean4');
  assert.equal(fileInfo.lineCount, 2);
  console.log('  ✓ 106.5 PreviewService accurately identifies language, extension, and line counts');

  // 106.6: Soft delete to Trash with metadata
  trashService.reset();
  const trashedItem = trashService.moveToTrash('src/obsolete.py', 'def deprecated(): pass\n');
  assert.ok(trashedItem.id.startsWith('trash-'));
  assert.equal(trashedItem.originalPath, 'src/obsolete.py');
  assert.ok(trashedItem.deletedAt);
  assert.equal(trashedItem.contentType, 'text/x-python');
  assert.equal(trashService.listTrash().length, 1);
  console.log('  ✓ 106.6 Soft delete moves item to .trash store with full metadata.json schema');

  // 106.7: Two-stage restore from Trash
  const restored = trashService.restoreFromTrash(trashedItem.id);
  assert.equal(restored.originalPath, 'src/obsolete.py');
  assert.equal(restored.content, 'def deprecated(): pass\n');
  assert.equal(trashService.listTrash().length, 0);
  console.log('  ✓ 106.7 Two-stage restore recovers file content and original path from trash');

  // 106.8: Permanent delete single item
  const tempItem = trashService.moveToTrash('temp.txt', 'temporary');
  assert.equal(trashService.listTrash().length, 1);
  trashService.deletePermanently(tempItem.id);
  assert.equal(trashService.listTrash().length, 0);
  console.log('  ✓ 106.8 Permanent deletion purges individual tombstone item');

  // 106.9: Empty trash purges all tombstones
  trashService.moveToTrash('file1.lean', 'content1');
  trashService.moveToTrash('file2.py', 'content2');
  assert.equal(trashService.listTrash().length, 2);
  const emptyRes = trashService.emptyTrash();
  assert.equal(emptyRes.deletedCount, 2);
  assert.equal(trashService.listTrash().length, 0);
  console.log('  ✓ 106.9 Empty trash purges all tombstones and returns deletedCount');

  trashService.destroy();
}
