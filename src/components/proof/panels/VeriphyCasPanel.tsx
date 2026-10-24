import React, { useState, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  veriphyClient,
  type VeriphyFactorResult,
  type VeriphyCoeffResult,
} from '../../../../server/src/services/autocorrect/veriphy-client';

export const VeriphyCasPanel: React.FC = () => {
  const [casPoly, setCasPoly] = useState<string>('x^2 - y^2');
  const [casFactorResult, setCasFactorResult] = useState<VeriphyFactorResult | null>(null);
  const [casCoeffResult, setCasCoeffResult] = useState<VeriphyCoeffResult | null>(null);
  const [isCasRunning, setIsCasRunning] = useState<boolean>(false);

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

  return (
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
  );
};
