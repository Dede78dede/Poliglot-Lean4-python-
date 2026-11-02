import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { SupportedLanguage } from '../../types/language';
import type { AuxiliaryTab, WorkspaceLayout } from '../../types/workspace';
import { WorkspaceLayoutSchema } from '../../types/workspace';
import { APP_CONSTANTS } from '../../registries/constants';
import { Compass, Terminal, Layers, PanelLeftClose, PanelLeft } from 'lucide-react';
import { activityBarStore } from '../../services/shell/activity-bar-store';
import { sidePanelStore } from '../../services/shell/side-panel-store';

export interface WorkspaceGridProps {
  readonly language: SupportedLanguage;
  readonly editorNode: React.ReactNode;
  readonly infoviewNode: React.ReactNode;
  readonly outputNode: React.ReactNode;
  readonly fileExplorerNode?: React.ReactNode;
  readonly isExplorerOpen?: boolean;
  readonly onToggleExplorer?: () => void;
  readonly tabsNode?: React.ReactNode;
  readonly pipelineNode?: React.ReactNode;
  readonly activityBarNode?: React.ReactNode;
  readonly sidePanelNode?: React.ReactNode;
  readonly breadcrumbsNode?: React.ReactNode;
  readonly diffViewerNode?: React.ReactNode;
  readonly isDiffActive?: boolean;
}

function loadInitialLayout(): WorkspaceLayout {
  try {
    const raw = localStorage.getItem(APP_CONSTANTS.LOCAL_STORAGE_LAYOUT_KEY);
    if (!raw) return WorkspaceLayoutSchema.parse({});
    const parsed = JSON.parse(raw);
    const valid = WorkspaceLayoutSchema.safeParse(parsed);
    return valid.success ? valid.data : WorkspaceLayoutSchema.parse({});
  } catch {
    return WorkspaceLayoutSchema.parse({});
  }
}

