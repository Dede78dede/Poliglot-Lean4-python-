/**
 * SettingsModal Component (Sprint 11.0.2, Task ST1 & ST2)
 *
 * Fullscreen modal with:
 * - 12 categories left nav
 * - Global search filtering
 * - Immediate apply with 5-second undo toast
 * - Reset to defaults per section
 * - JSON Export/Import with strict Zod validation
 * - Token Vault credential management
 */

import React, { useSyncExternalStore, useState, useMemo } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Download,
  Upload,
  Check,
  Undo2,
  Sliders,
  Palette,
  Cpu,
  Brain,
  Flag,
  Network,
  Wrench,
  Keyboard,
  MessageSquare,
  Database,
  Shield,
  Cog,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { settingsStore } from '../../services/settings/settings-store';
import type { SettingsCategory } from '../../services/settings/settings-types';
import { FEATURE_FLAGS } from '../../services/flags/feature-flag-registry';
import { AI_PROVIDERS } from '../../services/ai/ai-provider-registry';
import { AVAILABLE_LEAN_TOOLCHAINS } from '../../../server/src/config/lean-runner-config';

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: readonly CategoryItem[] = [
  { id: 'editor', label: 'Editor', icon: Sliders },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'runtime', label: 'Runtime', icon: Cpu },
  { id: 'providers', label: 'AI Providers', icon: Brain },
  { id: 'flags', label: 'Feature Flags', icon: Flag },
  { id: 'mcp', label: 'MCP Server', icon: Network },
  { id: 'toolchain', label: 'Toolchain', icon: Wrench },
  { id: 'keybindings', label: 'Keybindings', icon: Keyboard },
  { id: 'chat', label: 'Chat & Prover', icon: MessageSquare },
  { id: 'memory', label: '5-Tier Memory', icon: Database },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  { id: 'advanced', label: 'Advanced', icon: Cog },
];

