// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { PyodideProvider } from '../../src/context/PyodideContext';
import { ProjectProvider, useProjectContext } from '../../src/context/ProjectContext';
import { StorageProvider, useStorageProvider } from '../../src/context/StorageContext';
import { NotebookPanel } from '../../src/components/notebook/NotebookPanel';
import { ProjectDrawer } from '../../src/components/project/ProjectDrawer';
import { FileExplorer } from '../../src/components/project/FileExplorer';
import { FEMEVView } from '../../src/components/femev/FEMEVView';
import { FemevDrawer } from '../../src/components/femev/FemevDrawer';
import { AutoCorrectionPanel } from '../../src/components/autocorrect/AutoCorrectionPanel';
import { StorageModal } from '../../src/components/storage/StorageModal';
import { FiveTierMemoryDrawer } from '../../src/components/memory/FiveTierMemoryDrawer';
import { ProjectDiscoveryModal } from '../../src/components/discovery/ProjectDiscoveryModal';
import { BlueprintWorkspaceModal } from '../../src/components/collaboration/BlueprintWorkspaceModal';
import { SecretsManager } from '../../src/components/secrets/SecretsManager';
import { McpToolsDrawer } from '../../src/components/mcp/McpToolsDrawer';
import { ProofAutomationPanel } from '../../src/components/proof/ProofAutomationPanel';
import { sidePanelStore } from '../../src/services/shell/side-panel-store';
import { ROLE_PERMISSIONS } from '../../src/services/auth/roles';
import { setSessionBearerToken } from '../../src/services/auth/api-client';
import * as fflate from 'fflate';

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class FakeWorker {
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  public onerror: ((ev: ErrorEvent) => void) | null = null;
  private readonly listeners = new Set<(ev: MessageEvent) => void>();

  constructor(_url: string | URL) {
    setTimeout(() => {
      this.emit({ type: 'PYODIDE_READY' });
    }, 0);
  }

  private emit(data: unknown) {
    const ev = { data } as MessageEvent;
    this.onmessage?.(ev);
    for (const listener of this.listeners) {
      listener(ev);
    }
  }

  addEventListener(type: string, fn: (ev: MessageEvent) => void) {
    if (type === 'message') this.listeners.add(fn);
  }

  removeEventListener(type: string, fn: (ev: MessageEvent) => void) {
    if (type === 'message') this.listeners.delete(fn);
  }

  postMessage(msg: { type: string }) {
    if (msg.type === 'EXECUTE') {
      setTimeout(() => {
        this.emit({
          type: 'EXECUTION_RESULT',
          payload: { stdout: 'ok', stderr: '', exitCode: 0, durationMs: 3, simulated: false },
        });
      }, 0);
    } else if (msg.type === 'WRITE_FILES') {
      setTimeout(() => this.emit({ type: 'FILES_WRITTEN_SUCCESS' }), 0);
    } else if (msg.type === 'MOUNT_ZIP') {
      setTimeout(() => this.emit({ type: 'ZIP_MOUNTED_SUCCESS' }), 0);
    }
  }
  terminate() {}
}

function AllProviders({ children }: { readonly children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PyodideProvider>
        <ProjectProvider>
          <StorageProvider>{children}</StorageProvider>
        </ProjectProvider>
      </PyodideProvider>
    </AuthProvider>
  );
}

function ProjectSeeder({ children }: { readonly children: React.ReactNode }) {
  const ctx = useProjectContext();
  React.useEffect(() => {
    if (!ctx.currentProject) {
      void ctx.loadProject({
        id: 'proj-seed-1',
        name: 'Seeded Math Project',
        type: 'mixed',
        files: [
          { path: 'src/Main.lean', content: 'theorem t : True := trivial', language: 'lean4', isDirty: true },
          { path: 'main.py', content: 'print("hello")', language: 'python' },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    }
  }, [ctx]);
  return <>{children}</>;
}

function StorageHarness() {
  const storage = useStorageProvider();
  const projectCtx = useProjectContext();
  return (
    <div>
      <button type="button" onClick={() => storage.openStorageModal()}>
        OpenStorageModal
      </button>
      <button
        type="button"
        onClick={() => {
          const raw = fflate.zipSync({
            'src/algo.py': new TextEncoder().encode('x = 1\n'),
            'Proof.lean': new TextEncoder().encode('theorem p : True := trivial\n'),
          });
          const file = new File([raw], 'archive.zip', { type: 'application/zip' });
          void projectCtx.importZipFile(file);
        }}
      >
        ImportSampleZip
      </button>
      <StorageModal />
    </div>
  );
}

function createApiFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (url.includes('/api/v1/auth/status')) {
      return json({ requiresBootstrap: false, envPasscodeConfigured: true, userCount: 1 });
    }
    if (url.includes('/api/v1/auth/me')) {
      return json({
        authenticated: true,
        requiresBootstrap: false,
        user: { id: 'u1', username: 'admin', displayName: 'Admin', role: 'admin', createdAt: '2026-01-01T00:00:00Z' },
        activeRole: 'admin',
        baseRole: 'admin',
        tokenId: 'tok-1',
        permissions: ROLE_PERMISSIONS.admin,
      });
    }
    if (url.includes('/api/v1/settings')) {
      return json({ settings: undefined, editable: true });
    }
    if (url.includes('/api/v1/femev')) {
      return json({ ok: true, candidates: [], steps: [], records: [] });
    }
    if (url.includes('/api/v1/proposal-loop')) {
      return json({ status: 'completed', iterations: 1, proof: 'by rfl', verified: false });
    }
    if (url.includes('/api/v1/translation')) {
      return json({ translated: '-- ok', similarity: 0.92, passed: true, warnings: [] });
    }
    if (url.includes('/api/v1/autocorrect')) {
      return json({ fixedCode: 'theorem t : 1 = 1 := rfl', appliedTier: 1, explanation: 'Cleaned syntax', diagnostics: [] });
    }
    if (url.includes('/api/v1/automation')) {
      return json({ tasks: [], suggestions: ['omega', 'simp'], result: { status: 'ready' } });
    }
    if (url.includes('/api/v1/discovery')) {
      return json({ packages: [{ name: 'numpy', version: '2.1.0', summary: 'Numerical arrays' }], toolchains: ['v4.35.0'], manifest: {} });
    }
    if (url.includes('/api/v1/blueprint')) {
      return json({ nodes: [], edges: [], markdown: '# Blueprint' });
    }
    if (url.includes('/api/v1/mcp') || url.includes('/mcp')) {
      return json({ jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'polyglot_probe_tactic', description: 'Probe Lean tactic' }] } });
    }
    if (url.includes('/api/v1/projects') && method === 'POST') {
      return json({ ok: true });
    }
    return json({ ok: true });
  });
}

