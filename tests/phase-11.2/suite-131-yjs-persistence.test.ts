/**
 * Test Suite 131: Yjs Snapshot Persistence & Compaction (Phase 11.2, Sprint 11.2.5)
 */

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { HocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';

export async function runSuite131(): Promise<void> {
  console.log('\n--- Test Suite 131: Yjs Snapshot Persistence & Compaction ---');

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-suite-131-'));
  const server = new HocuspocusServer();

  try {
    const docId = 'PersistedFile.lean';
    server.applyUpdate(testDir, docId, { text: 'theorem persist_me : True := trivial\n' });

    // 131.1: Snapshot saved to .collab/{docId}.yjs
    const snapshotPath = server.persistSnapshot(testDir, docId);
    assert.ok(fs.existsSync(snapshotPath), 'Snapshot file must exist on disk');
    assert.equal(path.basename(snapshotPath), `${docId}.yjs`);
    assert.equal(path.dirname(snapshotPath), path.join(testDir, '.collab'));
    const content = fs.readFileSync(snapshotPath, 'utf8');
    assert.equal(content, 'theorem persist_me : True := trivial\n');
    console.log('  ✓ 131.1 Snapshot saved: written to .collab/{docId}.yjs successfully');

    // 131.2: Resume document state on reconnect (new server instance reading from disk)
    const newServer = new HocuspocusServer();
    const restoredDoc = newServer.getOrCreateDocument(testDir, docId);
    assert.equal(restoredDoc.content, 'theorem persist_me : True := trivial\n');
    console.log('  ✓ 131.2 Resume document state: reloaded content from disk snapshot on reconnect');

    // 131.3: Compaction after update threshold
    // Apply 50 updates to trigger auto-compaction
    for (let i = 0; i < 55; i++) {
      server.applyUpdate(testDir, 'CompactedDoc.lean', { text: `-- update ${i}\n` });
    }
    const compactedDoc = server.getOrCreateDocument(testDir, 'CompactedDoc.lean');
    assert.ok(compactedDoc.updateCount < 50, 'Update counter must reset upon compaction');
    assert.ok(fs.existsSync(path.join(testDir, '.collab', 'CompactedDoc.lean.yjs')));
    console.log('  ✓ 131.3 Compaction: update counter reset and snapshot automatically written after threshold');

    // 131.4: File corruption recovery (gracefully handles corrupt snapshot file)
    const corruptDocId = 'Corrupted.lean';
    const collabDir = path.join(testDir, '.collab');
    fs.mkdirSync(collabDir, { recursive: true });
    // Write invalid or locked snapshot
    fs.writeFileSync(path.join(collabDir, `${corruptDocId}.yjs`), 'corrupt binary data \0\0\0');
    const recoveredDoc = server.getOrCreateDocument(testDir, corruptDocId);
    assert.ok(recoveredDoc);
    assert.equal(recoveredDoc.docId, corruptDocId);
    console.log('  ✓ 131.4 Corruption recovery: server initialized safely despite corrupted snapshot');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}
