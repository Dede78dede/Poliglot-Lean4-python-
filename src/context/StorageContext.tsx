import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type {
  StorageTarget,
  SyncStatus,
  FileDiffSummary,
  GitHubDeviceCodeResponse,
  GitHubCommitResult,
} from '../types/storage';
import type { Project } from '../types/projects';
import { localFsProvider } from '../services/storage/local-fs-provider';
import {
  githubProvider,
  type GitHubUserProfile,
  type GitHubRepoSummary,
} from '../services/storage/github-provider';
import { tokenVault } from '../services/storage/token-vault';
import { useProjectContext } from './ProjectContext';

export interface StorageContextValue {
  readonly target: StorageTarget;
  readonly syncStatus: SyncStatus;
  readonly isSyncing: boolean;
  readonly syncMessage: string | null;
  readonly fileDiffs: readonly FileDiffSummary[];
  readonly lastSyncedAt: string | null;
  readonly isModalOpen: boolean;

  // GitHub state
  readonly githubUser: GitHubUserProfile | null;
  readonly githubRepos: readonly GitHubRepoSummary[];
  readonly activeDeviceCode: GitHubDeviceCodeResponse | null;
  readonly isDeviceFlowPolling: boolean;

  // Vault state
  readonly isVaultUnlocked: boolean;
  readonly hasStoredVault: boolean;

  // Modals & UI actions
  readonly openStorageModal: () => void;
  readonly closeStorageModal: () => void;
  readonly selectLocalFolder: () => Promise<boolean>;
  readonly disconnectLocalFolder: () => void;
  readonly unlockVault: (passphrase: string) => Promise<boolean>;
  readonly lockVault: () => void;
  readonly saveTokenToVault: (token: string, passphrase: string) => Promise<void>;
  readonly clearVault: () => void;
  readonly startDeviceFlow: (clientId?: string) => Promise<GitHubDeviceCodeResponse | null>;
  readonly cancelDeviceFlow: () => void;
  readonly setGitHubRepoTarget: (owner: string, repo: string, branch: string) => Promise<void>;
  readonly pushToGitHub: (commitMessage: string) => Promise<GitHubCommitResult | null>;
  readonly pullFromGitHub: (owner: string, repo: string, branch: string) => Promise<boolean>;
  readonly syncCurrentProject: () => Promise<boolean>;
  readonly refreshSyncStatus: () => Promise<void>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const { currentProject, loadProject } = useProjectContext();