describe('Frontend Panels, Contexts & Drawers Integration', () => {
  beforeEach(() => {
    setSessionBearerToken('pg_admin_session');
    sidePanelStore.setViewMode('explorer', 'tree');
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('fetch', createApiFetchMock());
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    setSessionBearerToken(null);
    vi.unstubAllGlobals();
  });

  it('exercises NotebookPanel run, inline restart confirmation, add/delete cell, and exports', async () => {
    render(<NotebookPanel />);
    expect(screen.getByText('Interactive Formal Exploration')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Restart Kernel/i }));
    expect(screen.getByText(/Clear kernel\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(screen.queryByText(/Clear kernel\?/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Restart Kernel/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Kernel Restarted/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Cell/i }));
    expect(screen.getByText(/3 cells/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Run All/i }));
    fireEvent.click(screen.getByRole('button', { name: /\.ipynb/i }));
    fireEvent.click(screen.getByRole('button', { name: /\.polyglot/i }));
  });

  it('exercises ProjectDrawer create/close and FileExplorer tree/list/changes/trash + ZIP import', async () => {
    const onClose = vi.fn();
    const onOpenZipDialog = vi.fn();

    render(
      <AllProviders>
        <ProjectSeeder>
          <ProjectDrawer isOpen={true} onClose={onClose} onOpenZipDialog={onOpenZipDialog} />
          <FileExplorer onImportZipClick={onOpenZipDialog} />
          <StorageHarness />
        </ProjectSeeder>
      </AllProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Seeded Math Project')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create New Multi-File Project/i }));
    fireEvent.change(screen.getByPlaceholderText(/My Formal Verification Library/i), {
      target: { value: 'EulerProof' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Project$/i }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    // Trigger ZIP import via ProjectContext
    fireEvent.click(screen.getByRole('button', { name: 'ImportSampleZip' }));
    await waitFor(() => {
      expect(screen.getAllByText(/Proof\.lean/i).length).toBeGreaterThan(0);
    });

    // Switch FileExplorer view modes
    act(() => sidePanelStore.setViewMode('explorer', 'list'));
    act(() => sidePanelStore.setViewMode('explorer', 'changes'));
    act(() => sidePanelStore.setViewMode('explorer', 'trash'));
    act(() => sidePanelStore.setViewMode('explorer', 'tree'));

    // Open StorageModal
    fireEvent.click(screen.getByRole('button', { name: 'OpenStorageModal' }));
    await waitFor(() => {
      expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0);
    });
  });

  it('exercises FEMEVView tabs, FemevDrawer, AutoCorrectionPanel, and secondary tool drawers', async () => {
    render(
      <AllProviders>
        <FEMEVView leanCode="theorem a : 1 = 1 := rfl" theoremName="a" onInsertCode={vi.fn()} onOpenFullDrawer={vi.fn()} />
        <FemevDrawer isOpen={true} onClose={vi.fn()} onApplyCodeToEditor={vi.fn()} />
        <AutoCorrectionPanel isOpen={true} onClose={vi.fn()} currentCode="theorem t : True := trivial" language="lean4" onApplyFix={vi.fn()} />
        <ProofAutomationPanel isOpen={true} onClose={vi.fn()} currentCode="theorem t : True := trivial" language="lean4" onApplyCode={vi.fn()} />
        <FiveTierMemoryDrawer isOpen={true} onClose={vi.fn()} currentProject={null} onRestoreProject={vi.fn()} />
        <ProjectDiscoveryModal isOpen={true} onClose={vi.fn()} onImportProject={vi.fn()} />
        <BlueprintWorkspaceModal isOpen={true} onClose={vi.fn()} onOpenInEditor={vi.fn()} />
        <SecretsManager isOpen={true} onClose={vi.fn()} />
        <McpToolsDrawer isOpen={true} onClose={vi.fn()} />
      </AllProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/FEMEV Epistemic Workspace/i)).toBeTruthy();
    });

    for (const tabLabel of ['Translation Fidelity Gate', 'Evidence Timeline', 'Mathesis Autoformalize', 'Paperproof Playback', 'AX-PROVER Proposal Loop']) {
      fireEvent.click(screen.getByRole('tab', { name: tabLabel }));
    }
  });
});