export function WorkspaceGrid({
  language,
  editorNode,
  infoviewNode,
  outputNode,
  fileExplorerNode,
  isExplorerOpen = false,
  onToggleExplorer,
  tabsNode,
  pipelineNode,
  activityBarNode,
  sidePanelNode,
  breadcrumbsNode,
  diffViewerNode,
  isDiffActive = false,
}: WorkspaceGridProps): React.JSX.Element {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadInitialLayout);
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitRef = useRef<boolean>(false);

  const activitySnapshot = useSyncExternalStore(
    activityBarStore.subscribe,
    activityBarStore.getSnapshot,
  );
  const sidePanelSnapshot = useSyncExternalStore(
    sidePanelStore.subscribe,
    sidePanelStore.getSnapshot,
  );

  // Responsive breakpoint check
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(APP_CONSTANTS.LOCAL_STORAGE_LAYOUT_KEY, JSON.stringify(layout));
  }, [layout]);

  // Horizontal resizer between Editor and Auxiliary Column
  const handleMouseDownSplit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSplitRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = Math.max(0.25, Math.min(0.8, (moveEvent.clientX - rect.left) / rect.width));
      setLayout((prev) => ({ ...prev, editorWidthRatio: newRatio }));
    };

    const handleMouseUp = () => {
      isDraggingSplitRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const setActiveTab = (tab: AuxiliaryTab) => {
    setLayout((prev) => ({ ...prev, activeAuxiliaryTab: tab }));
  };

  const isLean = language === 'lean4';
  const activeTab = layout.activeAuxiliaryTab;
  const isActivityBarLeft = activitySnapshot.position === 'left';
  const showActivityBar = !activitySnapshot.isZenMode && Boolean(activityBarNode);
  const showSidePanel =
    !activitySnapshot.isZenMode &&
    !sidePanelSnapshot.collapsed &&
    Boolean(activitySnapshot.activeActivity) &&
    Boolean(sidePanelNode || fileExplorerNode);

  const renderedSidePanel = sidePanelNode ?? (
    fileExplorerNode && (
      <div
        className={`h-full border-r border-neutral-800 transition-all duration-150 flex flex-col shrink-0 ${
          isExplorerOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
        }`}
      >
        {fileExplorerNode}
      </div>
    )
  );

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden select-none bg-[#0b0f17]"
    >
      {/* Desktop Split Mode */}
      {!isNarrow ? (
        <div className="flex w-full h-full">
          {/* Left Activity Bar & Side Panel (if position is left) */}
          {isActivityBarLeft && (
            <>
              {showActivityBar && activityBarNode}
              {showSidePanel && renderedSidePanel}
            </>
          )}

          {/* Legacy fallback if no ActivityBar configured */}
          {!activityBarNode && fileExplorerNode && (
            <div
              className={`h-full border-r border-neutral-800 transition-all duration-150 flex flex-col shrink-0 ${
                isExplorerOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
              }`}
            >
              {fileExplorerNode}
            </div>
          )}

          {/* Center Column: Monaco Tabs + Breadcrumbs + Monaco Editor / DiffViewer */}
          <div
            style={{ width: `${layout.editorWidthRatio * 100}%` }}
            className="h-full flex flex-col relative overflow-hidden min-w-[280px]"
          >
            {/* Top row with optional Explorer Toggle & Tabs */}
            <div className="flex items-center bg-[#090d15] border-b border-neutral-800">
              {!activityBarNode && onToggleExplorer && (
                <button
                  type="button"
                  onClick={onToggleExplorer}
                  title={isExplorerOpen ? 'Hide Explorer (Ctrl+B)' : 'Show Explorer (Ctrl+B)'}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-neutral-800/80 transition-colors border-r border-neutral-800 shrink-0"
                >
                  {isExplorerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
              )}
              <div className="flex-1 overflow-x-auto min-w-0">
                {tabsNode}
              </div>
            </div>

            {/* Breadcrumbs Navigation Bar */}
            {breadcrumbsNode}

            {/* Main Canvas: Diff Viewer or Monaco Editor Canvas */}
            <div className="flex-1 relative overflow-hidden">
              {isDiffActive && diffViewerNode ? diffViewerNode : editorNode}
            </div>
          </div>

          {/* Vertical Resizer Divider Handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize workspace panes"
            tabIndex={0}
            onMouseDown={handleMouseDownSplit}
            className="w-1.5 h-full bg-neutral-900 hover:bg-blue-600 transition-colors cursor-col-resize shrink-0 z-10 border-x border-neutral-800"
          />

          {/* Right Column: Auxiliary Pane (Infoview + Output + Pipeline) */}
          <div
            style={{ width: `${(1 - layout.editorWidthRatio) * 100}%` }}
            className="flex flex-col h-full bg-[#111827] overflow-hidden min-w-[260px]"
          >
            {/* Tab header buttons */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#090d15] border-b border-neutral-800 text-xs shrink-0">
              {isLean && (
                <button
                  type="button"
                  onClick={() => setActiveTab('infoview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'infoview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Infoview</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'output' || (!isLean && activeTab === 'infoview')
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Output Console</span>
              </button>

              {pipelineNode && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'pipeline'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pipeline</span>
                </button>
              )}
            </div>

            {/* Persistent Tab Panes */}
            <div className="flex-1 relative overflow-hidden">
              {isLean && (
                <div
                  className={`w-full h-full flex flex-col ${
                    activeTab === 'infoview' ? 'block' : 'hidden'
                  }`}
                >
                  <div
                    style={{ height: `${layout.infoviewHeightRatio * 100}%` }}
                    className="overflow-hidden border-b border-neutral-800"
                  >
                    {infoviewNode}
                  </div>
                  <div
                    style={{ height: `${(1 - layout.infoviewHeightRatio) * 100}%` }}
                    className="overflow-hidden"
                  >
                    {outputNode}
                  </div>
                </div>
              )}

              <div
                className={`w-full h-full ${
                  activeTab === 'output' || (!isLean && activeTab === 'infoview') ? 'block' : 'hidden'
                }`}
              >
                {outputNode}
              </div>

              {pipelineNode && (
                <div
                  className={`w-full h-full ${
                    activeTab === 'pipeline' ? 'block' : 'hidden'
                  }`}
                >
                  {pipelineNode}
                </div>
              )}
            </div>
          </div>

          {/* Right Activity Bar & Side Panel (if position is right) */}
          {!isActivityBarLeft && (
            <>
              {showSidePanel && renderedSidePanel}
              {showActivityBar && activityBarNode}
            </>
          )}
        </div>
      ) : (
        /* Mobile / Narrow Tabbed Layout */
        <div className="flex flex-col w-full h-full min-h-0 flex-1 overflow-hidden">
          <div className="h-1/2 min-h-0 w-full border-b border-neutral-800 overflow-hidden flex flex-col">
            {tabsNode && (
              <div className="flex items-center bg-[#090d15] border-b border-neutral-800">
                {tabsNode}
              </div>
            )}
            {breadcrumbsNode}
            <div className="flex-1 min-h-0 overflow-hidden">
              {editorNode}
            </div>
          </div>

          <div className="h-1/2 min-h-0 w-full flex flex-col bg-[#111827] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d131f] border-b border-neutral-800 text-xs">
              {isLean && (
                <button
                  type="button"
                  onClick={() => setActiveTab('infoview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'infoview'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Infoview</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'output' || (!isLean && activeTab === 'infoview')
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Output Console</span>
              </button>
              {pipelineNode && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'pipeline'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-neutral-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pipeline</span>
                </button>
              )}
            </div>

            <div className="flex-1 relative overflow-hidden">
              <div
                className={`w-full h-full ${
                  activeTab === 'infoview' && isLean ? 'block' : 'hidden'
                }`}
              >
                {infoviewNode}
              </div>

              <div
                className={`w-full h-full ${
                  activeTab === 'output' || (!isLean && activeTab === 'infoview') ? 'block' : 'hidden'
                }`}
              >
                {outputNode}
              </div>

              {pipelineNode && (
                <div
                  className={`w-full h-full ${
                    activeTab === 'pipeline' ? 'block' : 'hidden'
                  }`}
                >
                  {pipelineNode}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
