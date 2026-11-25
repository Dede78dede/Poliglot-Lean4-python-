// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { App } from '../../src/App';
import { AuthProvider } from '../../src/context/AuthContext';
import { AuthModal } from '../../src/components/auth/AuthModal';
import { NavigationDrawer } from '../../src/components/navigation/NavigationDrawer';
import { SettingsModal } from '../../src/components/settings/SettingsModal';
import { settingsStore } from '../../src/services/settings/settings-store';
import { getSessionBearerToken, setSessionBearerToken } from '../../src/services/auth/api-client';
import { ROLE_PERMISSIONS } from '../../src/services/auth/roles';
import { VIEWS } from '../../src/constants/navigation';

vi.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({
      value,
      onChange,
      onMount,
      language,
    }: {
      value?: string;
      onChange?: (val: string) => void;
      onMount?: (editor: unknown, monaco: unknown) => void;
      language?: string;
    }) => {
      const mountedRef = React.useRef(false);
      React.useEffect(() => {
        if (!onMount || mountedRef.current) return;
        mountedRef.current = true;
        const editorStub = {
          layout: vi.fn(),
          focus: vi.fn(),
          getModel: () => ({
            getValue: () => value ?? '',
            getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }),
          }),
          onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => {
            cb({ position: { lineNumber: 2, column: 4 } });
            return { dispose: vi.fn() };
          },
          addCommand: vi.fn(),
        };
        const registeredLangs: { id: string }[] = [{ id: 'python' }];
        const monacoStub = {
          KeyMod: { CtrlCmd: 2048 },
          KeyCode: { Enter: 3 },
          languages: {
            getLanguages: () => registeredLangs,
            register: (lang: { id: string }) => registeredLangs.push(lang),
            setMonarchTokensProvider: vi.fn(),
            setLanguageConfiguration: vi.fn(),
            CompletionItemKind: { Snippet: 27 },
            CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
            InlayHintKind: { Type: 1, Parameter: 2 },
            registerCompletionItemProvider: (_lang: string, provider: { provideCompletionItems: (m: unknown, p: unknown) => unknown }) => {
              provider.provideCompletionItems(editorStub.getModel(), { lineNumber: 1, column: 1 });
            },
            registerCodeLensProvider: (_lang: string, provider: { provideCodeLenses: (m: unknown) => unknown }) => {
              provider.provideCodeLenses(editorStub.getModel());
            },
            registerInlayHintsProvider: (_lang: string, provider: { provideInlayHints: (m: unknown) => unknown }) => {
              provider.provideInlayHints(editorStub.getModel());
            },
          },
        };
        void onMount(editorStub, monacoStub);
      }, [onMount]);

      return (
        <textarea
          aria-label={`Monaco ${language ?? 'code'} editor`}
          data-testid="mock-monaco-editor"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      );
    },
  };
});

