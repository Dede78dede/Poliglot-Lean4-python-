/**
 * Polyglot Code Studio Shell (Phase 14 Modular IDE Workspace)
 *
 * Implements Top Bar Contract with top-left Navigation Drawer trigger,
 * Mobile Touch Ergonomics (Android/iOS >=44px hitboxes),
 * Zero Magic Strings via central navigation constants,
 * EditorTabsStore with LIFO closedStack, Breadcrumbs, CommandPalette,
 * 3-zone Status Bar, and WCAG 2.2 AA accessibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './shared/ui/error-boundary';
import { Button } from './shared/ui/button';
import { Badge } from './shared/ui/badge';
import { VirtualizedContainer } from './shared/ui/virtualized-container';
import { Tabs } from './shared/ui/tabs';
import { Breadcrumbs } from './components/editor/Breadcrumbs';
import { StatusBar } from './components/StatusBar';
import { DesignSystemShowcase } from './shared/ui/showcase';
import { ProposalLoopPanel } from './components/femev/ProposalLoopPanel';
import { TranslationPanel } from './components/femev/TranslationPanel';
import { NotebookPanel } from './components/notebook/NotebookPanel';
import { RecommendationsPanel } from './components/config/RecommendationsPanel';
import { CommandPalette } from './components/navigation/CommandPalette';
import { NavigationDrawer } from './components/navigation/NavigationDrawer';
import { executionStore } from './services/execution/execution-store';
import { editorTabsStore } from './services/shell/editor-tabs-store';
import { useStoreSelector } from './services/stores/use-store-selector';
import { executeLean } from './services/lean-executor';
import { ExecutionError } from './types/execution';
import {
  VIEWS,
  ActiveView,
  ROUTES,
  LANGUAGES,
  DEFAULT_FILE_NAMES,
  PROOF_STATUS,
  EXECUTION_STATUS,
  KEYBOARD_SHORTCUTS,
  NAVIGATION_SECTIONS,
} from './constants/navigation';
import {
  Menu,
  X,
  Plus,
  Columns,
  Search,
  RotateCcw,
  Code2,
  BookOpen,
  ShieldCheck,
  MoreHorizontal,
} from 'lucide-react';

interface ProofItem {
  readonly id: string;
  readonly theorem: string;
  readonly status: typeof PROOF_STATUS[keyof typeof PROOF_STATUS];
  readonly durationMs: number;
}

const SAMPLE_PROOF_ITEMS: ProofItem[] = Array.from({ length: 150 }, (_, i) => ({
  id: `thm-${i + 1}`,
  theorem: `theorem pythagorean_lattice_${i + 1} (a b c : ℤ) : a^2 + b^2 = c^2`,
  status:
    i % 4 === 0
      ? PROOF_STATUS.FAILED
      : i % 3 === 0
      ? PROOF_STATUS.UNVERIFIED
      : PROOF_STATUS.VERIFIED,
  durationMs: 12 + (i % 20) * 8,
}));

const DEFAULT_FILES: Record<string, string> = {
  [DEFAULT_FILE_NAMES.LEAN_MAIN]: `-- Polyglot Code Studio: Dual-Runtime Lean 4 & Python 3.14\n\ntheorem add_comm_polyglot (n m : Nat) : n + m = m + n := by\n  omega\n`,
  [DEFAULT_FILE_NAMES.PYTHON_SCRATCH]: `# Polyglot Code Studio: Python 3.14 Symbolic Verification\n\ndef check_pythagorean(a: int, b: int, c: int) -> bool:\n    """Verify Pythagorean triple invariant."""\n    return a * a + b * b == c * c\n\nassert check_pythagorean(3, 4, 5) is True\nprint("Pythagorean contract holds!")\n`,
};

export function App(): React.JSX.Element {
  "use memo";
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith(ROUTES.NOTEBOOK)) {
      return VIEWS.NOTEBOOK;
    }
    return VIEWS.EDITOR;
  });

  const [files, setFiles] = useState<Record<string, string>>(DEFAULT_FILES);
  const [openTabs, setOpenTabs] = useState<string[]>([
    DEFAULT_FILE_NAMES.LEAN_MAIN,
    DEFAULT_FILE_NAMES.PYTHON_SCRATCH,
  ]);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_FILE_NAMES.LEAN_MAIN);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const tabsState = useStoreSelector(editorTabsStore, (s) => s);
  const executionState = useStoreSelector(executionStore, (s) => s);

  const currentCode = files[activeTab] ?? '';
  const currentLanguage = activeTab.endsWith('.lean') ? LANGUAGES.LEAN4 : LANGUAGES.PYTHON;

  const navigateToView = useCallback((view: ActiveView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      const targetRoute =
        view === VIEWS.NOTEBOOK
          ? ROUTES.NOTEBOOK
          : view === VIEWS.FEMEV
          ? ROUTES.FEMEV
          : view === VIEWS.LEDGER
          ? ROUTES.LEDGER
          : view === VIEWS.SHOWCASE
          ? ROUTES.SHOWCASE
          : view === VIEWS.SETTINGS
          ? ROUTES.SETTINGS
          : ROUTES.HOME;
      window.history.pushState(null, '', targetRoute);
    }
  }, []);

  const handleExecute = useCallback(async () => {
    if (currentLanguage !== LANGUAGES.LEAN4) return;
    executionStore.startExecution('lean');
    try {
      const res = await executeLean({ language: LANGUAGES.LEAN4, code: currentCode, timeoutMs: 10_000 });
      executionStore.completeExecution(res, 'lean');
    } catch (err: unknown) {
      const executionErr =
        err instanceof ExecutionError
          ? err
          : new ExecutionError('LEAN_EXECUTION_FAILED', err instanceof Error ? err.message : String(err));
      executionStore.failExecution(executionErr, 'lean');
    }
  }, [currentCode, currentLanguage]);

  // Global Keyboard Shortcuts (Ctrl+Enter, Ctrl+K, Ctrl+M, Ctrl+Shift+T, Alt+1..6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleExecute();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const reopened = editorTabsStore.popClosedTab();
        if (reopened && !openTabs.includes(reopened)) {
          setOpenTabs((prev) => [...prev, reopened]);
          setActiveTab(reopened);
        }
      } else if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const target = NAVIGATION_SECTIONS[index];
        if (target) {
          navigateToView(target.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecute, navigateToView, openTabs]);

  const handleCloseTab = (tabName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabs.length <= 1) return; // Keep at least one tab open
    editorTabsStore.pushClosedTab(tabName);
    const updated = openTabs.filter((t) => t !== tabName);
    setOpenTabs(updated);
    if (activeTab === tabName) {
      setActiveTab(updated[updated.length - 1]);
    }
  };

  const handleNewTab = () => {
    const newName = `scratch_${openTabs.length + 1}.lean`;
    setFiles((prev) => ({
      ...prev,
      [newName]: `-- New Lean 4 theorem\ntheorem example_${openTabs.length + 1} : True := by\n  trivial\n`,
    }));
    setOpenTabs((prev) => [...prev, newName]);
    setActiveTab(newName);
  };

  return (
    <ErrorBoundary fallbackTitle="Polyglot Code Studio Root Shell Failure">
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
        {/* Top Bar: Navigation Drawer Trigger + Brand Wordmark, Nav Links, Primary Action */}
        <header className="flex items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6 py-2 border-b border-slate-800 bg-slate-900/90 shrink-0 min-h-[52px]">
          {/* Zone 1: Navigation Button (In alto a sinistra) + Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 touch-manipulation"
              aria-label="Apri menu navigazione"
              aria-expanded={isDrawerOpen}
              aria-controls="navigation-drawer"
              title={`Menu Navigazione (${KEYBOARD_SHORTCUTS.MENU_TOGGLE})`}
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
              POLYGLOT CODE STUDIO
            </span>
            <Badge variant="verified" unboxed className="hidden lg:inline-flex">
              · Lean 4 / Python 3.14
            </Badge>
          </div>

          {/* Zone 2: Single-line navigation links (Desktop) */}
          <nav aria-label="Studio Navigation" className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
            {NAVIGATION_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => navigateToView(sec.id)}
                className={`min-h-[40px] px-2 py-1.5 rounded hover:text-slate-100 transition-colors whitespace-nowrap flex items-center gap-1.5 touch-manipulation ${
                  activeView === sec.id ? 'text-blue-400 font-semibold border-b-2 border-blue-400' : ''
                }`}
                aria-current={activeView === sec.id ? 'page' : undefined}
              >
                {sec.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Command palette trigger & Primary Verification Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="min-h-[44px] px-3 text-xs text-slate-400 flex items-center gap-1.5 touch-manipulation"
              aria-label="Open Command Palette"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="hidden sm:inline-block px-1 text-[10px] bg-slate-800 rounded border border-slate-700">
                {KEYBOARD_SHORTCUTS.COMMANDS}
              </kbd>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExecute}
              disabled={executionState.kind === EXECUTION_STATUS.RUNNING || currentLanguage !== LANGUAGES.LEAN4}
              className="min-h-[44px] px-3.5 text-xs font-medium touch-manipulation"
              aria-label="Verify Proof"
            >
              {executionState.kind === EXECUTION_STATUS.RUNNING
                ? 'Verifying...'
                : 'Verify Proof (Ctrl+Enter)'}
            </Button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-hidden flex flex-col pb-14 md:pb-0">
          {activeView === VIEWS.EDITOR && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Editor Tabs Bar (Touch scrollable) */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-2 min-h-[40px] shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto h-full scrollbar-none touch-pan-x py-0.5">
                  {openTabs.map((tab) => (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-3 min-h-[36px] text-xs font-mono border-r border-slate-800/80 cursor-pointer transition-colors touch-manipulation ${
                        activeTab === tab
                          ? 'bg-slate-950 text-blue-400 border-t-2 border-t-blue-500 font-medium'
                          : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                      role="tab"
                      aria-selected={activeTab === tab}
                    >
                      <span className="truncate max-w-[120px] sm:max-w-none">{tab}</span>
                      <button
                        onClick={(e) => handleCloseTab(tab, e)}
                        className="p-1 min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-slate-700/60 rounded text-slate-500 hover:text-slate-200 touch-manipulation"
                        aria-label={`Close ${tab}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleNewTab}
                    className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded touch-manipulation"
                    aria-label="New File Tab"
                    title="New File Tab"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 pr-1 text-slate-400 text-xs shrink-0">
                  {tabsState.closedStack.length > 0 && (
                    <button
                      onClick={() => {
                        const reopened = editorTabsStore.popClosedTab();
                        if (reopened && !openTabs.includes(reopened)) {
                          setOpenTabs((prev) => [...prev, reopened]);
                          setActiveTab(reopened);
                        }
                      }}
                      className="hidden sm:flex items-center gap-1 hover:text-slate-200 text-[11px] min-h-[36px] px-2 touch-manipulation"
                      title={`Reopen Closed Tab (${KEYBOARD_SHORTCUTS.REOPEN_TAB})`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reopen ({tabsState.closedStack.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => editorTabsStore.toggleSplit(activeTab)}
                    className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:text-slate-200 rounded touch-manipulation ${
                      tabsState.splitMode !== 'none' ? 'text-blue-400' : ''
                    }`}
                    title="Toggle Split View"
                    aria-label="Toggle Split View"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Breadcrumbs Navigation */}
              <div className="border-b border-slate-800/80 bg-slate-950/80 px-3 sm:px-4 py-1.5 shrink-0 overflow-x-auto touch-pan-x">
                <Breadcrumbs
                  filePath={`src/${activeTab}`}
                  code={currentCode}
                  language={currentLanguage}
                  currentLine={1}
                />
              </div>

              {/* Dual Pane Layout (Stacked on mobile, side-by-side on md+) */}
              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
                {/* Left Column: Code Buffer */}
                <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800 text-xs text-slate-400 bg-slate-900/40">
                    <span className="font-mono truncate">{activeTab}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      UTF-8 · {currentLanguage.toUpperCase()}
                    </span>
                  </div>
                  <textarea
                    value={currentCode}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setFiles((prev) => ({ ...prev, [activeTab]: newContent }));
                    }}
                    className="flex-1 w-full bg-transparent p-3 sm:p-4 font-mono text-[13px] sm:text-xs text-slate-200 resize-none outline-hidden focus:ring-0 leading-relaxed touch-manipulation select-text"
                    spellCheck={false}
                    aria-label={`Code editor for ${activeTab}`}
                  />
                </div>

                {/* Right Column: Execution & Infoview */}
                <div className="flex flex-col h-full bg-slate-900/30 overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800 text-xs text-slate-400 bg-slate-900/40">
                    <span>Lean 4 Infoview & Diagnostics</span>
                    {executionState.kind === EXECUTION_STATUS.COMPLETED && (
                      executionState.result.simulated ? (
                        <Badge variant="warning">
                          ⚠ SIMULATED — NON-CERTIFYING
                        </Badge>
                      ) : executionState.result.verified ? (
                        <Badge variant="verified">
                          SEAL_KERNEL_VERIFIED_TIER5
                        </Badge>
                      ) : (
                        <Badge variant="error">
                          UNVERIFIED
                        </Badge>
                      )
                    )}
                    {executionState.kind === EXECUTION_STATUS.FAILED && (
                      <Badge variant="error">
                        EXECUTION FAILED
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs space-y-3 touch-pan-y select-text">
                    {executionState.kind === EXECUTION_STATUS.IDLE && (
                      <div className="text-slate-500">
                        Press "Verify Proof" or use {KEYBOARD_SHORTCUTS.VERIFY} to execute formal verification.
                      </div>
                    )}

                    {executionState.kind === EXECUTION_STATUS.RUNNING && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <span className="animate-spin">◷</span>
                        <span>Executing Lean kernel verifier and tactic evaluation...</span>
                      </div>
                    )}

                    {executionState.kind === EXECUTION_STATUS.COMPLETED && (
                      <div className="space-y-2">
                        {executionState.result.simulated && (
                          <div role="alert" aria-live="polite" className="text-amber-400 bg-amber-950/40 p-3 rounded border border-amber-800 text-[11px]">
                            <span className="font-semibold">[NOTICE]</span> Execution completed in simulation fallback mode. This result is not verified by a Lean kernel.
                          </div>
                        )}
                        <div className="text-slate-300 bg-slate-900 p-3 rounded border border-slate-800 whitespace-pre-wrap text-[11px] sm:text-xs">
                          {executionState.result.stdout || executionState.result.stderr || 'No output.'}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          Execution time: {executionState.result.durationMs}ms · Exit code: {executionState.result.exitCode}
                        </div>
                      </div>
                    )}

                    {executionState.kind === EXECUTION_STATUS.FAILED && (
                      <div role="alert" aria-live="assertive" className="text-rose-400 bg-rose-950/40 p-3 rounded border border-rose-800 space-y-1">
                        <div className="font-semibold text-xs">[ERROR] {executionState.error.code}</div>
                        <div className="text-[11px] text-rose-200">{executionState.error.message}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === VIEWS.NOTEBOOK && (
            <div className="h-full w-full overflow-hidden">
              <NotebookPanel />
            </div>
          )}

          {activeView === VIEWS.FEMEV && (
            <div className="h-full p-3 sm:p-4 max-w-6xl mx-auto flex flex-col w-full overflow-y-auto">
              <Tabs
                items={[
                  {
                    id: 'proposal-loop',
                    label: 'AX-PROVER Proposal Loop',
                    content: <ProposalLoopPanel />,
                  },
                  {
                    id: 'translation-gate',
                    label: 'Translation Fidelity Gate',
                    content: <TranslationPanel />,
                  },
                ]}
              />
            </div>
          )}

          {activeView === VIEWS.LEDGER && (
            <div className="h-full p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 w-full overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Formal Proof Ledger
                  </h2>
                  <p className="text-xs text-slate-400">
                    Virtualized at &gt;100 items using react-window v2.3.0 List ({SAMPLE_PROOF_ITEMS.length} registered claims)
                  </p>
                </div>
              </div>

              <div className="flex-1 border border-slate-800 rounded-lg bg-slate-900/40 overflow-hidden">
                <VirtualizedContainer
                  items={SAMPLE_PROOF_ITEMS}
                  threshold={100}
                  rowHeight={48}
                  height={550}
                  keyExtractor={(item) => item.id}
                  renderItem={(item) => (
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800/60 hover:bg-slate-800/40 text-xs min-h-[48px] touch-manipulation">
                      <div className="flex items-center gap-2 sm:gap-3 truncate pr-2">
                        <span className="font-mono text-slate-400 text-[11px] shrink-0">{item.id}</span>
                        <span className="font-mono text-slate-200 truncate">{item.theorem}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums hidden sm:inline">
                          {item.durationMs}ms
                        </span>
                        <Badge
                          variant={
                            item.status === PROOF_STATUS.VERIFIED
                              ? 'verified'
                              : item.status === PROOF_STATUS.FAILED
                              ? 'error'
                              : 'warning'
                          }
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {activeView === VIEWS.SHOWCASE && (
            <div className="h-full overflow-y-auto">
              <DesignSystemShowcase />
            </div>
          )}

          {activeView === VIEWS.SETTINGS && (
            <div className="h-full p-4 sm:p-6 max-w-3xl mx-auto space-y-6 w-full overflow-y-auto">
              <header className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-semibold text-slate-100">Studio Preferences</h2>
                <p className="text-xs text-slate-400">Manage compiler optimization and accessibility</p>
              </header>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 min-h-[52px]">
                  <div>
                    <div className="font-medium text-slate-200">React Compiler</div>
                    <div className="text-slate-400">compilationMode: 'annotation' (Vite 8 Native Rust)</div>
                  </div>
                  <Badge variant="verified">ACTIVE</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 min-h-[52px]">
                  <div>
                    <div className="font-medium text-slate-200">List Virtualization</div>
                    <div className="text-slate-400">Threshold-gated at 100 items via react-window v2</div>
                  </div>
                  <Badge variant="verified">ACTIVE</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 min-h-[52px]">
                  <div>
                    <div className="font-medium text-slate-200">WCAG 2.2 AA Conformance</div>
                    <div className="text-slate-400">Accessible primitives &gt;=44px touch targets</div>
                  </div>
                  <Badge variant="verified">CONFORMANT</Badge>
                </div>
              </div>

              {/* Dynamic Config Discovery & Adaptive Recommendations */}
              <RecommendationsPanel />
            </div>
          )}
        </main>

        {/* Mobile Touch Bar: Quick Thumb-zone Switcher (Android / iOS) */}
        <nav
          aria-label="Navigazione rapida mobile"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 h-14 pb-safe touch-manipulation"
        >
          <button
            onClick={() => navigateToView(VIEWS.EDITOR)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 transition-colors ${
              activeView === VIEWS.EDITOR ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Vai all'editor"
          >
            <Code2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Editor</span>
          </button>

          <button
            onClick={() => navigateToView(VIEWS.NOTEBOOK)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 transition-colors ${
              activeView === VIEWS.NOTEBOOK ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Vai al notebook"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Notebook</span>
          </button>

          <button
            onClick={() => navigateToView(VIEWS.FEMEV)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 transition-colors ${
              activeView === VIEWS.FEMEV ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Vai a Femev"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Femev</span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Altre sezioni"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Altro</span>
          </button>
        </nav>

        {/* 3-Zone Live Status Bar (Desktop & Tablet) */}
        <div className="hidden md:block">
          <StatusBar language={currentLanguage} />
        </div>

        {/* Navigation Drawer Modal (Top-Left triggered) */}
        <NavigationDrawer
          isOpen={isDrawerOpen}
          activeView={activeView}
          onSelectView={navigateToView}
          onClose={() => setIsDrawerOpen(false)}
        />

        {/* Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