export function SettingsModal(): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  if (!snapshot.isModalOpen) return null;

  const { settings, activeCategory, searchQuery, undoAvailable, undoMessage } = snapshot;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const res = settingsStore.importJson(text);
      if (res.success) {
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError(res.error || 'Validation error');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const json = settingsStore.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyglot-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-label="Polyglot Studio Settings"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none"
    >
      <div className="bg-[#090d15] border border-neutral-800 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-[#06090e] border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <Cog className="w-5 h-5 text-blue-400" />
            <h1 className="text-base font-semibold text-slate-100">Settings</h1>
            <span className="text-[11px] font-mono text-slate-500">Ctrl+,</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search across settings */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => settingsStore.setSearchQuery(e.target.value)}
                placeholder="Search all settings..."
                className="w-full pl-8 pr-3 py-1 bg-neutral-900 border border-neutral-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => settingsStore.closeModal()}
              title="Close Settings (Esc)"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body Container: Nav on Left, Content on Right */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation */}
          <nav
            aria-label="Settings Categories"
            className="w-56 bg-[#06090e] border-r border-neutral-800 p-2 overflow-y-auto space-y-0.5 shrink-0"
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => settingsStore.setCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-neutral-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-neutral-800 px-2 space-y-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 text-[11px] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 text-[11px] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="sr-only"
                />
              </label>

              {importSuccess && (
                <div className="text-[10px] text-emerald-400 text-center font-mono">
                  ✓ Settings imported
                </div>
              )}
              {importError && (
                <div className="text-[10px] text-rose-400 text-center break-words">
                  {importError}
                </div>
              )}
            </div>
          </nav>

          {/* Right Content Panel */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#090d15] overflow-hidden">
            {/* Category Sub-header */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#080c13] border-b border-neutral-800 shrink-0">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                {CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory} Settings
              </span>
              <button
                type="button"
                onClick={() => settingsStore.resetSectionToDefaults(activeCategory)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Section</span>
              </button>
            </div>

            {/* Scrollable Settings Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {activeCategory === 'editor' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Font Size</div>
                      <div className="text-slate-500 text-[11px]">Controls the font size in pixels (8 - 36).</div>
                    </div>
                    <input
                      type="number"
                      min={8}
                      max={36}
                      value={settings.editor.fontSize}
                      onChange={(e) =>
                        settingsStore.updateSettings('editor', { fontSize: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-slate-200 font-mono text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Tab Size</div>
                      <div className="text-slate-500 text-[11px]">The number of spaces a tab is equal to.</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={settings.editor.tabSize}
                      onChange={(e) =>
                        settingsStore.updateSettings('editor', { tabSize: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-slate-200 font-mono text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Sticky Scroll</div>
                      <div className="text-slate-500 text-[11px]">Pins class, def, and theorem headers while scrolling.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.editor.stickyScroll}
                      onChange={(e) =>
                        settingsStore.updateSettings('editor', { stickyScroll: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Bracket Pair Colorization</div>
                      <div className="text-slate-500 text-[11px]">Renders matching brackets with distinct colors.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.editor.bracketPairColorization}
                      onChange={(e) =>
                        settingsStore.updateSettings('editor', { bracketPairColorization: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Minimap</div>
                      <div className="text-slate-500 text-[11px]">Shows Monaco code minimap overview ruler.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.editor.minimap}
                      onChange={(e) =>
                        settingsStore.updateSettings('editor', { minimap: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>
                </div>
              )}

              {activeCategory === 'appearance' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Theme</div>
                      <div className="text-slate-500 text-[11px]">Workbench color scheme.</div>
                    </div>
                    <select
                      value={settings.appearance.theme}
                      onChange={(e) =>
                        settingsStore.updateSettings('appearance', {
                          theme: e.target.value as any,
                        })
                      }
                      className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-slate-200"
                    >
                      <option value="dark">Dark Slate</option>
                      <option value="light">Light</option>
                      <option value="high-contrast">High Contrast (WCAG)</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Activity Bar Size</div>
                      <div className="text-slate-500 text-[11px]">Default (48px) vs Compact (40px).</div>
                    </div>
                    <select
                      value={settings.appearance.activityBarSize}
                      onChange={(e) =>
                        settingsStore.updateSettings('appearance', {
                          activityBarSize: e.target.value as any,
                        })
                      }
                      className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-slate-200"
                    >
                      <option value="default">Default (48px)</option>
                      <option value="compact">Compact (40px)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeCategory === 'providers' && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs">
                    Credentials are securely persisted into Token Vault. Stored keys are never logged or exposed in plaintext.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AI_PROVIDERS.map((prov) => (
                      <div
                        key={prov.id}
                        className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span className="truncate">{prov.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              prov.capabilities.pricingUsdPerMillionInput === 0
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-neutral-800 text-slate-400'
                            }`}
                          >
                            ${prov.capabilities.pricingUsdPerMillionInput}/1M in
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{prov.description}</p>
                        {!prov.isLocal && prov.id !== 'no-ai' && (
                          <div className="relative">
                            <input
                              type={revealedKeys[prov.id] ? 'text' : 'password'}
                              placeholder="Enter API Key / Token"
                              defaultValue={settings.providers[prov.id]?.apiKey || ''}
                              onBlur={(e) =>
                                settingsStore.updateProviderCredential(prov.id, e.target.value)
                              }
                              className="w-full pr-8 pl-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-slate-200 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedKeys((k) => ({ ...k, [prov.id]: !k[prov.id] }))
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {revealedKeys[prov.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCategory === 'flags' && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs">
                    45 feature flags. Toggling overrides .env configuration for this browser session.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(FEATURE_FLAGS).map(([key, def]) => {
                      const enabled =
                        settings.flags[key] !== undefined
                          ? settings.flags[key]
                          : def.default;
                      const isExp = def.category === 'experiment';
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2.5 rounded bg-neutral-900/50 border border-neutral-800"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-mono text-[11px] font-semibold text-slate-200 truncate flex items-center gap-1.5">
                              {key}
                              {isExp && (
                                <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-400 text-[9px] font-mono border border-amber-800">
                                  EXP
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Phase {def.phase} · {def.category}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              settingsStore.updateSettings('flags', {
                                [key]: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded text-blue-600 shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeCategory === 'toolchain' && (
                <div className="space-y-3 max-w-2xl">
                  <h3 className="font-semibold text-slate-200">Installed Lean 4 Toolchains</h3>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    {AVAILABLE_LEAN_TOOLCHAINS.map((tc) => (
                      <div
                        key={tc}
                        className="p-2.5 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-between"
                      >
                        <span className="text-slate-200">{tc}</span>
                        <span className="text-emerald-400 text-[10px] font-bold">READY</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCategory === 'chat' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Max Autonomous Tool Calls</div>
                      <div className="text-slate-500 text-[11px]">Hard guardrail for autonomous mode (1 - 200).</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={settings.chat.maxToolCalls}
                      onChange={(e) =>
                        settingsStore.updateSettings('chat', {
                          maxToolCalls: Number(e.target.value),
                        })
                      }
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-slate-200 font-mono text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Auto-Archive on Idle</div>
                      <div className="text-slate-500 text-[11px]">Propose safe project ZIP when workspace is idle.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.chat.autoArchiveEnabled}
                      onChange={(e) =>
                        settingsStore.updateSettings('chat', {
                          autoArchiveEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>
                </div>
              )}

              {activeCategory === 'privacy' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-slate-300 text-xs leading-relaxed space-y-2">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Local-First Architecture & Zero Telemetry
                    </div>
                    <p>
                      Polyglot Code Studio adheres to an offline-first, local-only telemetry discipline. No analytics, tracking tokens, or user data are transmitted to external servers without explicit user confirmation.
                    </p>
                  </div>
                </div>
              )}

              {activeCategory === 'advanced' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Debug Mode</div>
                      <div className="text-slate-500 text-[11px]">Verbose console logging and trace IDs.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.advanced.debugMode}
                      onChange={(e) =>
                        settingsStore.updateSettings('advanced', {
                          debugMode: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => settingsStore.resetAllToDefaults()}
                    className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 text-xs font-medium transition-colors"
                  >
                    Reset All Settings to Defaults
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* 5-Second Undo Toast at Bottom */}
        {undoAvailable && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-950 border-t border-blue-800 text-blue-200 text-xs shrink-0 animate-in fade-in">
            <span>{undoMessage ?? 'Setting modified'}</span>
            <button
              type="button"
              onClick={() => settingsStore.undoLastChange()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
