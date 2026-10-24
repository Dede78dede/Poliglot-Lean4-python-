import React, { useState, useCallback } from 'react';
import { Play, RotateCw, Lock, AlertTriangle } from 'lucide-react';
import type {
  AxleDisproveResult,
  AxleExtractStatesResult,
  AxleSimplifyResult,
} from '../../../types/proof-automation';
import { proofAutomationClient } from '../../../services/proof/proof-automation-client';
import { AxleConsentModal } from '../proof-automation-shared';

export interface AxlePanelProps {
  readonly currentCode: string;
  readonly onApplyCode: (newCode: string) => void;
}

export type AxleOperation = 'disprove' | 'extract' | 'simplify';

export const AxlePanel: React.FC<AxlePanelProps> = ({
  currentCode,
  onApplyCode,
}) => {
  const [axleConsent, setAxleConsent] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [axleOperation, setAxleOperation] = useState<AxleOperation>('disprove');
  const [disproveStatement, setDisproveStatement] = useState<string>('1 = 2');
  const [disproveResult, setDisproveResult] = useState<AxleDisproveResult | null>(null);
  const [extractResult, setExtractResult] = useState<AxleExtractStatesResult | null>(null);
  const [simplifyResult, setSimplifyResult] = useState<AxleSimplifyResult | null>(null);
  const [isAxleRunning, setIsAxleRunning] = useState<boolean>(false);
  const [axleError, setAxleError] = useState<string | null>(null);

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

  return (
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
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>
            {axleConsent
              ? 'Cloud Data Transmission Consent: GRANTED'
              : 'Cloud Data Transmission Consent: REQUIRED'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAxleConsent(!axleConsent)}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
        >
          {axleConsent ? 'Revoke Consent' : 'Grant Consent'}
        </button>
      </div>

      {/* Operation Selector */}
      <div className="flex border border-slate-800 rounded bg-[#0a0d14] p-1 gap-1">
        {(['disprove', 'extract', 'simplify'] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setAxleOperation(op)}
            className={`flex-1 py-1.5 rounded text-center font-medium capitalize transition-colors ${
              axleOperation === op
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {op === 'extract' ? 'Extract States' : op === 'simplify' ? 'Simplify Proof' : op}
          </button>
        ))}
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

      {/* Error View */}
      {axleError && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="font-mono text-[11px]">{axleError}</div>
        </div>
      )}

      {/* Disprove Outcome */}
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

      {/* Line-by-Line States */}
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

      {/* Simplified Proof */}
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

      {/* Consent Modal */}
      <AxleConsentModal
        show={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={() => {
          setAxleConsent(true);
          setShowConsentModal(false);
        }}
      />
    </div>
  );
};
