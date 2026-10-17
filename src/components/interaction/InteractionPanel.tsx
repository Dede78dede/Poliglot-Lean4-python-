import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Compass,
  Layers,
  Clock,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react';
import type {
  InteractionRequest,
  InteractionStepResult,
  PipelineExecutionPolicy,
  PipelineRunResult,
} from '../../types/interaction';
import { INTERACTION_TEMPLATES } from '../../examples/interaction-examples';
import { PipelineOrchestrator } from '../../services/interaction/pipeline-orchestrator';
import { usePyodideContext } from '../../context/PyodideContext';

export function InteractionPanel(): React.JSX.Element {
  const pyodide = usePyodideContext();

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const currentTemplate = INTERACTION_TEMPLATES[selectedTemplateIndex]!;

  const [policy, setPolicy] = useState<PipelineExecutionPolicy>(
    currentTemplate.request.executionPolicy,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [stepResults, setStepResults] = useState<Record<number, InteractionStepResult>>({});
  const [pipelineOutcome, setPipelineOutcome] = useState<PipelineRunResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [viewTab, setViewTab] = useState<'pipeline' | 'data'>('pipeline');
  const [storedDataKeys, setStoredDataKeys] = useState<readonly string[]>([]);

  const handleTemplateChange = (idx: number) => {
    setSelectedTemplateIndex(idx);
    const tmpl = INTERACTION_TEMPLATES[idx]!;
    setPolicy(tmpl.request.executionPolicy);
    setStepResults({});
    setPipelineOutcome(null);
    setExpandedStep(1);
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setStepResults({});
    setPipelineOutcome(null);

    const orchestrator = new PipelineOrchestrator(pyodide);

    const request: InteractionRequest = {
      pipeline: currentTemplate.request.pipeline,
      executionPolicy: policy,
      initialData: currentTemplate.request.initialData,
    };

    try {
      const outcome = await orchestrator.run(request, (stepRes) => {
        setStepResults((prev) => ({ ...prev, [stepRes.step]: stepRes }));
        setExpandedStep(stepRes.step);
      });

      setPipelineOutcome(outcome);
      const keys = await orchestrator.getSessionStore().list();
      setStoredDataKeys(keys);
    } catch (err: unknown) {
      console.error('[Pipeline Run Error]', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      data-pane="pipeline"
      className="flex flex-col h-full bg-[#0d131f] text-slate-200 select-text overflow-hidden"
      aria-label="Lean-Python Interaction Pipeline"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#090d15] border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Dynamic Interaction Pipeline</span>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
          <button
            type="button"
            onClick={() => setViewTab('pipeline')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              viewTab === 'pipeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewTab('data')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              viewTab === 'data' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Session Data</span>
          </button>
        </div>
      </div>

      {/* Template & Policy Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0f172a] border-b border-neutral-800 text-xs">
        {/* Template Selector */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-slate-400 whitespace-nowrap">Template:</span>
          <select
            value={selectedTemplateIndex}
            onChange={(e) => handleTemplateChange(Number(e.target.value))}
            className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-slate-200 text-xs truncate"
          >
            {INTERACTION_TEMPLATES.map((tmpl, i) => (
              <option key={tmpl.id} value={i}>
                {tmpl.title}
              </option>
            ))}
          </select>
        </div>

        {/* Policy Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 whitespace-nowrap">Policy:</span>
          <select
            value={policy}
            onChange={(e) => setPolicy(e.target.value as PipelineExecutionPolicy)}
            className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-slate-200 text-xs"
          >
            <option value="fail-fast">Fail-Fast</option>
            <option value="continue">Continue on Error</option>
            <option value="require-verified">Require Verified</option>
          </select>
        </div>

        {/* Run Pipeline Button */}
        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-md ${
            isRunning
              ? 'bg-blue-600/50 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Steps...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Pipeline</span>
            </>
          )}
        </button>
      </div>

      {/* Outcome Banner */}
      {pipelineOutcome && (
        <div
          role="status"
          className={`flex items-center justify-between px-3 py-2 text-xs font-medium border-b ${
            pipelineOutcome.pipelineVerified
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : pipelineOutcome.success
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {pipelineOutcome.pipelineVerified ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : pipelineOutcome.success ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {pipelineOutcome.pipelineVerified
                ? '✓ Pipeline Formally Verified: All computation and proofs validated.'
                : pipelineOutcome.success
                  ? '⚠ Completed with Warnings: Python completed, but Lean steps were unverified or simulated.'
                  : '✗ Pipeline Failed: Step execution halted.'}
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-400">
            {pipelineOutcome.totalDurationMs}ms
          </span>
        </div>
      )}

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {viewTab === 'pipeline' ? (
          <>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentTemplate.description}
            </p>

            {/* Steps Sequence */}
            <div className="space-y-2">
              {currentTemplate.request.pipeline.map((step) => {
                const res = stepResults[step.step];
                const isExpanded = expandedStep === step.step;

                return (
                  <div
                    key={step.step}
                    className="rounded-lg border border-neutral-800 bg-[#111827] overflow-hidden"
                  >
                    {/* Step Card Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setExpandedStep(isExpanded ? null : step.step);
                      }}
                      className="flex items-center justify-between p-2.5 hover:bg-neutral-800/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}

                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-slate-300">
                          Step {step.step}
                        </span>

                        {step.language === 'python' ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium shrink-0">
                            <Sparkles className="w-3 h-3" />
                            <span>Python (Client)</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-blue-400 font-medium shrink-0">
                            <Compass className="w-3 h-3" />
                            <span>Lean 4 (Server)</span>
                          </span>
                        )}

                        <span className="text-xs text-slate-200 font-medium truncate">
                          {step.title}
                        </span>
                      </div>

                      {/* Step Result Status Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {res ? (
                          res.status === 'success' ? (
                            res.language === 'lean4' ? (
                              res.verified ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Verified ({res.durationMs}ms)</span>
                                </span>
                              ) : res.simulated ? (
                                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Simulated ({res.durationMs}ms)</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Unverified ({res.durationMs}ms)</span>
                                </span>
                              )
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Success ({res.durationMs}ms)</span>
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-rose-400 font-mono">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>error</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">pending</span>
                        )}
                      </div>
                    </div>

                    {/* Step Body (Expanded) */}
                    {isExpanded && (
                      <div className="p-3 border-t border-neutral-800/80 bg-[#0d131f] space-y-2">
                        {step.description && (
                          <p className="text-[11px] text-slate-400">{step.description}</p>
                        )}

                        {/* Code preview */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">
                            Step Code
                          </span>
                          <pre className="p-2 rounded bg-black/50 border border-neutral-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                            {step.code}
                          </pre>
                        </div>

                        {/* Output stream if executed */}
                        {res && (
                          <div className="space-y-1 pt-1 border-t border-neutral-800">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              Execution Result
                            </span>
                            {res.stdout && (
                              <pre className="p-2 rounded bg-black/60 border border-neutral-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
                                {res.stdout}
                              </pre>
                            )}
                            {res.stderr && (
                              <pre className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-xs font-mono text-rose-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                                {res.stderr}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Session Data Store Inspector */
          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>IndexedDB Session Data Keys:</span>
              <span className="font-mono text-slate-300">{storedDataKeys.length} items</span>
            </div>

            {storedDataKeys.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-neutral-800 rounded-lg">
                No session data files exchanged yet. Run a pipeline to generate inter-step JSON files.
              </div>
            ) : (
              <div className="space-y-1.5">
                {storedDataKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono"
                  >
                    <span className="text-blue-300 font-semibold">{key}</span>
                    <span className="text-[10px] text-slate-500">JSON Payload</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
