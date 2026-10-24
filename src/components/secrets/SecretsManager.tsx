import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Plus,
  Download,
  Upload,
  X,
  Lock,
  Coins,
  Cpu,
} from 'lucide-react';
import { tokenVault, type SecretMetadata } from '../../services/storage/token-vault';
import { configRepository, type ProviderConfig } from '../../services/config/config-repository';
import { TokenBudgetDashboard } from '../ai/TokenBudgetDashboard';
import { AiProfileSelector } from '../ai/AiProfileSelector';
import type { AiProfile } from '../../types/ai-profile';

export interface SecretsManagerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function SecretsManager({ isOpen, onClose }: SecretsManagerProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'vault' | 'budgets' | 'profiles'>('vault');
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secrets, setSecrets] = useState<readonly SecretMetadata[]>([]);
  const [configs, setConfigs] = useState<readonly ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('nvidia-nim');
  const [newSecretVal, setNewSecretVal] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<AiProfile>('standard');

  if (!isOpen) return null;

  const refreshList = () => {
    setSecrets(tokenVault.listSecrets());
    setConfigs(configRepository.listConfigs());
  };

  const handleUnlock = () => {
    if (passphrase.length < 4) {
      setStatusMessage('Passphrase must be at least 4 characters');
      return;
    }
    setIsUnlocked(true);
    refreshList();
    setStatusMessage('Vault unlocked for active session');
  };

  const handleSaveSecret = async () => {
    if (!newSecretVal.trim()) return;
    try {
      await tokenVault.storeSecret(selectedProvider, newSecretVal.trim(), passphrase);
      setNewSecretVal('');
      refreshList();
      setStatusMessage(`Secret for ${selectedProvider} securely stored in vault`);
    } catch (err: unknown) {
      setStatusMessage(`Error storing secret: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteSecret = async (id: string) => {
    await tokenVault.deleteSecret(id);
    refreshList();
    setStatusMessage('Secret deleted');
  };

  const handleExportConfig = () => {
    const exported = configRepository.exportConfig(activeProfile);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polyglot-config.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Config exported (secrets excluded)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs font-sans text-slate-200">
      <div className="w-full max-w-3xl bg-[#0c1017] border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0e1420] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                  API & Secret Management & Resource-Aware AI
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-cyan-800 text-cyan-300 bg-cyan-950/40">
                  PBKDF2 · AES-GCM-256
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Local-first zero-knowledge credential vault & hardware-aware routing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#080b12] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'vault'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Credentials Vault</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'budgets'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Token Budgets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'profiles'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Resource Profiles</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'vault' && (
            <>
              {!isUnlocked ? (
                <div className="p-6 border border-slate-800 bg-[#090d15] space-y-4 text-center">
                  <div className="w-10 h-10 mx-auto rounded-none bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-200">Vault Locked</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Enter master passphrase to decrypt and manage your API keys. Keys never touch disk unencrypted.
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Master passphrase (min 4 chars)..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleUnlock}
                      className="w-full py-1.5 bg-cyan-950/60 border border-cyan-500/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition-colors"
                    >
                      Unlock Vault
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Add Secret Form */}
                  <div className="p-3.5 border border-slate-800 bg-[#090d15] space-y-3">
                    <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Configure Provider API Key</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      >
                        <option value="nvidia-nim">NVIDIA NIM (40 RPM/model)</option>
                        <option value="groq">Groq (30 RPM, 14.4k RPD)</option>
                        <option value="cerebras">Cerebras (30 RPM, 1M tok/day)</option>
                        <option value="gemini">Google Gemini (1.5k req/day)</option>
                        <option value="openrouter">OpenRouter (20 RPM, 50 RPD)</option>
                        <option value="mistral">Mistral Experiment (1 RPS)</option>
                        <option value="github">GitHub Personal Access Token</option>
                        <option value="axle">AXLE Formal Cloud Key</option>
                      </select>
                      <input
                        type="password"
                        value={newSecretVal}
                        onChange={(e) => setNewSecretVal(e.target.value)}
                        placeholder="Enter API key or Bearer token..."
                        className="sm:col-span-2 px-3 py-1.5 bg-slate-950 border border-slate-700 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveSecret}
                      className="px-3 py-1.5 border border-cyan-500 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-mono transition-colors"
                    >
                      Encrypt & Save to Vault
                    </button>
                  </div>

                  {/* Configured Secrets Table */}
                  <div className="border border-slate-800 bg-[#090d15]">
                    <div className="px-3.5 py-2 border-b border-slate-800 text-xs font-semibold uppercase text-slate-300">
                      Configured Provider Secrets ({secrets.length})
                    </div>
                    {secrets.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 font-mono">
                        No secrets configured in vault. Add your API keys above.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/80">
                        {secrets.map((s) => (
                          <div key={s.id} className="p-3 flex items-center justify-between text-xs font-mono">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">{s.providerId}</span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-1 border border-emerald-800">
                                  ENCRYPTED
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                ID: {s.id} · Updated: {new Date(s.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSecret(s.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete secret"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Config Repository Actions */}
                  <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-mono">
                    <span className="text-slate-400">Configuration Repository</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportConfig}
                        className="px-2.5 py-1 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON (Safe)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'budgets' && (
            <TokenBudgetDashboard className="border-0 p-0 bg-transparent" />
          )}

          {activeTab === 'profiles' && (
            <AiProfileSelector
              activeProfile={activeProfile}
              onSelectProfile={setActiveProfile}
              className="border-0 p-0 bg-transparent"
            />
          )}

          {statusMessage && (
            <div className="p-2 border border-cyan-800/60 bg-cyan-950/20 text-cyan-300 text-xs font-mono">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0e1420] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Zero external network transmission · Local-only PBKDF2</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
