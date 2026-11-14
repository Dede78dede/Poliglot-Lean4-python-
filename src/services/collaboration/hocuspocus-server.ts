/**
 * Hocuspocus CRDT Collaboration Server (Phase 11.2 & Phase 15 Wave 4)
 *
 * Implements real Yjs CRDT synchronization over WebSocket (`y-protocols/sync` &
 * `y-protocols/awareness` with `lib0` binary framing):
 * - Fail-closed token authentication & mandatory CORS origin allowlist verification
 * - No hardcoded dev token fallback in NODE_ENV === 'production'
 * - Path-contained snapshot persistence at .collab/{docId}.yjs (+ binary CRDT state .yjsbin)
 * - Per-room isolation, max 64 KB frame size guard, and per-connection rate limiting
 * - Periodic update compaction (threshold = 50 updates)
 * - Epistemic barrier: edits are collaborative text changes and cannot certify proofs.
 */

import fs from 'node:fs';
import path from 'node:path';
import type http from 'node:http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocketServer, type WebSocket, type RawData } from 'ws';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import { createLogger } from '../logging/logger';

const logger = createLogger('hocuspocus-server');

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MAX_FRAME_BYTES = 64 * 1024;
const DEFAULT_RATE_LIMIT_PER_SEC = 120;
const DEV_FALLBACK_TOKENS = ['polyglot-collab-token-default', 'collab-secret-dev'] as const;

export interface HocuspocusAuthConfig {
  readonly validTokens: readonly string[];
  readonly allowedOrigins: readonly string[];
}

export interface CollabPeerInfo {
  userId: string;
  cursor?: { line: number; ch: number };
}

export interface CollabDocumentState {
  readonly docId: string;
  readonly workspacePath: string;
  readonly content: string;
  readonly version: number;
  readonly updateCount: number;
  readonly peers: Map<string, CollabPeerInfo>;
  readonly lastSnapshotAt?: number;
}

interface InternalRoom {
  readonly key: string;
  readonly workspacePath: string;
  readonly docId: string;
  readonly ydoc: Y.Doc;
  readonly ytext: Y.Text;
  readonly awareness: awarenessProtocol.Awareness;
  readonly peers: Map<string, CollabPeerInfo>;
  readonly conns: Map<WebSocket, Set<number>>;
  version: number;
  updateCount: number;
  lastSnapshotAt?: number;
}

function resolveDefaultTokens(): readonly string[] {
  const envTokens =
    typeof process !== 'undefined' && process.env?.POLYGLOT_COLLAB_TOKENS
      ? process.env.POLYGLOT_COLLAB_TOKENS.split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  if (envTokens.length > 0) {
    return envTokens;
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    // Fail closed in production when no POLYGLOT_COLLAB_TOKENS are configured.
    return [];
  }

  return [...DEV_FALLBACK_TOKENS];
}

function rawDataToUint8Array(data: RawData): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }
  return new Uint8Array(data);
}

export class HocuspocusServer {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly config: HocuspocusAuthConfig;
  private readonly explicitTokensConfigured: boolean;
  private readonly compactionThreshold = 50;

