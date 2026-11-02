import React, { useState, useSyncExternalStore, useEffect } from 'react';
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
  Edit2,
  Archive,
  Eye,
  Copy,
  Scissors,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { sidePanelStore, type ExplorerViewMode } from '../../services/shell/side-panel-store';
import { trashService } from '../../services/files/trash-service';
import { archiveService, type ArchivePreviewResult } from '../../services/files/archive-service';
import { TrashView } from './TrashView';
import { ArchiveDialog } from './ArchiveDialog';
import { FilePreview } from './FilePreview';
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

  const sidePanelSnapshot = useSyncExternalStore(
    sidePanelStore.subscribe,
    sidePanelStore.getSnapshot,
  );
  const viewMode = (sidePanelSnapshot.viewModes['explorer'] ?? 'tree') as ExplorerViewMode;

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

  // Inline renaming state
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // New file creation state
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Drag and drop state
  const [draggedPaths, setDraggedPaths] = useState<string[]>([]);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetPath?: string;
    isDirectory?: boolean;
  } | null>(null);

  // Archive dialog & Preview state
  const [archiveModalData, setArchiveModalData] = useState<{
    fileName: string;
    preview: ArchivePreviewResult | null;
    rawBytes?: Uint8Array;
  } | null>(null);
  const [previewingFile, setPreviewingFile] = useState<{ path: string; content: string } | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = () => setContextMenu(null);
    window.addEventListener('click', handleOutside);
    window.addEventListener('contextmenu', handleOutside);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
    };
  }, [contextMenu]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  // Selection handler with multi-select (Shift range, Ctrl/Cmd toggle)
  const handleItemSelect = (path: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedPath && currentProject) {
      const allPaths = currentProject.files.map((f) => f.path);
      const startIdx = allPaths.indexOf(lastSelectedPath);
      const endIdx = allPaths.indexOf(path);
      if (startIdx !== -1 && endIdx !== -1) {
        const [low, high] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = allPaths.slice(low, high + 1);
        setSelectedPaths(new Set([...selectedPaths, ...range]));
      }
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      setSelectedPaths(next);
      setLastSelectedPath(path);
    } else {
      setSelectedPaths(new Set([path]));
      setLastSelectedPath(path);
    }
  };

  // Soft Delete (moves to trash first)
  const handleSoftDelete = async (path: string) => {
    const file = currentProject?.files.find((f) => f.path === path);
    const content = file?.content ?? '';
    trashService.moveToTrash(path, content);
    await deleteFile(path);
  };

  const handleDeleteSelected = async () => {
    const targets = selectedPaths.size > 0 ? Array.from(selectedPaths) : (lastSelectedPath ? [lastSelectedPath] : []);
    if (targets.length === 0) return;

    if (confirm(`Move ${targets.length} item${targets.length === 1 ? '' : 's'} to trash?`)) {
      for (const p of targets) {
        await handleSoftDelete(p);
      }
      setSelectedPaths(new Set());
      setLastSelectedPath(null);
    }
  };

  // Rename commit
  const handleRenameSubmit = async (oldPath: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === oldPath.split('/').pop()) {
      setRenamingPath(null);
      setRenameError(null);
      return;
    }

    if (trimmed.includes('/') || trimmed.includes('\\')) {
      setRenameError('File name cannot contain slashes');
      return;
    }

    const segments = oldPath.split('/');
    segments[segments.length - 1] = trimmed;
    const newPath = segments.join('/');

    if (currentProject?.files.some((f) => f.path === newPath)) {
      setRenameError('File with this name already exists');
      return;
    }

    const file = currentProject?.files.find((f) => f.path === oldPath);
    const content = file?.content ?? '';

    await createFile(newPath, content);
    await deleteFile(oldPath);
    setRenamingPath(null);
    setRenameError(null);
    openFile(newPath);
  };

  // Create ZIP from selected or all files
  const handleCreateZip = () => {
    if (!currentProject || currentProject.files.length === 0) return;
    const targets =
      selectedPaths.size > 0
        ? currentProject.files.filter((f) => selectedPaths.has(f.path))
        : currentProject.files;

    try {
      const bytes = archiveService.createArchive(targets);
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name || 'project'}_archive.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create archive');
    }
  };

  // Drag and Drop move files
  const handleDropOnFolder = async (destFolder: string) => {
    if (draggedPaths.length === 0 || !currentProject) return;
    for (const p of draggedPaths) {
      const fileName = p.split('/').pop();
      if (!fileName) continue;
      const newPath = destFolder ? `${destFolder}/${fileName}` : fileName;
      if (newPath === p) continue;

      const file = currentProject.files.find((f) => f.path === p);
      if (file) {
        await createFile(newPath, file.content);
        await deleteFile(p);
      }
    }
    setDraggedPaths([]);
    setDropTargetFolder(null);
  };

  const renderFileIcon = (path: string) => {
    if (path.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (path.endsWith('.lean')) return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (path.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (path.endsWith('.zip')) return <Archive className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  // Render tree view
  const renderTreeNodes = (nodes: readonly TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path] ?? true;
      const isSelected = selectedPaths.has(node.path);
      const isActive = activeFilePath === node.path;
      const isRenaming = renamingPath === node.path;
      const isDropTarget = dropTargetFolder === node.path;

      if (node.isDirectory) {
        return (
          <div
            key={node.path}
            className="select-none"
            onDragOver={(e) => {
              e.preventDefault();
              setDropTargetFolder(node.path);
            }}
            onDragLeave={() => {
              if (dropTargetFolder === node.path) setDropTargetFolder(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              void handleDropOnFolder(node.path);
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleFolder(node.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, targetPath: node.path, isDirectory: true });
              }}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex items-center gap-1.5 py-1 pr-2 rounded text-xs transition-colors cursor-pointer ${
                isDropTarget
                  ? 'bg-blue-600/30 text-blue-200 border border-blue-500'
                  : 'text-slate-300 hover:bg-neutral-800/60 hover:text-white'
              }`}
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
          draggable
          onDragStart={(e) => {
            const targets = selectedPaths.has(node.path) ? Array.from(selectedPaths) : [node.path];
            setDraggedPaths(targets);
            e.dataTransfer.setData('text/plain', node.path);
          }}
          onClick={(e) => {
            handleItemSelect(node.path, e);
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              openFile(node.path);
            }
          }}
          onDoubleClick={() => {
            setRenamingPath(node.path);
            setRenameValue(node.name);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!selectedPaths.has(node.path)) {
              setSelectedPaths(new Set([node.path]));
              setLastSelectedPath(node.path);
            }
            setContextMenu({ x: e.clientX, y: e.clientY, targetPath: node.path, isDirectory: false });
          }}
          onKeyDown={(e) => {
            if (e.key === 'F2') {
              setRenamingPath(node.path);
              setRenameValue(node.name);
            } else if (e.key === 'Delete') {
              void handleSoftDelete(node.path);
            } else if (e.key === 'Enter') {
              openFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
          className={`group flex items-center justify-between py-1 pr-2 rounded text-xs cursor-pointer font-mono transition-colors ${
            isSelected
              ? 'bg-[#1e293b] text-blue-200 font-semibold'
              : isActive
                ? 'bg-[#0f172a] text-blue-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800/40'
          }`}
        >
          {isRenaming ? (
            <div className="flex-1 mr-1">
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => void handleRenameSubmit(node.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRenameSubmit(node.path);
                  if (e.key === 'Escape') setRenamingPath(null);
                }}
                className="w-full px-1.5 py-0.5 rounded bg-black border border-blue-500 text-xs font-mono text-white focus:outline-none"
              />
              {renameError && <div className="text-[10px] text-rose-400 mt-0.5">{renameError}</div>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
              {renderFileIcon(node.path)}
              <span className="truncate">{node.name}</span>
            </div>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              title="Preview file"
              onClick={(e) => {
                e.stopPropagation();
                const f = currentProject?.files.find((file) => file.path === node.path);
                if (f) setPreviewingFile({ path: f.path, content: f.content });
              }}
              className="p-0.5 rounded text-slate-500 hover:text-blue-300"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              type="button"
              title={`Delete ${node.name}`}
              onClick={(e) => {
                e.stopPropagation();
                void handleSoftDelete(node.path);
              }}
              className="p-0.5 rounded text-slate-500 hover:text-rose-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    });
  };

  // View mode switcher rendering
  if (viewMode === 'trash') {
    return <TrashView />;
  }

  return (
    <aside
      aria-label="File Explorer"
      className="flex flex-col h-full bg-[#090d15] text-slate-300 select-none overflow-hidden w-full font-sans"
    >
      {/* Top action toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-[#06090e] text-xs font-semibold shrink-0">
        <div className="flex items-center gap-1.5 text-slate-200 truncate">
          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate max-w-[130px]">
            {currentProject?.name ?? 'Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Create new file"
            aria-label="Create new file"
            onClick={() => setIsCreatingFile(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Create ZIP Archive"
            aria-label="Create ZIP Archive"
            onClick={handleCreateZip}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-neutral-800 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          {onImportZipClick && (
            <button
              type="button"
              title="Import ZIP Project"
              aria-label="Import ZIP Project"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newFileName.trim()) {
              void createFile(newFileName.trim());
              setNewFileName('');
              setIsCreatingFile(false);
            }
          }}
          className="p-2 border-b border-neutral-800 bg-neutral-900/60"
        >
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

      {/* View Modes Container */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {viewMode === 'changes' ? (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Modified Files
            </div>
            {currentProject?.files.filter((f) => f.isDirty).length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No uncommitted changes in workspace
              </div>
            ) : (
              currentProject?.files
                .filter((f) => f.isDirty)
                .map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => openFile(file.path)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-800/60 text-left font-mono text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {renderFileIcon(file.path)}
                      <span className="truncate text-slate-200">{file.path}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold">M</span>
                  </button>
                ))
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-0.5">
            {currentProject?.files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={(e) => {
                  handleItemSelect(file.path, e);
                  openFile(file.path);
                }}
                className={`flex items-center justify-between w-full px-2 py-1 rounded hover:bg-neutral-800/60 text-left font-mono text-xs transition-colors ${
                  selectedPaths.has(file.path) ? 'bg-[#1e293b] text-blue-200' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {renderFileIcon(file.path)}
                  <span className="truncate">{file.path}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          fileTree.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 leading-relaxed font-sans">
              No files in workspace. Click <span className="text-blue-400">+</span> or import a ZIP archive.
            </div>
          ) : (
            renderTreeNodes(fileTree)
          )
        )}
      </div>

      {/* Windows Explorer-style Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Explorer Context Menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[190px] bg-[#111827] border border-neutral-700 rounded-md shadow-2xl p-1 text-xs text-slate-200 font-sans"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsCreatingFile(true);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>New File</span>
          </button>

          {contextMenu.targetPath && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = contextMenu.targetPath!;
                  const fileName = target.split('/').pop() ?? target;
                  setRenamingPath(target);
                  setRenameValue(fileName);
                  setContextMenu(null);
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">F2</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const f = currentProject?.files.find((file) => file.path === contextMenu.targetPath);
                  if (f) setPreviewingFile({ path: f.path, content: f.content });
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Preview</span>
              </button>

              <div className="my-1 border-t border-neutral-800" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleCreateZip();
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>Create ZIP Archive</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void handleDeleteSelected();
                  setContextMenu(null);
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-rose-950 text-rose-300 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete (Move to Trash)</span>
                </div>
                <span className="text-[10px] font-mono">Del</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Archive Inspection / Extract Modal */}
      {archiveModalData && (
        <ArchiveDialog
          isOpen={Boolean(archiveModalData)}
          fileName={archiveModalData.fileName}
          preview={archiveModalData.preview}
          onExtract={() => {
            if (archiveModalData.rawBytes) {
              const res = archiveService.extractArchive(archiveModalData.rawBytes);
              for (const f of res.files) {
                void createFile(f.path, f.content);
              }
            }
            setArchiveModalData(null);
          }}
          onClose={() => setArchiveModalData(null)}
        />
      )}

      {/* File Preview Modal / Slideout */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl h-[70vh] rounded-lg overflow-hidden shadow-2xl border border-neutral-700">
            <FilePreview
              path={previewingFile.path}
              content={previewingFile.content}
              onClose={() => setPreviewingFile(null)}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
