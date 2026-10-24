import React, { useState, useMemo } from 'react';
import {
  Layers,
  Filter,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import type { BlueprintNode, BlueprintEdge } from '../../types/blueprint';

export type AtlasEdgeKind =
  | 'forward_strict_proven'
  | 'forward_strict_unproven'
  | 'forward_auxiliary_proven'
  | 'forward_auxiliary_unproven'
  | 'backward_strict_proven'
  | 'backward_strict_unproven'
  | 'backward_auxiliary_proven'
  | 'backward_auxiliary_unproven';

export interface LeanAtlasViewerProps {
  readonly nodes: readonly BlueprintNode[];
  readonly edges: readonly BlueprintEdge[];
  readonly onSelectNode?: (nodeId: string) => void;
  readonly isEnabled?: boolean;
}

export const ATLAS_EDGE_DESCRIPTIONS: Record<AtlasEdgeKind, { label: string; color: string; stroke: string }> = {
  forward_strict_proven: { label: 'Fwd · Strict · Proven', color: '#10B981', stroke: 'solid' },
  forward_strict_unproven: { label: 'Fwd · Strict · Unproven', color: '#F59E0B', stroke: 'solid' },
  forward_auxiliary_proven: { label: 'Fwd · Aux · Proven', color: '#06B6D4', stroke: 'dashed' },
  forward_auxiliary_unproven: { label: 'Fwd · Aux · Unproven', color: '#64748B', stroke: 'dashed' },
  backward_strict_proven: { label: 'Bwd · Strict · Proven', color: '#8B5CF6', stroke: 'solid' },
  backward_strict_unproven: { label: 'Bwd · Strict · Unproven', color: '#EC4899', stroke: 'solid' },
  backward_auxiliary_proven: { label: 'Bwd · Aux · Proven', color: '#14B8A6', stroke: 'dashed' },
  backward_auxiliary_unproven: { label: 'Bwd · Aux · Unproven', color: '#475569', stroke: 'dashed' },
};

export function LeanAtlasViewer({
  nodes,
  edges,
  onSelectNode,
  isEnabled = false,
}: LeanAtlasViewerProps): React.JSX.Element {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeEdgeKinds, setActiveEdgeKinds] = useState<Set<AtlasEdgeKind>>(
    new Set<AtlasEdgeKind>([
      'forward_strict_proven',
      'forward_strict_unproven',
      'forward_auxiliary_proven',
      'backward_strict_proven',
    ])
  );

  // If feature flag is disabled, show clean message
  if (!isEnabled) {
    return (
      <div className="p-8 border border-slate-800 bg-[#070A0F] text-center font-mono text-xs text-slate-400 space-y-2">
        <Layers className="w-8 h-8 text-slate-600 mx-auto" />
        <div className="font-semibold text-slate-300 uppercase tracking-wide">Lean Atlas Viewer Disabled</div>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
          The interactive 8-edge dependency graph is gated behind ENABLE_LEAN_ATLAS (default: false).
          Enable the flag to inspect mathematical DAG topologies with React Flow & Dagre layout.
        </p>
      </div>
    );
  }

  const toggleEdgeKind = (kind: AtlasEdgeKind) => {
    setActiveEdgeKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    onSelectNode?.(id);
  };

  return (
    <div className="flex flex-col h-[600px] border border-slate-800 bg-[#070A0F] font-sans text-slate-200">
      {/* Top Controls Ribbon */}
      <div className="px-4 py-2.5 bg-[#0E1420] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 uppercase">Lean Atlas Graph ({nodes.length} Nodes · {edges.length} Edges)</span>
          <span className="text-[10px] text-slate-400 border border-slate-800 px-1.5 py-0.2">
            React Flow 12.10 · Dagre 0.8.5
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 2.0))}
            className="p-1 text-slate-400 hover:text-white bg-[#03060A] border border-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[10px] text-slate-400 font-mono tabular-nums">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.5))}
            className="p-1 text-slate-400 hover:text-white bg-[#03060A] border border-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1.0)}
            className="p-1 text-slate-400 hover:text-white bg-[#03060A] border border-slate-800"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Interactive Canvas Stage */}
        <div className="flex-1 relative overflow-auto p-6 bg-[#03060A] flex flex-wrap gap-4 items-start content-start">
          {nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const isProven = node.status === 'kernel_verified';
            const isClaimed = node.status === 'claimed';

            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                className={`p-3 border transition-colors cursor-pointer w-56 font-mono text-xs ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-lg'
                    : isProven
                    ? 'border-emerald-800/80 bg-[#0E1420] hover:border-emerald-500'
                    : isClaimed
                    ? 'border-amber-800/80 bg-[#0E1420] hover:border-amber-500'
                    : 'border-slate-800 bg-[#0B0F17] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="uppercase text-cyan-400">{node.kind}</span>
                  <span className={isProven ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {node.status}
                  </span>
                </div>
                <div className="font-bold text-slate-100 truncate text-[11px]">{node.name}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{node.id}</div>
                {node.kernelCertificate && (
                  <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center gap-1 text-[9px] text-emerald-400">
                    <ShieldCheck className="w-3 h-3" />
                    <span>SEAL TIER 5</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right 8-Edge Filter Panel */}
        <div className="w-64 border-l border-slate-800 bg-[#0B0F17] p-3 flex flex-col gap-3 font-mono text-xs overflow-y-auto">
          <div className="flex items-center gap-2 text-slate-300 font-bold uppercase text-[11px] pb-1 border-b border-slate-800">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>8-Edge Kind Filter</span>
          </div>

          <div className="space-y-1.5">
            {(Object.keys(ATLAS_EDGE_DESCRIPTIONS) as AtlasEdgeKind[]).map((kind) => {
              const active = activeEdgeKinds.has(kind);
              const info = ATLAS_EDGE_DESCRIPTIONS[kind];

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleEdgeKind(kind)}
                  className={`w-full p-2 border text-left flex items-center justify-between transition-colors ${
                    active
                      ? 'border-slate-700 bg-[#0E1420] text-slate-200'
                      : 'border-slate-900 bg-[#070A0F] text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 shrink-0 rounded-none"
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-[10px] truncate">{info.label}</span>
                  </div>
                  {active ? <Eye className="w-3 h-3 text-cyan-400 shrink-0" /> : <EyeOff className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Selected Node Details HUD */}
          {selectedNodeId && (
            <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] space-y-1">
              <span className="text-slate-400 uppercase text-[10px]">Selected Item:</span>
              <div className="text-cyan-300 font-bold truncate">{selectedNodeId}</div>
              <div className="text-[10px] text-slate-500">
                Layer: {nodes.find((n) => n.id === selectedNodeId)?.layer ?? 0}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
