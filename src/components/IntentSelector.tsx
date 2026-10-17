import React from 'react';
import { Compass, Sparkles, Code2, BookOpen, ArrowRight } from 'lucide-react';
import type { SupportedLanguage } from '../types/language';

export interface IntentSelectorProps {
  readonly onSelectLeanGuided: () => void;
  readonly onSelectPythonGuided: () => void;
  readonly onStartBlank: (lang: SupportedLanguage) => void;
  readonly onOpenGallery: () => void;
  readonly onOpenDiscovery?: () => void;
}

export function IntentSelector({
  onSelectLeanGuided,
  onSelectPythonGuided,
  onStartBlank,
  onOpenGallery,
  onOpenDiscovery,
}: IntentSelectorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-12 max-w-4xl mx-auto h-full text-slate-100 select-none">
      {/* Title & Intro */}
      <div className="text-center space-y-3 mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans">
          Welcome to Polyglot Code Studio
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          A high-performance environment for empirical computation in Python 3.14 and formal theorem proving in Lean 4.
        </p>
      </div>

      {/* 3 Intent Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
        {/* Card 1: Learn Lean 4 */}
        <button
          type="button"
          onClick={onSelectLeanGuided}
          className="group flex flex-col text-left p-5 rounded-xl bg-[#111827] border border-neutral-800 hover:border-blue-500/80 hover:bg-[#161f33] transition-all cursor-pointer shadow-lg hover:shadow-blue-900/20"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
            Learn Lean 4
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
            Step-by-step guided proofs from reflexivity to mathematical induction and `omega` tactic automation with live Infoview goals.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 group-hover:translate-x-0.5 transition-transform">
            <span>Start 7 Proof Steps</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 2: Learn Python */}
        <button
          type="button"
          onClick={onSelectPythonGuided}
          className="group flex flex-col text-left p-5 rounded-xl bg-[#111827] border border-neutral-800 hover:border-emerald-500/80 hover:bg-[#112423] transition-all cursor-pointer shadow-lg hover:shadow-emerald-900/20"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">
            Learn Python
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
            Client-side WebAssembly execution with Pyodide 314.0.1, NumPy linear algebra, FFT analysis, and dynamic `micropip` packages.
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
            <span>Start 6 Python Steps</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 3: Start Blank */}
        <div className="flex flex-col text-left p-5 rounded-xl bg-[#111827] border border-neutral-800 hover:border-neutral-700 transition-all shadow-lg">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-4 text-slate-300">
            <Code2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">
            Start Blank
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
            Jump directly into an empty Monaco scratchpad with your language of choice.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onStartBlank('python')}
              className="flex-1 py-1.5 px-3 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-slate-200 transition-colors text-center"
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => onStartBlank('lean4')}
              className="flex-1 py-1.5 px-3 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-slate-200 transition-colors text-center"
            >
              Lean 4
            </button>
          </div>
        </div>
      </div>

      {/* Footer Navigation Links */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenGallery}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Browse Reference Gallery</span>
          <kbd className="px-1.5 py-0.5 bg-neutral-800 text-slate-300 rounded text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>

        {onOpenDiscovery && (
          <button
            type="button"
            onClick={onOpenDiscovery}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-2 px-4 rounded-lg bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-700"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Esplora Progetti Open Source (Reservoir & PyPI)</span>
          </button>
        )}
      </div>
    </div>
  );
}
