import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCw, AlertTriangle, Check } from 'lucide-react';
import type { SupportedLanguage } from '../../../types/language';
import type { ProofAutomationResult } from '../../../types/proof-automation';
import { proofAutomationClient } from '../../../services/proof/proof-automation-client';
import { KernelVerificationBadge } from '../proof-automation-shared';

export interface DuperPanelProps {
  readonly currentCode: string;
  readonly language: SupportedLanguage;
  readonly onApplyCode: (newCode: string) => void;
}

export const DuperPanel: React.FC<DuperPanelProps> = ({
  currentCode,
  language,
  onApplyCode,
}) => {
  const [goal, setGoal] = useState<string>('⊢ ∃ q > p, Nat.Prime q');
  const [timeoutMs] = useState<number>(30000);
  const [isProving, setIsProving] = useState<boolean>(false);
  const [proveResult, setProveResult] = useState<ProofAutomationResult | null>(null);
  const [proveError, setProveError] = useState<string | null>(null);

  // Extract initial goal from currentCode if Lean 4
  useEffect(() => {
    if (language === 'lean4' && currentCode) {
      const match = currentCode.match(/(?:theorem|lemma)\s+([A-Za-z0-9_]+)[^:]*:\s*([^:=]+)(?::=|\bby\b|$)/);
      if (match?.[2]) {
        setGoal(`⊢ ${match[2].trim()}`);
      }
    }
  }, [currentCode, language]);

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

  return (
    <div className="space-y-4">
      {/* Target Proof Goal Card */}
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
                <KernelVerificationBadge certificate={proveResult.certificate} />
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
