import React, { useSyncExternalStore } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { trashService, type TrashItem } from '../../services/files/trash-service';
import { useProjectContext } from '../../context/ProjectContext';

export function TrashView(): React.JSX.Element {
  const items = useSyncExternalStore(
    trashService.subscribe,
    trashService.getSnapshot,
  );
  const { createFile } = useProjectContext();

  const handleRestore = (item: TrashItem) => {
    try {
      const restored = trashService.restoreFromTrash(item.id);
      void createFile(restored.originalPath, restored.content);
    } catch {
      // Error handling handled by trashService/store
    }
  };

  const handleEmpty = () => {
    if (items.length === 0) return;
    if (confirm(`Empty trash? This will permanently delete ${items.length} items.`)) {
      trashService.emptyTrash();
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div
      role="region"
      aria-label="Trash"
      className="flex flex-col h-full bg-[#090d15] text-slate-300 text-xs select-none overflow-hidden w-full font-sans"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#06090e] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Trash ({items.length})</span>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleEmpty}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-medium transition-colors border border-rose-800"
          >
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center px-4">
            <CheckCircle className="w-8 h-8 mb-2 text-slate-600" />
            <p className="text-xs font-medium">Trash is empty</p>
            <p className="text-[11px] text-slate-600 mt-1">Deleted files will appear here before permanent deletion</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded bg-neutral-900/50 hover:bg-neutral-850/80 border border-neutral-800/60 transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-slate-200 truncate font-medium">
                    {item.originalPath}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{formatSize(item.sizeBytes)}</span>
                    <span>•</span>
                    <span>{formatDate(item.deletedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRestore(item)}
                  title={`Restore ${item.originalPath}`}
                  aria-label={`Restore ${item.originalPath}`}
                  className="p-1 rounded text-blue-400 hover:text-white hover:bg-blue-600/40 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => trashService.deletePermanently(item.id)}
                  title={`Delete permanently`}
                  aria-label={`Delete ${item.originalPath} permanently`}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
