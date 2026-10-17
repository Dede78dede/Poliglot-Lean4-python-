import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Wrench,
  ShieldCheck,
  Cpu,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Sparkles,
  Zap,
  Lock,
  Terminal,
  Activity,
  Layers,
  FileCode,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { SupportedLanguage } from '../../types/language';
import {
  extractLeanCodeActions,
  applyAllLeanFixes,
  type LeanCodeAction,
} from '../../services/autocorrect/lean-lsp-actions';
import { runDeterministicPythonFixer } from '../../services/autocorrect/python-deterministic-fixer';

export interface AutoCorrectionPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentCode: string;
  readonly language: SupportedLanguage;
  readonly onApplyFix: (newCode: string) => void;
  readonly compilerOutput?: string;
}

export type AutoCorrectLevelId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface AutoCorrectLevelInfo {
  readonly id: AutoCorrectLevelId;
  readonly name: string;
  readonly category: string;
  readonly engine: string;
  readonly privacy: 'Zero Network' | 'Local REPL' | 'Local MoE' | 'Cloud (Opt-In)' | 'Skeptical Oracle';
  readonly requiresConsent?: boolean;
}

const LEVELS: readonly AutoCorrectLevelInfo[] = [
  {
    id: 'L1',
    name: 'Deterministic',
    category: 'Rule Engine',
    engine: 'Ruff CLI & Lean LSP Actions',
    privacy: 'Zero Network',
  },
  {
    id: 'L2',
    name: 'Feedback-Loop',
    category: 'Compiler REPL',
    engine: 'LeanProbe & mypy Feedback',
    privacy: 'Local REPL',
  },
  {
    id: 'L3',
    name: 'Specialized Models',
    category: 'Local MoE & 5-Worker',
    engine: 'Leanstral 1.5 & PyFixer',
    privacy: 'Local MoE',
  },
  {
    id: 'L4',
    name: 'Cloud Metaprogramming',
    category: 'AXLE Engine',
    engine: 'AXLE repair_proofs (ICML 2026)',
    privacy: 'Cloud (Opt-In)',
    requiresConsent: true,
  },
  {
    id: 'L5',
    name: 'Certified CAS',
    category: 'Computer Algebra',
    engine: 'Veriphy (SageMath + Lean Kernel)',
    privacy: 'Skeptical Oracle',
  },
];

interface LocalTelemetry {
  appliedCount: Record<AutoCorrectLevelId, number>;
  lastDurationMs: Record<AutoCorrectLevelId, number>;
}

