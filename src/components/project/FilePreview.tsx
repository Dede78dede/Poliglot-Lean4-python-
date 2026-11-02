import React from 'react';
import { FileCode, FileText, X, Info } from 'lucide-react';
import { previewService } from '../../services/files/preview-service';

export interface FilePreviewProps {
  readonly path: string;
  readonly content: string;
  readonly onClose: () => void;
}

export function FilePreview({
  path,
  content,
  onClose,
}: FilePreviewProps): React.JSX.Element {
  const info = previewService.resolveFileInfo(path, content);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const previewSnippet = content.slice(0, 1500);

  return (
    <div
      role="region"
      aria-label={`Preview of ${info.name}`}
      className="flex flex-col h-full bg-[#0d1117] text-slate-300 text-xs overflow-hidden border-l border-neutral-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#090d15] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate">File Info: {info.name}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Preview"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata grid */}
      <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Path:</span>
          <span className="text-slate-200 truncate max-w-[200px]">{info.path}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Size:</span>
          <span className="text-slate-200">{formatSize(info.sizeBytes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Lines:</span>
          <span className="text-slate-200">{info.lineCount ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Format:</span>
          <span className="text-slate-200 uppercase">{info.extension.replace('.', '') || 'TEXT'}</span>
        </div>
      </div>

      {/* Code preview snippet */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-slate-300 bg-[#070b12] whitespace-pre select-text">
        {previewSnippet}
        {content.length > 1500 && (
          <div className="text-slate-500 italic mt-2">
            ... [{(content.length - 1500)} more characters truncated for preview]
          </div>
        )}
      </div>
    </div>
  );
}
