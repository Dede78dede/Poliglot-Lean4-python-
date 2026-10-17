import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  ShieldCheck,
  Cpu,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Zap,
  Lock,
  Layers,
  FileCode,
  Check,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
  Info,
  Clock,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import type { SupportedLanguage } from '../../types/language';
import type {
  ProofAutomationResult,
  AxleDisproveResult,
  AxleExtractStatesResult,
  AxleSimplifyResult,
  BlueprintSyncResult,
  BlueprintDiscrepancy,
} from '../../types/proof-automation';
import { proofAutomationClient } from '../../services/proof/proof-automation-client';
import { veriphyClient, type VeriphyFactorResult, type VeriphyCoeffResult } from '../../../server/src/services/autocorrect/veriphy-client';

export interface ProofAutomationPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentCode: string;
  readonly language: SupportedLanguage;
  readonly onApplyCode: (newCode: string) => void;
  readonly currentWorkspaceId?: string;
}

export type ProofTab = 'auto-prove' | 'axle-cloud' | 'blueprint-sync' | 'veriphy-cas';

export const ProofAutomationPanel: React.FC<ProofAutomationPanelProps> = ({
  isOpen,
  onClose,
  currentCode,
  language,
  onApplyCode,
  currentWorkspaceId = 'ws-liquid-tensor',
}) => {
  const [activeTab, setActiveTab] = useState<ProofTab>('auto-prove');

  // Auto-Prove state
  const [goal, setGoal] = useState<string>('⊢ ∃ q > p, Nat.Prime q');
  const [timeoutMs, setTimeoutMs] = useState<number>(30000);
  const [isProving, setIsProving] = useState<boolean>(false);
  const [proveResult, setProveResult] = useState<ProofAutomationResult | null>(null);
  const [proveError, setProveError] = useState<string | null>(null);

  // AXLE Cloud state
  const [axleConsent, setAxleConsent] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [axleOperation, setAxleOperation] = useState<'disprove' | 'extract' | 'simplify'>('disprove');
  const [disproveStatement, setDisproveStatement] = useState<string>('1 = 2');
  const [disproveResult, setDisproveResult] = useState<AxleDisproveResult | null>(null);
  const [extractResult, setExtractResult] = useState<AxleExtractStatesResult | null>(null);
  const [simplifyResult, setSimplifyResult] = useState<AxleSimplifyResult | null>(null);
  const [isAxleRunning, setIsAxleRunning] = useState<boolean>(false);
  const [axleError, setAxleError] = useState<string | null>(null);

  // Blueprint Sync state
  const [syncMode, setSyncMode] = useState<'extract' | 'reconcile' | 'push'>('reconcile');
  const [syncResult, setSyncResult] = useState<BlueprintSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Veriphy CAS state
  const [casPoly, setCasPoly] = useState<string>('x^2 - y^2');
  const [casFactorResult, setCasFactorResult] = useState<VeriphyFactorResult | null>(null);
  const [casCoeffResult, setCasCoeffResult] = useState<VeriphyCoeffResult | null>(null);
  const [isCasRunning, setIsCasRunning] = useState<boolean>(false);

  // Extract initial goal from currentCode if Lean 4
  useEffect(() => {
    if (language === 'lean4' && currentCode) {
      const match = currentCode.match(/(?:theorem|lemma)\s+([A-Za-z0-9_]+)[^:]*:\s*([^:=]+)(?::=|\bby\b|$)/);
      if (match && match[2]) {
        setGoal(`⊢ ${match[2].trim()}`);
      }
    }
  }, [currentCode, language]);

  // Run Auto-Prove Fallback Chain
  const handleRunAutoProve = useCallback(async () => {
    setIsProving(true);
    setProveError(null);
    setProveResult(null);

    try {
      const result = await proofAutomationClient.autoProve({
        goal,
        contextCode: currentCode,
        timeoutMs,
      });
      setProveResult(result);
    } catch (err: any) {
      setProveError(err.message || 'Auto-prove execution failed');
    } finally {
      setIsProving(false);
    }
  }, [goal, currentCode, timeoutMs]);

  // Run AXLE Cloud Tools
  const handleRunAxle = useCallback(async () => {
    if (!axleConsent) {
      setShowConsentModal(true);
      return;
    }

    setIsAxleRunning(true);
    setAxleError(null);

    try {
      if (axleOperation === 'disprove') {
        const res = await proofAutomationClient.disprove(disproveStatement, true);
        setDisproveResult(res);
      } else if (axleOperation === 'extract') {
        const res = await proofAutomationClient.extractProofStates(currentCode, true);
        setExtractResult(res);
      } else if (axleOperation === 'simplify') {
        const res = await proofAutomationClient.simplifyProof(currentCode, true);
        setSimplifyResult(res);
      }
    } catch (err: any) {
      if (err.status === 403 || err.code === 'CONSENT_REQUIRED') {
        setShowConsentModal(true);
      }
      setAxleError(err.message || 'AXLE cloud execution failed');
    } finally {
      setIsAxleRunning(false);
    }
  }, [axleConsent, axleOperation, disproveStatement, currentCode]);

  // Run Blueprint Sync
  const handleRunSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await proofAutomationClient.syncBlueprint(currentWorkspaceId, {
        mode: syncMode,
        files: [
          {
            path: language === 'python' ? 'verification/test_witness.py' : 'Main.lean',
            content: currentCode,
          },
        ],
      });
      setSyncResult(res);
    } catch (err: any) {
      setSyncError(err.message || 'Blueprint sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [currentWorkspaceId, syncMode, language, currentCode]);

  // Run Veriphy CAS Factor / Coeffs
  const handleRunCas = useCallback(async (op: 'factor' | 'coeff') => {
    setIsCasRunning(true);
    try {
      if (op === 'factor') {
        const res = await veriphyClient.factorPolynomial(casPoly);
        setCasFactorResult(res);
      } else {
        const res = await veriphyClient.computeCoefficients(casPoly);
        setCasCoeffResult(res);
      }
    } catch (err: any) {
      console.error('CAS failed', err);
    } finally {
      setIsCasRunning(false);
    }
  }, [casPoly]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[640px] bg-[#0c1017] border-l border-slate-800 shadow-2xl flex flex-col font-sans text-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-[#0e1420] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                Proof Automation & Metaprogramming
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                Phase 8
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Superposition Provers · Cloud Metaprogramming · Skeptical CAS · DAG Sync
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800/80 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-[#0a0d14] px-4 pt-2 gap-1 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('auto-prove')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'auto-prove'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Auto-Prove (Duper/Aesop)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('axle-cloud')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'axle-cloud'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          AXLE Cloud
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blueprint-sync')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'blueprint-sync'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Blueprint Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('veriphy-cas')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'veriphy-cas'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Veriphy CAS
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* TAB 1: AUTO-PROVE */}
        {activeTab === 'auto-prove' && (
          <div className="space-y-4">
            <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs tracking-wide uppercase">
                  Target Proof Goal
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Timeout: {timeoutMs / 1000}s
                </span>
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                className="w-full bg-[#07090e] border border-slate-700/80 rounded p-2.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                placeholder="⊢ goal statement"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Fallback Order:</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Duper (Superposition) → aesop → Pantograph
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRunAutoProve}
                  disabled={isProving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  {isProving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isProving ? 'Synthesizing...' : 'Run Auto-Prove'}
                </button>
              </div>
            </div>

            {/* Error view */}
            {proveError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Automation Error</div>
                  <div className="font-mono text-[11px] mt-0.5">{proveError}</div>
                </div>
              </div>
            )}

            {/* Fallback Chain Visualization */}
            {proveResult && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide">
                    Fallback Chain Execution Log
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Evaluated in {proveResult.durationMs}ms
                  </span>
                </div>

                <div className="space-y-2">
                  {proveResult.chainLog.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border flex items-center justify-between font-mono text-xs ${
                        step.status === 'proved'
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                          : step.status === 'skipped'
                          ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                          : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-800">
                          {idx + 1}
                        </span>
                        <span className="font-bold uppercase">{step.tier}</span>
                        {step.reason && (
                          <span className="text-[10px] text-slate-400">({step.reason})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{step.status}</span>
                        <span className="text-[10px] text-slate-400">({step.durationMs}ms)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Synthesis Output & Certificate */}
                {proveResult.proved && proveResult.proofTerm && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verified by Lean 4 Kernel</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyCode(proveResult.proofTerm!)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Inject Proof
                      </button>
                    </div>

                    <pre className="p-3 bg-[#07090e] border border-slate-800 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                      {proveResult.proofTerm}
                    </pre>

                    {proveResult.certificate && (
                      <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded font-mono text-[10px] text-slate-400 space-y-1">
                        <div>Seal: {proveResult.certificate.signatureSeal}</div>
                        <div>Toolchain: {proveResult.certificate.toolchain}</div>
                        <div>Hash: {proveResult.certificate.contentHash}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AXLE CLOUD */}
        {activeTab === 'axle-cloud' && (
          <div className="space-y-4">
            {/* Consent Status Banner */}
            <div
              className={`p-3 rounded border flex items-center justify-between ${
                axleConsent
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>
                  {axleConsent
                    ? 'Cloud Data Transmission Consent: GRANTED'
                    : 'Cloud Data Transmission Consent: REQUIRED'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAxleConsent(!axleConsent)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                {axleConsent ? 'Revoke Consent' : 'Grant Consent'}
              </button>
            </div>

            {/* Operation Selector */}
            <div className="flex border border-slate-800 rounded bg-[#0a0d14] p-1 gap-1">
              <button
                type="button"
                onClick={() => setAxleOperation('disprove')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  axleOperation === 'disprove'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Disprove
              </button>
              <button
                type="button"
                onClick={() => setAxleOperation('extract')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  axleOperation === 'extract'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extract States
              </button>
              <button
                type="button"
                onClick={() => setAxleOperation('simplify')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  axleOperation === 'simplify'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Simplify Proof
              </button>
            </div>

            {/* Operation View */}
            <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
              {axleOperation === 'disprove' && (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 uppercase tracking-wide">
                    Conjecture / Statement to Disprove
                  </label>
                  <input
                    type="text"
                    value={disproveStatement}
                    onChange={(e) => setDisproveStatement(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-700 rounded p-2 font-mono text-xs text-cyan-300"
                    placeholder="e.g. 1 = 2 or ∀ n, Nat.Prime n"
                  />
                </div>
              )}

              {axleOperation === 'extract' && (
                <div className="space-y-1 text-slate-400 text-xs">
                  Extracts declaration-granularity proof state checkpoints for every line of active buffer.
                </div>
              )}

              {axleOperation === 'simplify' && (
                <div className="space-y-1 text-slate-400 text-xs">
                  Analyzes proof term with AST minimization heuristics to eliminate redundant tactic applications.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRunAxle}
                  disabled={isAxleRunning}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  {isAxleRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isAxleRunning ? 'Executing...' : 'Run AXLE Metaprogramming'}
                </button>
              </div>
            </div>

            {/* AXLE Results */}
            {disproveResult && axleOperation === 'disprove' && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Disprove Outcome</span>
                  <span className="font-mono text-slate-400">{disproveResult.timeMs}ms</span>
                </div>
                <div
                  className={`p-2.5 rounded font-mono text-xs ${
                    disproveResult.hasCounterexample
                      ? 'bg-red-950/40 text-red-300 border border-red-800'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {disproveResult.hasCounterexample
                    ? 'Counterexample Identified'
                    : 'No Counterexample Found'}
                </div>
                {disproveResult.counterexample && (
                  <div className="text-slate-300 font-mono text-xs">
                    {disproveResult.counterexample}
                  </div>
                )}
                {disproveResult.negationProof && (
                  <pre className="p-2.5 bg-[#07090e] border border-slate-800 rounded font-mono text-xs text-cyan-300 overflow-x-auto">
                    {disproveResult.negationProof}
                  </pre>
                )}
              </div>
            )}

            {extractResult && axleOperation === 'extract' && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Line-by-Line Proof States</span>
                  <span className="font-mono text-slate-400">{extractResult.totalLines} lines</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {extractResult.perLineStates.map((s, idx) => (
                    <div key={idx} className="p-2 bg-[#07090e] border border-slate-800 rounded flex gap-2">
                      <span className="text-slate-500 w-6">L{s.line}</span>
                      <div className="flex-1">
                        <div className="text-slate-300">{s.codeLine}</div>
                        <div className="text-cyan-400 text-[10px] mt-0.5">{s.state}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {simplifyResult && axleOperation === 'simplify' && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Simplified Proof</span>
                  <span className="font-mono text-slate-400">
                    -{simplifyResult.tacticsRemoved} tactics ({simplifyResult.originalLength}b → {simplifyResult.simplifiedLength}b)
                  </span>
                </div>
                <pre className="p-2.5 bg-[#07090e] border border-slate-800 rounded font-mono text-xs text-cyan-300 overflow-x-auto">
                  {simplifyResult.simplifiedCode}
                </pre>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onApplyCode(simplifyResult.simplifiedCode)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs transition-colors"
                  >
                    Apply Simplified Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BLUEPRINT SYNC */}
        {activeTab === 'blueprint-sync' && (
          <div className="space-y-4">
            <div className="flex border border-slate-800 rounded bg-[#0a0d14] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSyncMode('reconcile')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  syncMode === 'reconcile'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reconcile Drift
              </button>
              <button
                type="button"
                onClick={() => setSyncMode('push')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  syncMode === 'push'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Generate Lean Stubs
              </button>
              <button
                type="button"
                onClick={() => setSyncMode('extract')}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  syncMode === 'extract'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extract DAG
              </button>
            </div>

            <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
              <div className="text-slate-400 text-xs">
                {syncMode === 'reconcile' &&
                  'Detects architectural drift between the active editor buffer and the Archon Horizon blueprint DAG.'}
                {syncMode === 'push' &&
                  'Emits formal Lean 4 stubs with sorry for unproven nodes while strictly preserving frozen or verified nodes.'}
                {syncMode === 'extract' &&
                  'Re-parses the source tree to derive updated nodes, signatures, and dependencies.'}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  {isSyncing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isSyncing ? 'Synchronizing...' : 'Execute Sync'}
                </button>
              </div>
            </div>

            {/* Sync Results */}
            {syncResult && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Sync Report ({syncResult.mode})</span>
                  <span className="font-mono text-slate-400">{syncResult.timeMs}ms</span>
                </div>

                {syncResult.mode === 'reconcile' && (
                  <div className="space-y-2">
                    <div
                      className={`p-2.5 rounded font-mono text-xs ${
                        syncResult.driftDetected
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {syncResult.driftDetected
                        ? `Drift Detected: ${syncResult.discrepancies?.length} discrepancies found`
                        : 'Clean: Source code and Blueprint DAG are fully synchronized'}
                    </div>

                    {syncResult.discrepancies && syncResult.discrepancies.length > 0 && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto font-mono text-[11px]">
                        {syncResult.discrepancies.map((d, idx) => (
                          <div key={idx} className="p-2 bg-[#07090e] border border-slate-800 rounded space-y-0.5">
                            <div className="text-cyan-400 font-semibold">{d.id} ({d.type})</div>
                            <div className="text-slate-400">{d.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {syncResult.mode === 'push' && syncResult.generatedStubs && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>Skipped {syncResult.skippedFrozenNodes?.length || 0} frozen nodes</span>
                      <button
                        type="button"
                        onClick={() => onApplyCode(syncResult.generatedStubs!)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium"
                      >
                        Append Stubs to Buffer
                      </button>
                    </div>
                    <pre className="p-3 bg-[#07090e] border border-slate-800 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-52">
                      {syncResult.generatedStubs}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VERIPHY CAS */}
        {activeTab === 'veriphy-cas' && (
          <div className="space-y-4">
            <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-3">
              <span className="font-semibold text-slate-200 uppercase tracking-wide">
                Polynomial Expression
              </span>
              <input
                type="text"
                value={casPoly}
                onChange={(e) => setCasPoly(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-700 rounded p-2 font-mono text-xs text-cyan-300"
                placeholder="e.g. x^2 - y^2 or 3 * x^2 + 5 * x + 2"
              />

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleRunCas('factor')}
                  disabled={isCasRunning}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  Factor Polynomial
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCas('coeff')}
                  disabled={isCasRunning}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  Extract Coefficients
                </button>
              </div>
            </div>

            {casFactorResult && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Factored & Kernel-Verified
                  </span>
                  <span className="font-mono text-slate-400">{casFactorResult.polynomial}</span>
                </div>
                <div className="p-2.5 bg-[#07090e] border border-slate-800 rounded font-mono text-xs text-cyan-300">
                  {casFactorResult.factorization}
                </div>
                <pre className="p-2 bg-[#07090e] border border-slate-800/80 rounded font-mono text-[10px] text-slate-400 overflow-x-auto">
                  {casFactorResult.synthesizedProof}
                </pre>
              </div>
            )}

            {casCoeffResult && (
              <div className="bg-[#0e1420] p-4 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Coefficients & Kernel-Verified
                  </span>
                  <span className="font-mono text-slate-400">Degree: {casCoeffResult.degree}</span>
                </div>
                <div className="p-2.5 bg-[#07090e] border border-slate-800 rounded font-mono text-xs text-cyan-300">
                  {Object.entries(casCoeffResult.coefficients)
                    .map(([deg, coeff]) => `x^${deg}: ${coeff}`)
                    .join(' · ')}
                </div>
                <pre className="p-2 bg-[#07090e] border border-slate-800/80 rounded font-mono text-[10px] text-slate-400 overflow-x-auto">
                  {casCoeffResult.synthesizedProof}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consent Modal for AXLE Cloud */}
      {showConsentModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border border-slate-700 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold text-sm uppercase">Cloud Data Transmission Consent</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              AXLE Advanced Metaprogramming executes through the Axiom cloud infrastructure.
              Sending mathematical conjectures or proof states transmits your code payload over HTTPS.
              All synthesized proof certificates undergo local Lean 4 kernel verification before injection.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAxleConsent(true);
                  setShowConsentModal(false);
                }}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs"
              >
                Agree & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
