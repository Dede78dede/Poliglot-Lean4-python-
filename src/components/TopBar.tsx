import React, { useState } from 'react';
import {
  Play,
  Compass,
  Sparkles,
  BookOpen,
  Settings,
  RotateCcw,
  ChevronDown,
  Check,
  Folder,
  Upload,
  Layers,
  Wrench,
  Network,
  Terminal,
  KeyRound,
  FlaskConical,
} from 'lucide-react';
import type { SupportedLanguage } from '../types/language';
import { SUPPORTED_LANGUAGES } from '../types/language';
import type { ExecutionState } from '../types/execution';
import { StorageSyncButton } from './storage/StorageSyncButton';

export interface TopBarProps {
  readonly language: SupportedLanguage;
  readonly onLanguageChange: (lang: SupportedLanguage) => void;
  readonly executionState: ExecutionState;
  readonly onRunCode: () => void;
  readonly onOpenGallery: () => void;
  readonly onResetToTemplate: () => void;
  readonly timeoutMs: number;
  readonly onTimeoutChange: (timeout: number) => void;
  readonly onResetWorker: () => void;
  readonly isKiminaSimulated?: boolean;
  readonly onOpenProjects?: () => void;
  readonly onOpenDiscovery?: () => void;
  readonly onOpenMemory?: () => void;
  readonly onOpenAutoCorrection?: () => void;
  readonly onOpenProofAutomation?: () => void;
  readonly onOpenBlueprint?: () => void;
  readonly onOpenMcpTools?: () => void;
  readonly onOpenSecrets?: () => void;
  readonly onOpenFemev?: () => void;
  readonly onImportZipClick?: () => void;
  readonly projectName?: string | null;
}

