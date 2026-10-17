import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Database,
  Cpu,
  Layers,
  HardDrive,
  Archive,
  RefreshCw,
  Trash2,
  DownloadCloud,
  CheckCircle2,
  Clock,
  Shield,
  Sparkles,
} from 'lucide-react';
import { memoryManager } from '../../services/memory/MemoryManager';
import type { ColdStorageMetadata, FiveTierStatus } from '../../types/memory';
import type { Project } from '../../types/projects';

export interface FiveTierMemoryDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentProject: Project | null;
  readonly onRestoreProject: (project: Project) => void;
}

export function FiveTierMemoryDrawer({
  isOpen,
  onClose,
  currentProject,
  onRestoreProject,
}: FiveTierMemoryDrawerProps): React.JSX.Element | null {
  const [status, setStatus] = useState<FiveTierStatus | null>(null);
  const [snapshots, setSnapshots] = useState<readonly ColdStorageMetadata[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    const s = await memoryManager.getOverallStatus();
    setStatus(s);
    const snaps = await memoryManager.listColdSnapshots();
    setSnapshots(snaps);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void refreshMetrics();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, refreshMetrics]);

  if (!isOpen) return null;

  const handleClearTier1 = () => {
    memoryManager.clearTier1Cache();
    void refreshMetrics();
    setFeedbackMessage('Cache AST Tier 1 svuotata con successo.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleArchiveCurrent = async () => {
    if (!currentProject) return;
    setIsArchiving(true);
    try {
      const meta = await memoryManager.archiveToColdStorage(currentProject);
      await refreshMetrics();
      const dedupMsg = meta.isDeduplicated
        ? ' (Deduplicazione SHA-256 applicata: hash identico già archiviato, 0 byte ridondanti)'
        : '';
      setFeedbackMessage(
        `Snapshot "${meta.projectName}" archiviato in Cold Storage! Ratio: ${meta.compressionRatio}%${dedupMsg}`,
      );
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: unknown) {
      setFeedbackMessage(
        `Errore archiviazione: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    try {
      const restored = await memoryManager.restoreFromColdStorage(snapshotId);
      onRestoreProject(restored);
      onClose();
    } catch (err: unknown) {
      setFeedbackMessage(`Errore ripristino: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const t1Mb = status
    ? (status.tier1AstCache.totalBytes / (1024 * 1024)).toFixed(2)
    : '0.00';
  const t5SavingsKb = status
    ? (status.tier5ColdStorage.deduplicatedSavingsBytes / 1024).toFixed(1)
    : '0.0';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d121c] border border-neutral-800 rounded-xl shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090d15]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800/80 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="memory-drawer-title" className="text-base font-bold text-white tracking-tight">
                Architettura di Memoria a 5 Livelli & Cold Storage
              </h2>
              <p className="text-xs text-neutral-400">
                L1 AST Cache, Interactive Buffer, Offline IndexedDB, Server Workspace e Cold Storage con Deduplicazione SHA-256
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-indigo-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090d15]/50">
          {/* Grid of the 5 Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* TIER 1 */}
            <div className="p-4 rounded-xl bg-[#0e1420] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Tier 1: AST & Diagnostics
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-800/70 text-blue-300 font-mono">
                  L1 In-Memory
                </span>
              </div>
              <div className="space-y-1 text-xs text-neutral-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Memoria usata:</span>
                  <span className="text-white">{t1Mb} / 50 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Voci in cache:</span>
                  <span className="text-white">{status?.tier1AstCache.entries ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Hit Rate:</span>
                  <span className="text-emerald-400">
                    {((status?.tier1AstCache.hitRate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearTier1}
                className="w-full mt-2 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Svuota Cache AST</span>
              </button>
            </div>

            {/* TIER 2 */}
            <div className="p-4 rounded-xl bg-[#0e1420] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Tier 2: Interactive Buffer
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 font-mono">
                  Monaco Models
                </span>
              </div>
              <div className="space-y-1 text-xs text-neutral-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">File non salvati:</span>
                  <span className={status?.tier2InteractiveBuffer.dirtyFilesCount ? 'text-amber-400' : 'text-emerald-400'}>
                    {status?.tier2InteractiveBuffer.dirtyFilesCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Debounce sincronizzazione:</span>
                  <span className="text-white">300 ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Stato sync:</span>
                  <span className="text-neutral-400">Reattivo (verso Tier 3)</span>
                </div>
              </div>
            </div>

            {/* TIER 3 */}
            <div className="p-4 rounded-xl bg-[#0e1420] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Tier 3: Client Store
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/70 text-cyan-300 font-mono">
                  IndexedDB
                </span>
              </div>
              <div className="space-y-1 text-xs text-neutral-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Progetti persistiti:</span>
                  <span className="text-white">{status?.tier3ClientStore.projectCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">File totali:</span>
                  <span className="text-white">{status?.tier3ClientStore.totalFiles ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Modalità:</span>
                  <span className="text-emerald-400">Offline-First VFS</span>
                </div>
              </div>
            </div>

            {/* TIER 4 */}
            <div className="p-4 rounded-xl bg-[#0e1420] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Tier 4: Server Workspace
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-800/70 text-purple-300 font-mono">
                  /projects_store
                </span>
              </div>
              <div className="space-y-1 text-xs text-neutral-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">TTL Sessione:</span>
                  <span className="text-white">72 ore</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Quota sessione:</span>
                  <span className="text-white">500 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Session Pinning:</span>
                  <span className="text-purple-300">Supportato (Immunità TTL)</span>
                </div>
              </div>
            </div>

            {/* TIER 5 SUMMARY */}
            <div className="p-4 rounded-xl bg-[#0e1420] border border-neutral-800 space-y-2.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5" /> Tier 5: Cold Storage Deduplicato
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/70 text-amber-300 font-mono">
                  tar.gz / fflate + SHA-256
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Snapshot totali:</span>
                  <span className="text-white font-semibold text-sm">
                    {status?.tier5ColdStorage.snapshotCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Hash univoci SHA-256:</span>
                  <span className="text-cyan-400 font-semibold text-sm">
                    {status?.tier5ColdStorage.uniqueHashesCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Risparmio da Deduplicazione:</span>
                  <span className="text-emerald-400 font-semibold text-sm">
                    {t5SavingsKb} KB
                  </span>
                </div>
              </div>
              {currentProject && (
                <button
                  type="button"
                  disabled={isArchiving}
                  onClick={handleArchiveCurrent}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>
                    {isArchiving
                      ? 'Compressione e deduplicazione in corso...'
                      : `Archivia "${currentProject.name}" in Cold Storage`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Snapshot Archive List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>Archivio Snapshot Cold Storage (Tier 5)</span>
              </h3>
              <span className="text-[11px] text-neutral-500 font-mono">
                {snapshots.length} snapshot salvati
              </span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#0e1420] border border-neutral-800 text-xs text-neutral-400">
                Nessun progetto archiviato in Cold Storage. Clicca &quot;Archivia&quot; sopra per generare un archivio compresso e deduplicato via SHA-256.
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 rounded-xl bg-[#0e1420] border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{snap.projectName}</span>
                        {snap.isDeduplicated && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300 font-mono">
                            Deduplicato (SHA-256 match)
                          </span>
                        )}
                        {snap.isPinned && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-[10px] text-blue-300 font-mono">
                            Pinned
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono">
                        <span>SHA: {snap.contentSha256.slice(0, 12)}...</span>
                        <span>Compressione: {snap.compressionRatio}%</span>
                        <span>Dimensione: {(snap.compressedSizeBytes / 1024).toFixed(1)} KB</span>
                        <span>File: {snap.fileCount}</span>
                        <span className="flex items-center gap-1 text-neutral-500">
                          <Clock className="w-3 h-3" />
                          {new Date(snap.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestore(snap.id)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-slate-200 transition-colors shrink-0 self-end sm:self-center"
                    >
                      Ripristina nel Workspace
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#090d15] flex items-center justify-between text-xs text-neutral-500">
          <div>
            Architettura: <span className="font-mono text-neutral-300">Tier 1 L1 LRU ➔ Tier 2 Buffer ➔ Tier 3 IndexedDB ➔ Tier 4 Server ➔ Tier 5 Cold Storage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-200 transition-colors font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