class FakeResizeObserver {
  private readonly cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    queueMicrotask(() => {
      try {
        this.cb([{ target } as ResizeObserverEntry], this);
      } catch {
        // ignore unmounted element
      }
    });
  }
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

  postMessage(msg: { type: string; id?: string; payload?: unknown }) {
    if (msg.type === 'EXECUTE') {
      setTimeout(() => {
        this.emit({
          type: 'EXECUTION_RESULT',
          payload: {
            stdout: 'Result: 42',
            stderr: '',
            exitCode: 0,
            durationMs: 5,
            simulated: false,
          },
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

function createFetchMock(opts: { initialAuth?: boolean; role?: 'admin' | 'verifier' | 'collaborator' | 'viewer'; requiresBootstrap?: boolean } = {}) {
  let authenticated = opts.initialAuth ?? false;
  let activeRole = opts.role ?? 'admin';
  const baseRole = opts.role ?? 'admin';
  let requiresBootstrap = opts.requiresBootstrap ?? false;
  let users = [
    {
      id: 'user-1',
      username: 'ada',
      displayName: 'Ada Lovelace',
      role: baseRole,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];
  let tokens = [
    {
      id: 'tok-1',
      name: 'Studio Token',
      createdAt: '2026-01-01T00:00:00Z',
      userId: 'user-1',
      role: 'admin',
      baseRole: 'admin',
      authType: 'api-key',
    },
  ];

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const rawBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {};

    if (url.includes('/api/v1/auth/status')) {
      return json({
        requiresBootstrap,
        envPasscodeConfigured: true,
        userCount: requiresBootstrap ? 0 : users.length,
      });
    }

    if (url.includes('/api/v1/auth/me')) {
      if (!authenticated) return json({ detail: 'Unauthorized' }, 401);
      return json({
        authenticated: true,
        requiresBootstrap,
        user: users[0],
        activeRole,
        baseRole,
        tokenId: 'tok-1',
        permissions: ROLE_PERMISSIONS[activeRole],
      });
    }

    if (url.includes('/api/v1/auth/bootstrap') && method === 'POST') {
      authenticated = true;
      requiresBootstrap = false;
      activeRole = 'admin';
      return json({
        authenticated: true,
        token: 'pg_bootstrapped_secret',
        tokenId: 'tok-boot',
        expiresAt: null,
        user: { ...users[0], username: rawBody.username || 'admin', role: 'admin' },
        activeRole: 'admin',
        baseRole: 'admin',
        permissions: ROLE_PERMISSIONS.admin,
      });
    }

    if (url.includes('/api/v1/auth/login') && method === 'POST') {
      if (rawBody.password === 'wrong') {
        return json({ detail: 'Credenziali non valide' }, 401);
      }
      authenticated = true;
      return json({
        authenticated: true,
        token: 'pg_login_secret',
        tokenId: 'tok-login',
        expiresAt: null,
        user: users[0],
        activeRole,
        baseRole,
        permissions: ROLE_PERMISSIONS[activeRole],
      });
    }

    if (url.includes('/api/v1/auth/switch-role') && method === 'POST') {
      activeRole = rawBody.role ?? 'verifier';
      return json({
        success: true,
        activeRole,
        baseRole,
        permissions: ROLE_PERMISSIONS[activeRole],
      });
    }

    if (url.includes('/api/v1/auth/logout') && method === 'POST') {
      authenticated = false;
      return json({ ok: true });
    }

    if (url.endsWith('/api/v1/auth/users') && method === 'GET') {
      return json({ users });
    }

    if (url.endsWith('/api/v1/auth/users') && method === 'POST') {
      const created = {
        id: `user-${users.length + 1}`,
        username: rawBody.username,
        displayName: rawBody.displayName || rawBody.username,
        role: rawBody.role,
        createdAt: '2026-01-01T00:00:00Z',
      };
      users = [...users, created];
      return json({ user: created }, 201);
    }

    if (url.includes('/api/v1/auth/users/') && method === 'PATCH') {
      const parts = url.split('/');
      const id = parts[parts.length - 2]!;
      users = users.map((u) => (u.id === id ? { ...u, role: rawBody.role } : u));
      return json({ user: users.find((u) => u.id === id) });
    }

    if (url.includes('/api/v1/auth/users/') && method === 'DELETE') {
      const id = url.split('/').pop()!;
      users = users.filter((u) => u.id !== id);
      return json({ deleted: true });
    }

    if (url.endsWith('/api/v1/auth/tokens') && method === 'GET') {
      return json({ tokens });
    }

    if (url.endsWith('/api/v1/auth/tokens') && method === 'POST') {
      const id = `tok-${tokens.length + 1}`;
      const created = {
        id,
        name: rawBody.name || 'Workspace Token',
        createdAt: '2026-01-01T00:00:00Z',
        userId: 'user-1',
        role: rawBody.role || 'verifier',
        baseRole: rawBody.role || 'verifier',
        authType: 'api-key',
      };
      tokens = [...tokens, created];
      return json({ id, rawToken: 'pg_raw_issued_123', expiresAt: null }, 201);
    }

    if (url.includes('/rotate') && method === 'POST') {
      return json({ id: 'tok-1', newRawToken: 'pg_raw_rotated_456' });
    }

    if (url.includes('/revoke') && method === 'POST') {
      return json({ revoked: true });
    }

    if (url.includes('/api/v1/settings')) {
      if (method === 'PUT') return json({ success: true, settings: rawBody });
      return json({ settings: settingsStore.getSnapshot().settings, editable: true });
    }

    if (url.includes('/api/v1/lean/execute')) {
      return json({
        stdout: 'No goals\nAll goals accomplished.',
        stderr: '',
        exitCode: 0,
        durationMs: 14,
        verified: false,
        simulated: true,
      });
    }

    if (url.includes('/api/v1/projects/list') || url.includes('/api/v1/files')) {
      return json({ projects: [], files: [], totalFiles: 0 });
    }

    if (url.includes('/api/v1/search/query')) {
      return json({ results: [{ file: 'main.py', line: 1, snippet: 'def add(a, b):' }] });
    }

    return json({ ok: true });
  });
}

describe('Frontend App, Auth, RBAC, NavigationDrawer & SettingsModal Integration', () => {
  beforeEach(() => {
    setSessionBearerToken(null);
    settingsStore.closeModal();
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    URL.createObjectURL = vi.fn(() => 'blob:mock-settings');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    setSessionBearerToken(null);
    settingsStore.closeModal();
    vi.unstubAllGlobals();
  });

  it('exercises AuthModal bootstrap, token/passcode/credentials login, role switch, vault tokens & user management', async () => {
    const fetchMock = createFetchMock({ initialAuth: false, requiresBootstrap: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Configurazione Iniziale Amministratore/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Username Admin/i), { target: { value: 'owner' } });
    fireEvent.change(screen.getByLabelText(/Password \(min 8 caratteri\)/i), { target: { value: 'StrongPass123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /Crea Amministratore ed Entra/i }).closest('form')!);

    await waitFor(() => {
      expect(getSessionBearerToken()).toBe('pg_bootstrapped_secret');
    });

    cleanup();
    setSessionBearerToken('pg_bootstrapped_secret');
    vi.stubGlobal('fetch', createFetchMock({ initialAuth: true, role: 'admin', requiresBootstrap: false }));

    const onClose = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onClose} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Profilo Sessione, Ruolo & Token Vault/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Token Vault/i }));
    await waitFor(() => {
      expect(screen.getByText('Studio Token')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Genera Token/i }));
    await waitFor(() => {
      expect(screen.getByText(/pg_raw_issued_123/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByTitle('Ruota token')[0]!);
    await waitFor(() => {
      expect(screen.getByText(/pg_raw_rotated_456/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByTitle('Revoca token')[0]!);

    fireEvent.click(screen.getByRole('button', { name: /Utenti & Ruoli/i }));
    await waitFor(() => {
      expect(screen.getByText('@ada')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'emmy' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min 8 char)'), { target: { value: 'EmmyPass99!' } });
    fireEvent.click(screen.getByRole('button', { name: /^Crea$/i }));
    await waitFor(() => {
      expect(screen.getByText('@emmy')).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText('Ruolo utente emmy'), { target: { value: 'collaborator' } });
    fireEvent.click(screen.getByLabelText('Elimina utente emmy'));

    fireEvent.click(screen.getByRole('button', { name: /Sessione & Ruolo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Verifier/i }));
    fireEvent.click(screen.getByRole('button', { name: /Disconnetti e Revoca Sessione/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('exercises NavigationDrawer role switching, views, workbench tool launchers, and Escape key', async () => {
    setSessionBearerToken('pg_admin_token');
    vi.stubGlobal('fetch', createFetchMock({ initialAuth: true, role: 'admin' }));

    const onSelectView = vi.fn();
    const onClose = vi.fn();
    const onOpenAuthModal = vi.fn();
    const onOpenSettingsModal = vi.fn();
    const onOpenTool = vi.fn();

    render(
      <AuthProvider>
        <NavigationDrawer
          isOpen={true}
          activeView={VIEWS.EDITOR}
          onSelectView={onSelectView}
          onClose={onClose}
          onOpenAuthModal={onOpenAuthModal}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenTool={onOpenTool}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/ada \(ADMIN\)/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Configurazione Avanzata Studio/i }));
    expect(onOpenSettingsModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Auto-Correct L1-L5/i }));
    expect(onOpenTool).toHaveBeenCalledWith('autocorrect');

    fireEvent.click(screen.getByRole('menuitem', { name: /Notebook/i }));
    expect(onSelectView).toHaveBeenCalledWith(VIEWS.NOTEBOOK);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('exercises SettingsModal categories, search, edits, undo, reset, and export', async () => {
    setSessionBearerToken('pg_admin_token');
    vi.stubGlobal('fetch', createFetchMock({ initialAuth: true, role: 'admin' }));
    settingsStore.openModal('editor');

    render(
      <AuthProvider>
        <SettingsModal />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Polyglot Studio Settings/i })).toBeTruthy();
    });

    for (const cat of ['Appearance', 'Runtime', 'AI Providers', 'Feature Flags', 'MCP Server', 'Toolchain', 'Keybindings', 'Chat & Prover', '5-Tier Memory', 'Privacy & Data', 'Advanced']) {
      fireEvent.click(screen.getByRole('button', { name: cat }));
    }

    const searchInput = screen.getByPlaceholderText(/Search all settings/i);
    fireEvent.change(searchInput, { target: { value: 'theme' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    act(() => {
      settingsStore.updateSettings('editor', { fontSize: 16 }, 'Changed font size');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Undo/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
  });

  it('renders full App shell, executes Python via Worker, blocks unauthenticated Lean, and switches views & dock tabs', async () => {
    vi.stubGlobal('fetch', createFetchMock({ initialAuth: false }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Verify Proof/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Verify Proof/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Sessione e Gestione Accessi RBAC/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Chiudi finestra accesso/i }));

    fireEvent.click(screen.getByRole('tab', { name: /\.py$/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Run Python/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Run Python/i }));
    await waitFor(() => {
      expect(screen.getByText(/Result: 42/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Toggle Workbench Dock/i }));
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /Workbench Left Dock/i })).toBeTruthy();
    });
    for (const dockTab of ['Chat', 'LSpec', 'Pipeline', 'Archon', 'DAG', 'Files']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${dockTab}$`, 'i') }));
    }
    fireEvent.click(screen.getByRole('button', { name: /Toggle Diff Viewer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Toggle Real-Time Collaboration/i }));

    fireEvent.keyDown(window, { key: 'm', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /POLYGLOT STUDIO/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /Proof Ledger/i }));
    await waitFor(() => {
      expect(screen.getByText(/Formal Proof Ledger/i)).toBeTruthy();
    });

    fireEvent.keyDown(window, { key: 'm', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /Settings/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /Settings/i }));
    await waitFor(() => {
      expect(screen.getByText(/Apri Configurazione Completa/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Apri Configurazione Completa/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Polyglot Studio Settings/i })).toBeTruthy();
    });
  });
});
