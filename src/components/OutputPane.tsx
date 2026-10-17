import React, { useState } from 'react';
import { Terminal, Copy, Check, Trash2, AlertCircle, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { ExecutionResult, ExecutionState } from '../types/execution';

export interface OutputPaneProps {
  readonly executionState: ExecutionState;
  readonly onClear: () => void;
}

export function OutputPane({
  executionState,
  onClear,
}: OutputPaneProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stdout' | 'stderr'>('all');

  const isRunning = executionState.kind === 'running';
  const result: ExecutionResult | null =
    executionState.kind === 'completed' ? executionState.result : null;
  const executionError =
    executionState.kind === 'failed' ? executionState.error : null;

  const stdout = result?.stdout ?? '';
  const stderr = result?.stderr ?? (executionError?.message ?? '');
  const exitCode = result?.exitCode ?? (executionError ? 1 : null);
  const durationMs = result?.durationMs;
  const isSimulated = result?.simulated ?? false;
  const isVerified = result?.verified ?? false;

  const handleCopy = () => {
    const textToCopy = [
      stdout ? `--- STDOUT ---\n${stdout}` : '',
      stderr ? `--- STDERR ---\n${stderr}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-pane="output"
      className="flex flex-col h-full bg-[#0d131f] text-slate-200 select-text overflow-hidden"
      aria-label="Output Console Panel"
      role="region"
    >
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#090d15] border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Output Console</span>
          </div>

          {/* Stream Filter Buttons */}
          <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-neutral-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stdout')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'stdout'
                  ? 'bg-neutral-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              stdout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stderr')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'stderr'
                  ? 'bg-neutral-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              stderr
            </button>
          </div>
        </div>

        {/* Console Action Controls & Metadata */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {durationMs !== undefined && (
            <span className="flex items-center gap-1 tabular-nums font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{durationMs}ms</span>
            </span>
          )}

          {exitCode !== null && (
            <span
              className={`tabular-nums font-mono font-medium ${
                exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              exit {exitCode}
            </span>
          )}

          <div className="flex items-center gap-1 pl-2 border-l border-neutral-800">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!stdout && !stderr}
              title="Copy console output"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClear}
              title="Clear console"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Verification / Simulator Status Badges */}
      {isSimulated && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/60 border-b border-amber-800/80 text-amber-300 text-xs font-sans font-medium"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            ⚠ SIMULATED: Kimina Lean Server container not connected. Response is simulated for development.
          </span>
        </div>
      )}

      {isVerified && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border-b border-emerald-800/80 text-emerald-300 text-xs font-sans font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ FORMALLY VERIFIED: Proof complete without sorry or errors.</span>
        </div>
      )}

      {/* Console Content Stream */}
      <div
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-2 select-text"
        aria-live="polite"
      >
        {isRunning ? (
          <div className="flex items-center gap-2 text-blue-400 py-4 font-sans">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span>Executing code in sandboxed environment...</span>
          </div>
        ) : !stdout && !stderr ? (
          <div className="text-slate-500 py-6 text-center font-sans">
            Console output will appear here after clicking Run (<kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-[10px]">Ctrl+Enter</kbd>).
          </div>
        ) : (
          <>
            {/* Stdout view */}
            {(activeTab === 'all' || activeTab === 'stdout') && stdout && (
              <div data-testid="stdout-view" className="text-slate-200 whitespace-pre-wrap">
                {stdout}
              </div>
            )}

            {/* Stderr view */}
            {(activeTab === 'all' || activeTab === 'stderr') && stderr && (
              <div
                data-testid="stderr-view"
                className="text-rose-400 whitespace-pre-wrap p-2 rounded bg-rose-950/20 border border-rose-900/40"
              >
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold mb-1 text-[11px] font-sans">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Standard Error / Traceback</span>
                </div>
                {stderr}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
