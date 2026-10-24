import React, { useState } from 'react';
import { X, Sparkles, Zap, Cloud, Layers, Calculator } from 'lucide-react';
import {
  type ProofTab,
  type ProofAutomationPanelProps,
} from './proof-automation-shared';
import { DuperPanel } from './panels/DuperPanel';
import { AxlePanel } from './panels/AxlePanel';
import { BlueprintSyncPanel } from './panels/BlueprintSyncPanel';
import { VeriphyCasPanel } from './panels/VeriphyCasPanel';

export type { ProofTab, ProofAutomationPanelProps };

export const ProofAutomationPanel: React.FC<ProofAutomationPanelProps> = ({
  isOpen,
  onClose,
  currentCode,
  language,
  onApplyCode,
  currentWorkspaceId = 'ws-liquid-tensor',
}) => {
  const [activeTab, setActiveTab] = useState<ProofTab>('auto-prove');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[640px] bg-[#0c1017] border-l border-slate-800 shadow-2xl flex flex-col font-sans text-slate-200">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-[#0e1420] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                Proof Automation & Metaprogramming
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                Phase 8
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Superposition Provers · Cloud Metaprogramming · Skeptical CAS · DAG Sync
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

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-[#0a0d14] px-4 pt-2 gap-1 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('auto-prove')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'auto-prove'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Auto-Prove (Duper/Aesop)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('axle-cloud')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'axle-cloud'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          AXLE Cloud
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blueprint-sync')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'blueprint-sync'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Blueprint Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('veriphy-cas')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'veriphy-cas'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Veriphy CAS
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {activeTab === 'auto-prove' && (
          <DuperPanel
            currentCode={currentCode}
            language={language}
            onApplyCode={onApplyCode}
          />
        )}
        {activeTab === 'axle-cloud' && (
          <AxlePanel
            currentCode={currentCode}
            onApplyCode={onApplyCode}
          />
        )}
        {activeTab === 'blueprint-sync' && (
          <BlueprintSyncPanel
            currentCode={currentCode}
            language={language}
            currentWorkspaceId={currentWorkspaceId}
            onApplyCode={onApplyCode}
          />
        )}
        {activeTab === 'veriphy-cas' && <VeriphyCasPanel />}
      </div>
    </div>
  );
};
