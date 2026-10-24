import React, { useState, useSyncExternalStore } from 'react';
import {
  X,
  Terminal,
  Search,
  Activity,
  Server,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import {
  LEAN_LSP_MCP_TOOLS,
  type McpToolCategory,
  type McpToolDeclaration,
} from '../../../server/src/services/mcp/mcp-client-types';
import { mcpExternalSearchRateLimiter } from '../../../server/src/services/mcp/mcp-rate-limiter';
import { leanLspMcpClient } from '../../../server/src/services/mcp/lean-lsp-mcp-client';
import {
  mcpServerRegistry,
  type McpServerTool,
} from '../../services/mcp/mcp-server-registry';
import '../../services/mcp/mcp-server'; // ensure 10 tools are registered

export interface McpToolsDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transport?: 'stdio' | 'streamable-http' | 'sse';
  readonly isConnected?: boolean;
}

const CLIENT_CATEGORIES: readonly { id: McpToolCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tutti (26)' },
  { id: 'file-analysis', label: 'File Analysis (3)' },
  { id: 'proof-state', label: 'Proof State (4)' },
  { id: 'code-intelligence', label: 'Code Intelligence (5)' },
  { id: 'search', label: 'Semantic Search (6)' },
  { id: 'tactics', label: 'Tactics & Repair (3)' },
  { id: 'build', label: 'Build (2)' },
  { id: 'widgets-profiling', label: 'Widgets & Profiling (3)' },
];

export function McpToolsDrawer({
  isOpen,
  onClose,
  transport = 'stdio',
  isConnected = true,
}: McpToolsDrawerProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'client' | 'server'>('client');
  const [selectedCategory, setSelectedCategory] = useState<McpToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const clientSnapshot = useSyncExternalStore(
    leanLspMcpClient.subscribe,
    leanLspMcpClient.getSnapshot,
  );
  const serverSnapshot = useSyncExternalStore(
    mcpServerRegistry.subscribe,
    mcpServerRegistry.getSnapshot,
  );

  const activeTransport = clientSnapshot.transport || transport;
  const isCurrentlyConnected = clientSnapshot.isConnected ?? isConnected;

  if (!isOpen) return null;

  const rateLimitStatus = mcpExternalSearchRateLimiter.getStatus();

  const filteredClientTools = LEAN_LSP_MCP_TOOLS.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredServerTools = serverSnapshot.tools.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[680px] bg-[#0c1017] border-l border-slate-800 shadow-2xl flex flex-col font-sans text-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-[#0e1420] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-none bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            {activeTab === 'client' ? <Terminal className="w-4 h-4" /> : <Server className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                {activeTab === 'client' ? 'Lean LSP MCP Client Tools' : 'Polyglot MCP Server Hub'}
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 border border-cyan-800/60 text-cyan-300 bg-cyan-950/30">
                Phase 10.3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'client'
                ? 'Client Mode · lean-lsp-mcp & rust-lean-mcp (26 Tools)'
                : 'Server Mode · Exposed to Claude Code, Codex & Leanstral (10 Tools)'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800/80 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-800 bg-[#090d15] text-xs font-mono">
        <button
          type="button"
          onClick={() => {
            setActiveTab('client');
            setSelectedTool(null);
          }}
          className={`flex-1 py-2 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'client'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>LSP Client Tools ({LEAN_LSP_MCP_TOOLS.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('server');
            setSelectedTool(null);
          }}
          className={`flex-1 py-2 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'server'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server Hub Tools ({serverSnapshot.toolsCount})</span>
        </button>
      </div>

      {/* Telemetry Status Strip */}
      <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0a0d14] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Transport: {activeTab === 'client' ? activeTransport.toUpperCase() : 'STREAMABLE-HTTP (/mcp)'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Status: {isCurrentlyConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <div className="text-[11px] text-amber-300 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>
            {activeTab === 'client'
              ? `Search Rate: ${rateLimitStatus.remaining}/3 req`
              : 'Server Limit: 100 req/min'}
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 border-b border-slate-800 bg-[#0c1017] space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'client'
                ? 'Search client tools (e.g. goal, loogle, verify_kernel)...'
                : 'Search server tools (e.g. manifest, blueprint, autocorrect)...'
            }
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {activeTab === 'client' && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
            {CLIENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-[11px] font-mono border transition-colors shrink-0 ${
                  selectedCategory === cat.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-[#0a0d14] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#090d15]/50">
        {activeTab === 'client' ? (
          filteredClientTools.map((tool: McpToolDeclaration) => {
            const isSelected = selectedTool === tool.name;
            return (
              <div
                key={tool.name}
                className={`p-3 border transition-colors ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800/80 bg-[#0c1017] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-xs text-cyan-300">{tool.name}</span>
                    {tool.isExternalSearch && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 border border-amber-800/60 text-amber-300 bg-amber-950/20">
                        Rate Limited (3/30s)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTool(isSelected ? null : tool.name)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-mono"
                  >
                    {isSelected ? 'Nascondi schema' : 'Ispeziona schema'}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tool.description}</p>

                {isSelected && (
                  <div className="mt-3 p-3 bg-[#06080d] border border-slate-800/80 text-[11px] font-mono space-y-2">
                    <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                      Category: <span className="text-slate-200">{tool.category}</span>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                        Parameters Schema:
                      </div>
                      <pre className="text-slate-300 bg-slate-950 p-2 overflow-x-auto text-[10px] border border-slate-900">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          filteredServerTools.map((tool: McpServerTool) => {
            const isSelected = selectedTool === tool.name;
            return (
              <div
                key={tool.name}
                className={`p-3 border transition-colors ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800/80 bg-[#0c1017] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-xs text-emerald-300">{tool.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 border flex items-center gap-1 ${
                        tool.permission === 'safe'
                          ? 'border-emerald-800/60 text-emerald-300 bg-emerald-950/20'
                          : 'border-amber-800/60 text-amber-300 bg-amber-950/20'
                      }`}
                    >
                      {tool.permission === 'safe' ? (
                        <>
                          <Shield className="w-2.5 h-2.5" />
                          <span>SAFE</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-2.5 h-2.5" />
                          <span>CONFIRM (2-PHASE)</span>
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTool(isSelected ? null : tool.name)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-mono"
                  >
                    {isSelected ? 'Nascondi schema' : 'Ispeziona schema'}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{tool.description}</p>

                {isSelected && (
                  <div className="mt-3 p-3 bg-[#06080d] border border-slate-800/80 text-[11px] font-mono space-y-2">
                    <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                      Permission: <span className="text-slate-200 font-semibold">{tool.permission.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                        Parameters Schema:
                      </div>
                      <pre className="text-slate-300 bg-slate-950 p-2 overflow-x-auto text-[10px] border border-slate-900">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-800 bg-[#0e1420] flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          {activeTab === 'client' ? (
            <>
              Client Tools: <span className="text-slate-200">{filteredClientTools.length} / 26</span>
            </>
          ) : (
            <>
              Server Hub Tools: <span className="text-slate-200">{filteredServerTools.length} / 10</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
