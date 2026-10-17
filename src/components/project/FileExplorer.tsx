import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Plus,
  Trash2,
  Upload,
  ChevronRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import type { TreeNode } from '../../services/vfs';

export interface FileExplorerProps {
  readonly onImportZipClick?: () => void;
}

export function FileExplorer({ onImportZipClick }: FileExplorerProps): React.JSX.Element {
  const {
    currentProject,
    activeFilePath,
    fileTree,
    openFile,
    createFile,
    deleteFile,
  } = useProjectContext();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      void createFile(newFileName.trim());
      setNewFileName('');
      setIsCreatingFile(false);
    }
  };

  const renderFileIcon = (path: string) => {
    if (path.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (path.endsWith('.lean')) return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (path.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const renderTreeNodes = (nodes: readonly TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path] ?? true;
      const isActive = activeFilePath === node.path;

      if (node.isDirectory) {
        return (
          <div key={node.path} className="select-none">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleFolder(node.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggleFolder(node.path);
              }}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="flex items-center gap-1.5 py-1 pr-2 rounded text-xs text-slate-300 hover:bg-neutral-800/60 hover:text-white cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderTreeNodes(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          role="button"
          tabIndex={0}
          onClick={() => openFile(node.path)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openFile(node.path);
          }}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
          className={`group flex items-center justify-between py-1 pr-2 rounded text-xs cursor-pointer font-mono transition-colors ${
            isActive
              ? 'bg-[#1e293b] text-blue-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {renderFileIcon(node.path)}
            <span className="truncate">{node.name}</span>
          </div>

          <button
            type="button"
            title={`Delete ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete file "${node.name}"?`)) {
                void deleteFile(node.path);
              }
            }}
            className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      );
    });
  };

  return (
    <aside
      aria-label="File Explorer"
      className="flex flex-col h-full bg-[#090d15] border-r border-neutral-800 text-slate-300 select-none overflow-hidden w-full"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#06090e] text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-slate-200">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate max-w-[130px]">
            {currentProject?.name ?? 'Explorer'}
          </span>
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Create new file"
            onClick={() => setIsCreatingFile(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {onImportZipClick && (
            <button
              type="button"
              title="Import ZIP Project"
              onClick={onImportZipClick}
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* New file input prompt */}
      {isCreatingFile && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-neutral-800 bg-neutral-900/60">
          <input
            type="text"
            autoFocus
            placeholder="src/main.py or Proof.lean"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => {
              if (!newFileName.trim()) setIsCreatingFile(false);
            }}
            className="w-full px-2 py-1 rounded bg-black/60 border border-neutral-700 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </form>
      )}

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 leading-relaxed font-sans">
            No files in project. Click <span className="text-blue-400">+</span> or import a ZIP archive.
          </div>
        ) : (
          renderTreeNodes(fileTree)
        )}
      </div>
    </aside>
  );
}