export function TopBar({
  language,
  onLanguageChange,
  executionState,
  onRunCode,
  onOpenGallery,
  onResetToTemplate,
  timeoutMs,
  onTimeoutChange,
  onResetWorker,
  isKiminaSimulated,
  onOpenProjects,
  onOpenDiscovery,
  onOpenMemory,
  onOpenAutoCorrection,
  onOpenProofAutomation,
  onOpenBlueprint,
  onOpenMcpTools,
  onOpenSecrets,
  onOpenFemev,
  onImportZipClick,
  projectName,
}: TopBarProps): React.JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const isRunning = executionState.kind === 'running';

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-1.5 sm:py-2 bg-[#090d15] border-b border-neutral-800 text-slate-200 select-none overflow-x-auto shrink-0 max-w-full">
      {/* Zone 1: Wordmark and active project badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <a href="/" className="text-base font-bold tracking-tight text-white whitespace-nowrap hover:opacity-90">
          Polyglot Code Studio
        </a>
        <span className="text-xs text-neutral-500 font-mono hidden sm:inline">v1.1</span>

        {projectName && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/80 text-blue-300 text-xs font-medium max-w-[200px]">
            <Folder className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">{projectName}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation tools */}
      <nav className="flex items-center gap-2 text-xs font-medium shrink-0">
        {/* Language selector dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-600 text-white transition-colors"
          >
            {language === 'lean4' ? (
              <Compass className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold">{language === 'lean4' ? 'Lean 4' : 'Python 3.14'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {langMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-44 rounded-lg bg-[#111827] border border-neutral-700 shadow-xl py-1 z-50 text-xs"
              onMouseLeave={() => setLangMenuOpen(false)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    onLanguageChange(lang);
                    setLangMenuOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left hover:bg-neutral-800 transition-colors ${
                    language === lang ? 'text-blue-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {lang === 'lean4' ? <Compass className="w-3.5 h-3.5 text-blue-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{lang === 'lean4' ? 'Lean 4' : 'Python 3.14'}</span>
                  </span>
                  {language === lang && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects repository button */}
        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Open Projects Repository"
          >
            <Folder className="w-3.5 h-3.5 text-blue-400" />
            <span>Projects</span>
          </button>
        )}

        {/* Open Source Discovery button */}
        {onOpenDiscovery && (
          <button
            type="button"
            onClick={onOpenDiscovery}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Esplora Progetti Open Source (Lean Reservoir, Mathlib 4, PyPI)"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Discovery</span>
          </button>
        )}

        {/* Persistence / GitHub Sync Button */}
        <StorageSyncButton />

        {/* 5-Tier Memory & Cold Storage button */}
        {onOpenMemory && (
          <button
            type="button"
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Architettura di Memoria a 5 Livelli & Cold Storage"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Memory</span>
          </button>
        )}

        {/* 5-Level Auto-Correction System button */}
        {onOpenAutoCorrection && (
          <button
            type="button"
            onClick={onOpenAutoCorrection}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="5-Level Auto-Correction System (L1 Deterministic to L5 Certified CAS)"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
            <span>Auto-Fix</span>
          </button>
        )}

        {/* Phase 8 Advanced Proof Automation & Metaprogramming button */}
        {onOpenProofAutomation && (
          <button
            type="button"
            onClick={onOpenProofAutomation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Phase 8: Advanced Proof Automation & Cloud Metaprogramming (Duper, AXLE, Sync)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Prove</span>
          </button>
        )}

        {/* Phase 7 Archon Horizon Blueprint Workspace button */}
        {onOpenBlueprint && (
          <button
            type="button"
            onClick={onOpenBlueprint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Archon Horizon Blueprint Workspace & Collaborative Proof Engineering"
          >
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span>Blueprint</span>
          </button>
        )}

        {/* Phase 10.2: Lean LSP MCP Tools Foundation button */}
        {onOpenMcpTools && (
          <button
            type="button"
            onClick={onOpenMcpTools}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Phase 10.2: Lean LSP Model Context Protocol (MCP) Tools Matrix"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>MCP Tools</span>
          </button>
        )}

        {/* Phase 10.4: API & Secrets Manager button */}
        {onOpenSecrets && (
          <button
            type="button"
            onClick={onOpenSecrets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Phase 10.4: API & Secret Vault (PBKDF2 + AES-GCM-256)"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Vault</span>
          </button>
        )}

        {/* Phase 10.5: FEMEV Epistemic Workflow & Multi-Kernel Paranoid Check button */}
        {onOpenFemev && (
          <button
            type="button"
            onClick={onOpenFemev}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/40 text-emerald-300 hover:text-white transition-colors whitespace-nowrap"
            title="Phase 10.5: FEMEV Epistemic Workflow & 6-Kernel Soundness Paranoid Check"
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span>FEMEV</span>
          </button>
        )}

        {/* Import ZIP button */}
        {onImportZipClick && (
          <button
            type="button"
            onClick={onImportZipClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            title="Import project from ZIP archive"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import ZIP</span>
          </button>
        )}

        {/* Gallery button */}
        <button
          type="button"
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Gallery</span>
          <kbd className="hidden md:inline px-1 py-0.2 rounded bg-neutral-800 text-[10px] text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Reset scratchpad button */}
        <button
          type="button"
          onClick={onResetToTemplate}
          title="Reset to blank starter"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Settings button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Studio Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {settingsOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[#111827] border border-neutral-700 shadow-2xl p-3 z-50 text-xs space-y-3"
              onMouseLeave={() => setSettingsOpen(false)}
            >
              <div className="font-semibold text-white border-b border-neutral-800 pb-1.5">
                Execution Settings
              </div>

              {/* Timeout limit */}
              <div className="space-y-1">
                <label htmlFor="timeout-select" className="text-slate-400 flex justify-between">
                  <span>Execution Timeout</span>
                  <span className="font-mono text-blue-400">{timeoutMs / 1000}s</span>
                </label>
                <select
                  id="timeout-select"
                  value={timeoutMs}
                  onChange={(e) => onTimeoutChange(Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-slate-200 text-xs"
                >
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds (default)</option>
                  <option value={20000}>20 seconds</option>
                  <option value={30000}>30 seconds (maximum)</option>
                </select>
              </div>

              {/* Python Web Worker restart */}
              {language === 'python' && (
                <div className="pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      onResetWorker();
                      setSettingsOpen(false);
                    }}
                    className="w-full py-1 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-xs text-left flex items-center justify-between"
                  >
                    <span>Respawn Python Worker</span>
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}

              {/* Mode info */}
              <div className="pt-2 border-t border-neutral-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Lean 4 Backend:</span>
                  <span className="font-mono text-slate-300">
                    {isKiminaSimulated ? 'Simulator Mode' : 'Live Kimina'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Python Runtime:</span>
                  <span className="font-mono text-slate-300">Pyodide 314.0.7</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Zone 3: Primary Action (Run Code / Check Proof) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onRunCode}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-md ${
            isRunning
              ? 'bg-blue-600/50 cursor-wait'
              : language === 'lean4'
                ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25'
                : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/25'
          } whitespace-nowrap shrink-0`}
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{language === 'lean4' ? 'Check Proof' : 'Run Code'}</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-black/25 text-[10px] text-white/80 font-mono">
                ⌘↵
              </kbd>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
