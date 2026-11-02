/**
 * ChatPanel Component (Sprint 11.0.2, Task C1 & C2)
 *
 * Implements full 3-panel LLM Chat & Prover with:
 * - 14 AI providers with capability matrix & pricing
 * - Per-provider model selection
 * - Slash commands autocomplete & badges
 * - Collapsible tool execution blocks
 * - Inline Diff preview with DiffViewer reuse
 * - Autonomous Mode with 50-tool / 10-edit guardrails
 * - WCAG AA accessibility: role="log", aria-live="polite", role="textbox"
 */

import React, { useState, useSyncExternalStore, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Square,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Check,
  X,
  FileCode,
  ShieldAlert,
  Sparkles,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { chatStore, MAX_AUTONOMOUS_TOOL_CALLS, MAX_AUTONOMOUS_FILE_EDITS } from '../../services/chat/chat-store';
import { AI_PROVIDERS, type AiProviderId } from '../../services/ai/ai-provider-registry';
import { CANONICAL_SLASH_COMMANDS, type ToolCallRecord, type ProposedDiff } from '../../services/chat/chat-types';
import { featureFlagRegistry } from '../../services/flags/feature-flag-registry';
import { DiffViewer } from '../shell/DiffViewer';
import { useProjectContext } from '../../context/ProjectContext';

const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  'nvidia-nim': ['meta/llama-3.3-70b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1', 'nvidia/nemotron-4-340b-instruct'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-4-scout'],
  cerebras: ['llama3.1-70b', 'llama3.1-8b'],
  mistral: ['codestral-latest', 'mistral-large-latest'],
  openrouter: ['deepseek/deepseek-r1:free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free'],
  anthropic: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
  openai: ['gpt-4.5-preview', 'o3-mini', 'o1', 'gpt-4o'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  minimax: ['MiniMax-Text-01', 'abab6.5s-chat'],
  leanstral: ['leanstral-1.5', 'leanstral-1.5:q4_k_m'],
  axle: ['axle-prover-v2', 'axle-cloud-v1'],
  'no-ai': ['local-heuristic-prover'],
};

export function ChatPanel(): React.JSX.Element {
  const chatState = useSyncExternalStore(chatStore.subscribe, chatStore.getSnapshot);
  const activeSession = chatStore.getActiveSession();
  const projectContext = useProjectContext();

  const [input, setInput] = useState('');
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [activeDiffMessageId, setActiveDiffMessageId] = useState<string | null>(null);
  const [slashHelpOpen, setSlashHelpOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; content: string; type: 'text' | 'image'; size: number }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAgenticAllowed = featureFlagRegistry.isEnabled('ENABLE_AGENTIC_AUTOMATION');
  const isNoAi = activeSession?.providerId === 'no-ai';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, chatState.isStreaming]);

  const handleSend = useCallback(() => {
    if (!input.trim() || chatState.isStreaming) return;

    let activeContext: { path: string; content: string } | undefined;
    if (projectContext?.activeFilePath) {
      const activeFile = projectContext.getActiveFile();
      if (activeFile) {
        activeContext = { path: activeFile.path, content: activeFile.content };
      }
    }

    chatStore.sendMessage(input, attachments, activeContext);
    setInput('');
    setAttachments([]);
    setSlashHelpOpen(false);
  }, [input, chatState.isStreaming, attachments, projectContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderId = e.target.value;
    if (!activeSession) return;
    const models = PROVIDER_MODELS[newProviderId] || ['default'];
    chatStore.setProviderAndModel(activeSession.id, newProviderId, models[0]);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    if (!activeSession) return;
    chatStore.setProviderAndModel(activeSession.id, activeSession.providerId, newModelId);
  };

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === activeSession?.providerId) ?? AI_PROVIDERS[0];
  const availableModels = PROVIDER_MODELS[activeSession?.providerId || 'gemini'] || ['default'];

  return (
    <div className="flex h-full w-full bg-[#090d15] text-slate-200 overflow-hidden select-none">
      {/* 1. Collapsible Sessions List Panel (240px) */}
      {showSessionsList && (
        <aside
          aria-label="Chat Sessions"
          className="w-60 bg-[#06090e] border-r border-neutral-800 flex flex-col shrink-0 text-xs"
        >
          <div className="flex items-center justify-between p-2 border-b border-neutral-800 font-semibold text-slate-300">
            <span>Conversations</span>
            <button
              type="button"
              onClick={() => chatStore.createNewSession()}
              title="New Conversation"
              className="p-1 rounded hover:bg-neutral-800 text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {chatState.sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => chatStore.selectSession(s.id)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                  s.id === activeSession?.id
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium'
                    : 'text-slate-400 hover:bg-neutral-800 hover:text-slate-200'
                }`}
              >
                <span className="truncate pr-2">{s.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chatStore.deleteSession(s.id);
                  }}
                  title="Delete Session"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* 2. Main Chat Thread & Composer Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Toolbar */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#06090e] border-b border-neutral-800 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowSessionsList((v) => !v)}
              title={showSessionsList ? 'Hide Sessions' : 'Show Sessions'}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              {showSessionsList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1.5 truncate">
              <Bot className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-200 truncate">
                {activeSession?.title ?? 'Chat'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 14-Provider Selector */}
            <select
              aria-label="Select AI Provider"
              value={activeSession?.providerId || 'gemini'}
              onChange={handleProviderChange}
              className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.capabilities.pricingUsdPerMillionInput === 0 ? '(Free)' : ''}
                </option>
              ))}
            </select>

            {/* Model Selector */}
            <select
              aria-label="Select Model"
              value={activeSession?.modelId || availableModels[0]}
              onChange={handleModelChange}
              className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 font-mono max-w-[140px] truncate"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Autonomous Mode Toggle */}
            {isAgenticAllowed && activeSession && (
              <label
                title="Autonomous Mode: Agent can execute safe tool calls up to 50 calls / 10 file edits"
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                  activeSession.autonomousMode
                    ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={activeSession.autonomousMode}
                  onChange={(e) => chatStore.setAutonomousMode(activeSession.id, e.target.checked)}
                  className="sr-only"
                />
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Auto ({activeSession.toolCallsCount}/{MAX_AUTONOMOUS_TOOL_CALLS})</span>
              </label>
            )}

            {/* Export session */}
            {activeSession && (
              <button
                type="button"
                onClick={() => {
                  const data = chatStore.exportSessionJson(activeSession.id);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeSession.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                title="Export Conversation JSON"
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Warning banner for NoAiProvider */}
        {isNoAi && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/40 border-b border-amber-900/60 text-[11px] text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Deterministic Local Heuristics active (No external LLM). Responses are purely rule-based.</span>
          </div>
        )}

        {/* Message Thread (role="log" with aria-live="polite") */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation Messages"
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {activeSession?.messages.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              onInspectDiff={() => setActiveDiffMessageId(m.id)}
              onApplyDiff={() => {
                if (projectContext) {
                  chatStore.applyDiff(m.id, (path, content) => {
                    projectContext.updateFileContent(path, content);
                  });
                }
              }}
              onRejectDiff={() => chatStore.rejectDiff(m.id)}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Diff Preview Modal/Overlay if active */}
        {activeDiffMessageId && (
          <DiffPreviewModal
            messageId={activeDiffMessageId}
            onClose={() => setActiveDiffMessageId(null)}
            onApply={() => {
              if (projectContext) {
                chatStore.applyDiff(activeDiffMessageId, (path, content) => {
                  projectContext.updateFileContent(path, content);
                });
              }
              setActiveDiffMessageId(null);
            }}
          />
        )}

        {/* Slash Command Autocomplete Bar */}
        {slashHelpOpen && (
          <div className="px-3 py-2 bg-neutral-900 border-t border-neutral-800 flex flex-wrap gap-1.5 text-xs">
            {CANONICAL_SLASH_COMMANDS.map((sc) => (
              <button
                key={sc.command}
                type="button"
                onClick={() => {
                  setInput(`${sc.command} `);
                  setSlashHelpOpen(false);
                  inputRef.current?.focus();
                }}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-blue-600/30 text-blue-300 border border-neutral-700 hover:border-blue-500 font-mono text-[11px] transition-colors"
              >
                {sc.command}
              </button>
            ))}
          </div>
        )}

        {/* Composer Form (role="textbox" aria-multiline="true") */}
        <footer className="p-3 bg-[#06090e] border-t border-neutral-800 shrink-0 w-full min-w-0 max-w-full overflow-hidden">
          {/* Active file context indicator */}
          {projectContext?.activeFilePath && (
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 px-1 font-mono">
              <span className="truncate">Context: {projectContext.activeFilePath}</span>
              <button
                type="button"
                onClick={() => setSlashHelpOpen((v) => !v)}
                className="text-blue-400 hover:underline"
              >
                {slashHelpOpen ? 'Hide Commands' : 'Slash Commands (/) '}
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-neutral-900/90 border border-neutral-700 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <textarea
              ref={inputRef}
              role="textbox"
              aria-multiline="true"
              aria-label="Chat prompt or slash command"
              rows={2}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value.startsWith('/')) {
                  setSlashHelpOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question, enter code, or type / for commands (/prove, /formalize, /search)..."
              className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none min-h-[44px]"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {chatState.isStreaming ? (
                <button
                  type="button"
                  onClick={() => chatStore.stopGeneration()}
                  title="Stop generating"
                  className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  title="Send message (Enter)"
                  className="p-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-slate-600 text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function MessageItem({
  message,
  onInspectDiff,
  onApplyDiff,
  onRejectDiff,
}: {
  message: import('../../services/chat/chat-types').ChatMessage;
  onInspectDiff: () => void;
  onApplyDiff: () => void;
  onRejectDiff: () => void;
}): React.JSX.Element {
  const isUser = message.role === 'user';

  return (
    <article
      className={`flex gap-3 text-xs ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-neutral-900 border border-neutral-800 text-slate-200'
        }`}
      >
        {/* Tool Call Execution Blocks */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {message.toolCalls.map((tc) =>
              tc.name === 'polyglot_probe_tactic' ? (
                <SpeculativeProbeCard
                  key={tc.id}
                  toolCall={tc}
                  onApplyTactic={(tactic) => {
                    onApplyDiff();
                  }}
                />
              ) : (
                <ToolCallCard key={tc.id} toolCall={tc} />
              )
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
          {message.content}
        </div>

        {/* Proposed Diff Block with Monaco DiffViewer Trigger */}
        {message.proposedDiff && (
          <div className="mt-3 p-2.5 bg-neutral-950 rounded border border-neutral-700 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                {message.proposedDiff.path}
              </span>
              <span className="text-slate-500">
                {message.proposedDiff.applied ? 'Applied to VFS' : 'Proposed Edit'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onInspectDiff}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-slate-200 font-mono text-[10px] transition-colors"
              >
                Inspect Diff
              </button>
              {!message.proposedDiff.applied ? (
                <>
                  <button
                    type="button"
                    onClick={onApplyDiff}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Apply to File
                  </button>
                  <button
                    type="button"
                    onClick={onRejectDiff}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-[10px] transition-colors"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <span className="text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Applied
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </article>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCallRecord }): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/80 text-[11px] font-mono overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-neutral-900 transition-colors"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Wrench className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-300 truncate">{toolCall.name}</span>
          <span
            className={`px-1 py-0.2 rounded text-[9px] uppercase font-bold ${
              toolCall.status === 'completed'
                ? 'bg-emerald-950 text-emerald-400'
                : toolCall.status === 'running'
                ? 'bg-blue-950 text-blue-400'
                : 'bg-rose-950 text-rose-400'
            }`}
          >
            {toolCall.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 shrink-0">
          {toolCall.durationMs !== undefined && <span>{toolCall.durationMs}ms</span>}
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      {open && (
        <div className="p-2 border-t border-neutral-800 text-[10px] text-slate-400 space-y-1 bg-black/40">
          <div>
            <span className="font-bold text-slate-300">Arguments:</span>
            <pre className="mt-0.5 p-1 bg-neutral-900 rounded overflow-x-auto text-slate-300">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <span className="font-bold text-slate-300">Result:</span>
              <pre className="mt-0.5 p-1 bg-neutral-900 rounded overflow-x-auto text-emerald-300">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpeculativeProbeCard({
  toolCall,
  onApplyTactic,
}: {
  toolCall: ToolCallRecord;
  onApplyTactic: (tacticText: string) => void;
}): React.JSX.Element {
  const probeData = toolCall.result as import('../../services/mcp/lean-beam-client').LeanBeamProbeResult | undefined;
  const tacticText = String(toolCall.args['text'] ?? '');
  const isValid = probeData ? probeData.valid : toolCall.status === 'completed';
  const duration = toolCall.durationMs ?? probeData?.durationMs ?? 0;
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`rounded border text-[11px] font-mono overflow-hidden transition-all ${
        isValid
          ? 'border-neutral-800 bg-neutral-950/90'
          : 'border-rose-900/60 bg-rose-950/20'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/60 border-b border-neutral-800/80">
        <div className="flex items-center gap-2 truncate">
          <Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate">
            Probe: <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">{tacticText}</code>
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {duration}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isValid && (
            <button
              type="button"
              onClick={() => onApplyTactic(tacticText)}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-medium transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Apply this tactic
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-slate-400 hover:text-slate-200"
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {/* Side-by-side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
            {/* Left: Goals Before */}
            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
              <div className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[9px]">Goals Before</div>
              <pre className="text-slate-300 font-mono whitespace-pre-wrap">
                {probeData?.goalsBefore && probeData.goalsBefore.length > 0
                  ? probeData.goalsBefore.join('\n\n')
                  : '1 goal\n⊢ 1 + 1 = 2'}
              </pre>
            </div>

            {/* Right: Goals After */}
            <div
              className={`p-2 rounded border ${
                isValid
                  ? probeData?.goalsAfter && probeData.goalsAfter.length === 0
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-neutral-900/80 border-neutral-800 text-slate-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
              }`}
            >
              <div className="font-semibold mb-1 uppercase tracking-wider text-[9px] flex items-center justify-between">
                <span>Goals After</span>
                {isValid && probeData?.goalsAfter && probeData.goalsAfter.length === 0 && (
                  <span className="text-emerald-400 font-bold">Solved</span>
                )}
              </div>
              <pre className="font-mono whitespace-pre-wrap">
                {isValid
                  ? probeData?.goalsAfter && probeData.goalsAfter.length === 0
                    ? 'Goals closed by tactic 🎉'
                    : probeData?.goalsAfter?.join('\n\n') || 'Remaining goals'
                  : probeData?.errors && probeData.errors.length > 0
                  ? probeData.errors.join('\n')
                  : 'Tactic evaluation failed'}
              </pre>
            </div>
          </div>

          {!isValid && probeData?.errors && probeData.errors.length > 0 && (
            <div className="text-[10px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900/60">
              {probeData.errors.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffPreviewModal({
  messageId,
  onClose,
  onApply,
}: {
  messageId: string;
  onClose: () => void;
  onApply: () => void;
}): React.JSX.Element | null {
  const activeSession = chatStore.getActiveSession();
  const msg = activeSession?.messages.find((m) => m.id === messageId);
  const diff = msg?.proposedDiff;

  if (!diff) return null;

  const ext = diff.path.split('.').pop() ?? '';
  const lang = ext === 'lean' ? 'lean4' : ext === 'py' ? 'python' : 'text';

  return (
    <div
      role="dialog"
      aria-label="Inspect Proposed Code Diff"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-[#090d15] border border-neutral-700 rounded-lg w-full max-w-4xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between px-4 py-2.5 bg-[#06090e] border-b border-neutral-800 text-xs text-slate-200">
          <span className="font-mono font-semibold truncate">Diff: {diff.path}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0">
          <DiffViewer
            original={diff.originalContent}
            modified={diff.proposedContent}
            language={lang}
            originalTitle="Current File"
            modifiedTitle="Proposed Changes"
            onApplyModified={onApply}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
