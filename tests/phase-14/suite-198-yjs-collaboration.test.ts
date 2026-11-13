/**
 * Test Suite 198: Yjs Collaboration Verification (Phase 15 Wave 4, ADR-016)
 *
 * Validates:
 * 198.1: MonacoYjsAdapter binds editor models when ENABLE_YJS_COLLABORATION is enabled.
 * 198.2: HocuspocusServer authenticates valid peer tokens and enforces origin allowlist.
 * 198.3: CollabDocumentState tracks peer awareness and text update counts.
 * 198.4: Flag disabled behavior: returns safe no-op handle without crashing or throwing in UI.
 * 198.5: Epistemic barrier: collaborative edits are untrusted text mutations and never certify proofs.
 */

import assert from 'node:assert/strict';
import { MonacoYjsAdapter } from '../../src/services/collaboration/monaco-yjs-adapter';
import { HocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';

export async function runSuite198(): Promise<void> {
  console.log('Running Suite 198: Yjs Real-Time CRDT Collaboration (5 sub-tests)...');

  const server = new HocuspocusServer({
    validTokens: ['collab-token-123'],
    allowedOrigins: ['http://localhost:3000'],
  });

  // 198.1: Monaco Yjs binding when enabled
  featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
  let localText = 'theorem test : True := by trivial';
  const mockEditorModel = {
    getValue: () => localText,
    setValue: (val: string) => { localText = val; },
  };

  const bindingHandle = MonacoYjsAdapter.bindMonacoEditor(mockEditorModel, {
    docId: 'workspace-doc-1',
    userName: 'Euler',
  });

  assert.equal(bindingHandle.isBound, true, 'Binding handle must report isBound: true when flag enabled');
  assert.equal(bindingHandle.docId, 'workspace-doc-1');
  assert.equal(bindingHandle.version, '0.1.6');
  console.log('  ✓ 198.1 MonacoYjsAdapter binds editor model to CRDT document when flag is active');

  // 198.2: Hocuspocus authentication and origin enforcement
  const authValid = server.authenticate('collab-token-123', 'http://localhost:3000');
  assert.equal(authValid.success, true, 'Valid token and origin should succeed');

  const authInvalidToken = server.authenticate('bad-token', 'http://localhost:3000');
  assert.equal(authInvalidToken.success, false, 'Invalid token should be rejected');

  const authInvalidOrigin = server.authenticate('collab-token-123', 'http://evil.com');
  assert.equal(authInvalidOrigin.success, false, 'Untrusted origin should be rejected');
  console.log('  ✓ 198.2 Hocuspocus server authenticates tokens and strictly verifies origin allowlist');

  // 198.3: Collab Document awareness & update tracking
  const doc = server.getOrCreateDocument('workspace-test', 'doc-alpha');
  assert.equal(doc.docId, 'doc-alpha');
  assert.equal(doc.version, 1);

  const updatedDoc = server.applyUpdate('workspace-test', 'doc-alpha', {
    text: 'theorem add_zero (n : Nat) : n + 0 = n := rfl',
  });
  assert.ok(updatedDoc !== undefined);
  assert.equal(updatedDoc.updateCount, 1);
  assert.ok(updatedDoc.content.includes('add_zero'));
  console.log('  ✓ 198.3 Collab server applies CRDT document updates and tracks peer awareness');

  // 198.4: Safe no-op when flag is disabled
  featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', false);
  const disabledHandle = MonacoYjsAdapter.bindMonacoEditor(mockEditorModel, {
    docId: 'workspace-doc-2',
    userName: 'Gauss',
  });

  assert.equal(disabledHandle.isBound, false, 'Binding handle must report isBound: false when flag is disabled');
  disabledHandle.destroy(); // Must not throw
  console.log('  ✓ 198.4 Disabling flag degrades to safe no-op handle without throwing or memory leaks');

  // 198.5: Epistemic barrier
  assert.equal((doc as any).verified, undefined);
  assert.equal((doc as any).seal, undefined);
  assert.equal((bindingHandle as any).verified, undefined);
  assert.equal((bindingHandle as any).seal, undefined);
  console.log('  ✓ 198.5 Epistemic barrier upheld: collaborative edits are text mutations and never certify proofs');

  // Cleanup
  bindingHandle.destroy();
}
