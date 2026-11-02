import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  Search,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Activity,
  Binary,
  Cpu,
  User,
  FlaskConical,
  Scale,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import {
  evidenceTimelineService,
  type TimelineEntry,
  type EvidenceActor,
} from '../../services/femev/evidence-timeline';
import {
  type EpistemicStatus,
  EPISTEMIC_PALETTE,
} from '../../types/epistemic-status';

export interface EvidenceTimelinePanelProps {
  readonly declarationId: string;
}

const ACTOR_STYLES: Record<EvidenceActor, { label: string; bg: string; text: string }> = {
  user: { label: 'User', bg: 'bg-blue-950/60', text: 'text-blue-300' },
  kernel: { label: 'Lean 4 Kernel', bg: 'bg-emerald-950/60', text: 'text-emerald-300' },
  veriphy: { label: 'Veriphy CAS', bg: 'bg-amber-950/60', text: 'text-amber-300' },
  leancert: { label: 'LeanCert', bg: 'bg-indigo-950/60', text: 'text-indigo-300' },
  leanscreen: { label: 'LeanScreen', bg: 'bg-cyan-950/60', text: 'text-cyan-300' },
  leanflow: { label: 'LeanFlow', bg: 'bg-purple-950/60', text: 'text-purple-300' },
  pastaLean: { label: 'PastaLean', bg: 'bg-violet-950/60', text: 'text-violet-300' },
  axle: { label: 'AXLE', bg: 'bg-teal-950/60', text: 'text-teal-300' },
  duper: { label: 'Duper', bg: 'bg-orange-950/60', text: 'text-orange-300' },
};

function getEvidenceIcon(kind: string): React.JSX.Element {
  switch (kind) {
    case 'formal-proof':
    case 'kernel-proof':
      return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case 'numeric-certificate':
      return <FileCheck className="w-3.5 h-3.5 text-indigo-400" />;
    case 'numerical-test':
    case 'heuristic-interval':
      return <Activity className="w-3.5 h-3.5 text-amber-400" />;
    case 'faithfulness-screening':
      return <Scale className="w-3.5 h-3.5 text-cyan-400" />;
    case 'visual-pattern':
    case 'empirical-orbit':
      return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
    case 'sage-witness':
      return <FlaskConical className="w-3.5 h-3.5 text-teal-400" />;
    default:
      return <Binary className="w-3.5 h-3.5 text-slate-400" />;
  }
}

export function EvidenceTimelinePanel({ declarationId }: EvidenceTimelinePanelProps): React.JSX.Element {
  const [entries, setEntries] = useState<readonly TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    evidenceTimelineService
      .timeline(declarationId)
      .then((data) => {
        if (mounted) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load evidence timeline:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [declarationId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCorrelationId = (cid: string) => {
    navigator.clipboard.writeText(cid);
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${declarationId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (actorFilter !== 'all' && entry.actor !== actorFilter) return false;
      if (
        statusFilter !== 'all' &&
        entry.transition.from !== statusFilter &&
        entry.transition.to !== statusFilter
      ) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const inSummary = entry.summary.toLowerCase().includes(query);
        const inActor = entry.actor.toLowerCase().includes(query);
        const inDetails = entry.details
          ? JSON.stringify(entry.details).toLowerCase().includes(query)
          : false;
        if (!inSummary && !inActor && !inDetails) return false;
      }
      return true;
    });
  }, [entries, actorFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-lg overflow-hidden border border-slate-800">
      {/* Control Bar: Filters & Export */}
      <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search evidence or details..."
              className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Actors</option>
            {Object.keys(ACTOR_STYLES).map((actor) => (
              <option key={actor} value={actor}>
                {ACTOR_STYLES[actor as EvidenceActor]?.label || actor}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All States</option>
            {Object.keys(EPISTEMIC_PALETTE).map((status) => (
              <option key={status} value={status}>
                {EPISTEMIC_PALETTE[status as EpistemicStatus]?.label || status}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExportJson}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
            Loading evidence timeline audit trail...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No evidence events matched the criteria.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const actorStyle = ACTOR_STYLES[entry.actor] || {
              label: entry.actor,
              bg: 'bg-slate-800',
              text: 'text-slate-300',
            };
            const fromPalette = EPISTEMIC_PALETTE[entry.transition.from] || {
              label: entry.transition.from,
              bgClass: 'bg-slate-800',
              textClass: 'text-slate-300',
            };
            const toPalette = EPISTEMIC_PALETTE[entry.transition.to] || {
              label: entry.transition.to,
              bgClass: 'bg-slate-800',
              textClass: 'text-slate-300',
            };
            const isExpanded = expandedIds.has(entry.id);

            return (
              <div
                key={entry.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors text-xs"
              >
                {/* Top Row: Timestamp, Actor, Transition */}
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${actorStyle.bg} ${actorStyle.text}`}
                    >
                      {actorStyle.label}
                    </span>
                  </div>

                  {/* Transition Badge */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded ${fromPalette.bgClass} ${fromPalette.textClass}`}>
                      {fromPalette.label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className={`px-1.5 py-0.5 rounded ${toPalette.bgClass} ${toPalette.textClass}`}>
                      {toPalette.label}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Kind icon + Summary */}
                <div className="flex items-start gap-2 text-slate-200 mb-2">
                  <div className="mt-0.5 shrink-0">{getEvidenceIcon(entry.evidenceKind)}</div>
                  <div className="flex-1 leading-relaxed">{entry.summary}</div>
                </div>

                {/* Bottom Row: Correlation ID + Details toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-500">
                  <button
                    onClick={() => handleCopyCorrelationId(entry.correlationId)}
                    className="flex items-center gap-1 hover:text-slate-300 font-mono transition-colors"
                    title="Click to copy correlation ID"
                  >
                    {copiedCid === entry.correlationId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{entry.correlationId}</span>
                  </button>

                  {entry.details && (
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                    </button>
                  )}
                </div>

                {/* Expandable JSON viewer */}
                {isExpanded && entry.details && (
                  <div className="mt-2.5 p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-300 overflow-x-auto">
                    <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