  const [target, setTarget] = useState<StorageTarget>({ type: 'indexeddb' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<readonly FileDiffSummary[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // GitHub state
  const [githubUser, setGithubUser] = useState<GitHubUserProfile | null>(null);
  const [githubRepos, setGithubRepos] = useState<readonly GitHubRepoSummary[]>([]);
  const [activeDeviceCode, setActiveDeviceCode] = useState<GitHubDeviceCodeResponse | null>(null);
  const [isDeviceFlowPolling, setIsDeviceFlowPolling] = useState<boolean>(false);

  // Vault state
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(
    tokenVault.getActiveToken() !== null,
  );
  const [hasStoredVault, setHasStoredVault] = useState<boolean>(tokenVault.hasStoredVault());

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch repos if token available
  const refreshGitHubProfile = useCallback(async (token: string) => {
    const userRes = await githubProvider.getUserProfile(token);
    if (userRes.success) {
      setGithubUser(userRes.data);
      const reposRes = await githubProvider.listRepositories(token);
      if (reposRes.success) {
        setGithubRepos(reposRes.data);
      }
    } else {
      setGithubUser(null);
    }
  }, []);

  // Check sync status whenever currentProject changes or on demand
  const refreshSyncStatus = useCallback(async () => {
    if (!currentProject) {
      setSyncStatus('synced');
      setFileDiffs([]);
      return;
    }

    if (target.type === 'local') {
      const res = await localFsProvider.checkSyncStatus(currentProject);
      setSyncStatus(res.status);
      setFileDiffs(res.diffs);
      setSyncMessage(res.message || null);
    } else if (target.type === 'github') {
      const token = tokenVault.getActiveToken();
      if (!token) {
        setSyncStatus('disconnected');
        setSyncMessage('GitHub token not available in vault');
        return;
      }
      const res = await githubProvider.checkSyncStatus(
        currentProject,
        target.owner,
        target.repo,
        target.branch,
        token,
      );
      setSyncStatus(res.status);
      setFileDiffs(res.diffs);
      setSyncMessage(res.message || null);
    } else {
      setSyncStatus('synced');
      setFileDiffs([]);
      setSyncMessage('Saved locally in browser database');
    }
  }, [currentProject, target]);

  useEffect(() => {
    void refreshSyncStatus();
  }, [refreshSyncStatus]);

  // Local folder selection
  const selectLocalFolder = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    const result = await localFsProvider.promptSelectDirectory();
    if (!result.success) {
      setIsSyncing(false);
      setSyncMessage(result.error.message);
      return false;
    }

    // Read project from local folder or ask to bind current project
    const readResult = await localFsProvider.readProjectFromDirectory();
    if (readResult.success && readResult.data.files.length > 0) {
      await loadProject(readResult.data);
    } else if (currentProject) {
      // Save current project into this new empty local folder
      await localFsProvider.saveProject(currentProject);
    }

    setTarget({
      type: 'local',
      folderName: result.data.folderName,
      hasWritePermission: true,
    });
    setSyncStatus('synced');
    setLastSyncedAt(new Date().toLocaleTimeString());
    setIsSyncing(false);
    return true;
  }, [currentProject, loadProject]);

  const disconnectLocalFolder = useCallback(() => {
    localFsProvider.disconnect();
    setTarget({ type: 'indexeddb' });
    setSyncStatus('synced');
    setFileDiffs([]);
    setSyncMessage('Disconnected local folder');
  }, []);

  // Web Crypto Token Vault actions
  const unlockVault = useCallback(
    async (passphrase: string): Promise<boolean> => {
      const stored = tokenVault.getStoredPayload();
      if (!stored) return false;
      try {
        const token = await tokenVault.decrypt(stored, passphrase);
        setIsVaultUnlocked(true);
        await refreshGitHubProfile(token);
        return true;
      } catch {
        return false;
      }
    },
    [refreshGitHubProfile],
  );

  const lockVault = useCallback(() => {
    tokenVault.lock();
    setIsVaultUnlocked(false);
    setGithubUser(null);
  }, []);

  const saveTokenToVault = useCallback(
    async (token: string, passphrase: string) => {
      const payload = await tokenVault.encrypt(token, passphrase);
      tokenVault.saveEncryptedPayload(payload);
      setHasStoredVault(true);
      setIsVaultUnlocked(true);
      await refreshGitHubProfile(token);
    },
    [refreshGitHubProfile],
  );

  const clearVault = useCallback(() => {
    tokenVault.clear();
    setHasStoredVault(false);
    setIsVaultUnlocked(false);
    setGithubUser(null);
    if (target.type === 'github') {
      setTarget({ type: 'indexeddb' });
    }
  }, [target.type]);

  // GitHub Device Flow
  const cancelDeviceFlow = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsDeviceFlowPolling(false);
    setActiveDeviceCode(null);
  }, []);

  const startDeviceFlow = useCallback(
    async (clientId?: string): Promise<GitHubDeviceCodeResponse | null> => {
      cancelDeviceFlow();
      const res = await githubProvider.initiateDeviceFlow(clientId);
      if (!res.success) {
        setSyncMessage(res.error.message);
        return null;
      }

      const deviceData = res.data;
      setActiveDeviceCode(deviceData);
      setIsDeviceFlowPolling(true);

      const intervalSeconds = Math.max(deviceData.interval || 5, 5);
      const pollStart = Date.now();
      const expiresAt = pollStart + (deviceData.expires_in || 900) * 1000;

      pollingTimerRef.current = setInterval(async () => {
        if (Date.now() > expiresAt) {
          cancelDeviceFlow();
          setSyncMessage('GitHub Device Flow expired. Please try again.');
          return;
        }

        const pollRes = await githubProvider.pollDeviceToken(deviceData.device_code, clientId);
        if (pollRes.success && pollRes.data.access_token) {
          cancelDeviceFlow();
          const token = pollRes.data.access_token;
          tokenVault.setActiveToken(token);
          setIsVaultUnlocked(true);
          await refreshGitHubProfile(token);
          setSyncMessage('Successfully authenticated with GitHub');
        } else if (pollRes.success && pollRes.data.error) {
          if (pollRes.data.error === 'authorization_pending') {
            // User hasn't completed flow in browser yet, continue polling
          } else if (pollRes.data.error === 'slow_down') {
            // Back off slightly
          } else {
            cancelDeviceFlow();
            setSyncMessage(pollRes.data.error_description || 'GitHub authorization failed');
          }
        }
      }, intervalSeconds * 1000);

      return deviceData;
    },
    [cancelDeviceFlow, refreshGitHubProfile],
  );

  const setGitHubRepoTarget = useCallback(
    async (owner: string, repo: string, branch: string) => {
      setTarget({
        type: 'github',
        owner,
        repo,
        branch,
        repoUrl: `https://github.com/${owner}/${repo}/tree/${branch}`,
      });
      setSyncMessage(`Connected to GitHub: ${owner}/${repo}@${branch}`);
    },
    [],
  );

  const pushToGitHub = useCallback(
    async (commitMessage: string): Promise<GitHubCommitResult | null> => {
      if (target.type !== 'github' || !currentProject) return null;
      const token = tokenVault.getActiveToken();
      if (!token) {
        setSyncMessage('No GitHub token unlocked');
        return null;
      }

      setIsSyncing(true);
      const commitRes = await githubProvider.commitAndPush(
        target.owner,
        target.repo,
        target.branch,
        {
          message: commitMessage,
          files: currentProject.files,
          branch: target.branch,
        },
        token,
      );

      setIsSyncing(false);
      if (!commitRes.success) {
        setSyncStatus('error');
        setSyncMessage(commitRes.error.message);
        return null;
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncMessage(
        `Committed ${commitRes.data.filesCommitted} files to ${target.branch} (${commitRes.data.commitSha.slice(0, 7)})`,
      );
      void refreshSyncStatus();
      return commitRes.data;
    },
    [target, currentProject, refreshSyncStatus],
  );

  const pullFromGitHub = useCallback(
    async (owner: string, repo: string, branch: string): Promise<boolean> => {
      const token = tokenVault.getActiveToken();
      if (!token) {
        setSyncMessage('GitHub token not available');
        return false;
      }

      setIsSyncing(true);
      const res = await githubProvider.pullProject(owner, repo, branch, token);
      setIsSyncing(false);

      if (!res.success) {
        setSyncMessage(res.error.message);
        return false;
      }

      await loadProject(res.data);
      setTarget({
        type: 'github',
        owner,
        repo,
        branch,
        repoUrl: `https://github.com/${owner}/${repo}/tree/${branch}`,
      });
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncMessage(`Loaded project from GitHub ${owner}/${repo}@${branch}`);
      return true;
    },
    [loadProject],
  );

  const syncCurrentProject = useCallback(async (): Promise<boolean> => {
    if (!currentProject) return false;
    setIsSyncing(true);

    if (target.type === 'local') {
      const saveRes = await localFsProvider.saveProject(currentProject);
      setIsSyncing(false);
      if (!saveRes.success) {
        setSyncStatus('error');
        setSyncMessage(saveRes.error.message);
        return false;
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncMessage(`Saved to local folder ${target.folderName}`);
      void refreshSyncStatus();
      return true;
    }

    if (target.type === 'github') {
      const result = await pushToGitHub('Sync changes from Polyglot Code Studio');
      return result !== null;
    }

    setIsSyncing(false);
    setSyncStatus('synced');
    setLastSyncedAt(new Date().toLocaleTimeString());
    return true;
  }, [currentProject, target, pushToGitHub, refreshSyncStatus]);

  return (
    <StorageContext
      value={{
        target,
        syncStatus,
        isSyncing,
        syncMessage,
        fileDiffs,
        lastSyncedAt,
        isModalOpen,
        githubUser,
        githubRepos,
        activeDeviceCode,
        isDeviceFlowPolling,
        isVaultUnlocked,
        hasStoredVault,
        openStorageModal: () => setIsModalOpen(true),
        closeStorageModal: () => setIsModalOpen(false),
        selectLocalFolder,
        disconnectLocalFolder,
        unlockVault,
        lockVault,
        saveTokenToVault,
        clearVault,
        startDeviceFlow,
        cancelDeviceFlow,
        setGitHubRepoTarget,
        pushToGitHub,
        pullFromGitHub,
        syncCurrentProject,
        refreshSyncStatus,
      }}
    >
      {children}
    </StorageContext>
  );
}

export function useStorageProvider(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) {
    throw new Error('useStorageProvider must be used within a StorageProvider');
  }
  return ctx;
}
