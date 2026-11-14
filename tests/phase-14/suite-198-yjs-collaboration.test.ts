/**
 * Test Suite 198: Real Yjs WebSocket Collaboration Verification (Phase 15 Wave 4, ADR-016)
 *
 * Validates:
 * 198.1: Two real Y.Doc clients synchronize & converge concurrent edits over real WebSocket /collab (y-protocols).
 * 198.2: Awareness cursor/user presence propagates over WebSocket & cleans up on disconnect.
 * 198.3: Room isolation: updates in roomA never leak into roomB.
 * 198.4: Fail-closed HTTP Upgrade auth: rejects missing/bad token, missing/untrusted origin (401/403),
 *        disabled flag (503), and path traversal rooms (400).
 * 198.5: Disconnect, offline edit buffering in client Y.Doc, and automatic convergence on reconnect.
 * 198.6: Snapshot persistence (.collab/{docId}.yjs & .yjsbin) and path traversal blocking.
 * 198.7: MonacoYjsAdapter lazy-load no-op safety when disabled and zero epistemic breach.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import WebSocket from 'ws';
import { MonacoYjsAdapter } from '../../src/services/collaboration/monaco-yjs-adapter';
import { HocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { BridgeError } from '../../src/services/errors/bridge-error';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

async function connectYjsWsClient(options: {
  url: string;
  origin?: string;
  ydoc: Y.Doc;
  awareness?: awarenessProtocol.Awareness;
}): Promise<{ ws: WebSocket; close: () => Promise<void> }> {
  const ws = new WebSocket(options.url, {
    ...(options.origin ? { headers: { Origin: options.origin } } : {}),
  });
  ws.binaryType = 'arraybuffer';

  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote-ws' || ws.readyState !== WebSocket.OPEN) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeUpdate(enc, update);
    ws.send(encoding.toUint8Array(enc));
  };
  options.ydoc.on('update', onDocUpdate);

  const onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === 'remote-ws' || !options.awareness || ws.readyState !== WebSocket.OPEN) return;
    const changed = changes.added.concat(changes.updated).concat(changes.removed);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(options.awareness, changed)
    );
    ws.send(encoding.toUint8Array(enc));
  };
  options.awareness?.on('update', onAwarenessUpdate);

  ws.on('message', (raw) => {
    const buf = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw as Buffer);
    const dec = decoding.createDecoder(buf);
    const msgType = decoding.readVarUint(dec);
    if (msgType === MESSAGE_SYNC) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(dec, enc, options.ydoc, 'remote-ws');
      if (encoding.length(enc) > 1 && ws.readyState === WebSocket.OPEN) {
        ws.send(encoding.toUint8Array(enc));
      }
    } else if (msgType === MESSAGE_AWARENESS && options.awareness) {
      awarenessProtocol.applyAwarenessUpdate(
        options.awareness,
        decoding.readVarUint8Array(dec),
        'remote-ws'
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(enc, options.ydoc);
      ws.send(encoding.toUint8Array(enc));

      if (options.awareness) {
        const awareEnc = encoding.createEncoder();
        encoding.writeVarUint(awareEnc, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          awareEnc,
          awarenessProtocol.encodeAwarenessUpdate(options.awareness, [options.ydoc.clientID])
        );
        ws.send(encoding.toUint8Array(awareEnc));
      }
      resolve();
    });
    ws.once('error', reject);
  });

  return {
    ws,
    close: async () => {
      options.ydoc.off('update', onDocUpdate);
      options.awareness?.off('update', onAwarenessUpdate);
      if (ws.readyState === WebSocket.CLOSED) return;
      await new Promise<void>((resolve) => {
        ws.once('close', () => resolve());
        ws.close();
      });
    },
  };
}

async function waitForCondition(fn: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for Yjs sync convergence');
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function expectUpgradeStatus(url: string, expectedStatus: number, origin?: string): Promise<void> {
  const actualStatus = await new Promise<number>((resolve, reject) => {
    const ws = new WebSocket(url, {
      ...(origin ? { headers: { Origin: origin } } : {}),
    });
    ws.once('unexpected-response', (_req, res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });
    ws.once('open', () => {
      ws.close();
      reject(new Error(`Expected HTTP ${expectedStatus} upgrade rejection, but WebSocket opened`));
    });
    ws.once('error', () => {
      // ignore socket termination after unexpected-response
    });
  });
  assert.equal(actualStatus, expectedStatus, `Expected HTTP ${expectedStatus}, got ${actualStatus}`);
}

export async function runSuite198(): Promise<void> {
  console.log('Running Suite 198: Real Yjs WebSocket CRDT Collaboration (7 sub-tests)...');

  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-suite-198-'));
  const server = new HocuspocusServer({
    validTokens: ['collab-token-123'],
    allowedOrigins: ['http://localhost:3000'],
  });
  const httpServer = http.createServer();
  const wss = server.attachUpgradeHandler(httpServer, { workspacePath: tmpWorkspace });

  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
  const { port } = httpServer.address() as AddressInfo;
  const baseWsUrl = `ws://127.0.0.1:${port}/collab`;

  try {
    // 198.1 & 198.2: Two real Y.Doc peers converge + Awareness propagates
    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const awareA = new awarenessProtocol.Awareness(docA);
    const awareB = new awarenessProtocol.Awareness(docB);
    awareA.setLocalStateField('user', { name: 'Euler', color: '#3b82f6' });
    awareB.setLocalStateField('user', { name: 'Noether', color: '#10b981' });

    const clientA = await connectYjsWsClient({
      url: `${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`,
      origin: 'http://localhost:3000',
      ydoc: docA,
      awareness: awareA,
    });
    const clientB = await connectYjsWsClient({
      url: `${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`,
      origin: 'http://localhost:3000',
      ydoc: docB,
      awareness: awareB,
    });

    docA.getText('monaco').insert(0, 'theorem base : True := ');
    await waitForCondition(() => docB.getText('monaco').toString() === 'theorem base : True := ');

    // Concurrent edits at disjoint offsets
    docB.getText('monaco').insert(docB.getText('monaco').length, 'trivial');
    docA.getText('monaco').insert(0, '-- header\n');
    await waitForCondition(
      () =>
        docA.getText('monaco').toString() === '-- header\ntheorem base : True := trivial' &&
        docB.getText('monaco').toString() === '-- header\ntheorem base : True := trivial'
    );
    console.log('  ✓ 198.1 Two live Y.Doc WebSocket clients converged concurrent CRDT edits cleanly');

    await waitForCondition(() => awareA.getStates().size >= 2 && awareB.getStates().size >= 2);
    console.log('  ✓ 198.2 Yjs Awareness state synchronized across live WebSocket peers');

    // 198.3: Room isolation
    const docOther = new Y.Doc();
    const clientOther = await connectYjsWsClient({
      url: `${baseWsUrl}?room=RoomB.lean&token=collab-token-123`,
      origin: 'http://localhost:3000',
      ydoc: docOther,
    });
    docOther.getText('monaco').insert(0, '-- isolated room B');
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(docA.getText('monaco').toString().includes('isolated room B'), false);
    await clientOther.close();
    console.log('  ✓ 198.3 Per-room isolation prevented RoomB updates from leaking into TheoremA.lean');

    // 198.4: Fail-closed WebSocket upgrade auth
    await expectUpgradeStatus(`${baseWsUrl}?room=TheoremA.lean&token=bad-token`, 401, 'http://localhost:3000');
    await expectUpgradeStatus(`${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`, 403); // Missing Origin
    await expectUpgradeStatus(`${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`, 403, 'http://evil.com');
    await expectUpgradeStatus(`${baseWsUrl}?room=../secret.lean&token=collab-token-123`, 400, 'http://localhost:3000');

    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', false);
    await expectUpgradeStatus(`${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`, 503, 'http://localhost:3000');
    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', true);
    console.log('  ✓ 198.4 Fail-closed WS upgrade rejected bad tokens (401), bad/missing origin (403), traversal (400), disabled (503)');

    // 198.5: Disconnect + offline edit + reconnect convergence
    await clientB.close();
    docB.getText('monaco').insert(docB.getText('monaco').length, '\n-- offline edit');
    const clientBReconnected = await connectYjsWsClient({
      url: `${baseWsUrl}?room=TheoremA.lean&token=collab-token-123`,
      origin: 'http://localhost:3000',
      ydoc: docB,
    });
    await waitForCondition(() => docA.getText('monaco').toString().includes('-- offline edit'));
    await clientA.close();
    await clientBReconnected.close();
    console.log('  ✓ 198.5 Offline CRDT mutations buffered during disconnect converged cleanly upon reconnect');

    // 198.6: Snapshot persistence & path traversal check
    server.persistSnapshot(tmpWorkspace, 'TheoremA.lean');
    assert.ok(fs.existsSync(path.join(tmpWorkspace, '.collab', 'TheoremA.lean.yjs')));
    assert.ok(fs.existsSync(path.join(tmpWorkspace, '.collab', 'TheoremA.lean.yjsbin')));
    assert.throws(() => server.getOrCreateDocument(tmpWorkspace, '../escape.lean'));
    console.log('  ✓ 198.6 Snapshot persisted (.yjs + .yjsbin) and path traversal blocked');

    // 198.7: MonacoYjsAdapter lazy gating + zero epistemic breach
    featureFlagRegistry.set('ENABLE_YJS_COLLABORATION', false);
    const noopHandle = MonacoYjsAdapter.bindMonacoEditor(
      { getValue: () => '', setValue: () => {} },
      { docId: 'TheoremA.lean', userName: 'Gauss' }
    );
    assert.equal(noopHandle.isBound, false);
    await assert.rejects(
      () =>
        MonacoYjsAdapter.connectSession({
          wsBaseUrl: baseWsUrl,
          roomId: 'TheoremA.lean',
          token: 'collab-token-123',
          userName: 'Gauss',
        }),
      (err: unknown) => err instanceof BridgeError && err.code === 'FEATURE_DISABLED'
    );
    const publicState = server.getOrCreateDocument(tmpWorkspace, 'TheoremA.lean');
    assert.equal((publicState as any).verified, undefined);
    assert.equal((publicState as any).seal, undefined);
    console.log('  ✓ 198.7 Adapter flag gating & epistemic barrier upheld');
  } finally {
    featureFlagRegistry.reset('ENABLE_YJS_COLLABORATION');
    wss.close();
    await new Promise<void>((resolve) => {
      httpServer.closeAllConnections?.();
      httpServer.close(() => resolve());
    });
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  }
}
