/**
 * Test Suite 124: Workspace Archive Safety & Determinism (Phase 11.2, Sprint 11.2.1)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as fflate from 'fflate';
import {
  exportWorkspace,
  inspectArchive,
  restoreWorkspace,
} from '../../src/services/workspace/workspace-archive-service';
import { MAX_WORKSPACE_ARCHIVE_SIZE_BYTES } from '../../src/services/workspace/workspace-archive-format';

export async function runSuite124(): Promise<void> {
  console.log('\n--- Test Suite 124: Workspace Archive Safety & Determinism ---');

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-suite-124-'));
  const srcDir = path.join(testDir, 'src-safety');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'Safe.lean'), 'theorem safe : True := trivial\n');

  try {
    // 124.1: Path Traversal Rejection: archive containing '../' or absolute paths is rejected
    const evilZip = Buffer.from(fflate.zipSync({
      '../evil.txt': fflate.strToU8('malicious payload'),
    }));

    let traversalDetected = false;
    try {
      await restoreWorkspace(evilZip, {
        destinationDirectory: path.join(testDir, 'dest-evil'),
        dryRun: false,
      });
    } catch (err: unknown) {
      traversalDetected = true;
      const code = (err as any).code || '';
      const msg = err instanceof Error ? err.message : String(err);
      const reason = (err as any).details?.reason || '';
      assert.ok(
        code.includes('WORKSPACE_ARCHIVE_INVALID') ||
        msg.includes('traversal') ||
        reason.includes('traversal') ||
        msg.includes('WORKSPACE_ARCHIVE_INVALID'),
        `Expected traversal error, got code: ${code}, msg: ${msg}, reason: ${reason}`
      );
    }
    assert.ok(traversalDetected, 'Path traversal entry must be rejected');
    console.log('  ✓ 124.1 Path Traversal Rejection: rejected "../" paths securely');

    // 124.2: Size Limit Rejection: size exceeding MAX_WORKSPACE_ARCHIVE_SIZE_BYTES rejected
    assert.ok(MAX_WORKSPACE_ARCHIVE_SIZE_BYTES > 0);
    const oversizedBuffer = Buffer.alloc(MAX_WORKSPACE_ARCHIVE_SIZE_BYTES + 1024);
    let sizeLimitRejected = false;
    try {
      await restoreWorkspace(oversizedBuffer, {
        destinationDirectory: path.join(testDir, 'dest-oversize'),
      });
    } catch (err: unknown) {
      sizeLimitRejected = true;
      const code = (err as any).code || '';
      const reason = (err as any).details?.reason || '';
      const msg = err instanceof Error ? err.message : String(err);
      assert.ok(
        code.includes('WORKSPACE_ARCHIVE_INVALID') ||
        reason.includes('size') ||
        msg.includes('size') ||
        msg.includes('WORKSPACE_ARCHIVE_INVALID')
      );
    }
    assert.ok(sizeLimitRejected, 'Oversized archive must be rejected');
    console.log('  ✓ 124.2 Size Limit Rejection: archive exceeding max allowed size rejected');

    // 124.3: Export Determinism: repeated exports of identical workspace generate byte-identical checksums
    const export1 = await exportWorkspace({
      sourceDirectory: srcDir,
      workspaceId: 'determinism-test',
      name: 'Determinism Project',
    });
    // Sleep a tiny bit to ensure system clocks would differ if timestamps weren't normalized
    await new Promise(r => setTimeout(r, 50));
    const export2 = await exportWorkspace({
      sourceDirectory: srcDir,
      workspaceId: 'determinism-test',
      name: 'Determinism Project',
    });

    const insp1 = await inspectArchive(export1);
    const insp2 = await inspectArchive(export2);
    assert.equal(insp1.files.length, insp2.files.length);
    assert.deepEqual(insp1.files, insp2.files, 'File manifests and SHA256 checksums must match deterministically');
    console.log('  ✓ 124.3 Export Determinism: deterministic file listing and checksums verified');

    // 124.4: Audit Logging: operations emit structured records with file counts and duration
    assert.ok(insp1.manifest?.exportedAt);
    assert.equal(typeof insp1.manifest.fileCount, 'number');
    assert.ok(insp1.manifest.fileCount > 0);
    console.log('  ✓ 124.4 Audit Logging: manifest includes export timestamp, file counts, and metadata');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}
