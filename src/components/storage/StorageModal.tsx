import React, { useState } from 'react';
import {
  X,
  HardDrive,
  GitBranch,
  Folder,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Upload,
  ArrowUpRight,
  Shield,
  Key,
} from 'lucide-react';
import { useStorageProvider } from '../../context/StorageContext';
import { useProjectContext } from '../../context/ProjectContext';
import { LocalFileSystemProvider } from '../../services/storage/local-fs-provider';

type Tab = 'local' | 'github' | 'commit';

export function StorageModal(): React.JSX.Element | null {
  const {
    target,
    syncStatus,
    isSyncing,
    syncMessage,
    fileDiffs,
    lastSyncedAt,
    isModalOpen,
    closeStorageModal,
    selectLocalFolder,
    disconnectLocalFolder,
    githubUser,
    githubRepos,
    activeDeviceCode,
    isDeviceFlowPolling,
    isVaultUnlocked,
    hasStoredVault,
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
  } = useStorageProvider();

  const { currentProject } = useProjectContext();

  const [activeTab, setActiveTab] = useState<Tab>(
    target.type === 'github' ? 'commit' : target.type === 'local' ? 'local' : 'local',
  );

  // GitHub Device Flow & PAT state
  const [clientIdInput, setClientIdInput] = useState('');
  const [patInput, setPatInput] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Commit dialog state
  const [commitMessage, setCommitMessage] = useState('Update project files');
  const [selectedRepoFullName, setSelectedRepoFullName] = useState(
    target.type === 'github' ? `${target.owner}/${target.repo}` : '',
  );
  const [branchInput, setBranchInput] = useState(target.type === 'github' ? target.branch : 'main');
  const [commitSuccessNotice, setCommitSuccessNotice] = useState<string | null>(null);
  const [commitErrorNotice, setCommitErrorNotice] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const handleCopyUserCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    const ok = await unlockVault(passphraseInput);
    if (!ok) {
      setVaultError('Incorrect passphrase or unable to decrypt');
    } else {
      setPassphraseInput('');
    }
  };

  const handleSavePat = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    if (!patInput.trim()) {
      setVaultError('Personal Access Token cannot be empty');
      return;
    }
    if (passphraseInput.length < 4) {
      setVaultError('Master passphrase must have at least 4 characters');
      return;
    }
    try {
      await saveTokenToVault(patInput.trim(), passphraseInput);
      setPatInput('');
      setPassphraseInput('');
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Encryption failed');
    }
  };

  const handlePushCommit = async () => {
    setCommitErrorNotice(null);
    setCommitSuccessNotice(null);
    const res = await pushToGitHub(commitMessage);
    if (res) {
      setCommitSuccessNotice(
        `Successfully pushed commit ${res.commitSha.slice(0, 7)} with ${res.filesCommitted} files!`,
      );
    } else {
      setCommitErrorNotice(syncMessage || 'Commit failed. Check branch permissions.');
    }
  };

  const handleSelectRepo = async (fullName: string) => {
    setSelectedRepoFullName(fullName);
    const [owner, repo] = fullName.split('/');
    if (owner && repo) {
      const found = githubRepos.find((r) => r.fullName === fullName);
      const branch = found?.defaultBranch || 'main';
      setBranchInput(branch);
      await setGitHubRepoTarget(owner, repo, branch);
    }
  };

  const hasFSSupport = LocalFileSystemProvider.isSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0c1017] border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#111620]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Project Persistence & Version Control</h2>
              <p className="text-xs text-neutral-400">
                Synchronize files directly to local disk or push atomic Git commits to GitHub.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeStorageModal}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-[#090d14] px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'local'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Local Filesystem</span>
            {target.type === 'local' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'github'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>GitHub Auth & Vault</span>
            {githubUser && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono">
                @{githubUser.login}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('commit')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'commit'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>GitHub Sync & Commit</span>
            {target.type === 'github' && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: LOCAL FILESYSTEM */}
          {activeTab === 'local' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Folder className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="font-medium text-white">
                        {target.type === 'local' ? `Connected: ${target.folderName}` : 'No Local Folder Attached'}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {target.type === 'local'
                          ? 'Changes are mirrored directly to your hard drive.'
                          : 'Select a directory on your machine to save and load files natively.'}
                      </div>
                    </div>
                  </div>

                  {target.type === 'local' ? (
                    <button
                      type="button"
                      onClick={disconnectLocalFolder}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={selectLocalFolder}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-950/50"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Attach Local Folder</span>
                    </button>
                  )}
                </div>

                {!hasFSSupport && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Browser Notice:</strong> The File System Access API is not enabled in this browser.
                      You can continue using instant ZIP Import & Export without restrictions.
                    </div>
                  </div>
                )}
              </div>

              {target.type === 'local' && (
                <div className="space-y-3 p-4 rounded-xl bg-neutral-900/40 border border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Target Folder: <strong className="text-white font-mono">{target.folderName}</strong></span>
                    <span>Status: <strong className="text-emerald-400 uppercase font-mono">{syncStatus}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-neutral-400">
                      {lastSyncedAt ? `Last saved at ${lastSyncedAt}` : 'Not yet saved'}
                    </div>
                    <button
                      type="button"
                      onClick={syncCurrentProject}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Save Now to Disk</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GITHUB AUTH & TOKEN VAULT */}
          {activeTab === 'github' && (
            <div className="space-y-6">
              {/* Authenticated user badge */}
              {githubUser ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/80 border border-emerald-800/60">
                  <div className="flex items-center gap-3">
                    <img
                      src={githubUser.avatarUrl}
                      alt={githubUser.login}
                      className="w-10 h-10 rounded-full border border-neutral-700"
                    />
                    <div>
                      <div className="font-semibold text-white">{githubUser.name || githubUser.login}</div>
                      <div className="text-xs text-emerald-400 font-mono">@{githubUser.login} (Authenticated)</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={lockVault}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearVault}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : hasStoredVault && !isVaultUnlocked ? (
                /* Encrypted vault exists, prompt for master passphrase */
                <form
                  onSubmit={handleUnlockVault}
                  className="p-5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-4"
                >
                  <div className="flex items-center gap-2.5 text-white font-medium">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span>Unlock Token Vault</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Your GitHub credentials are stored encrypted with PBKDF2 (100,000 iterations) + AES-GCM-256.
                    Enter your master passphrase to unlock:
                  </p>

                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Master Passphrase"
                      value={passphraseInput}
                      onChange={(e) => setPassphraseInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {vaultError && (
                    <div className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{vaultError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={clearVault}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Reset / Clear Stored Vault
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Vault</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* GitHub Authorization: Primary Device Flow + Secondary PAT fallback */
                <div className="space-y-6">
                  {/* Primary Option: Device Flow (OAuth 2.0 RFC 8628) */}
                  <div className="p-5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span>OAuth 2.0 Device Flow (Recommended)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                        Zero Manual Secrets
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Sign in directly via GitHub without copying tokens. Polyglot Code Studio generates an 8-character code, which you confirm on GitHub.
                    </p>

                    {activeDeviceCode ? (
                      <div className="space-y-4 p-4 rounded-lg bg-neutral-950 border border-neutral-700">
                        <div className="text-center space-y-1">
                          <div className="text-xs text-neutral-400">Your one-time GitHub device code:</div>
                          <div className="text-2xl font-mono font-bold tracking-widest text-emerald-400 select-all">
                            {activeDeviceCode.user_code}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCopyUserCode(activeDeviceCode.user_code)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>

                          <a
                            href={activeDeviceCode.verification_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            <span>Open github.com/login/device</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span>Waiting for your approval on GitHub...</span>
                          <button
                            type="button"
                            onClick={cancelDeviceFlow}
                            className="ml-2 text-xs text-red-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="GitHub OAuth Client ID (optional, or uses server default)"
                            value={clientIdInput}
                            onChange={(e) => setClientIdInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => startDeviceFlow(clientIdInput.trim() || undefined)}
                            disabled={isDeviceFlowPolling}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            <span>Start Device Login</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Secondary Fallback: Personal Access Token with Vault */}
                  <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                    <div className="flex items-center gap-2 text-neutral-300 font-semibold text-xs">
                      <Lock className="w-4 h-4 text-neutral-400" />
                      <span>Secondary Fallback: Personal Access Token (PAT)</span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      If you already have a GitHub Fine-grained PAT (with <code className="text-neutral-200">contents:write</code>), you can store it encrypted in the Web Crypto vault.
                    </p>

                    <form onSubmit={handleSavePat} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="password"
                          placeholder="GitHub Token (ghp_...)"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs placeholder:text-neutral-600 font-mono"
                        />
                        <input
                          type="password"
                          placeholder="Choose Master Passphrase"
                          value={passphraseInput}
                          onChange={(e) => setPassphraseInput(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs placeholder:text-neutral-600 font-mono"
                        />
                      </div>

                      {vaultError && (
                        <div className="text-xs text-red-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{vaultError}</span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                          <span>Encrypt & Save into Vault</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMIT & PUSH */}
          {activeTab === 'commit' && (
            <div className="space-y-5">
              {!githubUser ? (
                <div className="p-6 text-center space-y-3 bg-neutral-900/50 rounded-xl border border-neutral-800">
                  <Shield className="w-8 h-8 text-neutral-500 mx-auto" />
                  <div className="text-white font-medium">GitHub Authentication Required</div>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Please sign in on the "GitHub Auth & Vault" tab to select a repository and push atomic commits.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('github')}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Go to Authentication
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Repository and branch selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Target Repository</label>
                      <select
                        value={selectedRepoFullName}
                        onChange={(e) => handleSelectRepo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
                      >
                        <option value="">Select a repository...</option>
                        {githubRepos.map((r) => (
                          <option key={r.id} value={r.fullName}>
                            {r.fullName} {r.isPrivate ? '(Private)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-400">Branch</label>
                      <input
                        type="text"
                        value={branchInput}
                        onChange={(e) => {
                          setBranchInput(e.target.value);
                          if (target.type === 'github') {
                            void setGitHubRepoTarget(target.owner, target.repo, e.target.value);
                          }
                        }}
                        placeholder="main"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Commit message */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-400">Commit Message</label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="e.g. Add Lean proof obligations & verification tests"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
                    />
                  </div>

                  {/* Project files overview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Files to include ({currentProject?.files.length ?? 0} files)</span>
                      <span className="font-mono text-[11px] text-purple-400">Atomic Multi-Blob Commit</span>
                    </div>

                    <div className="max-h-36 overflow-y-auto rounded-lg bg-neutral-950 border border-neutral-800 divide-y divide-neutral-900 p-1">
                      {currentProject?.files.map((file) => (
                        <div key={file.path} className="flex items-center justify-between px-2.5 py-1 text-xs">
                          <span className="text-neutral-300 font-mono text-[11px]">{file.path}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase font-mono">
                            {file.language}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {commitSuccessNotice && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{commitSuccessNotice}</span>
                    </div>
                  )}

                  {commitErrorNotice && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{commitErrorNotice}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                    {target.type === 'github' ? (
                      <button
                        type="button"
                        onClick={() => pullFromGitHub(target.owner, target.repo, target.branch)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Pull from Remote</span>
                      </button>
                    ) : <div />}

                    <button
                      type="button"
                      onClick={handlePushCommit}
                      disabled={isSyncing || !selectedRepoFullName || !commitMessage.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all shadow-lg shadow-purple-950/50"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pushing Tree & Blobs...</span>
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Commit & Push Atomically</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#090d14] flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Active Destination:</span>
            <span className="font-mono text-white">
              {target.type === 'local'
                ? `Local Folder (${target.folderName})`
                : target.type === 'github'
                  ? `GitHub (${target.owner}/${target.repo}@${target.branch})`
                  : 'Browser Storage'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : syncStatus === 'uncommitted'
                    ? 'bg-amber-400'
                    : syncStatus === 'syncing'
                      ? 'bg-blue-400 animate-spin'
                      : 'bg-neutral-500'
              }`}
            />
            <span className="capitalize">{syncStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
