import React from 'react';
import { Archive, AlertTriangle, CheckCircle, FileCode, X } from 'lucide-react';
import type { ArchivePreviewResult } from '../../services/files/archive-service';

export interface ArchiveDialogProps {
  readonly isOpen: boolean;
  readonly fileName: string;
  readonly preview: ArchivePreviewResult | null;
  readonly onExtract: () => void;
  readonly onClose: () => void;
}

export function ArchiveDialog({
  isOpen,
  fileName,
  preview,
  onExtract,
  onClose,
}: ArchiveDialogProps): React.JSX.Element | null {
  if (!isOpen || !preview) return null;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasErrors = !preview.valid || preview.errors.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
    >
      <div className="flex flex-col bg-[#0f172a] border border-neutral-700 rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#090d15] border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-400" />
            <h2 id="archive-dialog-title" className="font-semibold text-slate-100 text-sm">
              Archive Preview: {fileName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-900/60 border-b border-neutral-800 text-center font-mono text-[11px]">
          <div className="p-2 rounded bg-neutral-800/50">
            <div className="text-slate-400 text-[10px]">Files</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">{preview.entries.length}</div>
          </div>
          <div className="p-2 rounded bg-neutral-800/50">
            <div className="text-slate-400 text-[10px]">Uncompressed</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">{formatSize(preview.totalUncompressedSize)}</div>
          </div>
          <div className="p-2 rounded bg-neutral-800/50">
            <div className="text-slate-400 text-[10px]">Ratio</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">{preview.compressionRatio}:1</div>
          </div>
        </div>

        {/* Security Warning banner if errors */}
        {hasErrors && (
          <div className="p-3 bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Security / Validation Warning:</div>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                {preview.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Archive file tree entries */}
        <div className="flex-1 overflow-y-auto p-3 max-h-[300px] space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 mb-1">Archive Contents:</div>
          {preview.entries.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-neutral-800/40 text-[11px] font-mono text-slate-300"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{entry.path}</span>
              </div>
              <span className="text-slate-500 shrink-0 ml-2">{formatSize(entry.uncompressedSize)}</span>
            </div>
          ))}
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#090d15] border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExtract}
            disabled={!preview.valid}
            className={`px-3 py-1.5 rounded text-white font-medium transition-colors ${
              preview.valid
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-neutral-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Extract to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
