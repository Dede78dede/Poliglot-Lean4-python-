/**
 * TranslationPanel (Phase 12, Sprint 12.3, Task TF3)
 *
 * Dedicated Femev Drawer view displaying Translation Fidelity telemetry:
 * - Dual-pane source and translated target comparison
 * - "Check Fidelity" execution button
 * - Per-check badges (; rfl, Lungo assurance.json, 20-sample differential)
 * - Differential outputs table
 * - Lossy warning banner for LP² transpiled code
 */

import React, { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { authorizedFetch } from '../../services/auth/api-client';
import { settingsStore } from '../../services/settings/settings-store';

interface FidelityCheckSummary {
  readonly passed: boolean;
  readonly checks?: {
    readonly definitionalRfl?: boolean;
    readonly lungoAssurance?: boolean;
    readonly differentialPassed?: number;
    readonly differentialTotal?: number;
  };
  readonly differentialRows?: readonly {
    readonly input: unknown;
    readonly py: string;
    readonly lean: string;
    readonly match: boolean;
  }[];
  readonly detail?: string;
  readonly title?: string;
}

export function TranslationPanel(): React.JSX.Element {
  const [sourceLang] = useState<'python' | 'lean4'>('python');
  const [sourceCode, setSourceCode] = useState<string>(
    'def double_val(n: int) -> int:\n    return n * 2'
  );
  const [targetCode, setTargetCode] = useState<string>(
    'def double_val (n : Int) : Int :=\n  n * 2'
  );
  const [isLP2, setIsLP2] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkPassed, setCheckPassed] = useState<boolean | null>(null);
  const [lossyWarning, setLossyWarning] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ message: string; featureDisabled?: boolean } | null>(null);
  const [checksSummary, setChecksSummary] = useState<FidelityCheckSummary['checks'] | null>(null);
  const [differentialRows, setDifferentialRows] = useState<NonNullable<FidelityCheckSummary['differentialRows']>>([]);

  const handleToggleTranspiler = async () => {
    const nextLp2 = !isLP2;
    setIsLP2(nextLp2);
    setApiError(null);
    if (!nextLp2) {
      setLossyWarning(null);
      return;
    }

    try {
      const res = await authorizedFetch('/api/v1/translation/lp2', {
        method: 'POST',
        body: JSON.stringify({ direction: 'py2lean', source: sourceCode }),
      });
      const data = (await res.json()) as {
        translatedCode?: string;
        lossyWarning?: string;
        detail?: string;
        title?: string;
      };
      if (!res.ok) {
        setApiError({
          message: data.detail || `HTTP ${res.status}`,
          featureDisabled: res.status === 503 && data.title === 'FEATURE_DISABLED',
        });
        return;
      }
      if (data.translatedCode) {
        setTargetCode(data.translatedCode);
      }
      setLossyWarning(
        data.lossyWarning ||
          'LP² round-trip conversion is lossy and may drop in-place mutations.'
      );
    } catch (err: unknown) {
      setApiError({ message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleRunCheck = async () => {
    setIsChecking(true);
    setApiError(null);
    try {
      const res = await authorizedFetch('/api/v1/translation/fidelity-check', {
        method: 'POST',
        body: JSON.stringify({
          direction: sourceLang === 'python' ? 'py2lean' : 'lean2py',
          source: sourceCode,
          target: targetCode,
        }),
      });
      const data = (await res.json()) as FidelityCheckSummary;
      if (!res.ok) {
        setCheckPassed(false);
        setApiError({
          message: data.detail || `HTTP ${res.status}`,
          featureDisabled: res.status === 503 && data.title === 'FEATURE_DISABLED',
        });
        return;
      }
      setCheckPassed(Boolean(data.passed));
      setChecksSummary(data.checks ?? null);
      setDifferentialRows(Array.isArray(data.differentialRows) ? data.differentialRows : []);
    } catch (err: unknown) {
      setCheckPassed(false);
      setApiError({ message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 text-xs text-slate-200 font-sans">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">
              Translation Fidelity Gate
            </span>
            {checkPassed !== null && (
              <Badge variant={checkPassed ? 'verified' : 'error'}>
                {checkPassed ? 'FIDELITY_CONFIRMED' : 'FIDELITY_FAILED'}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Definitional equality (; rfl), Lungo assurance contracts, and 20-sample differential testing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleToggleTranspiler()}
            className="min-h-[44px]"
          >
            {isLP2 ? 'Using LP² (Lossy)' : 'Using PastaLean/Lungo'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleRunCheck()}
            disabled={isChecking}
            className="min-h-[44px]"
          >
            {isChecking ? 'Checking...' : 'Check Fidelity'}
          </Button>
        </div>
      </div>

      {/* API / Feature Flag Error Notice */}
      {apiError && (
        <div role="alert" className="p-2.5 rounded border border-rose-800/70 bg-rose-950/30 text-rose-200 text-[11px] flex items-center justify-between gap-3">
          <span>{apiError.message}</span>
          {apiError.featureDisabled && (
            <button
              type="button"
              onClick={() => settingsStore.openModal('flags')}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0"
            >
              Apri Feature Flags
            </button>
          )}
        </div>
      )}

      {/* LP² Warning Banner */}
      {isLP2 && (
        <div className="p-2.5 rounded border border-amber-800/60 bg-amber-950/30 text-amber-300 text-[11px] flex items-center justify-between">
          <span>
            <strong>LP² Transpiler Notice:</strong> {lossyWarning ?? 'Round-trip conversion is lossy. Run the fidelity gate before referencing in proof.'}
          </span>
          <Badge variant="warning">LOSSY_TRANSLATION</Badge>
        </div>
      )}

      {/* Dual Code View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[160px]">
        <div className="flex flex-col rounded border border-slate-800 bg-slate-900/60 p-2">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
            <span>Source Code (Python 3.14)</span>
            <span className="font-mono">spec.py</span>
          </div>
          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            className="flex-1 w-full bg-transparent font-mono text-xs text-slate-200 resize-none outline-hidden"
          />
        </div>

        <div className="flex flex-col rounded border border-slate-800 bg-slate-900/60 p-2">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
            <span>Target Code (Lean 4)</span>
            <span className="font-mono">Spec.lean</span>
          </div>
          <textarea
            value={targetCode}
            onChange={(e) => setTargetCode(e.target.value)}
            className="flex-1 w-full bg-transparent font-mono text-xs text-slate-200 resize-none outline-hidden"
          />
        </div>
      </div>

      {/* Fidelity Checks & Differential Table */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Fidelity Verification Metrics (3 Gates)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Definitional ; rfl</span>
              <Badge variant={checksSummary?.definitionalRfl ? 'verified' : checkPassed === false ? 'error' : 'neutral'}>
                {checksSummary ? (checksSummary.definitionalRfl ? 'PASSED' : 'FAILED') : 'PENDING'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              PastaBench definitional equality typechecked in kernel
            </p>
          </div>

          <div className="p-2.5 rounded border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">Lungo Assurance</span>
              <Badge variant={checksSummary?.lungoAssurance ? 'verified' : checkPassed === false ? 'error' : 'neutral'}>
                {checksSummary ? (checksSummary.lungoAssurance ? 'PASSED' : 'FAILED') : 'PENDING'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              LNG0602 proved claims intact; zero assumptions
            </p>
          </div>

          <div className="p-2.5 rounded border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">
                Differential ({checksSummary?.differentialPassed ?? 0}/{checksSummary?.differentialTotal ?? 20})
              </span>
              <Badge
                variant={
                  checksSummary && (checksSummary.differentialPassed ?? 0) === (checksSummary.differentialTotal ?? 20)
                    ? 'verified'
                    : checkPassed === false
                    ? 'error'
                    : 'neutral'
                }
              >
                {checksSummary ? 'CHECKED' : 'PENDING'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Pyodide vs Lean #eval differential gate
            </p>
          </div>
        </div>

        {/* Sample Differential Output Table */}
        <div className="rounded border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-medium text-slate-400 bg-slate-900/60">
            Differential Test Sample Runs (Pyodide ↔ Lean 4)
          </div>
          {differentialRows.length === 0 ? (
            <div className="p-3 text-[11px] text-slate-500">
              Premi &quot;Check Fidelity&quot; per eseguire il gate differenziale tramite <code className="font-mono">/api/v1/translation/fidelity-check</code>.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/20">
                <tr>
                  <th className="px-3 py-1">Input</th>
                  <th className="px-3 py-1">Python Output</th>
                  <th className="px-3 py-1">Lean Output</th>
                  <th className="px-3 py-1">Equivalence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {differentialRows.map((row, idx) => (
                  <tr key={`${String(row.input)}-${idx}`} className="hover:bg-slate-800/30">
                    <td className="px-3 py-1 text-slate-300">{String(row.input)}</td>
                    <td className="px-3 py-1 text-slate-300">{row.py}</td>
                    <td className="px-3 py-1 text-slate-300">{row.lean}</td>
                    <td className="px-3 py-1">
                      <Badge variant={row.match ? 'verified' : 'error'} unboxed>
                        {row.match ? '· MATCH' : '· MISMATCH'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

