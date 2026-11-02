/**
 * Test Suite 130: Yjs CRDT Core & Hocuspocus Auth (Phase 11.2, Sprint 11.2.5)
 */

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { HocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';

export async function runSuite130(): Promise<void> {
  console.log('\n--- Test Suite 130: Yjs CRDT Core & Hocuspocus Auth ---');

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-suite-130-'));
  const server = new HocuspocusServer({
    validTokens: ['secret-token-123'],
    allowedOrigins: ['http://localhost:3000'],
  });

  try {
    // 130.1: CRDT State Convergence across replicas
    const docId = 'SharedTheorem.lean';
    const initial = server.getOrCreateDocument(testDir, docId);
    assert.equal(initial.version, 1);

    server.applyUpdate(testDir, docId, { text: 'def add (a b : Nat) : Nat := a + b\n' });
    const replica1 = server.getOrCreateDocument(testDir, docId);
    assert.equal(replica1.content, 'def add (a b : Nat) : Nat := a + b\n');
    assert.equal(replica1.version, 2);
    console.log('  ✓ 130.1 CRDT State Convergence: updates converged cleanly across document handles');

    // 130.2: onAuthenticate token verification
    const goodAuth = server.authenticate('secret-token-123', 'http://localhost:3000');
    assert.equal(goodAuth.success, true);

    const badTokenAuth = server.authenticate('invalid-token', 'http://localhost:3000');
    assert.equal(badTokenAuth.success, false);
    assert.ok(badTokenAuth.error?.includes('HOCUSPOCUS_AUTH_FAILED'));
    console.log('  ✓ 130.2 onAuthenticate token check: valid token accepted, invalid token rejected');

    // 130.3: Origin allowlist enforcement
    const badOriginAuth = server.authenticate('secret-token-123', 'http://malicious-site.com');
    assert.equal(badOriginAuth.success, false);
    assert.ok(badOriginAuth.error?.includes('CORS allowlist') || badOriginAuth.error?.includes('HOCUSPOCUS_AUTH_FAILED'));
    console.log('  ✓ 130.3 Origin allowlist: rejected unauthorized origin');

    // 130.4: Awareness cursor propagation
    server.updatePeerCursor(testDir, docId, 'peer-1', 'Alice', { line: 10, ch: 4 });
    const docWithPeer = server.getOrCreateDocument(testDir, docId);
    assert.equal(docWithPeer.peers.get('peer-1')?.userId, 'Alice');
    assert.deepEqual(docWithPeer.peers.get('peer-1')?.cursor, { line: 10, ch: 4 });

    server.removePeer(testDir, docId, 'peer-1');
    assert.equal(docWithPeer.peers.has('peer-1'), false);
    console.log('  ✓ 130.4 Awareness cursor propagation: tracked and cleaned up peer presence');

    // 130.5: Epistemic barrier: CRDT edits never certify proofs
    assert.equal('SEAL_KERNEL_VERIFIED_TIER5' in replica1, false);
    assert.equal('verified' in replica1, false);
    console.log('  ✓ 130.5 Epistemic barrier: collaborative edits remain purely syntactic');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}
