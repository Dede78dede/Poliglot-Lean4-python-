import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as fflate from 'fflate';
import type { Project, ProjectFile } from '../types/projects';
import { vfs } from '../services/vfs';
import { validateZipEntries, type ZipValidationEntry } from '../services/zip-validator';
import { ProjectRepository } from '../services/project-repository';
import { usePyodideContext } from './PyodideContext';

export interface ProjectContextValue {
  readonly currentProject: Project | null;
  readonly activeFilePath: string | null;
  readonly openTabs: readonly string[];
  readonly fileTree: readonly { path: string; name: string; isDirectory: boolean; language?: ProjectFile['language']; children?: any[] }[];
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly loadProject: (project: Project) => Promise<void>;
  readonly openFile: (path: string) => void;
  readonly closeTab: (path: string) => void;
  readonly updateFileContent: (path: string, content: string) => void;
  readonly createFile: (path: string, content?: string) => Promise<void>;
  readonly deleteFile: (path: string) => Promise<void>;
  readonly togglePinProject: (projectId: string) => Promise<boolean>;
  readonly importZipFile: (file: File) => Promise<{ success: boolean; errors?: readonly string[] }>;
  readonly getActiveFile: () => ProjectFile | null;
  readonly clearError: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function detectLanguage(path: string): ProjectFile['language'] {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.lean')) return 'lean4';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.toml')) return 'toml';
  return 'text';
}

