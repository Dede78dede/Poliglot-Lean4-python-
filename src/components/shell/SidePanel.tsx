import React, { useSyncExternalStore, useRef, useCallback } from 'react';
import {
  X,
  FolderTree,
  List,
  GitCommit,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import {
  activityBarStore,
  CANONICAL_ACTIVITIES,
  type ActivityId,
} from '../../services/shell/activity-bar-store';
import {
  sidePanelStore,
  type ExplorerViewMode,
  SIDE_PANEL_LIMITS,
} from '../../services/shell/side-panel-store';

export interface SidePanelProps {
  readonly renderContent?: (activityId: ActivityId, viewMode: string) => React.ReactNode;
  readonly defaultChildren?: React.ReactNode;
}

export function SidePanel({
  renderContent,
  defaultChildren,
}: SidePanelProps): React.JSX.Element | null {
  const activitySnapshot = useSyncExternalStore(
    activityBarStore.subscribe,
    activityBarStore.getSnapshot,
  );
  const sidePanelSnapshot = useSyncExternalStore(
    sidePanelStore.subscribe,
    sidePanelStore.getSnapshot,
  );

  const isDraggingRef = useRef(false);
  const activeActivity = activitySnapshot.activeActivity;
  const isLeft = activitySnapshot.position === 'left';

  // Resize handler
  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = sidePanelSnapshot.width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = isLeft ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        sidePanelStore.setWidth(startWidth + delta);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isLeft, sidePanelSnapshot.width],
  );

  if (activitySnapshot.isZenMode || sidePanelSnapshot.collapsed || !activeActivity) {
    return null;
  }

  const descriptor = CANONICAL_ACTIVITIES.find((a) => a.id === activeActivity);
  const currentViewMode = sidePanelStore.getViewMode(activeActivity);

  return (
    <aside
      aria-label={`${descriptor?.label ?? 'Side'} Panel`}
      style={{ width: `${sidePanelSnapshot.width}px` }}
      className={`relative h-full bg-[#090d15] flex flex-col shrink-0 select-none overflow-hidden z-10 ${
        isLeft ? 'border-r border-neutral-800' : 'border-l border-neutral-800'
      }`}
    >
      {/* Side Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#06090e] border-b border-neutral-800 text-xs text-slate-300 font-semibold shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="uppercase tracking-wider text-[11px] font-mono text-slate-300 truncate">
            {descriptor?.label ?? activeActivity}
          </span>

          {/* View mode selector for Explorer */}
          {activeActivity === 'explorer' && (
            <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800 text-[10px]">
              <button
                type="button"
                onClick={() => sidePanelStore.setViewMode('explorer', 'tree')}
                title="Tree View"
                aria-label="Tree View"
                className={`p-1 rounded transition-colors ${
                  currentViewMode === 'tree'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderTree className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => sidePanelStore.setViewMode('explorer', 'list')}
                title="List View"
                aria-label="List View"
                className={`p-1 rounded transition-colors ${
                  currentViewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => sidePanelStore.setViewMode('explorer', 'changes')}
                title="Changed Files"
                aria-label="Changed Files"
                className={`p-1 rounded transition-colors ${
                  currentViewMode === 'changes'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCommit className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => sidePanelStore.setViewMode('explorer', 'trash')}
                title="Trash (Deleted Files)"
                aria-label="Trash"
                className={`p-1 rounded transition-colors ${
                  currentViewMode === 'trash'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Panel controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => sidePanelStore.setCollapsed(true)}
            title="Hide Side Bar (Ctrl+B)"
            aria-label="Close Side Bar"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Side Panel Content Body */}
      <div className="flex-1 overflow-auto relative min-h-0">
        {renderContent
          ? renderContent(activeActivity, currentViewMode)
          : defaultChildren}
      </div>

      {/* Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Side Panel"
        tabIndex={0}
        onMouseDown={handleMouseDownResize}
        className={`absolute top-0 bottom-0 w-1.5 hover:bg-blue-600/60 active:bg-blue-600 transition-colors cursor-col-resize z-20 ${
          isLeft ? 'right-0 -mr-0.5' : 'left-0 -ml-0.5'
        }`}
      />
    </aside>
  );
}
