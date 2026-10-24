import React, { useSyncExternalStore } from 'react';
import { Coins, Download, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { tokenBudgetManager, type TokenBudget } from '../../services/ai/token-budget-manager';

export interface TokenBudgetDashboardProps {
  readonly className?: string;
}

export function TokenBudgetDashboard({ className = '' }: TokenBudgetDashboardProps): React.JSX.Element {
  const budgets = useSyncExternalStore(
    tokenBudgetManager.subscribe,
    tokenBudgetManager.getSnapshot,
  );

  const handleExportCsv = () => {
    const csv = tokenBudgetManager.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-budget-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-4 bg-[#0a0d14] border border-slate-800 space-y-4 font-sans text-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-100">
            Token Budget & Usage Ledger
          </h3>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-2.5 py-1 text-[11px] font-mono border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-800 overflow-x-auto bg-[#07090e]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0e121b] border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-2 px-3 font-semibold uppercase text-[10px]">Provider</th>
              <th className="py-2 px-3 font-semibold uppercase text-[10px]">Today Used / Limit</th>
              <th className="py-2 px-3 font-semibold uppercase text-[10px]">Month Used</th>
              <th className="py-2 px-3 font-semibold uppercase text-[10px]">Reset (UTC)</th>
              <th className="py-2 px-3 font-semibold uppercase text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {budgets.map((b: TokenBudget) => {
              const dailyPct = Math.min(100, Math.round((b.usedToday / b.dailyLimit) * 100));
              const isExhausted = tokenBudgetManager.isExhausted(b.providerId);
              const isWarn = dailyPct >= 80;

              return (
                <tr key={b.providerId} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-slate-200">{b.providerId}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span>{b.usedToday.toLocaleString()} / {b.dailyLimit.toLocaleString()}</span>
                      <span className="text-slate-400">{dailyPct}%</span>
                    </div>
                    {/* Monospace progress bar */}
                    <div className="w-36 h-1.5 bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isExhausted
                            ? 'bg-rose-500'
                            : isWarn
                            ? 'bg-amber-400'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${dailyPct}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {b.usedThisMonth.toLocaleString()} / {b.monthlyLimit.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-slate-400">
                    {b.resetAtDaily.split('T')[1].slice(0, 5)} UTC
                  </td>
                  <td className="py-2.5 px-3">
                    {isExhausted ? (
                      <span className="text-[10px] px-1.5 py-0.5 border border-rose-800 text-rose-300 bg-rose-950/40 flex items-center gap-1 w-max">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        <span>BLOCKED</span>
                      </span>
                    ) : isWarn ? (
                      <span className="text-[10px] px-1.5 py-0.5 border border-amber-800 text-amber-300 bg-amber-950/40 flex items-center gap-1 w-max">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{dailyPct >= 95 ? '95% CRITICAL' : '80% WARNING'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800 text-emerald-300 bg-emerald-950/40 flex items-center gap-1 w-max">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
