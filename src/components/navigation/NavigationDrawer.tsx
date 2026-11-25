/**
 * Navigation Drawer Component (Phase 14.1+)
 *
 * Provides top-left responsive view switcher, live browser session/role
 * controls (RBAC switcher + Vault login + Studio Settings), and unified
 * launcher for all workbench drawers and panels.
 * Enforces >=44px touch targets and full keyboard accessibility.
 */

import React, { useEffect, useRef } from 'react';
import {
  VIEWS,
  ActiveView,
  NAVIGATION_SECTIONS,
  KEYBOARD_SHORTCUTS,
} from '../../constants/navigation';
import {
  Code2,
  BookOpen,
  ShieldCheck,
  FileCheck2,
  LayoutGrid,
  Settings,
  X,
  ChevronRight,
  Sparkles,
  UserCheck,
  FolderOpen,
  Wrench,
  FlaskConical,
  Network,
  Compass,
  FolderPlus,
  HardDrive,
  Database,
  KeyRound,
  Terminal,
  GitCompare,
  MessageSquare,
  Cpu,
  Layers,
} from 'lucide-react';
import { useOptionalAuthContext } from '../../context/AuthContext';
import { ROLE_LIST, type AppRole } from '../../services/auth/roles';

export type WorkbenchToolId =
  | 'projects'
  | 'autocorrect'
  | 'proof'
  | 'femev-drawer'
  | 'blueprint-modal'
  | 'discovery'
  | 'new-project'
  | 'storage'
  | 'memory'
  | 'secrets'
  | 'mcp'
  | 'diff'
  | 'dock-explorer'
  | 'dock-lspec'
  | 'dock-chat'
  | 'dock-pipeline'
  | 'dock-archon'
  | 'dock-blueprint';

interface NavigationDrawerProps {
  readonly isOpen: boolean;
  readonly activeView: ActiveView;
  readonly onSelectView: (view: ActiveView) => void;
  readonly onClose: () => void;
  readonly onOpenAuthModal?: () => void;
  readonly onOpenSettingsModal?: () => void;
  readonly onOpenTool?: (toolId: WorkbenchToolId) => void;
}

const ICON_MAP: Record<ActiveView, React.ComponentType<{ className?: string }>> = {
  [VIEWS.EDITOR]: Code2,
  [VIEWS.NOTEBOOK]: BookOpen,
  [VIEWS.FEMEV]: ShieldCheck,
  [VIEWS.LEDGER]: FileCheck2,
  [VIEWS.SHOWCASE]: LayoutGrid,
  [VIEWS.SETTINGS]: Settings,
};

const WORKBENCH_TOOLS: readonly {
  readonly id: WorkbenchToolId;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dock-explorer', label: 'File Explorer', icon: Layers },
  { id: 'projects', label: 'Progetti', icon: FolderOpen },
  { id: 'new-project', label: 'Nuovo Progetto', icon: FolderPlus },
  { id: 'discovery', label: 'Discovery Hub', icon: Compass },
  { id: 'autocorrect', label: 'Auto-Correct L1-L5', icon: Wrench },
  { id: 'proof', label: 'Proof Automation', icon: Sparkles },
  { id: 'femev-drawer', label: 'FEMEV Drawer', icon: FlaskConical },
  { id: 'blueprint-modal', label: 'Blueprint DAG', icon: Network },
  { id: 'dock-chat', label: 'AI Chat Studio', icon: MessageSquare },
  { id: 'dock-lspec', label: 'LSpec & CI', icon: Terminal },
  { id: 'dock-pipeline', label: 'Pyodide Pipeline', icon: Cpu },
  { id: 'dock-archon', label: 'Archon Monitor', icon: ShieldCheck },
  { id: 'diff', label: 'Diff Viewer', icon: GitCompare },
  { id: 'storage', label: 'GitHub & Storage', icon: HardDrive },
  { id: 'memory', label: '5-Tier Memory', icon: Database },
  { id: 'secrets', label: 'Token Secrets', icon: KeyRound },
  { id: 'mcp', label: 'MCP Tools', icon: Network },
];

