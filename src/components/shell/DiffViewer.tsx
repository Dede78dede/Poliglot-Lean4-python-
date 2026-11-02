import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, Columns2, Rows2, GitCompare } from 'lucide-react';

export interface DiffViewerProps {
  readonly original: string;
  readonly modified: string;
  readonly language: string;
  readonly originalTitle?: string;
  readonly modifiedTitle?: string;
  readonly onApplyModified?: (code: string) => void;
  readonly onRevertToOriginal?: (code: string) => void;
  readonly onClose?: () => void;
}

export function DiffViewer({
  original,
  modified,
  language,
  originalTitle = 'Original (Disk)',
  modifiedTitle = 'Modified (Working Copy)',
  onApplyModified,
  onRevertToOriginal,
  onClose,
}: DiffViewerProps): React.JSX.Element {
  const [isSideBySide, setIsSideBySide] = useState(true);

  // Simple line diff stats for summary header
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const lineDelta = modifiedLines.length - originalLines.length;

  return (
    <div
      role="region"
      aria-label="Diff Viewer"
      className="flex flex-col w-full h-full bg-[#0d1117] overflow-hidden"
    >
      {/* Top action toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090d15] border-b border-neutral-800 text-xs font-mono text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">Diff Viewer</span>
          <span className="text-[11px] text-slate-500">
            {originalTitle} ↔ {modifiedTitle}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              lineDelta >= 0
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {lineDelta >= 0 ? `+${lineDelta} lines` : `${lineDelta} lines`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle side-by-side vs inline */}
          <button
            type="button"
            onClick={() => setIsSideBySide((v) => !v)}
            title={isSideBySide ? 'Switch to Inline Diff' : 'Switch to Side-by-Side Diff'}
            aria-label="Toggle diff layout"
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-slate-300 text-xs transition-colors border border-neutral-800"
          >
            {isSideBySide ? (
              <>
                <Rows2 className="w-3.5 h-3.5" />
                <span>Inline</span>
              </>
            ) : (
              <>
                <Columns2 className="w-3.5 h-3.5" />
                <span>Side by Side</span>
              </>
            )}
          </button>

          {/* Accept / Apply Modified */}
          {onApplyModified && (
            <button
              type="button"
              onClick={() => onApplyModified(modified)}
              title="Apply all changes to working copy"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          )}

          {/* Revert to Original */}
          {onRevertToOriginal && (
            <button
              type="button"
              onClick={() => onRevertToOriginal(original)}
              title="Discard changes and revert to original"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs transition-colors"
            >
              <span>Revert</span>
            </button>
          )}

          {/* Close Diff View */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Diff"
              aria-label="Close Diff"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Monaco DiffEditor */}
      <div className="flex-1 relative overflow-hidden">
        <DiffEditor
          height="100%"
          width="100%"
          language={language === 'lean4' ? 'lean4' : 'python'}
          original={original}
          modified={modified}
          theme="vs-dark"
          options={{
            readOnly: false,
            renderSideBySide: isSideBySide,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            smoothScrolling: true,
            renderIndicators: true,
          }}
        />
      </div>
    </div>
  );
}
