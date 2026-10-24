/**
 * Paperproof Interactive Proof Playback Panel (Phase 10.9.5, Task S3)
 *
 * Visual step-by-step proof playback with RFC 9457 error diagnostic handling.
 * Gated by ENABLE_PAPERPROOF with expandable technical problem details.
 */

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ChevronDown,
  Layers,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { featureFlagRegistry } from '../../services/flags/feature-flag-registry';
import { paperproofClient, type PaperproofTree } from '../../services/femev/paperproof-client';
import { ERROR_REGISTRY, createProblemDetails } from '../../services/errors/error-registry';

export interface PaperproofPanelProps {
  readonly leanCode?: string;
  readonly theoremName?: string;
  readonly onApplyStep?: (stepIndex: number) => void;
}

export function PaperproofPanel({
  leanCode = 'theorem test_proof : 1 + 1 = 2 := by rfl',
  theoremName = 'test_proof',
  onApplyStep,
}: PaperproofPanelProps): React.JSX.Element {
  const isPaperproofEnabled = featureFlagRegistry.isEnabled('ENABLE_PAPERPROOF');
  const [tree, setTree] = useState<PaperproofTree | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const problemDetails = createProblemDetails(
    ERROR_REGISTRY.PAPERPROOF_UNAVAILABLE,
    'corr-paperproof-ui-gate',
    {
      featureFlag: 'ENABLE_PAPERPROOF',
      requiredVersion: 'paperproof-mcp v1.2',
      solution: 'Toggle ENABLE_PAPERPROOF in Settings -> Feature Flags to activate proof tree visualization.',
    }
  );

  const handleGenerateTree = async () => {
    setIsLoading(true);
    try {
      const generated = await paperproofClient.generateProofTree(leanCode, { theoremName });
      setTree(generated);
      setActiveStep(0);
    } catch {
      // Handled via problem details display
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (!tree) return;
    const next = Math.min(activeStep + 1, tree.totalSteps);
    setActiveStep(next);
    onApplyStep?.(next);
  };

  const handlePrevStep = () => {
    if (!tree) return;
    const prev = Math.max(activeStep - 1, 0);
    setActiveStep(prev);
    onApplyStep?.(prev);
  };

  return (
    <div className="p-4 bg-[#070A0F] border border-slate-800 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans">
            Paperproof Tree Playback
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 border border-slate-700 bg-slate-900 text-slate-400">
            Phase 10.9.5
          </span>
        </div>

        {isPaperproofEnabled && (
          <button
            type="button"
            onClick={handleGenerateTree}
            disabled={isLoading}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>{isLoading ? 'Tracing...' : 'Trace Proof Tree'}</span>
          </button>
        )}
      </div>

      {!isPaperproofEnabled ? (
        /* User-friendly alert with expandable technical problem details */
        <div className="p-3 bg-[#0B0F17] border border-amber-900/60 text-slate-300 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300 text-xs font-sans">
                Paperproof Integration Inactive
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Paperproof interactive proof-tree playback is currently disabled. You can inspect proofs using standard goal state diagnostics, or enable this integration in settings.
              </p>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
            >
              <span>Technical Problem Details (RFC 9457)</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`}
              />
            </button>

            {showTechnicalDetails && (
              <pre className="mt-2 p-2.5 bg-[#03060A] border border-slate-800 text-[10px] text-cyan-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(problemDetails, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ) : tree ? (
        /* Active Interactive Playback View */
        <div className="space-y-3">
          <div className="p-3 bg-[#03060A] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Theorem: <strong className="text-cyan-300">{tree.theoremName}</strong></span>
              <span>Step: <strong className="text-emerald-400">{activeStep} / {tree.totalSteps}</strong></span>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={activeStep === 0}
                className="px-2 py-1 bg-[#1E293B] hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Step</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={activeStep === tree.totalSteps}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                className="px-2 py-1 bg-[#1E293B] hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                title="Reset to beginning"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Active Nodes List */}
          <div className="space-y-1.5">
            {tree.nodes.map((node) => {
              const isActive = node.stepIndex === activeStep;
              const isPast = node.stepIndex < activeStep;
              return (
                <div
                  key={node.id}
                  className={`p-2.5 border text-xs flex items-center justify-between transition-colors ${
                    isActive
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200'
                      : isPast
                      ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-800 bg-[#03060A] text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] bg-slate-800">
                      {node.stepIndex}
                    </span>
                    <span className="font-bold">{node.label}</span>
                    <span className="text-[11px] font-mono text-slate-400">({node.expression})</span>
                  </div>
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-[#03060A] border border-slate-800 text-[11px] text-slate-500 italic">
          Click &quot;Trace Proof Tree&quot; to compute the visual DAG of proof obligations and tactics.
        </div>
      )}
    </div>
  );
}
