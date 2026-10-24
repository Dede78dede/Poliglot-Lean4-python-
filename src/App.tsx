import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import type { SupportedLanguage } from './types/language';
import { isSupportedLanguage } from './types/language';
import { PyodideProvider, usePyodideContext } from './context/PyodideContext';
import { ProjectProvider, useProjectContext } from './context/ProjectContext';
import { StorageProvider } from './context/StorageContext';
import { StorageModal } from './components/storage/StorageModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { WorkspaceGrid } from './components/Layout/WorkspaceGrid';
import { EditorPane } from './components/EditorPane';
import { LeanInfoview } from './components/LeanInfoview';
import { OutputPane } from './components/OutputPane';
import { IntentSelector } from './components/IntentSelector';
import { GuidedPathBar } from './components/GuidedPathBar';
import { FileExplorer } from './components/project/FileExplorer';
import { MonacoTabs } from './components/project/MonacoTabs';
import { ProjectDrawer } from './components/project/ProjectDrawer';
import { InteractionPanel } from './components/interaction/InteractionPanel';
import { useExecution } from './hooks/useExecution';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { APP_CONSTANTS } from './registries/constants';
import {
  LEAN_GUIDED_STEPS,
  PYTHON_GUIDED_STEPS,
  type CodeExample,
} from './examples/example-registry';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { ProjectDiscoveryModal } from './components/discovery/ProjectDiscoveryModal';
import { FiveTierMemoryDrawer } from './components/memory/FiveTierMemoryDrawer';
import { AutoCorrectionPanel } from './components/autocorrect/AutoCorrectionPanel';
import { ProofAutomationPanel } from './components/proof/ProofAutomationPanel';
import { BlueprintWorkspaceModal } from './components/collaboration/BlueprintWorkspaceModal';
import { McpToolsDrawer } from './components/mcp/McpToolsDrawer';
import { SecretsManager } from './components/secrets/SecretsManager';
import { FemevDrawer } from './components/femev/FemevDrawer';
import { MenuBar } from './components/navigation/MenuBar';
import { CommandPalette } from './components/navigation/CommandPalette';
import {
  registerDefaultCommands,
  registerMcpCommands,
  registerFemevCommands,
  setCommandActionHandlers,
} from './services/navigation/default-commands';
import { initializeDefaultStatusBarItems } from './services/status-bar/runtime-items';
import { keybindingResolver } from './services/navigation/keybinding-resolver';
import { contextUpdaters } from './services/context/context-updaters';
import { evaluateLeanCompatibility } from './services/discovery/LeanDependencyResolver';
import { evaluatePythonCompatibility } from './services/discovery/PythonDependencyResolver';
import type { ToolchainCompatibilityReport } from './types/discovery';
import type { Project } from './types/projects';

// Lazy-loaded Gallery Modal (React.lazy code-splitting as specified)
const GalleryModal = lazy(() => import('./components/gallery/GalleryModal'));

const DEFAULT_PYTHON_CODE = `# Polyglot Code Studio — Python 3.14 (WASM)
import numpy as np

# Empirical computation with NumPy
matrix = np.array([[3, 1], [1, 2]])
eigvals = np.linalg.eigvals(matrix)

print("Matrix eigenvalues:", eigvals)
print(f"Determinant: {np.linalg.det(matrix):.1f}")
`;

const DEFAULT_LEAN_CODE = `-- Polyglot Code Studio — Lean 4.26
-- Formal Theorem Proving & Verification

theorem add_zero_identity (n : Nat) : n + 0 = n := by
  rfl

#check add_zero_identity
`;

