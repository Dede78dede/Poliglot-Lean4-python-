import React from 'react';
import { ChevronLeft, ChevronRight, Eye, RotateCcw, X, Check } from 'lucide-react';
import type { CodeExample } from '../examples/example-registry';

export interface GuidedPathBarProps {
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly currentExample: CodeExample;
  readonly showingSolution: boolean;
  readonly onToggleSolution: () => void;
  readonly onResetStep: () => void;
  readonly onPrevStep: () => void;
  readonly onNextStep: () => void;
  readonly onExitGuide: () => void;
  readonly isVerified: boolean;
}

export function GuidedPathBar({
  currentStepIndex,
  totalSteps,
  currentExample,
  showingSolution,
  onToggleSolution,
  onResetStep,
  onPrevStep,
  onNextStep,
  onExitGuide,
  isVerified,
}: GuidedPathBarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0f172a] border-b border-blue-900/50 text-xs text-slate-200">
      {/* Step Badge & Title */}
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold font-mono text-[11px]">
          Step {currentStepIndex + 1} / {totalSteps}
        </span>
        <div className="flex flex-col">
          <span className="font-semibold text-white">{currentExample.title}</span>
          <span className="text-[11px] text-slate-400">{currentExample.description}</span>
        </div>
      </div>

      {/* Guided Path Controls */}
      <div className="flex items-center gap-2">
        {/* Verification Status */}
        {isVerified && (
          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium mr-2">
            <Check className="w-3.5 h-3.5" />
            <span>Passed</span>
          </span>
        )}

        {/* Show Solution Toggle */}
        {currentExample.solution && (
          <button
            type="button"
            onClick={onToggleSolution}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              showingSolution
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showingSolution ? 'Hide Solution' : 'Show Solution'}</span>
          </button>
        )}

        {/* Reset Code */}
        <button
          type="button"
          onClick={onResetStep}
          title="Reset to initial template"
          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Previous Step */}
        <button
          type="button"
          onClick={onPrevStep}
          disabled={currentStepIndex === 0}
          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Next Step */}
        <button
          type="button"
          onClick={onNextStep}
          disabled={currentStepIndex >= totalSteps - 1}
          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-slate-300 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Exit Guided Path */}
        <button
          type="button"
          onClick={onExitGuide}
          title="Exit guided path"
          className="p-1.5 rounded bg-neutral-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-neutral-800 transition-colors ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