const ROLE_RANK: Readonly<Record<AppRole, number>> = {
  viewer: 0,
  collaborator: 1,
  verifier: 2,
  admin: 3,
};

export function NavigationDrawer({
  isOpen,
  activeView,
  onSelectView,
  onClose,
  onOpenAuthModal,
  onOpenSettingsModal,
  onOpenTool,
}: NavigationDrawerProps): React.JSX.Element | null {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const auth = useOptionalAuthContext();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.ESCAPE) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        id="navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="navigation-drawer-heading"
        className="relative z-10 w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="navigation-drawer-heading"
                className="text-sm font-bold tracking-tight text-white whitespace-nowrap"
              >
                POLYGLOT STUDIO
              </h2>
              <p className="text-[11px] text-slate-400">Navigazione Spazi di Lavoro</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 touch-manipulation"
            aria-label="Chiudi menu navigazione"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Item List */}
        <nav
          aria-label="Sezioni del programma"
          className="flex-1 overflow-y-auto p-3 space-y-4 touch-pan-y"
        >
          {/* Live Session & Role Switcher */}
          {auth && (
            <section
              aria-label="Sessione e Controllo Ruolo"
              className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Sessione Browser
                  </div>
                  <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      {auth.authenticated
                        ? `${auth.user?.username ?? 'session'} (${(auth.activeRole ?? 'viewer').toUpperCase()})`
                        : 'Non autenticato'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal?.();
                  }}
                  className="min-h-[36px] px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium shrink-0 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {auth.authenticated ? 'Account / Vault' : 'Accedi'}
                </button>
              </div>

              {auth.authenticated && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400">Cambio Ruolo Attivo</div>
                  <div className="grid grid-cols-4 gap-1">
                    {ROLE_LIST.map((r) => {
                      const baseRank = ROLE_RANK[auth.baseRole ?? 'viewer'];
                      const canUse = ROLE_RANK[r] <= baseRank;
                      const isCurrent = auth.activeRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={!canUse || isCurrent || auth.loading}
                          onClick={() => void auth.switchRole(r)}
                          className={`px-1.5 py-1 rounded text-[10px] font-mono uppercase border transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                            isCurrent
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                              : canUse
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-slate-950 border-slate-800/60 text-slate-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {r.slice(0, 5)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {onOpenSettingsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettingsModal();
                  }}
                  className="w-full min-h-[36px] px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 flex items-center justify-between focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Configurazione Avanzata Studio</span>
                  </span>
                  <kbd className="text-[10px] font-mono text-slate-400">Ctrl+,</kbd>
                </button>
              )}
            </section>
          )}

          {/* Core 6 Sections */}
          <div className="space-y-1.5">
            {NAVIGATION_SECTIONS.map((section) => {
              const Icon = ICON_MAP[section.id];
              const isSelected = activeView === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    onSelectView(section.id);
                    onClose();
                  }}
                  className={`w-full min-h-[52px] px-3.5 py-3 rounded-xl flex items-center gap-3.5 text-left transition-all active:scale-[0.99] touch-manipulation border focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-xs'
                      : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60 hover:border-slate-700/60 text-slate-300'
                  }`}
                  role="menuitem"
                  aria-current={isSelected ? 'page' : undefined}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-blue-300' : 'text-slate-100'
                        }`}
                      >
                        {section.label}
                      </span>
                      {section.shortcut && (
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                          {section.shortcut}
                        </kbd>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                      {section.description}
                    </p>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* All Connected Workbench Tools */}
          {onOpenTool && (
            <section aria-label="Strumenti Workbench" className="pt-2 border-t border-slate-800 space-y-2">
              <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Strumenti & Pannelli Collegati
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {WORKBENCH_TOOLS.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        onOpenTool(tool.id);
                        onClose();
                      }}
                      className="min-h-[44px] px-2.5 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors touch-manipulation focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <ToolIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate text-[11px] font-medium">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </nav>

        {/* Drawer Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Kernel Runtime</span>
            <span className="font-mono text-emerald-400">Lean 4 · Tier-5</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Touch Optimization</span>
            <span className="font-mono text-slate-300">Android / iOS ≥44px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
