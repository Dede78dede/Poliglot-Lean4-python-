/**
 * New Project Scaffolding Wizard Modal (Sprint 11.0.2, Task A2)
 *
 * Full interactive wizard providing:
 * - 8 Canonical project templates (Python, Lean 4, Mixed, Educational)
 * - Category filter tabs
 * - File tree preview
 * - Creates project into VFS with ro-crate-metadata.json
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileCode,
  FolderPlus,
  Check,
  ChevronRight,
  Code,
  Layers,
  GraduationCap,
  Terminal,
} from 'lucide-react';
import { SCAFFOLD_TEMPLATES, type ProjectTemplate } from '../../services/automation/scaffold-templates';
import { useProjectContext } from '../../context/ProjectContext';

export interface NewProjectModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onProjectCreated?: (projectName: string) => void;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: NewProjectModalProps): React.JSX.Element | null {
  const projectContext = useProjectContext();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'python' | 'lean4' | 'mixed' | 'educational'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate>(SCAFFOLD_TEMPLATES[0]);
  const [projectName, setProjectName] = useState('my-polyglot-project');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const filteredTemplates = selectedCategory === 'all'
    ? SCAFFOLD_TEMPLATES
    : SCAFFOLD_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      if (projectContext) {
        // Create files in VFS
        for (const [filePath, content] of Object.entries(selectedTemplate.files)) {
          projectContext.createFile(filePath, content);
        }
      }
      onProjectCreated?.(projectName);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="New Project Wizard"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none"
    >
      <div className="bg-[#090d15] border border-neutral-800 rounded-xl w-full max-w-4xl h-[78vh] flex flex-col overflow-hidden shadow-2xl text-xs">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-[#06090e] border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">New Project Wizard</h2>
              <span className="text-[11px] text-slate-500 font-mono">Ctrl+Shift+N</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Category filter tabs */}
        <div className="flex items-center gap-2 px-6 py-2 bg-[#080c13] border-b border-neutral-800 shrink-0 text-slate-400">
          {(['all', 'python', 'lean4', 'mixed', 'educational'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-neutral-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Template Selection Grid */}
          <div className="w-1/2 p-4 border-r border-neutral-800 overflow-y-auto space-y-2">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-sm'
                      : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span className="truncate">{tpl.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-neutral-800 text-slate-400">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-neutral-950 text-slate-400 border border-neutral-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Details & File Preview */}
          <div className="w-1/2 p-5 flex flex-col min-h-0 bg-[#06090e] overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-100">{selectedTemplate.name}</h3>
            <p className="mt-1 text-slate-400 text-xs">{selectedTemplate.description}</p>

            <div className="mt-4 flex flex-col flex-1 min-h-0">
              <span className="text-[11px] font-semibold text-slate-300 mb-1.5 font-mono">
                Included Project Files ({Object.keys(selectedTemplate.files).length}):
              </span>
              <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-2.5 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
                {Object.keys(selectedTemplate.files).map((fp) => (
                  <div key={fp} className="flex items-center gap-1.5 truncate">
                    <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{fp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3 shrink-0">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating || !projectName.trim()}
                className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Create & Initialize Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
