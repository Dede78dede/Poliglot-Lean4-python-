import React from 'react';
import { X, FileCode, Plus, Circle } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';

export interface MonacoTabsProps {
  readonly onNewFileClick?: () => void;
}

export function MonacoTabs({ onNewFileClick }: MonacoTabsProps): React.JSX.Element | null {
  const { currentProject, openTabs, activeFilePath, openFile, closeTab } = useProjectContext();

  if (!currentProject || openTabs.length === 0) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Open editor files"
      className="flex items-center gap-1 px-2 bg-[#090d15] border-b border-neutral-800 text-xs overflow-x-auto select-none no-scrollbar shrink-0 h-9"
    >
      {openTabs.map((path) => {
        const file = currentProject.files.find((f) => f.path === path);
        const isActive = activeFilePath === path;
        const fileName = path.split('/').pop() ?? path;

        return (
          <div
            key={path}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => openFile(path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openFile(path);
              if (e.key === 'Delete' || (e.ctrlKey && e.key === 'w')) closeTab(path);
            }}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t border-t-2 text-xs font-mono transition-all cursor-pointer ${
              isActive
                ? 'bg-[#0d1117] border-blue-500 text-slate-100 font-medium'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-neutral-900/60'
            }`}
          >
            <FileCode
              className={`w-3.5 h-3.5 ${
                path.endsWith('.py')
                  ? 'text-emerald-400'
                  : path.endsWith('.lean')
                    ? 'text-blue-400'
                    : 'text-slate-400'
              }`}
            />
            <span className="truncate max-w-[160px]">{fileName}</span>

            {/* Dirty indicator */}
            {file?.isDirty && (
              <Circle className="w-2 h-2 fill-current text-blue-400 shrink-0" />
            )}

            {/* Close tab */}
            <button
              type="button"
              aria-label={`Close tab ${fileName}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className="p-0.5 rounded hover:bg-neutral-800 text-slate-400 hover:text-white transition-colors opacity-60 group-hover:opacity-100"
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
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-900 transition-colors ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
