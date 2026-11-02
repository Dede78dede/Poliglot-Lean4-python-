import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { BlueprintNode, BlueprintEdge } from '../../types/blueprint';
import { LeanAtlasViewer } from './LeanAtlasViewer';
import {
  blueprintStubGenerator,
  type BlueprintStubResult,
} from '../../services/blueprint/blueprint-stub-generator';

export interface BlueprintCanvasProps {
  readonly nodes: readonly BlueprintNode[];
  readonly edges: readonly BlueprintEdge[];
  readonly onSelectNode?: (nodeId: string) => void;
  readonly onOpenGeneratedFile?: (path: string, content: string) => void;
  readonly isEnabled?: boolean;
}

export function BlueprintCanvas({
  nodes,
  edges,
  onSelectNode,
  onOpenGeneratedFile,
  isEnabled = true,
}: BlueprintCanvasProps): React.JSX.Element {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stubResult, setStubResult] = useState<BlueprintStubResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [filterMissingDeps, setFilterMissingDeps] = useState(false);

  // Check if at least one node is unformalized/unproven
  const hasUnformalizedNodes = useMemo(() => {
    return nodes.some(
      (n) =>
        n.status === 'unproven' ||
        n.status === 'claimed' ||
        (n as { proofStatus?: string }).proofStatus === 'unformalized' ||
        (n as { proofStatus?: string }).proofStatus === 'sorry'
    );
  }, [nodes]);

  const handleGenerateStubs = async () => {
    setIsGenerating(true);
    try {
      const result = await blueprintStubGenerator.generateStub(
        { nodes, edges },
        { moduleName: 'Blueprint.Main' }
      );
      setStubResult(result);
    } catch (err) {
      console.error('Failed to generate blueprint stubs:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyClipboard = async () => {
    if (!stubResult) return;
    try {
      await navigator.clipboard.writeText(stubResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleApplyToEditor = () => {
    if (!stubResult) return;
    if (onOpenGeneratedFile) {
      onOpenGeneratedFile(stubResult.fileName, stubResult.content);
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Blueprint DAG Canvas
          </span>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasUnformalizedNodes && (
            <button
              onClick={handleGenerateStubs}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Generate Lean Stubs'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden">
        <LeanAtlasViewer
          nodes={nodes}
          edges={edges}
          onSelectNode={onSelectNode}
          isEnabled={isEnabled}
        />

        {/* Generated Stubs Modal / Overlay Preview */}
        {stubResult && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-100">
                    Generated Lean 4 Stubs · {stubResult.fileName}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                    {stubResult.generatedNodes.length} generated
                  </span>
                </div>
                <button
                  onClick={() => setStubResult(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Skipped Nodes Banner (if any) */}
              {stubResult.skippedNodes.length > 0 && (
                <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {stubResult.skippedNodes.length} node(s) skipped (
                      {stubResult.skippedNodes.map((s) => `${s.nodeId}: ${s.reason}`).join(', ')}
                      )
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={filterMissingDeps}
                      onChange={(e) => setFilterMissingDeps(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="text-[11px]">Include missing deps</span>
                  </label>
                </div>
              )}

              {/* Code Preview */}
              <div className="flex-1 overflow-auto p-4 bg-slate-950/90 font-mono text-xs text-slate-200">
                <pre className="whitespace-pre leading-relaxed">{stubResult.content}</pre>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/60">
                <div className="text-xs text-slate-500">
                  Target: <span className="text-slate-300 font-mono">{stubResult.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy to Clipboard'}</span>
                  </button>

                  <button
                    onClick={handleApplyToEditor}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors shadow-sm"
                  >
                    {applied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>{applied ? 'Applied to Editor' : 'Apply to Editor (Blueprint/Main.lean)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