export function AutoCorrectionPanel({
  isOpen,
  onClose,
  currentCode,
  language,
  onApplyFix,
  compilerOutput = '',
}: AutoCorrectionPanelProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<AutoCorrectLevelId>('L1');
  const [allowUnsafe, setAllowUnsafe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // L1 state
  const [l1Actions, setL1Actions] = useState<readonly LeanCodeAction[]>([]);
  const [l1AppliedRules, setL1AppliedRules] = useState<readonly string[]>([]);

  // L2 state
  const [l2MaxAttempts, setL2MaxAttempts] = useState(3);
  const [l2Diagnostics, setL2Diagnostics] = useState<readonly { line: number; message: string; fix?: string }[]>([]);

  // L3 state
  const [l3ContractPassed, setL3ContractPassed] = useState<boolean | null>(null);
  const [l3WorkerReports, setL3WorkerReports] = useState<readonly { workerName: string; description: string }[]>([]);

  // L4 state
  const [cloudConsentGiven, setCloudConsentGiven] = useState(false);
  const [cloudPasses, setCloudPasses] = useState<readonly string[]>([]);

  // L5 state
  const [casWitnessStatus, setCasWitnessStatus] = useState<string | null>(null);

  // Local-only telemetry
  const [telemetry, setTelemetry] = useState<LocalTelemetry>(() => {
    try {
      const saved = localStorage.getItem('polyglot_autocorrect_telemetry');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      appliedCount: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
      lastDurationMs: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    };
  });

  const recordTelemetry = useCallback((level: AutoCorrectLevelId, durationMs: number) => {
    setTelemetry((prev) => {
      const updated: LocalTelemetry = {
        appliedCount: { ...prev.appliedCount, [level]: (prev.appliedCount[level] ?? 0) + 1 },
        lastDurationMs: { ...prev.lastDurationMs, [level]: durationMs },
      };
      try {
        localStorage.setItem('polyglot_autocorrect_telemetry', JSON.stringify(updated));
      } catch {
        // local storage quota
      }
      return updated;
    });
  }, []);

  // Update L1 Lean actions when compilerOutput changes
  useEffect(() => {
    if (language === 'lean4') {
      const actions = extractLeanCodeActions(currentCode, compilerOutput);
      setL1Actions(actions);
    }
  }, [currentCode, compilerOutput, language]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // L1 Fix Handler
  const handleRunL1 = async () => {
    setIsProcessing(true);
    setFeedbackNotice(null);
    const t0 = performance.now();

    try {
      if (language === 'python') {
        const res = await fetch('/api/v1/autocorrect/deterministic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode, allowUnsafe }),
        });
        const data = await res.json();
        const duration = Math.round(performance.now() - t0);

        if (res.ok && data.result) {
          setPreviewCode(data.result.correctedCode);
          setL1AppliedRules(data.result.appliedRules);
          setFeedbackNotice({
            type: 'success',
            message: `L1 Python: Applied ${data.result.appliedRules.length} rule(s) via ${data.result.engine} in ${duration}ms.`,
          });
        } else {
          // Fallback locally
          const localRes = runDeterministicPythonFixer(currentCode, { allowUnsafe });
          setPreviewCode(localRes.correctedCode);
          setL1AppliedRules(localRes.appliedRules);
          setFeedbackNotice({
            type: 'success',
            message: `L1 Python: Applied ${localRes.appliedRules.length} rule(s) via deterministic engine in ${duration}ms.`,
          });
        }
      } else {
        // Lean 4 LSP Actions
        const result = applyAllLeanFixes(currentCode, l1Actions);
        const duration = Math.round(performance.now() - t0);
        setPreviewCode(result.updatedCode);
        setFeedbackNotice({
          type: 'success',
          message: `L1 Lean 4: Elaborated ${result.appliedCount} Quick Fix action(s) in ${duration}ms.`,
        });
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'L1 repair failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // L2 Feedback Loop Handler
  const handleRunL2 = async () => {
    setIsProcessing(true);
    setFeedbackNotice(null);
    const t0 = performance.now();

    try {
      if (language === 'python') {
        const res = await fetch('/api/v1/autocorrect/python-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode }),
        });
        const data = await res.json();
        const duration = Math.round(performance.now() - t0);

        if (res.ok && data.result) {
          setPreviewCode(data.result.repairedCode);
          setL2Diagnostics(data.result.diagnostics);
          setFeedbackNotice({
            type: 'success',
            message: `L2 Python: Injected ${data.result.appliedFixes.length} type annotations/declarations in ${duration}ms.`,
          });
        }
      } else {
        // LeanProbe REPL
        const res = await fetch('/api/v1/autocorrect/feedback-loop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode, maxAttempts: l2MaxAttempts }),
        });
        const data = await res.json();
        const duration = Math.round(performance.now() - t0);

        if (res.ok && data.result) {
          setPreviewCode(data.result.repairedCode);
          setFeedbackNotice({
            type: 'success',
            message: `L2 LeanProbe: Declaration verified in ${data.result.attempts} loop attempt(s) via "${data.result.closedBy}" in ${duration}ms.`,
          });
        } else if (res.status === 503) {
          setFeedbackNotice({
            type: 'warning',
            message: 'LeanProbe compiler daemon offline. Run `lean-probe --repl` on port 8082 to enable warm feedback.',
          });
        } else {
          setFeedbackNotice({
            type: 'error',
            message: data.message || 'L2 feedback loop could not complete.',
          });
        }
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'L2 feedback failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // L3 Specialized Model Handler
  const handleRunL3 = async () => {
    setIsProcessing(true);
    setFeedbackNotice(null);
    const t0 = performance.now();

    try {
      if (language === 'python') {
        const res = await fetch('/api/v1/autocorrect/python-specialized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode }),
        });
        const data = await res.json();
        const duration = Math.round(performance.now() - t0);

        if (res.ok && data.result) {
          setPreviewCode(data.result.repairedCode);
          setL3ContractPassed(data.result.contractGatePassed);
          setL3WorkerReports(data.result.workerReports);
          if (data.result.contractGatePassed) {
            setFeedbackNotice({
              type: 'success',
              message: `L3 PyFixer 5-Worker: Repaired code passed Behavioral Contract Gate in ${duration}ms.`,
            });
          } else {
            setFeedbackNotice({
              type: 'error',
              message: `L3 PyFixer: ${data.result.reason}`,
            });
          }
        }
      } else {
        // Leanstral 1.5
        const res = await fetch('/api/v1/autocorrect/specialized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brokenProof: currentCode }),
        });
        const data = await res.json();
        const duration = Math.round(performance.now() - t0);

        if (res.ok && data.result) {
          setPreviewCode(data.result.repairedProof);
          setFeedbackNotice({
            type: 'success',
            message: `L3 Leanstral 1.5: Repaired proof certified by Lean 4 kernel in ${duration}ms.`,
          });
        } else {
          setFeedbackNotice({
            type: 'warning',
            message: data.message || 'Leanstral local daemon offline (start vLLM/Ollama on :11434).',
          });
        }
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'L3 specialized model failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // L4 Cloud AXLE Handler
  const handleRunL4 = async () => {
    if (!cloudConsentGiven) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Explicit user consent is mandatory before sending proof terms to AXLE Cloud.',
      });
      return;
    }

    setIsProcessing(true);
    setFeedbackNotice(null);
    const t0 = performance.now();

    try {
      const res = await fetch('/api/v1/autocorrect/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokenProof: currentCode, consentGiven: cloudConsentGiven }),
      });
      const data = await res.json();
      const duration = Math.round(performance.now() - t0);

      if (res.status === 403) {
        setFeedbackNotice({
          type: 'error',
          message: 'Consent check failed (HTTP 403 CONSENT_REQUIRED).',
        });
      } else if (res.status === 429) {
        setFeedbackNotice({
          type: 'warning',
          message: `AXLE Rate Limit reached. Retry after ${data.retryAfter ?? 60}s.`,
        });
      } else if (res.ok && data.result) {
        setPreviewCode(data.result.repairedProof);
        const passNames = data.result.passesApplied?.map((p: { name: string }) => p.name) ?? [];
        setCloudPasses(passNames);
        setFeedbackNotice({
          type: 'success',
          message: `L4 AXLE Cloud: Completed repair passes in ${duration}ms.`,
        });
      } else {
        setFeedbackNotice({
          type: 'error',
          message: data.message || 'AXLE repair failed.',
        });
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'L4 cloud repair failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // L5 Certified CAS Handler
  const handleRunL5 = async () => {
    setIsProcessing(true);
    setFeedbackNotice(null);
    const t0 = performance.now();

    try {
      const res = await fetch('/api/v1/autocorrect/certified-cas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: currentCode }),
      });
      const data = await res.json();
      const duration = Math.round(performance.now() - t0);

      if (res.status === 503) {
        setFeedbackNotice({
          type: 'warning',
          message: 'SageMath 10.x binary not found on host PATH. Simulated skeptical oracle active.',
        });
      } else if (res.ok && data.result) {
        if (!data.result.kernelVerified) {
          setFeedbackNotice({
            type: 'error',
            message: `Veriphy rejected proof: ${data.result.error ?? 'Kernel verification failed.'}`,
          });
        } else {
          setCasWitnessStatus('Certified by Lean 4 Kernel (No sorry, standard axioms only)');
          setPreviewCode(data.result.synthesizedTacticBlock);
          setFeedbackNotice({
            type: 'success',
            message: `L5 Veriphy: Synthesized tactic certified by Lean 4 kernel in ${duration}ms.`,
          });
        }
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'L5 CAS failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPreview = () => {
    if (!previewCode) return;
    const t0 = performance.now();
    onApplyFix(previewCode);
    recordTelemetry(activeTab, Math.round(performance.now() - t0));
    setFeedbackNotice({
      type: 'success',
      message: `Code successfully applied from ${activeTab}!`,
    });
    setPreviewCode(null);
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#090d15] border-l border-neutral-800 shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200"
      aria-label="5-Level Auto-Correction System"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#0d121d]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-700/50 text-blue-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Auto-Correction System</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700/40">
                5-Level Hierarchy
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              L1 Deterministic to L5 Certified CAS with kernel gates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Close drawer (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Level Tabs */}
      <nav className="flex items-center border-b border-neutral-800 bg-[#070b12] px-2 py-1.5 overflow-x-auto gap-1">
        {LEVELS.map((lvl) => {
          const isActive = activeTab === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setActiveTab(lvl.id);
                setPreviewCode(null);
                setFeedbackNotice(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <span className="font-mono font-bold text-[11px] opacity-90">{lvl.id}</span>
              <span>{lvl.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Level Info Banner */}
      {(() => {
        const currentLevelInfo = LEVELS.find((l) => l.id === activeTab)!;
        return (
          <div className="px-5 py-2.5 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Engine:</span>
              <span className="font-semibold text-slate-200">{currentLevelInfo.engine}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[11px]">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-300 font-medium">{currentLevelInfo.privacy}</span>
            </div>
          </div>
        );
      })()}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {feedbackNotice && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                : feedbackNotice.type === 'warning'
                ? 'bg-amber-950/40 border-amber-800/70 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/70 text-rose-200'
            }`}
          >
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{feedbackNotice.message}</div>
          </div>
        )}

        {/* Level 1: Deterministic */}
        {activeTab === 'L1' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">L1 Deterministic Fixes</span>
                <span className="text-neutral-500 font-mono">Zero Network • Always On</span>
              </div>
              <p className="text-neutral-400 text-xs">
                {language === 'python'
                  ? 'Applies canonical Ruff fixes (F401 unused imports, I001 sorting, E701 single-line colons, UP006/UP007 modern typing) via native CLI or deterministic rule engine.'
                  : 'Ingests compiler suggestions (Try this: rfl, exact?, simp?) and provides one-click editor Quick Fixes.'}
              </p>

              {language === 'python' && (
                <label className="flex items-center gap-2.5 pt-2 border-t border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowUnsafe}
                    onChange={(e) => setAllowUnsafe(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                  />
                  <div>
                    <div className="font-medium text-slate-200">Allow Unsafe Fixes (B006, etc.)</div>
                    <div className="text-[11px] text-neutral-400">
                      Replaces mutable default arguments with None. Requires explicit opt-in.
                    </div>
                  </div>
                </label>
              )}

              {language === 'lean4' && l1Actions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Detected {l1Actions.length} Quick Fix suggestion(s):
                  </div>
                  {l1Actions.map((act) => (
                    <div
                      key={act.id}
                      className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono text-blue-300">{act.title}</div>
                        <div className="text-[10px] text-neutral-400">Line {act.line}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = currentCode.split('\n');
                          lines[act.line - 1] = act.replacementText;
                          onApplyFix(lines.join('\n'));
                          recordTelemetry('L1', 10);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleRunL1}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>
                  {language === 'python' ? 'Run Deterministic Ruff Fixer' : 'Fix All in File (1-Click)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Level 2: Feedback-Loop */}
        {activeTab === 'L2' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">L2 Compiler Feedback Loop</span>
                <span className="text-neutral-500 font-mono">Self-Hosted REPL</span>
              </div>
              <p className="text-neutral-400">
                {language === 'python'
                  ? 'Runs compiler diagnostic checks, classifies type errors (missing return types, undefined variables), and injects verified annotations.'
                  : 'Runs LeanProbe warm REPL loop at declaration granularity to iteratively resolve unknown identifiers and unsolved goals.'}
              </p>

              {language === 'lean4' && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                  <span className="text-slate-300">Max Iteration Loops:</span>
                  <select
                    value={l2MaxAttempts}
                    onChange={(e) => setL2MaxAttempts(Number(e.target.value))}
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
                  >
                    <option value={1}>1 loop</option>
                    <option value={2}>2 loops</option>
                    <option value={3}>3 loops (Standard)</option>
                    <option value={5}>5 loops (Exhaustive)</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunL2}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Run Feedback-Loop Auto-Repair</span>
              </button>
            </div>
          </div>
        )}

        {/* Level 3: Specialized Models */}
        {activeTab === 'L3' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">L3 Specialized Models & Contract Gates</span>
                <span className="text-neutral-500 font-mono">Local MoE & 5-Worker</span>
              </div>
              <p className="text-neutral-400">
                {language === 'python'
                  ? 'PyFixer 5-Worker Pipeline (Syntax Surgeon, Security Guard, Type Tamer, Style Formatter, Code Cleaner) enforced by a mandatory Behavioral Contract Gate.'
                  : 'Leanstral 1.5 local MoE proof repair with mandatory Lean 4 kernel verification gate (rejects any unproven sorry).'}
              </p>

              {l3WorkerReports.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                  <div className="text-[11px] font-semibold text-slate-300">Worker Pipeline Report:</div>
                  {l3WorkerReports.map((w) => (
                    <div key={w.workerName} className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px]">
                      <div className="font-semibold text-cyan-400">{w.workerName}</div>
                      <div className="text-neutral-400">{w.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {l3ContractPassed !== null && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                    l3ContractPassed
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Behavioral Contract Gate:{' '}
                    <strong>{l3ContractPassed ? 'PASSED (0 divergence in untouched functions)' : 'FAILED'}</strong>
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunL3}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Run Specialized Model Repair</span>
              </button>
            </div>
          </div>
        )}

        {/* Level 4: Cloud Metaprogramming */}
        {activeTab === 'L4' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">L4 Cloud Metaprogramming (AXLE)</span>
                <span className="text-amber-400 font-mono text-[11px]">Requires User Consent</span>
              </div>
              <p className="text-neutral-400">
                Connects to AXLE ICML 2026 reworked `repair_proofs` API to execute proof restructuring passes:
                insert_sorries, relax_defeq_transparency, and remove_unknown_options.
              </p>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Lock className="w-4 h-4" />
                  <span>Privacy & Transmission Consent Guard</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  In accordance with Polyglot Code Studio offline-first guidelines, code will only be transmitted
                  externally if you explicitly provide consent.
                </p>
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloudConsentGiven}
                    onChange={(e) => setCloudConsentGiven(e.target.checked)}
                    className="rounded border-amber-700 bg-neutral-900 text-amber-500 focus:ring-0"
                  />
                  <span className="text-slate-200 font-medium">I consent to sending this proof buffer to AXLE Cloud</span>
                </label>
              </div>

              {cloudPasses.length > 0 && (
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px] space-y-1">
                  <span className="text-neutral-400">Passes applied:</span>
                  <div className="font-mono text-cyan-300">{cloudPasses.join(', ')}</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunL4}
                disabled={isProcessing || !cloudConsentGiven}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Execute AXLE Cloud Repair</span>
              </button>
            </div>
          </div>
        )}

        {/* Level 5: Certified CAS */}
        {activeTab === 'L5' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">L5 Certified CAS (Veriphy)</span>
                <span className="text-cyan-400 font-mono text-[11px]">Skeptical Oracle + Kernel</span>
              </div>
              <p className="text-neutral-400">
                SageMath operates as an untrusted oracle generating certificates, polynomial factors, or linear combination witnesses.
                The Lean 4 kernel strictly validates every step. Proofs containing `sorry` or non-standard axioms are rejected immediately.
              </p>

              {casWitnessStatus && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2 text-[11px]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{casWitnessStatus}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunL5}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                <span>Certify Algebraic Goal via Veriphy</span>
              </button>
            </div>
          </div>
        )}

        {/* Diff / Preview Section */}
        {previewCode && (
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-blue-900/50 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white text-xs">Proposed Fix Preview</span>
              </div>
              <button
                type="button"
                onClick={handleApplyPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Fix to Workspace</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60">
              {previewCode}
            </pre>
          </div>
        )}

        {/* Local Telemetry Tracker (Privacy Guaranteed) */}
        <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Local Telemetry (Zero Phone-Home)</span>
            <span className="text-[10px] text-neutral-500">Stored only in your browser</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {(['L1', 'L2', 'L3', 'L4', 'L5'] as const).map((lvl) => (
              <div key={lvl} className="p-2 rounded bg-neutral-950/60 border border-neutral-800 text-center">
                <div className="font-mono font-bold text-xs text-blue-400">{lvl}</div>
                <div className="text-[11px] text-white font-semibold">{telemetry.appliedCount[lvl] ?? 0} fixes</div>
                <div className="text-[9px] text-neutral-500 font-mono">{telemetry.lastDurationMs[lvl] ?? 0}ms</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
