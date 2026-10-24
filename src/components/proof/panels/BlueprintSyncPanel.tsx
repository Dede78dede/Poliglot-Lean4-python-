import React, { useState, useCallback } from 'react';
import { RefreshCw, RotateCw, AlertTriangle } from 'lucide-react';
import type { SupportedLanguage } from '../../../types/language';
import type { BlueprintSyncResult } from '../../../types/proof-automation';
import { proofAutomationClient } from '../../../services/proof/proof-automation-client';

export interface BlueprintSyncPanelProps {
  readonly currentCode: string;
  readonly language: SupportedLanguage;
  readonly currentWorkspaceId?: string;
  readonly onApplyCode: (newCode: string) => void;
}

export type SyncMode = 'reconcile' | 'push' | 'extract';

export const BlueprintSyncPanel: React.FC<BlueprintSyncPanelProps> = ({
  currentCode,
  language,
  currentWorkspaceId = 'ws-liquid-tensor',
  onApplyCode,
}) => {
  const [syncMode, setSyncMode] = useState<SyncMode>('reconcile');
  const [syncResult, setSyncResult] = useState<BlueprintSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleRunSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await proofAutomationClient.syncBlueprint(currentWorkspaceId, {
        mode: syncMode,
        files: [
          {
            path: language === 'python' ? 'verification/test_witness.py' : 'Main.lean',
            content: currentCode,
          },
        ],
      });
      setSyncResult(res);
    } catch (err: any) {
      setSyncError(err.message || 'Blueprint sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [currentWorkspaceId, syncMode, language, currentCode]);

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex border border-slate-800 rounded bg-[#0a0d14] p-1 gap-1">
        <button
          type="button"
          onClick={() => setSyncMode('reconcile')}
          className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
            syncMode === 'reconcile'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Reconcile Drift
        </button>
        <button
          type="button"
          onClick={() => setSyncMode('push')}
          className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
            syncMode === 'push'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Generate Lean Stubs
        </button>
        <button
          type="button"
          onClick={() => setSyncMode('extract')}
          className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
            syncMode === 'extract'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Extract DAG
        </button>
      </div>

      {/* Description & Action */}
      <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
        <div className="text-slate-400 text-xs">
          {syncMode === 'reconcile' &&
            'Detects architectural drift between the active editor buffer and the Archon Horizon blueprint DAG.'}
          {syncMode === 'push' &&
            'Emits formal Lean 4 stubs with sorry for unproven nodes while strictly preserving frozen or verified nodes.'}
          {syncMode === 'extract' &&
            'Re-parses the source tree to derive updated nodes, signatures, and dependencies.'}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRunSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
          >
            {isSyncing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {isSyncing ? 'Synchronizing...' : 'Execute Sync'}
          </button>
        </div>
      </div>

      {/* Error View */}
      {syncError && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="font-mono text-[11px]">{syncError}</div>
        </div>
      )}

      {/* Sync Results */}
      {syncResult && (
        <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Sync Report ({syncResult.mode})</span>
            <span className="font-mono text-slate-400">{syncResult.timeMs}ms</span>
          </div>

          {syncResult.mode === 'reconcile' && (
            <div className="space-y-2">
              <div
                className={`p-2.5 rounded font-mono text-xs ${
                  syncResult.driftDetected
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
                }`}
              >
                {syncResult.driftDetected
                  ? `Drift Detected: ${syncResult.discrepancies?.length} discrepancies found`
                  : 'Clean: Source code and Blueprint DAG are fully synchronized'}
              </div>

              {syncResult.discrepancies && syncResult.discrepancies.length > 0 && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto font-mono text-[11px]">
                  {syncResult.discrepancies.map((d, idx) => (
                    <div key={idx} className="p-2 bg-[#07090e] border border-slate-800 rounded space-y-0.5">
                      <div className="text-cyan-400 font-semibold">{d.id} ({d.type})</div>
                      <div className="text-slate-400">{d.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {syncResult.mode === 'push' && syncResult.generatedStubs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Skipped {syncResult.skippedFrozenNodes?.length || 0} frozen nodes</span>
                <button
                  type="button"
                  onClick={() => onApplyCode(syncResult.generatedStubs!)}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Append Stubs to Buffer
                </button>
              </div>
              <pre className="p-3 bg-[#07090e] border border-slate-800 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-52">
                {syncResult.generatedStubs}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