export function ProjectProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<readonly string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pyodide = usePyodideContext();

  const loadProject = useCallback(async (project: Project) => {
    setCurrentProject(project);
    // Write all project files to VFS
    for (const f of project.files) {
      await vfs.writeFile(project.id, f);
    }

    if (project.files.length > 0) {
      const firstFile = project.files[0]!;
      setActiveFilePath(firstFile.path);
      setOpenTabs([firstFile.path]);
    } else {
      setActiveFilePath(null);
      setOpenTabs([]);
    }

    // If python files exist, sync to Pyodide
    const pyFiles = project.files.filter((f) => f.language === 'python');
    if (pyFiles.length > 0 && pyodide.status === 'ready') {
      void pyodide.syncFiles(pyFiles);
    }
  }, [pyodide]);

  const openFile = useCallback((path: string) => {
    setActiveFilePath(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((p) => p !== path);
      if (activeFilePath === path) {
        setActiveFilePath(filtered[filtered.length - 1] ?? null);
      }
      return filtered;
    });
  }, [activeFilePath]);

  const updateFileContent = useCallback((path: string, content: string) => {
    setCurrentProject((prev) => {
      if (!prev) return null;
      const updatedFiles = prev.files.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f,
      );
      // Persist to VFS asynchronously
      const changed = updatedFiles.find((f) => f.path === path);
      if (changed) {
        void vfs.writeFile(prev.id, changed);
        if (changed.language === 'python' && pyodide.status === 'ready') {
          void pyodide.syncFiles([changed]);
        }
      }
      return { ...prev, files: updatedFiles, updatedAt: new Date().toISOString() };
    });
  }, [pyodide]);

  const createFile = useCallback(async (path: string, initialContent = '') => {
    if (!currentProject) return;
    const cleanPath = path.trim().replace(/^[/\\]+/, '');
    if (!cleanPath) return;

    const newFile: ProjectFile = {
      path: cleanPath,
      content: initialContent,
      language: detectLanguage(cleanPath),
      isDirty: false,
    };

    await vfs.writeFile(currentProject.id, newFile);

    setCurrentProject((prev) => {
      if (!prev) return null;
      const exists = prev.files.some((f) => f.path === cleanPath);
      const files = exists
        ? prev.files.map((f) => (f.path === cleanPath ? newFile : f))
        : [...prev.files, newFile];
      return { ...prev, files, updatedAt: new Date().toISOString() };
    });

    openFile(cleanPath);

    if (newFile.language === 'python' && pyodide.status === 'ready') {
      void pyodide.syncFiles([newFile]);
    }
  }, [currentProject, openFile, pyodide]);

  const deleteFile = useCallback(async (path: string) => {
    if (!currentProject) return;
    await vfs.deleteFile(currentProject.id, path);
    closeTab(path);
    setCurrentProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        files: prev.files.filter((f) => f.path !== path),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [currentProject, closeTab]);

  const togglePinProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      const repo = new ProjectRepository();
      const proj = await repo.getProject(projectId);
      if (!proj) return false;

      const nextPinned = !proj.isPinned;
      const updated: Project = {
        ...proj,
        isPinned: nextPinned,
        updatedAt: new Date().toISOString(),
      };
      await repo.saveProject(updated);

      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(updated);
      }

      // Sync pin state to backend for Lean sessions (exempts from 72h TTL)
      const hasLean = proj.files.some((f) => f.language === 'lean4' || f.path === 'lakefile.lean');
      if (hasLean) {
        try {
          await fetch(`/api/v1/projects/lean/session/${projectId}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: nextPinned }),
          });
        } catch (e) {
          console.warn('[Pin Lean session warning]', e);
        }
      }

      return nextPinned;
    },
    [currentProject],
  );

  const importZipFile = useCallback(
    async (file: File): Promise<{ success: boolean; errors?: readonly string[] }> => {
      setIsSaving(true);
      setError(null);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const rawBytes = new Uint8Array(arrayBuffer);

        // 1. Inspect ZIP entries with fflate without unpacking
        const unzipped = fflate.unzipSync(rawBytes);
        const entries: ZipValidationEntry[] = Object.entries(unzipped).map(([path, data]) => ({
          path,
          uncompressedSize: data.length,
          isDirectory: path.endsWith('/'),
        }));

        // 2. Validate against ZIP bombs, quotas, path traversal, extensions
        const validation = validateZipEntries(entries, arrayBuffer.byteLength);
        if (!validation.valid) {
          setError(validation.errors.join(' '));
          setIsSaving(false);
          return { success: false, errors: validation.errors };
        }

        // 3. Construct project files
        const projectFiles: ProjectFile[] = [];
        let hasPython = false;
        let hasLean = false;

        const decoder = new TextDecoder('utf-8');

        for (const [path, data] of Object.entries(unzipped)) {
          if (path.endsWith('/')) continue; // skip dir entries

          // Ignore hidden or OS files
          if (path.includes('__MACOSX') || path.endsWith('.DS_Store')) continue;

          const lang = detectLanguage(path);
          if (lang === 'python') hasPython = true;
          if (lang === 'lean4') hasLean = true;

          const content = decoder.decode(data);
          projectFiles.push({
            path,
            content,
            language: lang,
          });
        }

        const projectType = hasPython && hasLean ? 'mixed' : hasLean ? 'lean4' : 'python';
        const projectName = file.name.replace(/\.zip$/i, '') || 'Imported Project';
        const projectId = crypto.randomUUID();

        const newProject: Project = {
          id: projectId,
          name: projectName,
          type: projectType,
          files: projectFiles,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 4. Save to VFS
        await vfs.clearProject(projectId);
        for (const f of projectFiles) {
          await vfs.writeFile(projectId, f);
        }

        // 5. Mount into Pyodide MEMFS directly via unpackArchive
        if (hasPython && pyodide.status === 'ready') {
          // Pass the preserved ArrayBuffer directly
          await pyodide.mountZip(arrayBuffer).catch((err) => {
            console.warn('[Pyodide mountZip warning]', err);
            // Fallback to manual syncFiles
            return pyodide.syncFiles(projectFiles.filter((f) => f.language === 'python'));
          });
        }

        // 6. If Lean project, sync to server session directory
        if (hasLean) {
          try {
            await fetch('/api/v1/projects/lean/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: projectId,
                files: projectFiles.filter((f) => f.language === 'lean4' || f.path === 'lakefile.lean'),
              }),
            });
          } catch (e) {
            console.warn('[Lean upload warning]', e);
          }
        }

        await loadProject(newProject);
        setIsSaving(false);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to decompress ZIP archive';
        setError(msg);
        setIsSaving(false);
        return { success: false, errors: [msg] };
      }
    },
    [pyodide, loadProject],
  );

  const getActiveFile = useCallback((): ProjectFile | null => {
    if (!currentProject || !activeFilePath) return null;
    return currentProject.files.find((f) => f.path === activeFilePath) ?? null;
  }, [currentProject, activeFilePath]);

  const fileTree = currentProject ? vfs.buildFileTree(currentProject.files) : [];

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        activeFilePath,
        openTabs,
        fileTree,
        isSaving,
        error,
        loadProject,
        openFile,
        closeTab,
        updateFileContent,
        createFile,
        deleteFile,
        togglePinProject,
        importZipFile,
        getActiveFile,
        clearError: () => setError(null),
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return ctx;
}
