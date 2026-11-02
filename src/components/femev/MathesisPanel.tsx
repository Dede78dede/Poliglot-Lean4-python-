/**
 * Mathesis Autoformalization Panel (Phase 11.2, Sprint 11.2.4)
 *
 * Interactive NL-to-Lean 4 translation interface with LeanScorer validation badges.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings,
  Copy,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { mathesisProvider, MATHESIS_SCORE_THRESHOLD } from '../../services/formalization/mathesis-provider';

export interface MathesisPanelProps {
  readonly onInsertCode?: (code: string) => void;
}

export function MathesisPanel({ onInsertCode }: MathesisPanelProps): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    leanCode: string;
    leanScorerScore: number;
    accepted: boolean;
  } | null>(null);
  const [error, setError] = useState<{ reason: string; instructions?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const endpointConfigured = Boolean(mathesisProvider.getEndpoint());

  const handleFormalize = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await mathesisProvider.formalize({
        naturalLanguagePrompt: prompt,
      });
      setResult({
        leanCode: res.leanCode,
        leanScorerScore: res.leanScorerScore,
        accepted: res.accepted,
      });
    } catch (err: any) {
      setError({
        reason: err.message || 'Autoformalization failed',
        instructions: err.details?.instructions || 'Check MATHESIS_ENDPOINT in your .env configuration.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.leanCode) return;
    navigator.clipboard?.writeText(result.leanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full p-4 bg-slate-900 text-slate-100 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold">Mathesis Autoformalization</h2>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`px-2 py-0.5 rounded-full ${
              endpointConfigured
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {endpointConfigured ? 'Endpoint Configured' : 'No Endpoint'}
          </span>
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded bg-slate-800/60 border border-slate-700/60 text-xs flex items-start space-x-2 text-slate-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Epistemic Barrier:</strong> Autoformalized candidates & LeanScorer ratings are heuristic suggestions. Only kernel verification (Tier 5) certifies truth.
        </span>
      </div>

      <div className="mt-4 flex flex-col space-y-2">
        <label className="text-xs font-medium text-slate-400">
          Natural Language Mathematical Statement:
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Every natural number is greater than or equal to zero."
          rows={3}
          className="w-full px-3 py-2 text-xs rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-500"
        />
        <button
          onClick={handleFormalize}
          disabled={isLoading || !prompt.trim()}
          className="self-end px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium rounded text-white flex items-center space-x-1.5 transition-colors"
        >
          {isLoading ? (
            <span>Synthesizing...</span>
          ) : (
            <>
              <span>Formalize</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded bg-rose-950/50 border border-rose-800 text-xs text-rose-200">
          <div className="flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error.reason}</span>
          </div>
          {error.instructions && (
            <p className="mt-2 text-rose-300 text-[11px] leading-relaxed">
              {error.instructions}
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Synthesized Lean 4 Code:</span>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  result.leanScorerScore >= MATHESIS_SCORE_THRESHOLD
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-900/60 text-rose-300 border border-rose-700'
                }`}
              >
                LeanScorer: {result.leanScorerScore} ({result.accepted ? 'Accepted' : 'Rejected'})
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
                title="Copy code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
            {result.leanCode}
          </pre>
          {onInsertCode && (
            <button
              onClick={() => onInsertCode(result.leanCode)}
              className="self-end px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
            >
              Insert into active file
            </button>
          )}
        </div>
      )}
    </div>
  );
}
