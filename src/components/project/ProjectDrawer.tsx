import React, { useState, useEffect } from 'react';
import {
  Folder,
  X,
  Plus,
  Download,
  Trash2,
  FolderOpen,
  Calendar,
  Layers,
  Sparkles,
  Compass,
  ArrowRight,
  Pin,
} from 'lucide-react';
import type { Project, ProjectType } from '../../types/projects';
import { projectRepository } from '../../services/project-repository';
import { useProjectContext } from '../../context/ProjectContext';

export interface ProjectDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onOpenZipDialog: () => void;
}

export function ProjectDrawer({
  isOpen,
  onClose,
  onOpenZipDialog,
}: ProjectDrawerProps): React.JSX.Element | null {
  const { currentProject, loadProject, togglePinProject } = useProjectContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('lean4');

  const refreshList = async () => {
    const list = await projectRepository.listProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      void refreshList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const initialFiles =
      newProjectType === 'lean4'
        ? [
            {
              path: 'lakefile.lean',
              content: 'import Lake\nopen Lake DSL\n\npackage «my_project»\n',
              language: 'lean4' as const,
            },
            {
              path: 'Main.lean',
              content: 'def main : IO Unit :=\n  IO.println "Hello from multi-file Lean 4!"\n',
              language: 'lean4' as const,
            },
          ]
        : [
            {
              path: 'main.py',
              content: '#!/usr/bin/env python3\nimport sys\n\nprint("Hello from multi-file Python project!")\n',
              language: 'python' as const,
            },
            {
              path: 'utils.py',
              content: 'def add(a, b):\n    return a + b\n',
              language: 'python' as const,
            },
          ];

    const newProj: Project = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      type: newProjectType,
      files: initialFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await projectRepository.saveProject(newProj);
    await loadProject(newProj);
    setIsCreating(false);
    setNewProjectName('');
    onClose();
  };

  const handleExport = (proj: Project) => {
    const blob = projectRepository.exportProjectAsZip(proj);
    projectRepository.triggerDownload(blob, `${proj.name.toLowerCase().replace(/\s+/g, '_')}.zip`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      await projectRepository.deleteProject(id);
      void refreshList();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="projects-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none"
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] bg-[#0d131f] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090d15]">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 id="projects-drawer-title" className="text-base font-semibold text-white">
              Project Repository
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenZipDialog}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import ZIP</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create new project button / form */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-neutral-700 hover:border-blue-500 text-xs text-slate-300 hover:text-white hover:bg-blue-950/20 transition-all font-medium"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Create New Multi-File Project</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 rounded-lg bg-[#111827] border border-neutral-700 space-y-3">
              <div className="text-xs font-semibold text-white">New Project Details</div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Project Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="My Formal Verification Library"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Project Type</label>
                <div className="flex items-center gap-2 text-xs">
                  {(['lean4', 'python', 'mixed'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewProjectType(t)}
                      className={`flex-1 py-1.5 rounded capitalize font-medium transition-colors ${
                        newProjectType === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          {/* Saved projects list */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400">Saved Workspaces ({projects.length})</div>
            {projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-neutral-800 rounded-lg">
                No saved projects yet. Import a ZIP archive or create a project above.
              </div>
            ) : (
              projects.map((proj) => {
                const isActive = currentProject?.id === proj.id;

                return (
                  <div
                    key={proj.id}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-[#161f33] border-blue-500/80'
                        : 'bg-[#111827] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded bg-neutral-900 border border-neutral-800 shrink-0">
                        {proj.type === 'lean4' ? (
                          <Compass className="w-4 h-4 text-blue-400" />
                        ) : proj.type === 'python' ? (
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Layers className="w-4 h-4 text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{proj.name}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono">
                              Active
                            </span>
                          )}
                          {proj.isPinned && (
                            <span
                              title="Exempt from 72h server session eviction"
                              className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1"
                            >
                              <Pin className="w-2.5 h-2.5 fill-current" />
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="capitalize">{proj.type}</span>
                          <span>·</span>
                          <span>{proj.files.length} files</span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(proj.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await togglePinProject(proj.id);
                          await refreshList();
                        }}
                        title={
                          proj.isPinned
                            ? 'Unpin project (subject to 72h server TTL)'
                            : 'Pin project (exempt from 72h server session cleanup & eviction)'
                        }
                        className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${
                          proj.isPinned
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Pin className={`w-4 h-4 ${proj.isPinned ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport(proj)}
                        title="Download ZIP archive"
                        className="p-1.5 rounded hover:bg-neutral-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(proj.id, proj.name)}
                        title="Delete project"
                        className="p-1.5 rounded hover:bg-neutral-800 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={async () => {
                            await loadProject(proj);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-800 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