function StudioWorkspace(): React.JSX.Element {
  const projectContext = useProjectContext();
  const {
    currentProject,
    activeFilePath,
    getActiveFile,
    updateFileContent,
    createFile,
    closeTab,
    importZipFile,
    loadProject,
    error: projectError,
    clearError: clearProjectError,
  } = projectContext;

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(APP_CONSTANTS.LOCAL_STORAGE_LANGUAGE_KEY);
    return isSupportedLanguage(saved) ? saved : 'lean4';
  });

  const [code, setCode] = useState<string>(() => {
    const saved = localStorage.getItem(`${APP_CONSTANTS.LOCAL_STORAGE_CODE_KEY_PREFIX}${language}`);
    return saved ?? (language === 'lean4' ? DEFAULT_LEAN_CODE : DEFAULT_PYTHON_CODE);
  });

  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [timeoutMs, setTimeoutMs] = useState<number>(APP_CONSTANTS.DEFAULT_TIMEOUT_MS);
  const [isDegradedMonarch, setIsDegradedMonarch] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState(false);
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
  const [autoCorrectionOpen, setAutoCorrectionOpen] = useState(false);
  const [proofAutomationOpen, setProofAutomationOpen] = useState(false);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [mcpToolsOpen, setMcpToolsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [secretsManagerOpen, setSecretsManagerOpen] = useState(false);
  const [femevDrawerOpen, setFemevDrawerOpen] = useState(false);
  const [toolchainWarning, setToolchainWarning] = useState<string | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isKiminaSimulated, setIsKiminaSimulated] = useState<boolean>(false);
  const [showIntentSelector, setShowIntentSelector] = useState<boolean>(() => {
    return !localStorage.getItem(APP_CONSTANTS.LOCAL_STORAGE_LANGUAGE_KEY);
  });

  const zipInputRef = useRef<HTMLInputElement>(null);

  // Re-evaluate toolchain alignment whenever project changes
  useEffect(() => {
    if (!currentProject) {
      setToolchainWarning(null);
      return;
    }
    if (currentProject.type === 'lean4') {
      const report = evaluateLeanCompatibility(currentProject.files);
      if (report.status === 'mismatch' && report.warning) {
        setToolchainWarning(report.warning);
      } else {
        setToolchainWarning(null);
      }
    } else if (currentProject.type === 'python') {
      const report = evaluatePythonCompatibility(currentProject.files);
      if (report.status === 'mismatch' && report.warning) {
        setToolchainWarning(report.warning);
      } else {
        setToolchainWarning(null);
      }
    }
  }, [currentProject]);

  // Guided learning path state
  const [guidedPath, setGuidedPath] = useState<{
    active: boolean;
    steps: readonly CodeExample[];
    currentIndex: number;
    showingSolution: boolean;
  } | null>(null);

  const { state: executionState, runCode, reset: resetExecution } = useExecution();
  const pyodide = usePyodideContext();

  // Active file determination:
  const activeFile = getActiveFile();
  const effectiveLanguage: SupportedLanguage = activeFile
    ? activeFile.language === 'python'
      ? 'python'
      : 'lean4'
    : language;

  const effectiveCode = activeFile ? activeFile.content : code;

  // Check backend health on mount to detect Kimina mode
  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.kiminaMode === 'simulator' || !data.kiminaConnected) {
          setIsKiminaSimulated(true);
        }
      })
      .catch(() => {
        setIsKiminaSimulated(true);
      });
  }, []);

  // Update simulator flag from execution result if available
  useEffect(() => {
    if (executionState.kind === 'completed' && executionState.result.simulated !== undefined) {
      setIsKiminaSimulated(executionState.result.simulated);
    }
  }, [executionState]);

  // Persist code changes when in single-file scratchpad mode
  useEffect(() => {
    if (!showIntentSelector && !currentProject) {
      localStorage.setItem(`${APP_CONSTANTS.LOCAL_STORAGE_CODE_KEY_PREFIX}${language}`, code);
      localStorage.setItem(APP_CONSTANTS.LOCAL_STORAGE_LANGUAGE_KEY, language);
    }
  }, [code, language, showIntentSelector, currentProject]);

  const handleLanguageChange = useCallback((newLang: SupportedLanguage) => {
    setLanguage(newLang);
    const savedCode = localStorage.getItem(`${APP_CONSTANTS.LOCAL_STORAGE_CODE_KEY_PREFIX}${newLang}`);
    setCode(savedCode ?? (newLang === 'lean4' ? DEFAULT_LEAN_CODE : DEFAULT_PYTHON_CODE));
    setGuidedPath(null);
  }, []);

  const handleCodeChange = useCallback((newVal: string) => {
    if (activeFile && activeFilePath) {
      updateFileContent(activeFilePath, newVal);
    } else {
      setCode(newVal);
    }
  }, [activeFile, activeFilePath, updateFileContent]);

  const handleRun = useCallback(() => {
    void runCode({
      language: effectiveLanguage,
      code: effectiveCode,
      timeoutMs,
    });
  }, [runCode, effectiveLanguage, effectiveCode, timeoutMs]);

  // Keyboard shortcuts (Ctrl+Enter, Ctrl+K, Ctrl+B, Ctrl+W, Esc)
  useKeyboardShortcuts({
    onRunCode: handleRun,
    onOpenGallery: () => setGalleryOpen(true),
    onEscape: () => {
      setGalleryOpen(false);
      setProjectDrawerOpen(false);
    },
    onToggleExplorer: () => setIsExplorerOpen((v) => !v),
    onCloseTab: () => {
      if (activeFilePath) {
        closeTab(activeFilePath);
      }
    },
  });

  // Navigation & Command Registry setup
  useEffect(() => {
    const defaultCommandsDisp = registerDefaultCommands();
    const mcpCommandsDisp = registerMcpCommands();
    const femevCommandsDisp = registerFemevCommands();
    initializeDefaultStatusBarItems();
    keybindingResolver.attach();

    return () => {
      defaultCommandsDisp.dispose();
      mcpCommandsDisp.dispose();
      femevCommandsDisp.dispose();
      keybindingResolver.detach();
    };
  }, []);

  // Bind Command Handlers to Workbench actions
  useEffect(() => {
    setCommandActionHandlers({
      onRun: handleRun,
      onSave: () => {
        if (activeFilePath) {
          updateFileContent(activeFilePath, effectiveCode);
        }
      },
      onNewProject: () => {
        setShowIntentSelector(true);
        setGuidedPath(null);
      },
      onOpenProject: () => setProjectDrawerOpen(true),
      onOpenDiscovery: () => setDiscoveryModalOpen(true),
      onOpenMemory: () => setMemoryDrawerOpen(true),
      onOpenAutoFix: () => setAutoCorrectionOpen(true),
      onOpenProofAutomation: () => setProofAutomationOpen(true),
      onOpenBlueprint: () => setBlueprintModalOpen(true),
      onOpenMcpTools: () => setMcpToolsOpen(true),
      onOpenProviders: () => setSecretsManagerOpen(true),
      onOpenFemev: () => setFemevDrawerOpen(true),
      onOpenCommandPalette: () => setCommandPaletteOpen(true),
      onOpenShortcuts: () => setCommandPaletteOpen(true),
      onOpenDoc: () => setGalleryOpen(true),
      onToggleExplorer: () => setIsExplorerOpen((v) => !v),
      onImportZip: () => zipInputRef.current?.click(),
    });
  }, [handleRun, activeFilePath, effectiveCode, updateFileContent]);

  // Reactive Context Key Updates
  useEffect(() => {
    contextUpdaters.setEditorContext({
      langId: effectiveLanguage,
      line: cursor.line,
      column: cursor.col,
    });
  }, [effectiveLanguage, cursor.line, cursor.col]);

  useEffect(() => {
    contextUpdaters.setRuntimeContext({
      pyodideReady: pyodide.status === 'ready',
      kiminaReady: !isKiminaSimulated,
      toolchainMismatch: Boolean(toolchainWarning),
      toolchainText: toolchainWarning ? 'Lean Toolchain Mismatch' : 'Lean 4.35 (Aligned)',
    });
  }, [pyodide.status, isKiminaSimulated, toolchainWarning]);

  useEffect(() => {
    contextUpdaters.setWorkspaceContext({
      exists: Boolean(currentProject),
      workspaceName: currentProject?.name || 'main',
      fileCount: currentProject ? Object.keys(currentProject.files).length : 1,
    });
  }, [currentProject]);

  useEffect(() => {
    contextUpdaters.setDrawerContext({
      open: memoryDrawerOpen || autoCorrectionOpen || proofAutomationOpen,
      tab: memoryDrawerOpen ? 'memory' : autoCorrectionOpen ? 'autocorrect' : proofAutomationOpen ? 'proof' : undefined,
    });
  }, [memoryDrawerOpen, autoCorrectionOpen, proofAutomationOpen]);

  // ZIP import handler
  const handleTriggerZipInput = () => {
    zipInputRef.current?.click();
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importZipFile(file);
    if (res.success) {
      setIsExplorerOpen(true);
      setShowIntentSelector(false);
    }
    if (zipInputRef.current) {
      zipInputRef.current.value = '';
    }
  };

  // Intent selector handlers
  const handleSelectLeanGuided = () => {
    setLanguage('lean4');
    setShowIntentSelector(false);
    const step = LEAN_GUIDED_STEPS[0]!;
    setCode(step.code);
    setGuidedPath({
      active: true,
      steps: LEAN_GUIDED_STEPS,
      currentIndex: 0,
      showingSolution: false,
    });
  };

  const handleSelectPythonGuided = () => {
    setLanguage('python');
    setShowIntentSelector(false);
    const step = PYTHON_GUIDED_STEPS[0]!;
    setCode(step.code);
    setGuidedPath({
      active: true,
      steps: PYTHON_GUIDED_STEPS,
      currentIndex: 0,
      showingSolution: false,
    });
  };

  const handleStartBlank = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setCode(lang === 'lean4' ? DEFAULT_LEAN_CODE : DEFAULT_PYTHON_CODE);
    setShowIntentSelector(false);
    setGuidedPath(null);
  };

  const handleImportDiscoveredProject = useCallback(
    (project: Project, report: ToolchainCompatibilityReport) => {
      void loadProject(project);
      setShowIntentSelector(false);
      setLanguage(project.type === 'lean4' ? 'lean4' : 'python');
      if (report.status === 'mismatch' && report.warning) {
        setToolchainWarning(report.warning);
      } else {
        setToolchainWarning(null);
      }
    },
    [loadProject],
  );

  // Guided path controls
  const handleToggleSolution = () => {
    if (!guidedPath) return;
    const currentStep = guidedPath.steps[guidedPath.currentIndex];
    if (!currentStep) return;

    if (guidedPath.showingSolution) {
      setCode(currentStep.code);
      setGuidedPath({ ...guidedPath, showingSolution: false });
    } else if (currentStep.solution) {
      setCode(currentStep.solution);
      setGuidedPath({ ...guidedPath, showingSolution: true });
    }
  };

  const handleResetStep = () => {
    if (!guidedPath) return;
    const currentStep = guidedPath.steps[guidedPath.currentIndex];
    if (currentStep) {
      setCode(currentStep.code);
      setGuidedPath({ ...guidedPath, showingSolution: false });
    }
  };

  const handlePrevStep = () => {
    if (!guidedPath || guidedPath.currentIndex <= 0) return;
    const nextIdx = guidedPath.currentIndex - 1;
    const nextStep = guidedPath.steps[nextIdx];
    if (nextStep) {
      setCode(nextStep.code);
      setGuidedPath({ ...guidedPath, currentIndex: nextIdx, showingSolution: false });
    }
  };

  const handleNextStep = () => {
    if (!guidedPath || guidedPath.currentIndex >= guidedPath.steps.length - 1) return;
    const nextIdx = guidedPath.currentIndex + 1;
    const nextStep = guidedPath.steps[nextIdx];
    if (nextStep) {
      setCode(nextStep.code);
      setGuidedPath({ ...guidedPath, currentIndex: nextIdx, showingSolution: false });
    }
  };

  const handleExitGuide = () => {
    setGuidedPath(null);
  };

  const handleSelectExample = (example: CodeExample) => {
    setLanguage(example.language);
    setCode(example.code);
    setShowIntentSelector(false);
    setGalleryOpen(false);
    setGuidedPath(null);
  };

  const lastResult = executionState.kind === 'completed' ? executionState.result : null;

  return (
    <div className="flex flex-col w-full h-screen h-[100dvh] max-w-full bg-[#0b0f17] text-slate-100 overflow-hidden font-sans">
      {/* Hidden file input for ZIP import */}
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipFileChange}
        accept=".zip,application/zip"
        className="hidden"
        aria-hidden="true"
      />

      {/* Tier 1: Menu Bar */}
      <MenuBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

      {/* Top Navigation Bar */}
      <TopBar
        language={effectiveLanguage}
        onLanguageChange={handleLanguageChange}
        executionState={executionState}
        onRunCode={handleRun}
        onOpenGallery={() => setGalleryOpen(true)}
        onResetToTemplate={() => {
          setShowIntentSelector(true);
          setGuidedPath(null);
        }}
        timeoutMs={timeoutMs}
        onTimeoutChange={setTimeoutMs}
        onResetWorker={pyodide.resetWorker}
        isKiminaSimulated={isKiminaSimulated}
        onOpenProjects={() => setProjectDrawerOpen(true)}
        onOpenDiscovery={() => setDiscoveryModalOpen(true)}
        onOpenMemory={() => setMemoryDrawerOpen(true)}
        onOpenAutoCorrection={() => setAutoCorrectionOpen(true)}
        onOpenProofAutomation={() => setProofAutomationOpen(true)}
        onOpenBlueprint={() => setBlueprintModalOpen(true)}
        onOpenMcpTools={() => setMcpToolsOpen(true)}
        onOpenSecrets={() => setSecretsManagerOpen(true)}
        onOpenFemev={() => setFemevDrawerOpen(true)}
        onImportZipClick={handleTriggerZipInput}
        projectName={currentProject?.name}
      />

      {/* Toolchain Mismatch Warning Banner */}
      {toolchainWarning && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-950/80 border-b border-amber-800 text-amber-200 text-xs shrink-0 font-mono shadow-inner"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{toolchainWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setToolchainWarning(null)}
            className="p-1 rounded hover:bg-amber-900 text-amber-300 hover:text-white transition-colors"
            title="Chiudi avviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error banner if project validation/import error occurs */}
      {projectError && (
        <div
          role="alert"
          className="flex items-center justify-between px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs shrink-0"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{projectError}</span>
          </div>
          <button
            type="button"
            onClick={clearProjectError}
            className="p-1 rounded hover:bg-rose-900 text-rose-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Guided Path Progress Bar */}
      {guidedPath?.active && guidedPath.steps[guidedPath.currentIndex] && (
        <GuidedPathBar
          currentStepIndex={guidedPath.currentIndex}
          totalSteps={guidedPath.steps.length}
          currentExample={guidedPath.steps[guidedPath.currentIndex]!}
          showingSolution={guidedPath.showingSolution}
          onToggleSolution={handleToggleSolution}
          onResetStep={handleResetStep}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
          onExitGuide={handleExitGuide}
          isVerified={Boolean(lastResult?.verified)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden relative">
        {showIntentSelector ? (
          <IntentSelector
            onSelectLeanGuided={handleSelectLeanGuided}
            onSelectPythonGuided={handleSelectPythonGuided}
            onStartBlank={handleStartBlank}
            onOpenGallery={() => setGalleryOpen(true)}
            onOpenDiscovery={() => setDiscoveryModalOpen(true)}
          />
        ) : (
          <WorkspaceGrid
            language={effectiveLanguage}
            fileExplorerNode={
              <FileExplorer onImportZipClick={handleTriggerZipInput} />
            }
            isExplorerOpen={isExplorerOpen}
            onToggleExplorer={() => setIsExplorerOpen((v) => !v)}
            tabsNode={
              currentProject ? (
                <MonacoTabs
                  onNewFileClick={() => {
                    const ext = effectiveLanguage === 'python' ? 'py' : 'lean';
                    void createFile(`file_${Date.now().toString().slice(-4)}.${ext}`);
                  }}
                />
              ) : undefined
            }
            editorNode={
              <EditorPane
                language={effectiveLanguage}
                value={effectiveCode}
                onChange={handleCodeChange}
                onCursorChange={(line, col) => setCursor({ line, col })}
                onRunRequested={handleRun}
                isDegradedMonarch={isDegradedMonarch}
                onMonacoInitState={setIsDegradedMonarch}
              />
            }
            infoviewNode={
              <LeanInfoview
                isDegraded={isDegradedMonarch}
                lastResult={lastResult}
                code={effectiveCode}
              />
            }
            outputNode={
              <OutputPane
                executionState={executionState}
                onClear={resetExecution}
              />
            }
            pipelineNode={<InteractionPanel />}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        language={effectiveLanguage}
        line={cursor.line}
        col={cursor.col}
        charCount={effectiveCode.length}
        pyodideStatus={pyodide.status}
        isKiminaSimulated={isKiminaSimulated}
        lastDurationMs={lastResult?.durationMs}
      />

      {/* Lazy-Loaded Gallery Modal */}
      {galleryOpen && (
        <Suspense fallback={null}>
          <GalleryModal
            isOpen={galleryOpen}
            onClose={() => setGalleryOpen(false)}
            onSelectExample={handleSelectExample}
          />
        </Suspense>
      )}

      {/* Project Repository Drawer Modal */}
      <ProjectDrawer
        isOpen={projectDrawerOpen}
        onClose={() => setProjectDrawerOpen(false)}
        onOpenZipDialog={handleTriggerZipInput}
      />

      {/* Open Source Discovery Modal */}
      <ProjectDiscoveryModal
        isOpen={discoveryModalOpen}
        onClose={() => setDiscoveryModalOpen(false)}
        onImportProject={handleImportDiscoveredProject}
      />

      {/* 5-Tier Memory Architecture & Cold Storage Drawer Modal */}
      <FiveTierMemoryDrawer
        isOpen={memoryDrawerOpen}
        onClose={() => setMemoryDrawerOpen(false)}
        currentProject={currentProject}
        onRestoreProject={(restored) => {
          void loadProject(restored);
          setLanguage(restored.type === 'lean4' ? 'lean4' : 'python');
        }}
      />

      {/* 5-Level Auto-Correction System Drawer */}
      <AutoCorrectionPanel
        isOpen={autoCorrectionOpen}
        onClose={() => setAutoCorrectionOpen(false)}
        currentCode={effectiveCode}
        language={effectiveLanguage}
        onApplyFix={handleCodeChange}
        compilerOutput={lastResult?.stdout || lastResult?.stderr}
      />

      {/* Phase 8 Advanced Proof Automation & Metaprogramming Drawer */}
      <ProofAutomationPanel
        isOpen={proofAutomationOpen}
        onClose={() => setProofAutomationOpen(false)}
        currentCode={effectiveCode}
        language={effectiveLanguage}
        onApplyCode={handleCodeChange}
      />

      {/* Phase 7 Archon Horizon Blueprint Workspace & Collaboration Modal */}
      <BlueprintWorkspaceModal
        isOpen={blueprintModalOpen}
        onClose={() => setBlueprintModalOpen(false)}
        onOpenInEditor={(code, lang) => {
          setLanguage(lang);
          handleCodeChange(code);
        }}
      />

      {/* Phase 10.2: Native Lean LSP MCP Tools Drawer */}
      <McpToolsDrawer
        isOpen={mcpToolsOpen}
        onClose={() => setMcpToolsOpen(false)}
      />

      {/* API & Secrets Manager Modal */}
      <SecretsManager
        isOpen={secretsManagerOpen}
        onClose={() => setSecretsManagerOpen(false)}
      />

      {/* Phase 10.5: FEMEV Epistemic Workflow Drawer */}
      <FemevDrawer
        isOpen={femevDrawerOpen}
        onClose={() => setFemevDrawerOpen(false)}
        onApplyCodeToEditor={(appliedCode, lang) => {
          setLanguage(lang);
          handleCodeChange(appliedCode);
        }}
      />

      {/* Cloud & Local Storage Modal */}
      <StorageModal />

      {/* Command Palette (cmdk) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <PyodideProvider>
        <ProjectProvider>
          <StorageProvider>
            <StudioWorkspace />
          </StorageProvider>
        </ProjectProvider>
      </PyodideProvider>
    </ErrorBoundary>
  );
}