  constructor(config?: Partial<HocuspocusAuthConfig>) {
    this.explicitTokensConfigured = Array.isArray(config?.validTokens);
    this.config = {
      validTokens: config?.validTokens ?? resolveDefaultTokens(),
      allowedOrigins: config?.allowedOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000'],
    };
  }

  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_YJS_COLLABORATION');
  }

  public checkEnabled(): void {
    if (!this.isEnabled()) {
      throw new BridgeError('FEATURE_DISABLED', `yjs-${Date.now()}`, {
        feature: 'ENABLE_YJS_COLLABORATION',
        message: 'Yjs collaboration is disabled by feature flag ENABLE_YJS_COLLABORATION',
      });
    }
  }

  public authenticate(token: string, origin?: string): { success: boolean; error?: string } {
    if (!this.isEnabled()) {
      throw new BridgeError('FEATURE_DISABLED', `yjs-${Date.now()}`, {
        feature: 'ENABLE_YJS_COLLABORATION',
        message: 'Yjs collaboration is disabled by feature flag ENABLE_YJS_COLLABORATION',
      });
    }

    // 1. Fail-closed Origin verification (missing or non-allowlisted origins are rejected)
    const trimmedOrigin = origin?.trim() ?? '';
    if (!trimmedOrigin) {
      return {
        success: false,
        error: 'HOCUSPOCUS_AUTH_FAILED: Origin header is required',
      };
    }

    if (!this.config.allowedOrigins.includes(trimmedOrigin)) {
      return {
        success: false,
        error: 'HOCUSPOCUS_AUTH_FAILED: Origin not permitted by CORS allowlist',
      };
    }

    // 2. Token verification (no dev fallback in production)
    const activeTokens = this.explicitTokensConfigured ? this.config.validTokens : resolveDefaultTokens();
    if (activeTokens.length === 0) {
      return {
        success: false,
        error: 'HOCUSPOCUS_AUTH_FAILED: Collaboration tokens not configured for production environment',
      };
    }

    if (!token || !activeTokens.includes(token)) {
      return {
        success: false,
        error: 'HOCUSPOCUS_AUTH_FAILED: Invalid or missing collaboration token',
      };
    }

    return { success: true };
  }

  public assertSafeDocId(workspacePath: string, docId: string): { collabDir: string; snapshotFile: string; binFile: string } {
    if (!docId || docId.includes('\0') || docId.trim().length === 0) {
      throw new BridgeError('YJS_SYNC_FAILED', `yjs-${Date.now()}`, {
        reason: 'Document identifier must be non-empty and valid',
      });
    }

    const collabDir = path.resolve(workspacePath, '.collab');
    const snapshotFile = path.resolve(collabDir, `${docId}.yjs`);
    const binFile = path.resolve(collabDir, `${docId}.yjsbin`);
    const relText = path.relative(collabDir, snapshotFile);

    if (
      relText === '' ||
      relText.startsWith('..') ||
      path.isAbsolute(relText) ||
      docId.includes('..') ||
      docId.includes('/') ||
      docId.includes('\\')
    ) {
      throw new BridgeError('YJS_SYNC_FAILED', `yjs-${Date.now()}`, {
        reason: `Path traversal blocked for collaboration document: ${docId}`,
      });
    }

    return { collabDir, snapshotFile, binFile };
  }

  private toPublicState(room: InternalRoom): CollabDocumentState {
    return {
      docId: room.docId,
      workspacePath: room.workspacePath,
      content: room.ytext.toString(),
      version: room.version,
      updateCount: room.updateCount,
      peers: room.peers,
      lastSnapshotAt: room.lastSnapshotAt,
    };
  }

  private getOrCreateInternalRoom(workspacePath: string, docId: string): InternalRoom {
    const paths = this.assertSafeDocId(workspacePath, docId);
    const key = `${path.resolve(workspacePath)}::${docId}`;

    if (this.rooms.has(key)) {
      return this.rooms.get(key)!;
    }

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');

    // Attempt recovery from binary Yjs state first, falling back to UTF-8 .yjs snapshot
    let recovered = false;
    if (fs.existsSync(paths.binFile)) {
      try {
        const rawBin = fs.readFileSync(paths.binFile);
        if (rawBin.length > 0) {
          Y.applyUpdate(ydoc, new Uint8Array(rawBin), 'disk-restore');
          recovered = true;
        }
      } catch {
        logger.warn(`Corrupt binary Yjs snapshot for ${docId}, falling back to UTF-8 snapshot`);
      }
    }

    if (!recovered && fs.existsSync(paths.snapshotFile)) {
      try {
        const initialContent = fs.readFileSync(paths.snapshotFile, 'utf8');
        if (initialContent.length > 0) {
          ydoc.transact(() => {
            ytext.insert(0, initialContent);
          }, 'disk-restore');
        }
      } catch {
        logger.warn(`Failed to read snapshot file for ${docId}, initializing clean`);
      }
    }

    const awareness = new awarenessProtocol.Awareness(ydoc);
    const peers = new Map<string, CollabPeerInfo>();
    const conns = new Map<WebSocket, Set<number>>();

    const room: InternalRoom = {
      key,
      workspacePath,
      docId,
      ydoc,
      ytext,
      awareness,
      peers,
      conns,
      version: 1,
      updateCount: 0,
    };

    // Broadcast Y.Doc updates to all connected peer sockets in THIS room only
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'disk-restore') return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const payload = encoding.toUint8Array(encoder);

      for (const conn of room.conns.keys()) {
        if (conn !== origin && conn.readyState === conn.OPEN) {
          conn.send(payload);
        }
      }

      if (origin !== 'local-apply') {
        room.version += 1;
        room.updateCount += 1;
        if (room.updateCount >= this.compactionThreshold) {
          this.persistSnapshot(workspacePath, docId);
        }
      }
    });

    // Propagate awareness updates across connected peers in the same room
    awareness.on(
      'update',
      (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => {
        const changedClients = changes.added.concat(changes.updated).concat(changes.removed);
        if (origin && room.conns.has(origin as WebSocket)) {
          const controlled = room.conns.get(origin as WebSocket)!;
          for (const id of changes.added) controlled.add(id);
          for (const id of changes.removed) controlled.delete(id);
        }

        // Sync public peer cursor summary map
        const states = awareness.getStates();
        for (const id of changedClients) {
          const clientKey = `awareness-${id}`;
          const st = states.get(id) as
            | { user?: { name?: string }; cursor?: { line: number; ch: number } }
            | undefined;
          if (!st) {
            room.peers.delete(clientKey);
          } else if (st.user?.name) {
            room.peers.set(clientKey, {
              userId: st.user.name,
              cursor: st.cursor,
            });
          }
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const payload = encoding.toUint8Array(encoder);

        for (const conn of room.conns.keys()) {
          if (conn !== origin && conn.readyState === conn.OPEN) {
            conn.send(payload);
          }
        }
      }
    );

    this.rooms.set(key, room);
    return room;
  }

  public getOrCreateDocument(workspacePath: string, docId: string): CollabDocumentState {
    const room = this.getOrCreateInternalRoom(workspacePath, docId);
    return this.toPublicState(room);
  }

  public getYDoc(workspacePath: string, docId: string): Y.Doc {
    return this.getOrCreateInternalRoom(workspacePath, docId).ydoc;
  }

  public applyUpdate(
    workspacePath: string,
    docId: string,
    diff: { text: string; insertAt?: number; deleteCount?: number }
  ): CollabDocumentState {
    const room = this.getOrCreateInternalRoom(workspacePath, docId);

    room.ydoc.transact(() => {
      if (diff.insertAt !== undefined) {
        if (diff.deleteCount && diff.deleteCount > 0) {
          room.ytext.delete(diff.insertAt, diff.deleteCount);
        }
        if (diff.text.length > 0) {
          room.ytext.insert(diff.insertAt, diff.text);
        }
      } else {
        if (room.ytext.length > 0) {
          room.ytext.delete(0, room.ytext.length);
        }
        if (diff.text.length > 0) {
          room.ytext.insert(0, diff.text);
        }
      }
    }, 'local-apply');

    room.version += 1;
    room.updateCount += 1;

    if (room.updateCount >= this.compactionThreshold) {
      this.persistSnapshot(workspacePath, docId);
    }

    return this.toPublicState(room);
  }

  public persistSnapshot(workspacePath: string, docId: string): string {
    const room = this.getOrCreateInternalRoom(workspacePath, docId);
    const { collabDir, snapshotFile, binFile } = this.assertSafeDocId(workspacePath, docId);

    if (!fs.existsSync(collabDir)) {
      fs.mkdirSync(collabDir, { recursive: true });
    }

    fs.writeFileSync(snapshotFile, room.ytext.toString(), 'utf8');
    fs.writeFileSync(binFile, Buffer.from(Y.encodeStateAsUpdate(room.ydoc)));

    room.updateCount = 0;
    room.lastSnapshotAt = Date.now();

    return snapshotFile;
  }

  public updatePeerCursor(
    workspacePath: string,
    docId: string,
    peerId: string,
    userId: string,
    cursor?: { line: number; ch: number }
  ): void {
    const room = this.getOrCreateInternalRoom(workspacePath, docId);
    room.peers.set(peerId, { userId, cursor });
  }

  public removePeer(workspacePath: string, docId: string, peerId: string): void {
    const room = this.getOrCreateInternalRoom(workspacePath, docId);
    room.peers.delete(peerId);
  }

  public handleConnection(
    ws: WebSocket,
    options: {
      readonly workspacePath: string;
      readonly docId: string;
      readonly maxMessagesPerSecond?: number;
    }
  ): void {
    const room = this.getOrCreateInternalRoom(options.workspacePath, options.docId);
    room.conns.set(ws, new Set());

    // Initial Yjs SyncStep1
    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, room.ydoc);
    ws.send(encoding.toUint8Array(syncEncoder));

    // Send existing awareness states if peers are present
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }

    const rateLimit = options.maxMessagesPerSecond ?? DEFAULT_RATE_LIMIT_PER_SEC;
    let windowStart = Date.now();
    let msgCount = 0;

    ws.on('message', (data: RawData) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        msgCount = 0;
      }
      msgCount += 1;
      if (msgCount > rateLimit) {
        ws.close(1008, 'Rate limit exceeded');
        return;
      }

      const buf = rawDataToUint8Array(data);
      if (buf.byteLength > MAX_FRAME_BYTES) {
        ws.close(1009, 'Frame exceeds 64 KB cap');
        return;
      }

      try {
        const decoder = decoding.createDecoder(buf);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === MESSAGE_SYNC) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, room.ydoc, ws);
          if (encoding.length(encoder) > 1 && ws.readyState === ws.OPEN) {
            ws.send(encoding.toUint8Array(encoder));
          }
        } else if (messageType === MESSAGE_AWARENESS) {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
        }
      } catch (err) {
        logger.warn(`Invalid Yjs frame received for ${options.docId}`);
        ws.close(1003, err instanceof Error ? err.message : 'Malformed Yjs frame');
      }
    });

    ws.on('close', () => {
      const controlledIds = room.conns.get(ws);
      room.conns.delete(ws);
      if (controlledIds && controlledIds.size > 0) {
        awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null);
      }
      if (room.updateCount > 0) {
        try {
          this.persistSnapshot(options.workspacePath, options.docId);
        } catch {
          // ignore snapshot persistence failure on teardown if temp dir was removed
        }
      }
    });
  }

  public attachUpgradeHandler(
    httpServer: http.Server,
    options: { readonly workspacePath: string }
  ): WebSocketServer {
    const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });

    httpServer.on('upgrade', (req, socket, head) => {
      let url: URL;
      try {
        url = new URL(req.url ?? '/', 'http://localhost');
      } catch {
        socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      if (url.pathname !== '/collab') {
        return;
      }

      if (!this.isEnabled()) {
        socket.write(
          'HTTP/1.1 503 Service Unavailable\r\nContent-Type: application/problem+json\r\nConnection: close\r\n\r\n' +
            JSON.stringify({
              type: 'https://polyglot.dev/errors/feature-disabled',
              title: 'FEATURE_DISABLED',
              status: 503,
              detail: 'ENABLE_YJS_COLLABORATION is disabled.',
            })
        );
        socket.destroy();
        return;
      }

      const token = url.searchParams.get('token') ?? '';
      const docId = url.searchParams.get('room') ?? 'Main.lean';
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';

      const auth = this.authenticate(token, origin);
      if (!auth.success) {
        const statusLine = auth.error?.includes('Origin')
          ? '403 Forbidden'
          : '401 Unauthorized';
        socket.write(
          `HTTP/1.1 ${statusLine}\r\nContent-Type: application/problem+json\r\nConnection: close\r\n\r\n` +
            JSON.stringify({
              type: 'https://polyglot.dev/errors/hocuspocus-auth-failed',
              title: 'HOCUSPOCUS_AUTH_FAILED',
              status: auth.error?.includes('Origin') ? 403 : 401,
              detail: auth.error ?? 'Unauthorized',
            })
        );
        socket.destroy();
        return;
      }

      try {
        this.assertSafeDocId(options.workspacePath, docId);
      } catch (pathErr) {
        socket.write(
          'HTTP/1.1 400 Bad Request\r\nContent-Type: application/problem+json\r\nConnection: close\r\n\r\n' +
            JSON.stringify({
              type: 'https://polyglot.dev/errors/yjs-sync-failed',
              title: 'YJS_SYNC_FAILED',
              status: 400,
              detail: pathErr instanceof Error ? pathErr.message : 'Invalid room identifier',
            })
        );
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
        this.handleConnection(ws, {
          workspacePath: options.workspacePath,
          docId,
        });
      });
    });

    return wss;
  }
}

export const hocuspocusServer = new HocuspocusServer();
