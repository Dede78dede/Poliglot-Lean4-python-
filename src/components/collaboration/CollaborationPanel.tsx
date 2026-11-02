/**
 * Collaboration Status Panel (Phase 11.2, Sprint 11.2.5)
 *
 * Displays Yjs CRDT real-time synchronization state, connected peers,
 * awareness cursors, and local snapshot persistence status.
 */

import React, { useState } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  Save,
  ShieldAlert,
  Radio,
  FileCode,
} from 'lucide-react';
import { featureFlagRegistry } from '../../services/flags/feature-flag-registry';
import { Y_MONACO_PINNED_VERSION } from '../../services/collaboration/monaco-yjs-adapter';

export interface CollaborationPanelProps {
  readonly activeDocId?: string;
  readonly isConnected?: boolean;
}

export function CollaborationPanel({
  activeDocId = 'Main.lean',
  isConnected = false,
}: CollaborationPanelProps): React.JSX.Element {
  const isEnabled = featureFlagRegistry.isEnabled('ENABLE_YJS_COLLABORATION');
  const [roomId, setRoomId] = useState('polyglot-default-room');

  return (
    <div className="flex flex-col h-full p-4 bg-slate-900 text-slate-100 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold">Real-Time CRDT Collaboration</h2>
        </div>
        <div className="flex items-center space-x-1.5 text-xs">
          {isEnabled ? (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded bg-slate-800/60 border border-slate-700/60 text-xs flex items-start space-x-2 text-slate-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Epistemic Barrier:</strong> Collaborative co-editing shares buffer text. Co-authors cannot bypass Lean 4 kernel validation (Tier 5 seal required).
        </span>
      </div>

      {!isEnabled ? (
        <div className="mt-6 p-4 rounded bg-slate-800/40 border border-slate-800 text-center">
          <WifiOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400">
            Real-time CRDT collaboration is disabled by default.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Enable <code className="text-indigo-400 font-mono">ENABLE_YJS_COLLABORATION=true</code> in settings or environment to activate peer synchronization.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col space-y-4 text-xs">
          <div className="p-3 rounded bg-slate-800 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Document:</span>
              <span className="font-mono text-indigo-300 flex items-center space-x-1">
                <FileCode className="w-3.5 h-3.5" />
                <span>{activeDocId}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Room Identifier:</span>
              <span className="font-mono text-slate-200">{roomId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Adapter Version:</span>
              <span className="font-mono text-slate-400">y-monaco v{Y_MONACO_PINNED_VERSION}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Snapshot Persistence:</span>
              <span className="font-mono text-emerald-400 flex items-center space-x-1">
                <Save className="w-3 h-3" />
                <span>.collab/{activeDocId}.yjs</span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-800/60 border border-slate-700/60">
            <h3 className="font-medium text-slate-300 mb-2">Connected Peers (1)</h3>
            <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200 font-medium">You (Local Editor)</span>
              </div>
              <span className="text-[11px] text-slate-500">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
