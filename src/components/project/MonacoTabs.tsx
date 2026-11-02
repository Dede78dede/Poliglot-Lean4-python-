import React, { useState, useSyncExternalStore, useEffect, useCallback } from 'react';
import {
  X,
  FileCode,
  Plus,
  Circle,
  Columns2,
  Rows2,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { editorTabsStore } from '../../services/shell/editor-tabs-store';

export interface MonacoTabsProps {
  readonly onNewFileClick?: () => void;
  readonly onSplitToggle?: () => void;
}

export function MonacoTabs({
  onNewFileClick,
  onSplitToggle,
}: MonacoTabsProps): React.JSX.Element | null {
  const { currentProject, openTabs, activeFilePath, openFile, closeTab } = useProjectContext();
  const tabsSnapshot = useSyncExternalStore(
    editorTabsStore.subscribe,
    editorTabsStore.getSnapshot,
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [contextMenuTab, setContextMenuTab] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  // Sync tabOrder in store with project's openTabs if length or items differ
  useEffect(() => {
    if (openTabs.length > 0) {
      const currentStored = tabsSnapshot.tabOrder;
      const isMismatch =
        currentStored.length !== openTabs.length ||
        !openTabs.every((t) => currentStored.includes(t));
      if (isMismatch) {
        editorTabsStore.setTabOrder(openTabs);
      }
    }
  }, [openTabs, tabsSnapshot.tabOrder]);

  // Global keydown for Ctrl+Shift+T (reopen closed tab) and Ctrl+W (close current tab)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const reopenPath = editorTabsStore.popClosedTab();
        if (reopenPath) {
          openFile(reopenPath);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        // If an editor tab is active and not inside an input
        if (activeFilePath && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          editorTabsStore.pushClosedTab(activeFilePath);
          closeTab(activeFilePath);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFilePath, closeTab, openFile]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuTab) return;
    const handleOutside = () => setContextMenuTab(null);
    window.addEventListener('click', handleOutside);
    window.addEventListener('contextmenu', handleOutside);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
    };
  }, [contextMenuTab]);

  const handleClose = useCallback(
    (path: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      editorTabsStore.pushClosedTab(path);
      closeTab(path);
    },
    [closeTab],
  );

  const handleCloseOthers = useCallback(
    (targetPath: string) => {
      for (const tab of openTabs) {
        if (tab !== targetPath) {
          editorTabsStore.pushClosedTab(tab);
          closeTab(tab);
        }
      }
    },
    [closeTab, openTabs],
  );

  const handleCloseToRight = useCallback(
    (targetPath: string) => {
      const idx = openTabs.indexOf(targetPath);
      if (idx !== -1) {
        const rightTabs = openTabs.slice(idx + 1);
        for (const tab of rightTabs) {
          editorTabsStore.pushClosedTab(tab);
          closeTab(tab);
        }
      }
    },
    [closeTab, openTabs],
  );

  const handleCloseSaved = useCallback(() => {
    if (!currentProject) return;
    for (const tab of openTabs) {
      const file = currentProject.files.find((f) => f.path === tab);
      if (file && !file.isDirty) {
        editorTabsStore.pushClosedTab(tab);
        closeTab(tab);
      }
    }
  }, [closeTab, currentProject, openTabs]);

  if (!currentProject || openTabs.length === 0) {
    return null;
  }

  const effectiveTabs =
    tabsSnapshot.tabOrder.length === openTabs.length &&
    openTabs.every((t) => tabsSnapshot.tabOrder.includes(t))
      ? tabsSnapshot.tabOrder
      : openTabs;

  return (
    <div
      role="tablist"
      aria-label="Open editor files"
      className="flex items-center justify-between bg-[#090d15] border-b border-neutral-800 text-xs select-none shrink-0 h-9 px-1"
    >
      {/* Scrollable Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {effectiveTabs.map((path, index) => {
          const file = currentProject.files.find((f) => f.path === path);
          const isActive = activeFilePath === path;
          const fileName = path.split('/').pop() ?? path;

          return (
            <div
              key={path}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.setData('text/plain', path);
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  editorTabsStore.moveTab(draggedIndex, index);
                }
                setDraggedIndex(null);
              }}
              onClick={() => openFile(path)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault();
                  handleClose(path);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuTab({ path, x: e.clientX, y: e.clientY });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openFile(path);
                if (e.key === 'Delete' || (e.ctrlKey && e.key === 'w')) handleClose(path);
              }}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t border-t-2 text-xs font-mono transition-all cursor-pointer shrink-0 max-w-[220px] ${
                isActive
                  ? 'bg-[#0d1117] border-blue-500 text-slate-100 font-medium'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-neutral-900/60'
              }`}
            >
              <FileCode
                className={`w-3.5 h-3.5 shrink-0 ${
                  path.endsWith('.py')
                    ? 'text-emerald-400'
                    : path.endsWith('.lean')
                      ? 'text-blue-400'
                      : 'text-slate-400'
                }`}
              />
              <span className="truncate">{fileName}</span>

              {/* Dirty indicator */}
              {file?.isDirty && (
                <Circle className="w-2 h-2 fill-current text-blue-400 shrink-0" />
              )}

              {/* Close tab button */}
              <button
                type="button"
                aria-label={`Close tab ${fileName}`}
                onClick={(e) => handleClose(path, e)}
                className="p-0.5 rounded hover:bg-neutral-800 text-slate-400 hover:text-white transition-colors opacity-60 group-hover:opacity-100 shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New file button */}
        {onNewFileClick && (
          <button
            type="button"
            onClick={onNewFileClick}
            title="Create new file"
            aria-label="Create new file"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-900 transition-colors ml-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Controls: Split Editor Toggle */}
      <div className="flex items-center gap-1 pl-2 border-l border-neutral-850 shrink-0">
        <button
          type="button"
          onClick={() => {
            editorTabsStore.toggleSplit(activeFilePath);
            onSplitToggle?.();
          }}
          title={
            tabsSnapshot.splitMode === 'none'
              ? 'Split Editor Right (Ctrl+\\)'
              : 'Close Editor Split'
          }
          aria-label="Split Editor View"
          className={`p-1 rounded transition-colors ${
            tabsSnapshot.splitMode !== 'none'
              ? 'bg-blue-600/30 text-blue-300'
              : 'text-slate-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Context Menu */}
      {contextMenuTab && (
        <div
          role="menu"
          aria-label="Tab Options"
          style={{ top: `${contextMenuTab.y}px`, left: `${contextMenuTab.x}px` }}
          className="fixed z-50 min-w-[180px] bg-[#111827] border border-neutral-700 rounded-md shadow-2xl p-1 text-xs text-slate-200 font-sans"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleClose(contextMenuTab.path);
              setContextMenuTab(null);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <span>Close</span>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+W</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCloseOthers(contextMenuTab.path);
              setContextMenuTab(null);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <span>Close Others</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCloseToRight(contextMenuTab.path);
              setContextMenuTab(null);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <span>Close to the Right</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCloseSaved();
              setContextMenuTab(null);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <span>Close Saved</span>
          </button>

          <div className="my-1 border-t border-neutral-800" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard?.writeText(contextMenuTab.path);
              setContextMenuTab(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <Copy className="w-3 h-3 text-slate-400" />
            <span>Copy Path</span>
          </button>
        </div>
      )}
    </div>
  );
}
