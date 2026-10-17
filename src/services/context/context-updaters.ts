import { contextKeyService } from '../navigation/context-key-service';
import { statusBarRegistry } from '../status-bar/status-bar-registry';

export interface EditorContextParams {
  readonly focused?: boolean;
  readonly readonly?: boolean;
  readonly hasSelection?: boolean;
  readonly langId?: string;
  readonly line?: number;
  readonly column?: number;
}

export interface RuntimeContextParams {
  readonly pyodideReady?: boolean;
  readonly kiminaReady?: boolean;
  readonly pantographReady?: boolean;
  readonly toolchainMismatch?: boolean;
  readonly toolchainText?: string;
}

export interface WorkspaceContextParams {
  readonly exists?: boolean;
  readonly hasUnsaved?: boolean;
  readonly pinned?: boolean;
  readonly workspaceName?: string;
  readonly fileCount?: number;
}

export interface CollaborationContextParams {
  readonly active?: boolean;
  readonly role?: string;
  readonly count?: number;
}

export interface ProofContextParams {
  readonly openGoalCount?: number;
  readonly hasActiveProof?: boolean;
  readonly searchRunning?: boolean;
}

export interface DrawerContextParams {
  readonly open?: boolean;
  readonly tab?: string;
}

export interface AiContextParams {
  readonly configured?: boolean;
  readonly consentGiven?: boolean;
}

export const contextUpdaters = {
  setEditorContext(params: EditorContextParams): void {
    if (params.focused !== undefined) contextKeyService.setKey('editorFocus', params.focused);
    if (params.readonly !== undefined) contextKeyService.setKey('editorReadonly', params.readonly);
    if (params.hasSelection !== undefined) contextKeyService.setKey('editorHasSelection', params.hasSelection);
    if (params.langId !== undefined) {
      contextKeyService.setKey('editorLangId', params.langId);
      contextKeyService.setKey('leanFile', params.langId === 'lean4');
      contextKeyService.setKey('pythonFile', params.langId === 'python');
    }

    if (params.line !== undefined && params.column !== undefined) {
      statusBarRegistry.update('cursor-position', {
        text: `Ln ${params.line}, Col ${params.column}`,
      });
    }
  },

  setRuntimeContext(params: RuntimeContextParams): void {
    if (params.pyodideReady !== undefined) {
      contextKeyService.setKey('pyodideReady', params.pyodideReady);
      statusBarRegistry.update('pyodide-ready', {
        text: params.pyodideReady ? 'Pyodide 3.14 (WASM)' : 'Pyodide (Initializing)',
        color: params.pyodideReady ? undefined : '#f59e0b',
      });
    }

    if (params.kiminaReady !== undefined) {
      contextKeyService.setKey('kiminaReady', params.kiminaReady);
    }

    if (params.pantographReady !== undefined) {
      contextKeyService.setKey('pantographReady', params.pantographReady);
    }

    if (params.toolchainMismatch !== undefined) {
      contextKeyService.setKey('leanToolchainMismatch', params.toolchainMismatch);
      statusBarRegistry.update('kimina-ready', {
        text: params.toolchainMismatch ? 'Lean Toolchain Mismatch' : (params.toolchainText || 'Lean 4.35 (Aligned)'),
        color: params.toolchainMismatch ? '#f43f5e' : '#06b6d4',
      });
    } else if (params.toolchainText) {
      statusBarRegistry.update('kimina-ready', {
        text: params.toolchainText,
        color: '#06b6d4',
      });
    }
  },

  setWorkspaceContext(params: WorkspaceContextParams): void {
    if (params.exists !== undefined) contextKeyService.setKey('workspaceExists', params.exists);
    if (params.hasUnsaved !== undefined) contextKeyService.setKey('hasUnsavedChanges', params.hasUnsaved);
    if (params.pinned !== undefined) {
      contextKeyService.setKey('sessionPinned', params.pinned);
      statusBarRegistry.update('session-pinned', { visible: params.pinned });
    }

    if (params.workspaceName || params.fileCount !== undefined) {
      const name = params.workspaceName || 'main';
      const count = params.fileCount !== undefined ? ` · ${params.fileCount} files` : '';
      statusBarRegistry.update('git-branch', { text: `${name}${count}` });
    }
  },

  setCollaborationContext(params: CollaborationContextParams): void {
    if (params.active !== undefined) contextKeyService.setKey('collaborationActive', params.active);
    if (params.role !== undefined) contextKeyService.setKey('collaborationRole', params.role);
    if (params.count !== undefined) {
      contextKeyService.setKey('presenceCount', params.count);
      statusBarRegistry.update('collaborators', {
        text: `${params.count} ${params.count === 1 ? 'Collaborator' : 'Collaborators'}`,
      });
    }
  },

  setProofContext(params: ProofContextParams): void {
    if (params.openGoalCount !== undefined) {
      const count = params.openGoalCount;
      contextKeyService.setKey('hasOpenGoal', count > 0);
      statusBarRegistry.update('proof-progress', {
        text: `${count} Open ${count === 1 ? 'Goal' : 'Goals'}`,
        color: count === 0 ? '#10b981' : '#f59e0b',
      });
    }

    if (params.hasActiveProof !== undefined) {
      contextKeyService.setKey('hasActiveProof', params.hasActiveProof);
    }

    if (params.searchRunning !== undefined) {
      contextKeyService.setKey('proofSearchRunning', params.searchRunning);
    }
  },

  setDrawerContext(params: DrawerContextParams): void {
    if (params.open !== undefined) contextKeyService.setKey('drawerOpen', params.open);
    if (params.tab !== undefined) contextKeyService.setKey('drawerTab', params.tab);
  },

  setAiContext(params: AiContextParams): void {
    if (params.configured !== undefined) contextKeyService.setKey('llmProviderConfigured', params.configured);
    if (params.consentGiven !== undefined) contextKeyService.setKey('aiConsentGiven', params.consentGiven);
  },
};
