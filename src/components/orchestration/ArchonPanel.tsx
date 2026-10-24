import React, { useState } from 'react';
import {
  Workflow,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Play,
} from 'lucide-react';
import { archonHorizonService } from '../../services/archon/archon-horizon';

export const ESTIMATED_ARCHON_COST_WEEKLY = 600; // $600/week (3 accounts @ $200/mo)

export interface ArchonPanelProps {
  readonly className?: string;
  readonly isEnabledDefault?: boolean;
}

export function ArchonPanel({
  className = '',
  isEnabledDefault = false,
}: ArchonPanelProps): React.JSX.Element {
  const [enabled, setEnabled] = useState(isEnabledDefault);
  const [confirmedCost, setConfirmedCost] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const handleToggle = () => {
    if (!enabled && !confirmedCost) {
      setStatusText('Confirmation required: You must acknowledge the estimated $600/week API cost before enabling Archon Horizon.');
      return;
    }
    const next = !enabled;
    setEnabled(next);
    setStatusText(next ? 'Archon Horizon active (Ports 8080-8099 monitored, Kimina Tier 5 gate enabled)' : 'Archon Horizon paused');
  };

  return (
    <div className={`p-4 bg-[#0a0d14] border border-slate-800 space-y-4 font-sans text-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-100">
            Archon Horizon Multi-Agent Orchestration
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 border ${
            enabled
              ? 'border-purple-800 text-purple-300 bg-purple-950/40'
              : 'border-slate-800 text-slate-500 bg-slate-900'
          }`}
        >
          {enabled ? 'ACTIVE' : 'DEFAULT DISABLED'}
        </span>
      </div>

      {/* Setup Wizard & Cost Guard Warning */}
      <div className="p-3.5 border border-amber-900/40 bg-amber-950/10 space-y-2.5 font-mono text-xs">
        <div className="flex items-start gap-2 text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider">High-Concurrency API Cost Warning:</span>
            <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
              Archon Horizon v0.1.5 coordinates multi-agent long-running formalization using Claude Code / Claude Opus 4.8.
              Running 3 parallel accounts for a 1-week theorem proving sprint is estimated at <strong className="text-amber-100">${ESTIMATED_ARCHON_COST_WEEKLY} USD/week</strong>.
            </p>
          </div>
        </div>

        {/* Mandatory Confirmation Checkbox */}
        <label className="flex items-center gap-2 pt-2 border-t border-amber-900/30 cursor-pointer text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={confirmedCost}
            onChange={(e) => {
              setConfirmedCost(e.target.checked);
              if (e.target.checked) setStatusText(null);
            }}
            className="w-3.5 h-3.5 accent-purple-500 rounded-none bg-slate-900 border-slate-700"
          />
          <span>I understand Archon Horizon may cost up to $600/week in Claude API usage.</span>
        </label>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] font-mono text-slate-400">
          Kernel Gate: <span className="text-emerald-400">SEAL_KERNEL_VERIFIED_TIER5 (Zero Sorry)</span>
        </div>
        <button
          type="button"
          disabled={!enabled && !confirmedCost}
          onClick={handleToggle}
          className={`px-3 py-1.5 text-xs font-mono border transition-colors flex items-center gap-1.5 ${
            enabled
              ? 'border-rose-700 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40'
              : confirmedCost
              ? 'border-purple-500 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
              : 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
          }`}
        >
          {enabled ? 'Disable Archon Horizon' : 'Enable Archon Horizon'}
        </button>
      </div>

      {statusText && (
        <div className="p-2 border border-slate-800 text-[11px] font-mono text-cyan-300 bg-cyan-950/20">
          {statusText}
        </div>
      )}
    </div>
  );
}
