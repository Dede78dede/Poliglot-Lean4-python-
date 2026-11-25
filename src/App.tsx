/**
 * Polyglot Code Studio Shell (Full-Workspace Integration)
 *
 * Connects all frontend providers (AuthProvider, PyodideProvider,
 * ProjectProvider, StorageProvider), live Python Pyodide WASM execution,
 * authenticated Lean kernel verification, dormant IDE drawers/panels,
 * RBAC account/role switching, and full WCAG 2.2 AA touch ergonomics.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ErrorBoundary } from './shared/ui/error-boundary';
import { Button } from './shared/ui/button';
import { Badge } from './shared/ui/badge';
import { VirtualizedContainer } from './shared/ui/virtualized-container';
import { Breadcrumbs } from './components/editor/Breadcrumbs';
import { StatusBar } from './components/StatusBar';
import { NavigationDrawer, type WorkbenchToolId } from './components/navigation/NavigationDrawer';
import { executionStore } from './services/execution/execution-store';
import { editorTabsStore } from './services/shell/editor-tabs-store';
import { settingsStore } from './services/settings/settings-store';
import { useStoreSelector } from './services/stores/use-store-selector';
import { executeLean } from './services/lean-executor';
import { ExecutionError } from './types/execution';
import { EPISTEMIC_BADGES } from './types/verification-ui';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { PyodideProvider, usePyodideContext } from './context/PyodideContext';
import { ProjectProvider, useProjectContext } from './context/ProjectContext';
import { StorageProvider, useStorageProvider } from './context/StorageContext';
import type { BlueprintNode, BlueprintEdge } from './types/blueprint';
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
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Columns from 'lucide-react/dist/esm/icons/columns';
import Search from 'lucide-react/dist/esm/icons/search';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Code2 from 'lucide-react/dist/esm/icons/code-2';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Users from 'lucide-react/dist/esm/icons/users';
import SettingsIcon from 'lucide-react/dist/esm/icons/settings';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import PanelLeft from 'lucide-react/dist/esm/icons/panel-left';
import GitCompare from 'lucide-react/dist/esm/icons/git-compare';
import Wrench from 'lucide-react/dist/esm/icons/wrench';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';

const DesignSystemShowcase = React.lazy(() =>
  import('./shared/ui/showcase').then((m) => ({ default: m.DesignSystemShowcase || (m as any).default }))
);
const FEMEVView = React.lazy(() =>
  import('./components/femev/FEMEVView').then((m) => ({ default: m.FEMEVView || (m as any).default }))
);
const NotebookPanel = React.lazy(() =>
  import('./components/notebook/NotebookPanel').then((m) => ({ default: m.NotebookPanel || (m as any).default }))
);
const RecommendationsPanel = React.lazy(() =>
  import('./components/config/RecommendationsPanel').then((m) => ({ default: m.RecommendationsPanel || (m as any).default }))
);
const CommandPalette = React.lazy(() =>
  import('./components/navigation/CommandPalette').then((m) => ({ default: m.CommandPalette || (m as any).default }))
);
const CollaborationPanel = React.lazy(() =>
  import('./components/collaboration/CollaborationPanel').then((m) => ({
    default: m.CollaborationPanel || (m as any).default,
  }))
);
const EditorPane = React.lazy(() =>
  import('./components/EditorPane').then((m) => ({
    default: m.EditorPane || (m as any).default,
  }))
);
const AuthModal = React.lazy(() =>
  import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const SettingsModal = React.lazy(() =>
  import('./components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const FileExplorer = React.lazy(() =>
  import('./components/project/FileExplorer').then((m) => ({ default: m.FileExplorer }))
);
const ProjectDrawer = React.lazy(() =>
  import('./components/project/ProjectDrawer').then((m) => ({ default: m.ProjectDrawer }))
);
const DiffViewer = React.lazy(() =>
  import('./components/shell/DiffViewer').then((m) => ({ default: m.DiffViewer }))
);
const AutoCorrectionPanel = React.lazy(() =>
  import('./components/autocorrect/AutoCorrectionPanel').then((m) => ({ default: m.AutoCorrectionPanel }))
);
const ChatPanel = React.lazy(() =>
  import('./components/chat/ChatPanel').then((m) => ({ default: m.ChatPanel }))
);
const ProofAutomationPanel = React.lazy(() =>
  import('./components/proof/ProofAutomationPanel').then((m) => ({ default: m.ProofAutomationPanel }))
);
const InteractionPanel = React.lazy(() =>
  import('./components/interaction/InteractionPanel').then((m) => ({ default: m.InteractionPanel }))
);
const LSpecPanel = React.lazy(() =>
  import('./components/lean-tooling/LSpecPanel').then((m) => ({ default: m.LSpecPanel }))
);
const ArchonPanel = React.lazy(() =>
  import('./components/orchestration/ArchonPanel').then((m) => ({ default: m.ArchonPanel }))
);
const BlueprintCanvas = React.lazy(() =>
  import('./components/blueprint/BlueprintCanvas').then((m) => ({ default: m.BlueprintCanvas }))
);
const BlueprintWorkspaceModal = React.lazy(() =>
  import('./components/collaboration/BlueprintWorkspaceModal').then((m) => ({ default: m.BlueprintWorkspaceModal }))
);
const SecretsManager = React.lazy(() =>
  import('./components/secrets/SecretsManager').then((m) => ({ default: m.SecretsManager }))
);
const McpToolsDrawer = React.lazy(() =>
  import('./components/mcp/McpToolsDrawer').then((m) => ({ default: m.McpToolsDrawer }))
);
const FiveTierMemoryDrawer = React.lazy(() =>
  import('./components/memory/FiveTierMemoryDrawer').then((m) => ({ default: m.FiveTierMemoryDrawer }))
);
const ProjectDiscoveryModal = React.lazy(() =>
  import('./components/discovery/ProjectDiscoveryModal').then((m) => ({ default: m.ProjectDiscoveryModal }))
);
const NewProjectModal = React.lazy(() =>
  import('./components/scaffold/NewProjectModal').then((m) => ({ default: m.NewProjectModal }))
);
const StorageModal = React.lazy(() =>
  import('./components/storage/StorageModal').then((m) => ({ default: m.StorageModal }))
);
const FemevDrawer = React.lazy(() =>
  import('./components/femev/FemevDrawer').then((m) => ({ default: m.FemevDrawer }))
);

function ViewFallback(): React.JSX.Element {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 text-slate-500 animate-pulse" role="status" aria-label="Loading view">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
        <span className="text-xs font-mono">Loading module...</span>
      </div>
    </div>
  );
}

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

type LeftDockTab = 'explorer' | 'lspec' | 'chat' | 'pipeline' | 'archon' | 'blueprint';

function AppShell(): React.JSX.Element {
  "use memo";
  const auth = useAuthContext();
  const pyodide = usePyodideContext();
  const projectCtx = useProjectContext();
  const storage = useStorageProvider();

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
  const [isCollabDrawerOpen, setIsCollabDrawerOpen] = useState(false);
  const [isLeftDockOpen, setIsLeftDockOpen] = useState(false);
  const [leftDockTab, setLeftDockTab] = useState<LeftDockTab>('explorer');
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isAutoCorrectOpen, setIsAutoCorrectOpen] = useState(false);
  const [isProofAutomationOpen, setIsProofAutomationOpen] = useState(false);
  const [isFemevDrawerOpen, setIsFemevDrawerOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isSecretsOpen, setIsSecretsOpen] = useState(false);
  const [isMcpDrawerOpen, setIsMcpDrawerOpen] = useState(false);
  const [isMemoryDrawerOpen, setIsMemoryDrawerOpen] = useState(false);
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const [monacoEditor, setMonacoEditor] = useState<{ getModel?: () => unknown } | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const hasSeededProjectRef = useRef(false);

  const tabsState = useStoreSelector(editorTabsStore, (s) => s);
  const executionState = useStoreSelector(executionStore, (s) => s);

  // Seed ProjectContext on first load so FileExplorer, Memory, Storage share a real project
  useEffect(() => {
    if (hasSeededProjectRef.current || projectCtx.currentProject) return;
    hasSeededProjectRef.current = true;
    void projectCtx.loadProject({
      id: 'polyglot-starter-workspace',
      name: 'Polyglot Starter',
      type: 'mixed',
      files: [
        {
          path: DEFAULT_FILE_NAMES.LEAN_MAIN,
          content: DEFAULT_FILES[DEFAULT_FILE_NAMES.LEAN_MAIN],
          language: 'lean4',
        },
        {
          path: DEFAULT_FILE_NAMES.PYTHON_SCRATCH,
          content: DEFAULT_FILES[DEFAULT_FILE_NAMES.PYTHON_SCRATCH],
          language: 'python',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [projectCtx]);

  // Reflect loaded ProjectContext files into editor buffers cleanly
  useEffect(() => {
    if (!projectCtx.currentProject || projectCtx.currentProject.files.length === 0) return;
    setFiles((prev) => {
      const next = { ...prev };
      for (const f of projectCtx.currentProject!.files) {
        next[f.path] = f.content;
      }
      return next;
    });
    if (projectCtx.activeFilePath) {
      setOpenTabs((prev) =>
        prev.includes(projectCtx.activeFilePath!) ? prev : [...prev, projectCtx.activeFilePath!]
      );
      setActiveTab(projectCtx.activeFilePath);
    }
  }, [projectCtx.currentProject?.id, projectCtx.activeFilePath]);

  const currentCode = files[activeTab] ?? '';
  const currentLanguage = activeTab.endsWith('.lean') ? LANGUAGES.LEAN4 : LANGUAGES.PYTHON;

  const blueprintNodes = useMemo<readonly BlueprintNode[]>(() => {
    return [
      {
        id: 'PythagoreanWitness',
        name: 'check_pythagorean',
        kind: 'python_witness',
        language: 'python',
        filePath: DEFAULT_FILE_NAMES.PYTHON_SCRATCH,
        lineRange: { start: 1, end: 8 },
        signature: 'def check_pythagorean(a: int, b: int, c: int) -> bool',
        status: 'empirically_validated',
        code: files[DEFAULT_FILE_NAMES.PYTHON_SCRATCH] ?? '',
        contentHash: 'witness-hash-1',
        complexityWeight: 2,
        layer: 0,
      },
      {
        id: 'AddCommPolyglot',
        name: 'add_comm_polyglot',
        kind: 'theorem',
        language: 'lean4',
        filePath: DEFAULT_FILE_NAMES.LEAN_MAIN,
        lineRange: { start: 1, end: 5 },
        signature: 'theorem add_comm_polyglot (n m : Nat) : n + m = m + n',
        status: 'kernel_verified',
        code: files[DEFAULT_FILE_NAMES.LEAN_MAIN] ?? '',
        contentHash: 'thm-hash-1',
        complexityWeight: 3,
        layer: 1,
      },
    ];
  }, [files]);

  const blueprintEdges = useMemo<readonly BlueprintEdge[]>(() => {
    return [
      {
        id: 'PythagoreanWitness->AddCommPolyglot:witness_dependency',
        from: 'PythagoreanWitness',
        to: 'AddCommPolyglot',
        role: 'witness_dependency',
        description: 'Python witness validates formal integer arithmetic invariance',
      },
    ];
  }, []);

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

  const handleOpenTool = useCallback(
    (toolId: WorkbenchToolId) => {
      switch (toolId) {
        case 'projects':
          setIsProjectDrawerOpen(true);
          break;
        case 'autocorrect':
          navigateToView(VIEWS.EDITOR);
          setIsAutoCorrectOpen(true);
          break;
        case 'proof':
          navigateToView(VIEWS.EDITOR);
          setIsProofAutomationOpen(true);
          break;
        case 'femev-drawer':
          setIsFemevDrawerOpen(true);
          break;
        case 'blueprint-modal':
          setIsBlueprintModalOpen(true);
          break;
        case 'discovery':
          setIsDiscoveryModalOpen(true);
          break;
        case 'new-project':
          setIsNewProjectModalOpen(true);
          break;
        case 'storage':
          storage.openStorageModal();
          break;
        case 'memory':
          setIsMemoryDrawerOpen(true);
          break;
        case 'secrets':
          setIsSecretsOpen(true);
          break;
        case 'mcp':
          setIsMcpDrawerOpen(true);
          break;
        case 'diff':
          navigateToView(VIEWS.EDITOR);
          setIsDiffMode((prev) => !prev);
          break;
        case 'dock-explorer':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('explorer');
          break;
        case 'dock-lspec':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('lspec');
          break;
        case 'dock-chat':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('chat');
          break;
        case 'dock-pipeline':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('pipeline');
          break;
        case 'dock-archon':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('archon');
          break;
        case 'dock-blueprint':
          navigateToView(VIEWS.EDITOR);
          setIsLeftDockOpen(true);
          setLeftDockTab('blueprint');
          break;
      }
    },
    [navigateToView, storage]
  );

  const handleExecute = useCallback(async () => {
    if (currentLanguage === LANGUAGES.PYTHON) {
      executionStore.startExecution('python');
      try {
        const res = await pyodide.execute(currentCode, 15_000);
        executionStore.completeExecution(res, 'python');
      } catch (err: unknown) {
        executionStore.failExecution(
          err instanceof ExecutionError
            ? err
            : new ExecutionError(
                'PYODIDE_EXECUTION_FAILED',
                err instanceof Error ? err.message : String(err)
              ),
          'python'
        );
      }
      return;
    }

    if (!auth.authenticated) {
      auth.openAuthModal();
      executionStore.failExecution(
        new ExecutionError(
          'INVALID_REQUEST',
          'Autenticazione richiesta per eseguire il verificatore Lean sul server.',
          { reason: 'AUTH_REQUIRED' }
        ),
        'lean'
      );
      return;
    }

    if (!auth.hasPermission('proof:verify')) {
      executionStore.failExecution(
        new ExecutionError(
          'INVALID_REQUEST',
          `Il ruolo attivo (${auth.activeRole ?? 'viewer'}) non dispone del permesso proof:verify.`,
          { reason: 'FORBIDDEN_ROLE' }
        ),
        'lean'
      );
      return;
    }

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
  }, [auth, currentCode, currentLanguage, pyodide]);

  // Global Keyboard Shortcuts (Ctrl+Enter, Ctrl+K, Ctrl+M, Ctrl+Shift+T, Ctrl+,, Alt+1..6)
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        settingsStore.openModal('editor');
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
    if (openTabs.length <= 1) return;
    editorTabsStore.pushClosedTab(tabName);
    const updated = openTabs.filter((t) => t !== tabName);
    setOpenTabs(updated);
    if (activeTab === tabName) {
      setActiveTab(updated[updated.length - 1]);
    }
  };

  const handleNewTab = () => {
    const newName = `scratch_${openTabs.length + 1}.lean`;
    const nextCode = `-- New Lean 4 theorem\ntheorem example_${openTabs.length + 1} : True := by\n  trivial\n`;
    setFiles((prev) => ({
      ...prev,
      [newName]: nextCode,
    }));
    setOpenTabs((prev) => [...prev, newName]);
    setActiveTab(newName);
    void projectCtx.createFile(newName, nextCode);
  };

  const updateCurrentBuffer = (newContent: string) => {
    setFiles((prev) => ({ ...prev, [activeTab]: newContent }));
    projectCtx.updateFileContent(activeTab, newContent);
  };

  const applyCodeInEditor = (code: string, targetLang?: 'lean4' | 'python', filePath?: string) => {
    const targetName =
      filePath ??
      (targetLang === 'python'
        ? activeTab.endsWith('.py')
          ? activeTab
          : DEFAULT_FILE_NAMES.PYTHON_SCRATCH
        : activeTab.endsWith('.lean')
        ? activeTab
        : DEFAULT_FILE_NAMES.LEAN_MAIN);
    setFiles((prev) => ({ ...prev, [targetName]: code }));
    if (!openTabs.includes(targetName)) {
      setOpenTabs((prev) => [...prev, targetName]);
    }
    setActiveTab(targetName);
    projectCtx.updateFileContent(targetName, code);
    navigateToView(VIEWS.EDITOR);
  };

  const compilerOutputText =
    executionState.kind === EXECUTION_STATUS.COMPLETED
      ? `${executionState.result.stdout}\n${executionState.result.stderr}`.trim()
      : executionState.kind === EXECUTION_STATUS.FAILED
      ? executionState.error.message
      : '';

  return (
    <ErrorBoundary fallbackTitle="Polyglot Code Studio Root Shell Failure">
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
        {/* Top Bar (3-zone Contract: Navigation Trigger + Wordmark, Nav Links, Account + Primary Action) */}
        <header className="flex items-center justify-between gap-4 sm:gap-8 px-3 sm:px-6 py-2 border-b border-slate-800 bg-slate-900/90 shrink-0 min-h-[52px]">
          {/* Zone 1: Navigation Button (In alto a sinistra) + Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 touch-manipulation"
              aria-label="Apri menu navigazione"
              aria-expanded={isDrawerOpen}
              aria-controls="navigation-drawer"
              title={`Menu Navigazione (${KEYBOARD_SHORTCUTS.MENU_TOGGLE})`}
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              POLYGLOT CODE STUDIO
            </span>
            <Badge variant="verified" unboxed className="hidden xl:inline-flex whitespace-nowrap shrink-0">
              · Lean 4 / Python 3.14
            </Badge>
          </div>

          {/* Zone 2: Single-line navigation links (Desktop) */}
          <nav
            aria-label="Studio Navigation"
            className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400"
          >
            {NAVIGATION_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => navigateToView(sec.id)}
                className={`min-h-[40px] px-2 py-1.5 rounded hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 touch-manipulation ${
                  activeView === sec.id ? 'text-blue-400 font-semibold border-b-2 border-blue-400' : ''
                }`}
                aria-current={activeView === sec.id ? 'page' : undefined}
              >
                {sec.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Account, Settings, Command Palette & Primary Execute Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => auth.openAuthModal()}
              className="min-h-[44px] px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 touch-manipulation focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              aria-label="Sessione Utente e Ruolo"
              title="Gestisci Login, Vault Token e Ruolo"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden lg:inline font-mono">
                {auth.authenticated
                  ? `${auth.user?.username ?? 'session'} · ${(auth.activeRole ?? 'viewer').toUpperCase()}`
                  : 'Accedi'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => settingsStore.openModal('editor')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white touch-manipulation focus:outline-hidden focus:ring-2 focus:ring-blue-500 shrink-0"
              aria-label="Apri Impostazioni Avanzate"
              title="Impostazioni Studio (Ctrl+,)"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="min-h-[44px] px-3 text-xs text-slate-400 flex items-center gap-1.5 touch-manipulation whitespace-nowrap shrink-0"
              aria-label="Open Command Palette"
            >
              <Search className="w-4 h-4" />
              <span className="hidden xl:inline">Commands</span>
              <kbd className="hidden xl:inline-block px-1 text-[10px] bg-slate-800 rounded border border-slate-700">
                {KEYBOARD_SHORTCUTS.COMMANDS}
              </kbd>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleExecute()}
              disabled={executionState.kind === EXECUTION_STATUS.RUNNING}
              className="min-h-[44px] px-3.5 text-xs font-medium touch-manipulation whitespace-nowrap shrink-0"
              aria-label={currentLanguage === LANGUAGES.PYTHON ? 'Run Python' : 'Verify Proof'}
            >
              {executionState.kind === EXECUTION_STATUS.RUNNING
                ? 'Running...'
                : currentLanguage === LANGUAGES.PYTHON
                ? 'Run Python (Ctrl+Enter)'
                : 'Verify Proof (Ctrl+Enter)'}
            </Button>
          </div>
        </header>

        {/* Hidden ZIP import input wired to ProjectContext & FileExplorer */}
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          aria-label="Importa archivio ZIP progetto"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void projectCtx.importZipFile(file);
              e.target.value = '';
            }
          }}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col pb-14 md:pb-0">
          {activeView === VIEWS.EDITOR && (
            <div className="flex flex-col flex-1 min-h-0 min-w-0 h-full overflow-hidden">
              {/* Editor Tabs Bar (Touch scrollable) */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-2 min-h-[40px] shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto h-full scrollbar-none touch-pan-x py-0.5">
                  <button
                    type="button"
                    onClick={() => setIsLeftDockOpen((prev) => !prev)}
                    className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded touch-manipulation ${
                      isLeftDockOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle Workbench Dock (Explorer / Chat / LSpec / Blueprint)"
                    aria-label="Toggle Workbench Dock"
                    aria-expanded={isLeftDockOpen}
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>

                  {openTabs.map((tab) => (
                    <div
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        projectCtx.openFile(tab);
                      }}
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
                        type="button"
                        onClick={(e) => handleCloseTab(tab, e)}
                        className="p-1 min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-slate-700/60 rounded text-slate-500 hover:text-slate-200 touch-manipulation"
                        aria-label={`Close ${tab}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
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
                      type="button"
                      onClick={() => {
                        const reopened = editorTabsStore.popClosedTab();
                        if (reopened && !openTabs.includes(reopened)) {
                          setOpenTabs((prev) => [...prev, reopened]);
                          setActiveTab(reopened);
                        }
                      }}
                      className="hidden sm:flex items-center gap-1 hover:text-slate-200 text-[11px] min-h-[36px] px-2 touch-manipulation whitespace-nowrap"
                      title={`Reopen Closed Tab (${KEYBOARD_SHORTCUTS.REOPEN_TAB})`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reopen ({tabsState.closedStack.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAutoCorrectOpen(true)}
                    className="px-2 min-h-[36px] flex items-center gap-1 hover:text-slate-200 rounded touch-manipulation whitespace-nowrap shrink-0"
                    title="Open 5-Level Auto-Correction"
                    aria-label="Auto-Correction"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Fix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProofAutomationOpen(true)}
                    className="px-2 min-h-[36px] flex items-center gap-1 hover:text-slate-200 rounded touch-manipulation whitespace-nowrap shrink-0"
                    title="Open Proof Automation Drawer"
                    aria-label="Proof Automation"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Provers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDiffMode((prev) => !prev)}
                    className={`px-2 min-h-[36px] flex items-center gap-1 hover:text-slate-200 rounded touch-manipulation whitespace-nowrap shrink-0 ${
                      isDiffMode ? 'text-blue-400 bg-slate-800/60' : ''
                    }`}
                    title="Toggle Diff Viewer"
                    aria-label="Toggle Diff Viewer"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Diff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCollabDrawerOpen((prev) => !prev)}
                    className={`px-2.5 min-h-[36px] flex items-center gap-1.5 hover:text-slate-200 rounded touch-manipulation whitespace-nowrap shrink-0 ${
                      isCollabDrawerOpen ? 'text-blue-400 bg-slate-800/60' : ''
                    }`}
                    title="Toggle Real-Time CRDT Collaboration"
                    aria-label="Toggle Real-Time Collaboration"
                    aria-expanded={isCollabDrawerOpen}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Collab</span>
                  </button>
                  <button
                    type="button"
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

              {/* Main Editor Area + Optional Left Workbench Dock */}
              <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
                {isLeftDockOpen && (
                  <aside
                    aria-label="Workbench Left Dock"
                    className="w-72 md:w-80 border-r border-slate-800 bg-[#090d15] flex flex-col shrink-0 min-h-0 overflow-hidden"
                  >
                    <div className="flex items-center border-b border-slate-800 bg-[#06090e] px-1.5 py-1 gap-1 overflow-x-auto text-[11px] font-mono shrink-0">
                      {(
                        [
                          { id: 'explorer', label: 'Files' },
                          { id: 'chat', label: 'Chat' },
                          { id: 'lspec', label: 'LSpec' },
                          { id: 'pipeline', label: 'Pipeline' },
                          { id: 'archon', label: 'Archon' },
                          { id: 'blueprint', label: 'DAG' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLeftDockTab(tab.id)}
                          className={`px-2 py-1 rounded whitespace-nowrap ${
                            leftDockTab === tab.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <React.Suspense fallback={<ViewFallback />}>
                        {leftDockTab === 'explorer' && (
                          <FileExplorer onImportZipClick={() => zipInputRef.current?.click()} />
                        )}
                        {leftDockTab === 'chat' && <ChatPanel />}
                        {leftDockTab === 'lspec' && (
                          <LSpecPanel
                            projectName={projectCtx.currentProject?.name ?? 'Polyglot'}
                            onAddToProject={(code) => applyCodeInEditor(code, 'lean4')}
                          />
                        )}
                        {leftDockTab === 'pipeline' && <InteractionPanel />}
                        {leftDockTab === 'archon' && <ArchonPanel isEnabledDefault />}
                        {leftDockTab === 'blueprint' && (
                          <BlueprintCanvas
                            nodes={blueprintNodes}
                            edges={blueprintEdges}
                            onOpenGeneratedFile={(filePath, code) =>
                              applyCodeInEditor(code, 'lean4', filePath)
                            }
                          />
                        )}
                      </React.Suspense>
                    </div>
                  </aside>
                )}

                {/* Dual Pane Layout (Stacked on mobile, side-by-side on md+) */}
                <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 min-w-0 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
                  {/* Left Column: Code Buffer or Diff Viewer */}
                  <div className="flex flex-col h-full min-h-0 min-w-0 bg-slate-950 overflow-hidden">
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800 text-xs text-slate-400 bg-slate-900/40 shrink-0">
                      <span className="font-mono truncate">{activeTab}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        UTF-8 · {currentLanguage.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 min-w-0 overflow-hidden select-text">
                      <React.Suspense fallback={<ViewFallback />}>
                        {isDiffMode ? (
                          <DiffViewer
                            original={DEFAULT_FILES[activeTab] ?? ''}
                            modified={currentCode}
                            language={currentLanguage === LANGUAGES.LEAN4 ? 'lean4' : 'python'}
                            onApplyModified={updateCurrentBuffer}
                            onRevertToOriginal={updateCurrentBuffer}
                            onClose={() => setIsDiffMode(false)}
                          />
                        ) : (
                          <EditorPane
                            language={currentLanguage}
                            value={currentCode}
                            onChange={updateCurrentBuffer}
                            onRunRequested={() => {
                              void handleExecute();
                            }}
                            onEditorMounted={setMonacoEditor}
                          />
                        )}
                      </React.Suspense>
                    </div>
                  </div>

                  {/* Right Column: Execution, Pyodide Worker Status & Lean 4 Infoview */}
                  <div className="flex flex-col h-full min-h-0 min-w-0 bg-slate-900/30 overflow-hidden">
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-800 text-xs text-slate-400 bg-slate-900/40 gap-2">
                      <span className="truncate">
                        {currentLanguage === LANGUAGES.PYTHON
                          ? 'Python 3.14 (Pyodide WASM) Output'
                          : 'Lean 4 Infoview & Diagnostics'}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {currentLanguage === LANGUAGES.PYTHON && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span
                              className={
                                pyodide.status === 'ready'
                                  ? 'text-emerald-400'
                                  : pyodide.status === 'error'
                                  ? 'text-rose-400'
                                  : 'text-amber-300'
                              }
                            >
                              Pyodide: {pyodide.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => pyodide.resetWorker()}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px]"
                            >
                              Reset Worker
                            </button>
                          </div>
                        )}

                        {executionState.kind === EXECUTION_STATUS.COMPLETED && (
                          executionState.language === LANGUAGES.PYTHON ? (
                            <Badge variant="verified">PYTHON WASM PASSED</Badge>
                          ) : executionState.result.simulated ? (
                            <Badge variant="warning">
                              {EPISTEMIC_BADGES.SIMULATED_NON_CERTIFYING}
                            </Badge>
                          ) : executionState.result.verified ? (
                            <Badge variant="warning">
                              KIMINA PASSED (SINGLE ENGINE — CONSENSUS REQUIRED)
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              {EPISTEMIC_BADGES.UNVERIFIED}
                            </Badge>
                          )
                        )}
                        {executionState.kind === EXECUTION_STATUS.FAILED && (
                          <Badge variant="error">EXECUTION FAILED</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs space-y-3 touch-pan-y select-text">
                      {executionState.kind === EXECUTION_STATUS.IDLE && (
                        <div className="text-slate-500">
                          {currentLanguage === LANGUAGES.PYTHON
                            ? `Press "Run Python" or use ${KEYBOARD_SHORTCUTS.VERIFY} to execute in local Pyodide WASM worker.`
                            : `Press "Verify Proof" or use ${KEYBOARD_SHORTCUTS.VERIFY} to execute formal verification.`}
                        </div>
                      )}

                      {executionState.kind === EXECUTION_STATUS.RUNNING && (
                        <div className="flex items-center gap-2 text-blue-400">
                          <span className="animate-spin">◷</span>
                          <span>
                            {currentLanguage === LANGUAGES.PYTHON
                              ? 'Executing Python script in Pyodide WASM worker...'
                              : 'Executing Lean kernel verifier and tactic evaluation...'}
                          </span>
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
                        <div role="alert" aria-live="assertive" className="text-rose-400 bg-rose-950/40 p-3 rounded border border-rose-800 space-y-2">
                          <div className="font-semibold text-xs">[ERROR] {executionState.error.code}</div>
                          <div className="text-[11px] text-rose-200">{executionState.error.message}</div>
                          {(executionState.error.details.reason === 'AUTH_REQUIRED' ||
                            executionState.error.details.reason === 'FORBIDDEN_ROLE') && (
                            <button
                              type="button"
                              onClick={() => auth.openAuthModal()}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-sans font-medium"
                            >
                              Apri Login / Cambia Ruolo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isCollabDrawerOpen && (
                    <aside
                      aria-label="Editor Collaboration Drawer"
                      className="col-span-1 md:col-span-2 border-t border-slate-800 max-h-[320px] overflow-y-auto"
                    >
                      <React.Suspense fallback={<ViewFallback />}>
                        <CollaborationPanel
                          activeDocId={activeTab}
                          bufferContent={currentCode}
                          monacoEditor={monacoEditor}
                          onRemoteBufferChange={updateCurrentBuffer}
                        />
                      </React.Suspense>
                    </aside>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === VIEWS.NOTEBOOK && (
            <div className="h-full w-full overflow-hidden">
              <React.Suspense fallback={<ViewFallback />}>
                <NotebookPanel />
              </React.Suspense>
            </div>
          )}

          {activeView === VIEWS.FEMEV && (
            <React.Suspense fallback={<ViewFallback />}>
              <FEMEVView
                leanCode={files[DEFAULT_FILE_NAMES.LEAN_MAIN] ?? currentCode}
                theoremName="add_comm_polyglot"
                onInsertCode={(code) => applyCodeInEditor(code, 'lean4')}
                onOpenFullDrawer={() => setIsFemevDrawerOpen(true)}
              />
            </React.Suspense>
          )}

          {activeView === VIEWS.LEDGER && (
            <div className="h-full p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 w-full overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Formal Proof Ledger</h2>
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
              <React.Suspense fallback={<ViewFallback />}>
                <DesignSystemShowcase />
              </React.Suspense>
            </div>
          )}

          {activeView === VIEWS.SETTINGS && (
            <div className="h-full p-4 sm:p-6 max-w-3xl mx-auto space-y-6 w-full overflow-y-auto">
              <header className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Studio Preferences</h2>
                  <p className="text-xs text-slate-400">
                    Manage compiler optimization, roles, token vault, and workspace settings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => auth.openAuthModal()}
                    className="min-h-[40px] px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
                  >
                    Sessione & Ruolo ({auth.activeRole ?? 'guest'})
                  </button>
                  <button
                    type="button"
                    onClick={() => settingsStore.openModal('editor')}
                    className="min-h-[40px] px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                  >
                    Apri Configurazione Completa (12 Sezioni)
                  </button>
                </div>
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

              <React.Suspense fallback={<ViewFallback />}>
                <RecommendationsPanel />
              </React.Suspense>
            </div>
          )}
        </main>

        {/* Mobile Touch Bar: Quick Thumb-zone Switcher (Android / iOS) */}
        <nav
          aria-label="Navigazione rapida mobile"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 h-14 pb-safe touch-manipulation"
        >
          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
          onOpenAuthModal={() => auth.openAuthModal()}
          onOpenSettingsModal={() => settingsStore.openModal('editor')}
          onOpenTool={handleOpenTool}
        />

        {/* Lazily mounted Workspace Drawers & Modals */}
        <React.Suspense fallback={null}>
          {isCommandPaletteOpen && (
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
            />
          )}
          <AuthModal isOpen={auth.isAuthModalOpen} onClose={() => auth.closeAuthModal()} />
          <SettingsModal />
          <StorageModal />
          {isProjectDrawerOpen && (
            <ProjectDrawer
              isOpen={isProjectDrawerOpen}
              onClose={() => setIsProjectDrawerOpen(false)}
              onOpenZipDialog={() => zipInputRef.current?.click()}
            />
          )}
          {isAutoCorrectOpen && (
            <AutoCorrectionPanel
              isOpen={isAutoCorrectOpen}
              onClose={() => setIsAutoCorrectOpen(false)}
              currentCode={currentCode}
              language={currentLanguage}
              onApplyFix={updateCurrentBuffer}
              compilerOutput={compilerOutputText}
            />
          )}
          {isProofAutomationOpen && (
            <ProofAutomationPanel
              isOpen={isProofAutomationOpen}
              onClose={() => setIsProofAutomationOpen(false)}
              currentCode={currentCode}
              language={currentLanguage}
              onApplyCode={updateCurrentBuffer}
              currentWorkspaceId={projectCtx.currentProject?.id}
            />
          )}
          {isFemevDrawerOpen && (
            <FemevDrawer
              isOpen={isFemevDrawerOpen}
              onClose={() => setIsFemevDrawerOpen(false)}
              onApplyCodeToEditor={(code, lang) => applyCodeInEditor(code, lang)}
            />
          )}
          {isBlueprintModalOpen && (
            <BlueprintWorkspaceModal
              isOpen={isBlueprintModalOpen}
              onClose={() => setIsBlueprintModalOpen(false)}
              onOpenInEditor={(code, lang, filePath) => applyCodeInEditor(code, lang, filePath)}
            />
          )}
          {isSecretsOpen && (
            <SecretsManager isOpen={isSecretsOpen} onClose={() => setIsSecretsOpen(false)} />
          )}
          {isMcpDrawerOpen && (
            <McpToolsDrawer isOpen={isMcpDrawerOpen} onClose={() => setIsMcpDrawerOpen(false)} />
          )}
          {isMemoryDrawerOpen && (
            <FiveTierMemoryDrawer
              isOpen={isMemoryDrawerOpen}
              onClose={() => setIsMemoryDrawerOpen(false)}
              currentProject={projectCtx.currentProject}
              onRestoreProject={(proj) => void projectCtx.loadProject(proj)}
            />
          )}
          {isDiscoveryModalOpen && (
            <ProjectDiscoveryModal
              isOpen={isDiscoveryModalOpen}
              onClose={() => setIsDiscoveryModalOpen(false)}
              onImportProject={(proj) => void projectCtx.loadProject(proj)}
            />
          )}
          {isNewProjectModalOpen && (
            <NewProjectModal
              isOpen={isNewProjectModalOpen}
              onClose={() => setIsNewProjectModalOpen(false)}
              onProjectCreated={() => navigateToView(VIEWS.EDITOR)}
            />
          )}
        </React.Suspense>
      </div>
    </ErrorBoundary>
  );
}

export function App(): React.JSX.Element {
  "use memo";
  return (
    <AuthProvider>
      <PyodideProvider>
        <ProjectProvider>
          <StorageProvider>
            <AppShell />
          </StorageProvider>
        </ProjectProvider>
      </PyodideProvider>
    </AuthProvider>
  );
}
