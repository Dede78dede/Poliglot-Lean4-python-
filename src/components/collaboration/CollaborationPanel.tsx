/**
 * Collaboration Panel (Phase 11.2 & Phase 15 Wave 4)
 *
 * Real-time Yjs CRDT synchronization drawer for the Polyglot Code Studio editor:
 * - Room ID & token inputs (fail-closed server WebSocket handshake at /collab)
 * - Connect / Disconnect lifecycle wired directly to MonacoYjsAdapter.connectSession
 * - Explicit status state: Disabled / Connecting / Connected · N peers / Offline Queue / Auth Error
 * - Epistemic barrier reminder: collaborative buffer edits never certify proofs.
 */

import React, { useState, useEffect, useRef } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';
import Save from 'lucide-react/dist/esm/icons/save';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import FileCode from 'lucide-react/dist/esm/icons/file-code';
import { featureFlagRegistry } from '../../services/flags/feature-flag-registry';
import { useStoreSelector } from '../../services/stores/use-store-selector';
import {
  MonacoYjsAdapter,
  Y_MONACO_PINNED_VERSION,
} from '../../services/collaboration/monaco-yjs-adapter';
import type {
  CollabConnectionStatus,
  LiveCollabPeer,
  LiveCollabSession,
} from '../../services/collaboration/yjs-runtime';

export interface CollaborationPanelProps {
  readonly activeDocId?: string;
  readonly bufferContent?: string;
  readonly onRemoteBufferChange?: (nextContent: string) => void;
}

export function CollaborationPanel({
  activeDocId = 'Main.lean',
  bufferContent = '',
  onRemoteBufferChange,
}: CollaborationPanelProps): React.JSX.Element {
  const isEnabled = useStoreSelector(
    featureFlagRegistry,
    (flags) => Boolean(flags.ENABLE_YJS_COLLABORATION)
  );

  const [roomId, setRoomId] = useState(activeDocId);
  const [token, setToken] = useState('polyglot-collab-token-default');
  const [userName, setUserName] = useState('Researcher');
  const [status, setStatus] = useState<CollabConnectionStatus>(
    isEnabled ? 'offline_queue' : 'disabled'
  );
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [peers, setPeers] = useState<readonly LiveCollabPeer[]>([]);
  const sessionRef = useRef<LiveCollabSession | null>(null);

  useEffect(() => {
    setRoomId(activeDocId);
  }, [activeDocId]);

  // Propagate local editor buffer mutations into connected Y.Doc session
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.applyLocalText(bufferContent);
    }
  }, [bufferContent]);

  useEffect(() => {
    if (!isEnabled) {
      sessionRef.current?.destroy();
      sessionRef.current = null;
      setPeers([]);
      setStatus('disabled');
      setStatusDetail(null);
    } else if (status === 'disabled') {
      setStatus('offline_queue');
    }
  }, [isEnabled, status]);

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const handleConnect = async () => {
    if (!isEnabled) return;
    sessionRef.current?.destroy();
    setStatus('connecting');
    setStatusDetail(null);

    const protocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? 'wss:'
        : 'ws:';
    const host =
      typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsBaseUrl = `${protocol}//${host}/collab`;

    try {
      const session = await MonacoYjsAdapter.connectSession({
        wsBaseUrl,
        roomId: roomId.trim() || activeDocId,
        token: token.trim(),
        userName: userName.trim() || 'Researcher',
        initialText: bufferContent,
        onRemoteText: (nextText) => onRemoteBufferChange?.(nextText),
        onStatusChange: (next, detail) => {
          setStatus(next);
          setStatusDetail(detail ?? null);
        },
        onPeersChange: (nextPeers) => setPeers(nextPeers),
      });
      sessionRef.current = session;
    } catch (err) {
      setStatus('auth_error');
      setStatusDetail(
        err instanceof Error ? err.message : 'Unable to start collaboration session'
      );
    }
  };

  const handleDisconnect = () => {
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setPeers([]);
    setStatus(isEnabled ? 'offline_queue' : 'disabled');
    setStatusDetail('Disconnected from collaboration server.');
  };

  const renderStatusText = () => {
    switch (status) {
      case 'disabled':
        return 'Disabled';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return `Connected · ${peers.length} ${peers.length === 1 ? 'peer' : 'peers'}`;
      case 'offline_queue':
        return 'Offline Queue';
      case 'auth_error':
        return 'Auth Error';
    }
  };

  const isLiveSession = sessionRef.current !== null && (status === 'connected' || status === 'connecting');

  return (
    <div className="flex flex-col h-full p-4 bg-slate-900 text-slate-100 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-blue-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-100 truncate">
            Real-Time CRDT Collaboration
          </h2>
        </div>
        <span
          className={`text-xs font-mono tabular-nums whitespace-nowrap shrink-0 ${
            status === 'connected'
              ? 'text-emerald-400'
              : status === 'auth_error'
              ? 'text-rose-400'
              : status === 'connecting'
              ? 'text-amber-400'
              : 'text-slate-400'
          }`}
        >
          {renderStatusText()}
        </span>
      </div>

      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-2.5 text-slate-300 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Collaborative co-editing mutates shared buffer text via Yjs CRDT. Edits remain syntactic and require formal Lean 4 kernel verification (Tier 5 seal) before certification.
        </span>
      </div>

      {!isEnabled ? (
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 text-center space-y-2">
          <WifiOff className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300">
            Real-time collaboration is disabled by policy flag.
          </p>
          <p className="text-xs text-slate-500 font-mono">
            ENABLE_YJS_COLLABORATION=false
          </p>
        </div>
      ) : (
        <div className="flex flex-col space-y-4 text-xs">
          <div className="space-y-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span>Document</span>
              <span className="font-mono text-blue-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>{activeDocId}</span>
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="collab-room-input" className="block text-slate-400">
                Room Identifier
              </label>
              <input
                id="collab-room-input"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isLiveSession}
                className="w-full min-h-[40px] px-3 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="collab-name-input" className="block text-slate-400">
                Display Name
              </label>
              <input
                id="collab-name-input"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isLiveSession}
                className="w-full min-h-[40px] px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="collab-token-input" className="block text-slate-400">
                Access Token
              </label>
              <input
                id="collab-token-input"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLiveSession}
                className="w-full min-h-[40px] px-3 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            <div className="flex items-center justify-between pt-1 gap-2">
              <span className="font-mono text-slate-500 flex items-center gap-1.5 truncate">
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">.collab/{roomId || activeDocId}.yjs</span>
              </span>
              {!isLiveSession ? (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="min-h-[40px] px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="min-h-[40px] px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {statusDetail && (
              <p
                role={status === 'auth_error' ? 'alert' : 'status'}
                className={`text-xs ${
                  status === 'auth_error' ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {statusDetail}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Active Peers</span>
              <span className="font-mono tabular-nums text-slate-400">
                {peers.length} · y-monaco v{Y_MONACO_PINNED_VERSION}
              </span>
            </div>
            {peers.length === 0 ? (
              <p className="text-slate-500">No active WebSocket peers connected.</p>
            ) : (
              <ul className="divide-y divide-slate-800/80">
                {peers.map((peer) => (
                  <li
                    key={peer.clientId}
                    className="flex items-center justify-between py-1.5 text-slate-200"
                  >
                    <span>{peer.userName}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      #{peer.clientId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaborationPanel;
