import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Network,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
  Lock,
  Unlock,
  Play,
  RotateCw,
  Sparkles,
  Search,
  ExternalLink,
  Activity,
  FileCode,
  Terminal,
} from 'lucide-react';
import type {
  ArchonWorkspace,
  BlueprintNode,
  BlueprintEdge,
  CollaboratorPresence,
  VerificationStatus,
  WorkspaceSummary,
} from '../../types/blueprint';
import { sharedWorkspaceClient } from '../../services/collaboration/blueprint-workspace-client';

export interface BlueprintWorkspaceModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onOpenInEditor?: (code: string, language: 'lean4' | 'python', filePath?: string) => void;
}

export function BlueprintWorkspaceModal({
  isOpen,
  onClose,
  onOpenInEditor,
}: BlueprintWorkspaceModalProps): React.JSX.Element | null {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('ws-liquid-tensor');
  const [workspace, setWorkspace] = useState<ArchonWorkspace | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dag' | 'ledger' | 'harness'>('dag');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [presences, setPresences] = useState<readonly CollaboratorPresence[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // Load available workspaces
  useEffect(() => {
    if (!isOpen) return;
    void sharedWorkspaceClient.fetchWorkspaces().then((list) => {
      setWorkspaces(list);
      if (list.length > 0 && !list.some((w) => w.id === selectedWorkspaceId)) {
        setSelectedWorkspaceId(list[0].id);
      }
    });
  }, [isOpen, selectedWorkspaceId]);

  // Connect to workspace and listen to real-time events
  useEffect(() => {
    if (!isOpen || !selectedWorkspaceId) return;

    // Fetch initial state via REST
    void sharedWorkspaceClient.fetchWorkspace(selectedWorkspaceId).then((ws) => {
      if (ws) {
        setWorkspace(ws);
        setPresences(ws.collaborators || []);
        if (ws.nodes.length > 0 && !selectedNodeId) {
          setSelectedNodeId(ws.nodes[0].id);
        }
      }
    });

    // Connect WebSocket
    sharedWorkspaceClient.connect(selectedWorkspaceId);

    const unsubscribe = sharedWorkspaceClient.subscribe((event) => {
      if (event.type === 'connection_status') {
        setConnectionStatus(event.payload.status as any);
      } else if (event.type === 'workspace_snapshot') {
        const ws = event.payload.workspace as ArchonWorkspace;
        if (ws) {
          setWorkspace(ws);
          setPresences((event.payload.presences as CollaboratorPresence[]) || ws.collaborators);
        }
      } else if (event.type === 'presence_joined' || event.type === 'presence_left') {
        if (event.payload.presences) {
          setPresences(event.payload.presences as CollaboratorPresence[]);
        }
      } else if (event.type === 'node_claimed' || event.type === 'node_released' || event.type === 'node_verified') {
        const updatedNode = event.payload.node as BlueprintNode;
        if (updatedNode) {
          setWorkspace((prev) => {
            if (!prev) return prev;
            const nodes = prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
            return { ...prev, nodes };
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, selectedWorkspaceId, selectedNodeId]);

  // Handle node selection
  const handleSelectNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setVerifyMessage(null);
      sharedWorkspaceClient.updateCursor(selectedWorkspaceId, nodeId);
    },
    [selectedWorkspaceId]
  );

  // Claim node
  const handleClaimNode = useCallback(
    async (agentType: 'human' | 'claude' | 'leanstral' | 'axle' | 'heuristic' = 'human') => {
      if (!selectedNodeId || !workspace) return;
      const res = await sharedWorkspaceClient.claimNode(workspace.id, selectedNodeId, agentType);
      if (res.success && res.node) {
        setWorkspace((prev) => {
          if (!prev) return prev;
          const nodes = prev.nodes.map((n) => (n.id === res.node!.id ? res.node! : n));
          return { ...prev, nodes };
        });
      } else {
        setVerifyMessage(res.message || 'Could not claim node');
      }
    },
    [selectedNodeId, workspace]
  );

  // Release node
  const handleReleaseNode = useCallback(async () => {
    if (!selectedNodeId || !workspace) return;
    const res = await sharedWorkspaceClient.releaseNode(workspace.id, selectedNodeId);
    if (res.success && res.node) {
      setWorkspace((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.map((n) => (n.id === res.node!.id ? res.node! : n));
        return { ...prev, nodes };
      });
    }
  }, [selectedNodeId, workspace]);

  // Verify node in Lean 4 kernel
  const handleVerifyNode = useCallback(async () => {
    if (!selectedNodeId || !workspace) return;
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await sharedWorkspaceClient.verifyNode(workspace.id, selectedNodeId);
      if (res.success && res.node) {
        setWorkspace((prev) => {
          if (!prev) return prev;
          const nodes = prev.nodes.map((n) => (n.id === res.node!.id ? res.node! : n));
          return { ...prev, nodes };
        });
        setVerifyMessage('✓ Kernel verified: proof certified and sealed in Tier 5 storage');
      } else {
        setVerifyMessage(`✗ Verification rejected: ${res.message || 'Check failed'}`);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [selectedNodeId, workspace]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!workspace || !selectedNodeId) return null;
    return workspace.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [workspace, selectedNodeId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!workspace) return [];
    return workspace.nodes.filter((node) => {
      const matchesSearch =
        node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.statement && node.statement.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workspace, searchQuery, statusFilter]);

  // Group nodes by layer for topological DAG columns
  const layerColumns = useMemo(() => {
    const layers = new Map<number, BlueprintNode[]>();
    for (const node of filteredNodes) {
      const list = layers.get(node.layer) || [];
      list.push(node);
      layers.set(node.layer, list);
    }
    return Array.from(layers.entries()).sort(([a], [b]) => a - b);
  }, [filteredNodes]);

  // Upstream and Downstream dependencies for selected node
  const { upstreamDeps, downstreamDeps } = useMemo(() => {
    if (!workspace || !selectedNodeId) return { upstreamDeps: [], downstreamDeps: [] };
    const upstreamIds = new Set(
      workspace.edges.filter((e) => e.to === selectedNodeId).map((e) => e.from)
    );
    const downstreamIds = new Set(
      workspace.edges.filter((e) => e.from === selectedNodeId).map((e) => e.to)
    );

    return {
      upstreamDeps: workspace.nodes.filter((n) => upstreamIds.has(n.id)),
      downstreamDeps: workspace.nodes.filter((n) => downstreamIds.has(n.id)),
    };
  }, [workspace, selectedNodeId]);

  // Progress metrics
  const progressMetrics = useMemo(() => {
    if (!workspace) return { total: 0, verified: 0, claimed: 0, percent: 0 };
    const total = workspace.nodes.length || 1;
    const verified = workspace.nodes.filter(
      (n) => n.status === 'kernel_verified' || n.status === 'empirically_validated'
    ).length;
    const claimed = workspace.nodes.filter((n) => n.status === 'claimed').length;
    const percent = Math.round((verified / total) * 100);
    return { total, verified, claimed, percent };
  }, [workspace]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blueprint-workspace-title"
    >
      <div className="flex flex-col w-full max-w-7xl h-[92vh] bg-[#0c1017] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-[#080c13]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="blueprint-workspace-title" className="text-sm font-semibold text-white tracking-wide">
                  Archon Horizon Blueprint Workspace
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
                  Phase 7 DAG
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono">
                  Toolchain: {workspace?.toolchain || 'v4.35.0-rc4'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {workspace?.name || 'Loading mathematical blueprint...'}
              </p>
            </div>
          </div>

          {/* Right side header: Presence & Progress */}
          <div className="flex items-center gap-4">
            {/* Live Presence Bar */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-neutral-900/80 border border-neutral-800">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs text-neutral-400 font-mono">
                  {connectionStatus === 'connected' ? 'Relay Active' : 'Connecting...'}
                </span>
              </div>
              <div className="h-3 w-px bg-neutral-800" />
              <div className="flex items-center -space-x-1.5">
                {presences.slice(0, 4).map((p) => (
                  <div
                    key={p.userId}
                    className="w-5 h-5 rounded-full border border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: p.userColor }}
                    title={`${p.userName} (${p.status}) ${p.activeNodeId ? `- Focusing: ${p.activeNodeId}` : ''}`}
                  >
                    {p.userName.slice(0, 1)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-neutral-300 font-mono">
                {presences.length} online
              </span>
            </div>

            {/* Progress Bar Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 font-mono text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {progressMetrics.verified}/{progressMetrics.total} Verified ({progressMetrics.percent}%)
              </span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close blueprint modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Workspace Selector & Tab Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#090e16] border-b border-neutral-800 text-xs">
          {/* Workspace dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">Workspace:</span>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="bg-neutral-900 border border-neutral-700/80 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.completionPercent}% complete)
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('dag')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'dag'
                  ? 'bg-indigo-600 text-white font-medium shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Blueprint DAG</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600 text-white font-medium shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Shared Ledger & Roadmap</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('harness')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'harness'
                  ? 'bg-indigo-600 text-white font-medium shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Agent Seam</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: BLUEPRINT DAG VIEW */}
          {activeTab === 'dag' && (
            <div className="flex-1 flex overflow-hidden">
              {/* DAG Canvas Area */}
              <div className="flex-1 flex flex-col bg-[#070b12] overflow-hidden border-r border-neutral-800">
                {/* Canvas Controls & Filter Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#090d16] border-b border-neutral-800/80 text-xs">
                  {/* Search and Filters */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Search theorems & lemmas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-md pl-8 pr-2.5 py-1 text-slate-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 w-52"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {(['all', 'unproven', 'claimed', 'kernel_verified'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                            statusFilter === st
                              ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                              : 'text-neutral-400 hover:text-neutral-300'
                          }`}
                        >
                          {st === 'all' ? 'All Nodes' : st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                      className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                    >
                      -
                    </button>
                    <span className="text-neutral-400 w-10 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                      className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Graph Columns View */}
                <div className="flex-1 overflow-auto p-6" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
                  <div className="flex gap-8 min-w-max">
                    {layerColumns.map(([layerIdx, nodes]) => (
                      <div key={layerIdx} className="flex flex-col gap-4 w-72 shrink-0">
                        {/* Layer Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            {layerIdx === 0
                              ? 'Layer 0: Axioms & Definitions'
                              : layerIdx === 1
                              ? 'Layer 1: Foundational Lemmas'
                              : layerIdx === 2
                              ? 'Layer 2: Intermediate Theorems'
                              : `Layer ${layerIdx}: Culminating Theorems`}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {nodes.length}
                          </span>
                        </div>

                        {/* Nodes in this layer */}
                        <div className="flex flex-col gap-3">
                          {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const isVerified = node.status === 'kernel_verified';
                            const isEmpirical = node.status === 'empirically_validated';
                            const isClaimed = node.status === 'claimed';
                            const isUnproven = node.status === 'unproven';

                            return (
                              <div
                                key={node.id}
                                onClick={() => handleSelectNode(node.id)}
                                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#151c28] border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                                    : isVerified
                                    ? 'bg-[#0a1310] border-emerald-900/60 hover:border-emerald-700/80'
                                    : isEmpirical
                                    ? 'bg-[#09131d] border-sky-900/60 hover:border-sky-700/80'
                                    : isClaimed
                                    ? 'bg-[#18150c] border-amber-900/60 hover:border-amber-700/80'
                                    : 'bg-[#140c0c] border-rose-950/80 hover:border-rose-800'
                                }`}
                              >
                                {/* Node Header */}
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                                        node.kind === 'theorem'
                                          ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                                          : node.kind === 'lemma'
                                          ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                                          : node.kind === 'python_witness'
                                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                                      }`}
                                    >
                                      {node.kind}
                                    </span>
                                    <span className="text-xs font-semibold text-white truncate" title={node.id}>
                                      {node.name}
                                    </span>
                                  </div>

                                  {/* Status Icon */}
                                  {isVerified && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  )}
                                  {isEmpirical && (
                                    <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  )}
                                  {isClaimed && (
                                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                  {isUnproven && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  )}
                                </div>

                                {/* Node Signature */}
                                <p className="text-[11px] font-mono text-neutral-300 truncate mb-1">
                                  {node.signature}
                                </p>

                                {/* Footer details */}
                                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/40">
                                  <span>{node.filePath.split('/').pop()}</span>
                                  {isClaimed && node.claim && (
                                    <span className="text-amber-400 font-medium">
                                      Claimed: {node.claim.userName.split(' ')[0]}
                                    </span>
                                  )}
                                  {isVerified && (
                                    <span className="text-emerald-400 font-medium">
                                      Kernel Sealed
                                    </span>
                                  )}
                                  {isUnproven && (
                                    <span className="text-rose-400">
                                      open obligation
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inspector Side Drawer */}
              <div className="w-96 flex flex-col bg-[#0b0f17] border-l border-neutral-800 overflow-y-auto p-5 text-xs">
                {selectedNode ? (
                  <div className="flex flex-col gap-5">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">
                          Declaration Inspector
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            selectedNode.status === 'kernel_verified'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : selectedNode.status === 'empirically_validated'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : selectedNode.status === 'claimed'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {selectedNode.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white break-words">
                        {selectedNode.id}
                      </h3>
                      <p className="text-neutral-400 text-xs mt-1">
                        {selectedNode.statement || 'No informal statement provided'}
                      </p>
                    </div>

                    {/* Signature block */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-neutral-400 font-semibold">Signature</span>
                      <pre className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-indigo-200 overflow-x-auto whitespace-pre-wrap">
                        {selectedNode.signature}
                      </pre>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{selectedNode.filePath}</span>
                      </div>
                      <span className="text-neutral-500">
                        L{selectedNode.lineRange.start}-{selectedNode.lineRange.end}
                      </span>
                    </div>

                    {/* Claim Details if claimed */}
                    {selectedNode.claim && (
                      <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          <User className="w-3.5 h-3.5" />
                          <span>Claimed by: {selectedNode.claim.userName}</span>
                        </div>
                        <p className="text-[11px] text-amber-200/80">
                          {selectedNode.claim.notes || 'In-progress formalization'}
                        </p>
                        <span className="text-[10px] font-mono text-amber-400/60 mt-1">
                          Claimed at: {new Date(selectedNode.claim.claimedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}

                    {/* Kernel Verification Certificate if verified */}
                    {selectedNode.kernelCertificate && (
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Tier 5 Kernel Seal Certificate</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-emerald-200/80">
                          <div>Terms: 5/5 Valid</div>
                          <div>Duration: {selectedNode.kernelCertificate.durationMs}ms</div>
                          <div>Zero-Sorry: Yes</div>
                          <div>Toolchain: {selectedNode.kernelCertificate.toolchain}</div>
                        </div>
                        <div className="pt-1.5 border-t border-emerald-900/50">
                          <span className="text-[9px] font-mono text-emerald-400/70 break-all">
                            Seal: {selectedNode.kernelCertificate.signatureSeal}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Upstream & Downstream Dependencies */}
                    <div className="flex flex-col gap-2">
                      <span className="text-neutral-400 font-semibold">Dependencies ({upstreamDeps.length})</span>
                      {upstreamDeps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {upstreamDeps.map((dep) => (
                            <button
                              key={dep.id}
                              type="button"
                              onClick={() => handleSelectNode(dep.id)}
                              className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-mono"
                            >
                              ← {dep.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">No upstream dependencies (base axiom)</span>
                      )}

                      <span className="text-neutral-400 font-semibold mt-2">Dependents ({downstreamDeps.length})</span>
                      {downstreamDeps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {downstreamDeps.map((dep) => (
                            <button
                              key={dep.id}
                              type="button"
                              onClick={() => handleSelectNode(dep.id)}
                              className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-mono"
                            >
                              → {dep.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">No downstream dependents</span>
                      )}
                    </div>

                    {/* Verification Message Alert */}
                    {verifyMessage && (
                      <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
                        {verifyMessage}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                      {selectedNode.status !== 'kernel_verified' && (
                        <div className="flex gap-2">
                          {selectedNode.status === 'claimed' ? (
                            <button
                              type="button"
                              onClick={handleReleaseNode}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-200 font-medium"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Release Claim</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClaimNode('human')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Claim Obligation</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleVerifyNode}
                            disabled={isVerifying}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isVerifying ? 'Verifying...' : 'Verify in Kernel'}</span>
                          </button>
                        </div>
                      )}

                      {/* Open in Monaco Editor Button */}
                      {onOpenInEditor && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenInEditor(
                              selectedNode.code,
                              selectedNode.language === 'python' ? 'python' : 'lean4',
                              selectedNode.filePath
                            );
                            onClose();
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Open in Monaco Editor</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-neutral-500 italic">
                    Select a declaration node in the DAG to inspect properties and actions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SHARED LEDGER & ROADMAP */}
          {activeTab === 'ledger' && (
            <div className="flex-1 flex overflow-hidden p-6 gap-6">
              {/* Left Column: Roadmap Milestones */}
              <div className="w-1/2 flex flex-col bg-[#080c13] border border-neutral-800 rounded-xl p-5 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-800">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Project Roadmap & Formal Milestones</h3>
                </div>
                <div className="flex flex-col gap-4">
                  {workspace?.roadmap && workspace.roadmap.length > 0 ? (
                    workspace.roadmap.map((m) => (
                      <div
                        key={m.id}
                        className={`p-4 rounded-lg border ${
                          m.completed
                            ? 'bg-emerald-950/20 border-emerald-900/50'
                            : 'bg-neutral-900/60 border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-white">{m.title}</h4>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              m.completed
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {m.completed ? 'COMPLETED' : 'IN PROGRESS'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mb-2">{m.description}</p>
                        <div className="flex flex-wrap gap-1 text-[10px] font-mono text-neutral-500">
                          <span>Targets:</span>
                          {m.targetNodeIds.map((tid) => (
                            <span key={tid} className="px-1.5 py-0.2 rounded bg-neutral-950 text-neutral-300">
                              {tid}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-500 italic text-xs">No roadmap milestones configured</div>
                  )}
                </div>
              </div>

              {/* Right Column: Shared Ledger Event Log */}
              <div className="w-1/2 flex flex-col bg-[#080c13] border border-neutral-800 rounded-xl p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Cryptographic Shared Ledger (Archon)</h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {workspace?.ledger.length || 0} Events
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {workspace?.ledger.map((entry) => (
                    <div
                      key={entry.seq}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-400 font-bold">#{entry.seq}</span>
                          <span className="text-neutral-200 font-semibold">{entry.type}</span>
                          {entry.nodeId && <span className="text-amber-400">({entry.nodeId})</span>}
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-neutral-400 text-[10px]">
                        Author: <span className="text-neutral-300">{entry.author.name}</span> ({entry.author.role})
                      </div>
                      <div className="text-[9px] text-neutral-600 truncate">
                        Hash: {entry.integrityHash}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI AGENT SEAM */}
          {activeTab === 'harness' && (
            <div className="flex-1 flex flex-col p-6 bg-[#080c13] overflow-y-auto max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Archon Multi-Engine Proof Agent Seam</h3>
              </div>
              <p className="text-xs text-neutral-400 mb-6">
                Assign open proof obligations to local or cloud AI formalization harnesses.
                All suggested proofs must pass the 5-term verification formula and kernel seal before committing.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Leanstral 1.5 Local MoE</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Self-hosted 119B/6B active MoE for agentic proof repair. Zero external API calls.
                  </p>
                  <span className="text-[10px] text-emerald-400 font-mono mt-auto">✓ Ready (Ollama/vLLM)</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>AXLE Metaprogramming</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Cloud Lean 4 engine with 14 metaprogramming tools and 3-pass proof repair.
                  </p>
                  <span className="text-[10px] text-amber-400 font-mono mt-auto">Requires Consent & Key</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <RotateCw className="w-4 h-4 text-indigo-400" />
                    <span>NoAi Heuristic Search</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Fast deterministic search over Pantograph tactic candidates (`rfl`, `omega`, `decide`).
                  </p>
                  <span className="text-[10px] text-emerald-400 font-mono mt-auto">✓ Built-in Native</span>
                </div>
              </div>

              {/* Open obligations list */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-neutral-300">Open Proof Obligations in Workspace</h4>
                {workspace?.nodes.filter((n) => n.status === 'unproven').map((n) => (
                  <div key={n.id} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{n.name}</span>
                      <p className="text-[11px] font-mono text-neutral-400">{n.signature}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectNode(n.id);
                        void handleClaimNode('leanstral');
                      }}
                      className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
                    >
                      Assign to Leanstral
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
