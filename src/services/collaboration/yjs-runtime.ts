/**
 * Dynamic Yjs Browser/Client Collaboration Runtime (Phase 15 Wave 4)
 *
 * Strictly code-split and dynamically imported ONLY when ENABLE_YJS_COLLABORATION is true
 * so initial bundle O2 stays unaffected (~0 KB impact when disabled).
 */

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export type CollabConnectionStatus =
  | 'disabled'
  | 'connecting'
  | 'connected'
  | 'offline_queue'
  | 'auth_error';

export interface LiveCollabPeer {
  readonly clientId: number;
  readonly userName: string;
  readonly userColor: string;
}

export interface LiveCollabSessionOptions {
  readonly wsBaseUrl: string;
  readonly roomId: string;
  readonly token: string;
  readonly userName: string;
  readonly userColor?: string;
  readonly initialText?: string;
  readonly monacoEditor?: { getModel?: () => unknown };
  readonly onRemoteText?: (nextText: string) => void;
  readonly onStatusChange?: (status: CollabConnectionStatus, detail?: string) => void;
  readonly onPeersChange?: (peers: readonly LiveCollabPeer[]) => void;
}

export interface LiveCollabSession {
  readonly ydoc: Y.Doc;
  readonly ytext: Y.Text;
  readonly getStatus: () => CollabConnectionStatus;
  readonly applyLocalText: (nextText: string) => void;
  readonly disconnect: () => void;
  readonly destroy: () => void;
}

export async function startLiveYjsSession(
  options: LiveCollabSessionOptions
): Promise<LiveCollabSession> {
  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('monaco');
  const awareness = new awarenessProtocol.Awareness(ydoc);

  awareness.setLocalStateField('user', {
    name: options.userName,
    color: options.userColor ?? '#3b82f6',
  });

  if (options.initialText && ytext.length === 0) {
    ydoc.transact(() => {
      ytext.insert(0, options.initialText!);
    }, 'local-init');
  }

  let status: CollabConnectionStatus = 'connecting';
  let ws: WebSocket | null = null;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let monacoBinding: { destroy(): void } | null = null;

  // Bind genuine y-monaco MonacoBinding when an actual Monaco editor instance is passed
  if (options.monacoEditor && typeof options.monacoEditor.getModel === 'function') {
    const model = options.monacoEditor.getModel();
    if (model) {
      const { MonacoBinding } = await import('y-monaco');
      monacoBinding = new MonacoBinding(
        ytext,
        model as any,
        new Set([options.monacoEditor as any]),
        awareness
      );
    }
  }

  const updateStatus = (next: CollabConnectionStatus, detail?: string) => {
    status = next;
    options.onStatusChange?.(next, detail);
  };

  const emitPeers = () => {
    const list: LiveCollabPeer[] = [];
    for (const [clientId, state] of awareness.getStates().entries()) {
      const user = (state as { user?: { name?: string; color?: string } })?.user;
      if (user?.name) {
        list.push({
          clientId,
          userName: user.name,
          userColor: user.color ?? '#3b82f6',
        });
      }
    }
    options.onPeersChange?.(list);
  };

  ytext.observe((_event, tr) => {
    if (tr.origin !== 'local-editor') {
      options.onRemoteText?.(ytext.toString());
    }
  });

  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote-ws') return;
    if (ws && ws.readyState === ws.OPEN) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      ws.send(encoding.toUint8Array(enc));
    } else if (!destroyed) {
      updateStatus('offline_queue', 'Local edits buffered in Yjs CRDT pending reconnect.');
    }
  });

  awareness.on(
    'update',
    (changes: { added: number[]; updated: number[]; removed: number[] }) => {
      emitPeers();
      if (ws && ws.readyState === ws.OPEN) {
        const changed = changes.added.concat(changes.updated).concat(changes.removed);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          enc,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
        );
        ws.send(encoding.toUint8Array(enc));
      }
    }
  );

  const connectSocket = () => {
    if (destroyed) return;
    updateStatus('connecting');
    const wsUrl = `${options.wsBaseUrl.replace(/\/$/, '')}?room=${encodeURIComponent(
      options.roomId
    )}&token=${encodeURIComponent(options.token)}`;

    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    ws = socket;

    socket.onopen = () => {
      if (destroyed) {
        socket.close();
        return;
      }
      updateStatus('connected');

      // Send SyncStep1 & our awareness state
      const syncEnc = encoding.createEncoder();
      encoding.writeVarUint(syncEnc, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(syncEnc, ydoc);
      socket.send(encoding.toUint8Array(syncEnc));

      const awareEnc = encoding.createEncoder();
      encoding.writeVarUint(awareEnc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awareEnc,
        awarenessProtocol.encodeAwarenessUpdate(awareness, [ydoc.clientID])
      );
      socket.send(encoding.toUint8Array(awareEnc));
      emitPeers();
    };

    socket.onmessage = (event) => {
      const buf = new Uint8Array(event.data as ArrayBuffer);
      const dec = decoding.createDecoder(buf);
      const msgType = decoding.readVarUint(dec);

      if (msgType === MESSAGE_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(dec, enc, ydoc, 'remote-ws');
        if (encoding.length(enc) > 1 && socket.readyState === socket.OPEN) {
          socket.send(encoding.toUint8Array(enc));
        }
      } else if (msgType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(dec),
          'remote-ws'
        );
      }
    };

    socket.onerror = () => {
      if (!destroyed && status !== 'connected') {
        updateStatus('auth_error', 'WebSocket handshake rejected or endpoint unreachable.');
      }
    };

    socket.onclose = (ev) => {
      ws = null;
      if (destroyed) return;
      if (ev.code === 1008 || ev.code === 1003) {
        updateStatus('auth_error', ev.reason || 'Collaboration session closed.');
        return;
      }
      updateStatus('offline_queue', 'Connection closed; buffering CRDT updates locally.');
      reconnectTimer = setTimeout(() => {
        if (!destroyed) connectSocket();
      }, 1500);
    };
  };

  connectSocket();

  return {
    ydoc,
    ytext,
    getStatus: () => status,
    applyLocalText: (nextText: string) => {
      if (nextText === ytext.toString()) return;
      ydoc.transact(() => {
        if (ytext.length > 0) ytext.delete(0, ytext.length);
        if (nextText.length > 0) ytext.insert(0, nextText);
      }, 'local-editor');
    },
    disconnect: () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      ws = null;
      updateStatus('offline_queue', 'Paused by user; edits preserved in local Y.Doc.');
    },
    destroy: () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      monacoBinding?.destroy();
      ws?.close();
      awareness.destroy();
      ydoc.destroy();
    },
  };
}
