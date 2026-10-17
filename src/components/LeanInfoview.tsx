import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Compass, HelpCircle } from 'lucide-react';
import type { ExecutionResult } from '../types/execution';

export interface LeanInfoviewProps {
  readonly isDegraded: boolean;
  readonly lastResult?: ExecutionResult | null;
  readonly code: string;
}

export function LeanInfoview({
  isDegraded,
  lastResult,
  code,
}: LeanInfoviewProps): React.JSX.Element {
  // Parse goals or sorry from code/output
  const hasSorry = code.includes('sorry');
  const isVerified = lastResult?.verified ?? false;

  return (
    <div
      data-pane="infoview"
      className="flex flex-col h-full bg-[#111827] text-slate-200 border-b border-neutral-800 select-text overflow-hidden"
      aria-label="Lean 4 Infoview Panel"
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d131f] border-b border-neutral-800 text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Lean 4 Infoview</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {isVerified ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Goals Closed</span>
            </span>
          ) : hasSorry ? (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Contains `sorry`</span>
            </span>
          ) : (
            <span className="text-slate-400">Proof Inspector</span>
          )}
        </div>
      </div>

      {/* Pane Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
        {/* Degraded mode explicit disclaimer if LSP failed */}
        {isDegraded && (
          <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs font-sans space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Degraded Mode: LSP Infoview Inactive</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              `lean4monaco` LSP client is not active in this browser environment. Monaco Monarch syntax highlighting is active, and proof verification runs directly through the Kimina Lean Server. Full verification details appear in the Output console below.
            </p>
          </div>
        )}

        {/* Proof State / Goals View */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans font-medium text-slate-400 uppercase tracking-wider">
            <span>Proof Goals & Hypotheses</span>
            <span className="text-[10px] text-slate-500">Live Diagnostics</span>
          </div>

          {lastResult?.verified ? (
            <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No goals — proof complete!</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-sans">
                The theorem was elaborated without `sorry` or unsatisfied obligations.
              </p>
            </div>
          ) : hasSorry ? (
            <div className="p-3 rounded bg-neutral-900 border border-neutral-700/80 space-y-2">
              <div className="text-slate-300 font-semibold flex items-center justify-between">
                <span>1 goal</span>
                <span className="text-[10px] text-amber-400 font-sans">Open Obligation</span>
              </div>
              <div className="space-y-1 text-slate-300 text-xs pl-2 border-l-2 border-blue-500">
                <div className="text-slate-400">case sorry</div>
                <div className="text-blue-300 font-semibold">⊢ Goal awaiting proof tactic</div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-2">
                Replace <code className="text-amber-300 bg-neutral-800 px-1 py-0.5 rounded">sorry</code> with tactic proof steps (e.g., <code className="text-blue-300">rfl</code>, <code className="text-blue-300">simp</code>, <code className="text-blue-300">cases</code>, <code className="text-blue-300">omega</code>).
              </p>
            </div>
          ) : lastResult?.stderr ? (
            <div className="p-3 rounded bg-rose-950/30 border border-rose-800/50 text-rose-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Elaboration Diagnostics</span>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap text-rose-200/90 font-mono">
                {lastResult.stderr}
              </pre>
            </div>
          ) : (
            <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 text-slate-400 space-y-1 font-sans">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Ready for Verification</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 bg-neutral-800 text-slate-300 rounded text-[10px] font-mono">Ctrl + Enter</kbd> to submit proof to Kimina Lean Server.
              </p>
            </div>
          )}
        </div>

        {/* Quick Tactics Cheat Sheet */}
        <div className="pt-2 border-t border-neutral-800 space-y-1.5 font-sans">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            <span>Common Core Tactics</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800/80">
              <span className="font-mono text-blue-400 font-semibold">rfl</span>
              <p className="text-slate-400 text-[10px]">Reflexivity (a = a)</p>
            </div>
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800/80">
              <span className="font-mono text-blue-400 font-semibold">simp</span>
              <p className="text-slate-400 text-[10px]">Simplification rewrites</p>
            </div>
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800/80">
              <span className="font-mono text-blue-400 font-semibold">omega</span>
              <p className="text-slate-400 text-[10px]">Presburger arithmetic</p>
            </div>
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800/80">
              <span className="font-mono text-blue-400 font-semibold">cases h</span>
              <p className="text-slate-400 text-[10px]">Inductive case split</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
