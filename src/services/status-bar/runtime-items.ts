import { statusBarRegistry } from './status-bar-registry';
import { FEATURE_FLAGS } from '../flags/feature-flag-registry';

export function initializeDefaultStatusBarItems(): void {
  // If default items are already registered, avoid resetting to prevent store notification cascades
  if (statusBarRegistry.getItem('kimina-ready')) {
    return;
  }
  statusBarRegistry.reset();

  const flagCount = Object.keys(FEATURE_FLAGS).length;

  // ==========================================
  // Left Zone: Toolchain, Runtime & Health
  // ==========================================
  statusBarRegistry.add({
    id: 'system-readiness',
    text: '● System Ready',
    tooltip: 'Aggregate readiness: 9 containers monitored (/readyz)',
    alignment: 'left',
    priority: 110,
    commandId: 'tools.systemHealth',
    color: '#10b981',
  });

  statusBarRegistry.add({
    id: 'kimina-ready',
    text: 'Lean 4.35 (Aligned)',
    tooltip: 'Lean 4 toolchain: v4.35.0-rc4 (Kernel verified)',
    alignment: 'left',
    priority: 100,
    commandId: 'runtime.selectToolchain',
    color: '#06b6d4',
  });

  statusBarRegistry.add({
    id: 'pyodide-ready',
    text: 'Pyodide 3.14 (WASM)',
    tooltip: 'Python runtime: Pyodide v0.27 (NumPy ready)',
    alignment: 'left',
    priority: 90,
    commandId: 'runtime.configurePyodide',
  });

  statusBarRegistry.add({
    id: 'git-branch',
    text: 'main · 1 workspace',
    tooltip: 'Active Virtual File System branch and workspace',
    alignment: 'left',
    priority: 80,
    commandId: 'tools.discovery',
  });

  statusBarRegistry.add({
    id: 'correlation-id',
    text: 'trace: ready',
    tooltip: 'Request trace correlation ID',
    alignment: 'left',
    priority: 65,
  });

  statusBarRegistry.add({
    id: 'session-pinned',
    text: 'Pinned',
    tooltip: 'Session exempt from 72h TTL automatic cold storage eviction',
    alignment: 'left',
    priority: 50,
    visible: false,
  });

  // ==========================================
  // Center Zone: Document Specs & Proof Status
  // ==========================================
  statusBarRegistry.add({
    id: 'doc-language',
    text: 'Lean 4',
    tooltip: 'Active file language mode',
    alignment: 'center',
    priority: 70,
  });

  statusBarRegistry.add({
    id: 'doc-encoding',
    text: 'UTF-8',
    tooltip: 'File character encoding',
    alignment: 'center',
    priority: 65,
  });

  statusBarRegistry.add({
    id: 'doc-eol',
    text: 'LF',
    tooltip: 'Line sequence ending (UNIX)',
    alignment: 'center',
    priority: 60,
  });

  statusBarRegistry.add({
    id: 'doc-indent',
    text: 'Spaces: 2',
    tooltip: 'Indentation style and width',
    alignment: 'center',
    priority: 55,
  });

  statusBarRegistry.add({
    id: 'proof-progress',
    text: '0 Open Goals',
    tooltip: 'Formal verification goal tracker',
    alignment: 'center',
    priority: 50,
    commandId: 'proof.autoprove',
    color: '#10b981',
  });

  // ==========================================
  // Right Zone: Telemetry, Memory, Flags & Diagnostics
  // ==========================================
  statusBarRegistry.add({
    id: 'problems-count',
    text: '0 Errors, 0 Warnings',
    tooltip: 'Language diagnostics and linter problems',
    alignment: 'right',
    priority: 110,
    color: '#10b981',
  });

  statusBarRegistry.add({
    id: 'cursor-position',
    text: 'Ln 1, Col 1',
    tooltip: 'Cursor line and column',
    alignment: 'right',
    priority: 100,
  });

  statusBarRegistry.add({
    id: 'collaborators',
    text: '1 Collaborator',
    tooltip: 'Connected via WebSocket relay (/ws/collaboration)',
    alignment: 'right',
    priority: 90,
    commandId: 'proof.openBlueprint',
  });

  statusBarRegistry.add({
    id: 'memory-status',
    text: 'L1 RAM · L5 Cold',
    tooltip: '5-Tier Memory Architecture Status (L1-L5 active)',
    alignment: 'right',
    priority: 85,
    commandId: 'tools.memory',
  });

  const defaultProviderText =
    typeof process !== 'undefined' && process.env?.['LEANSTRAL_ENDPOINT']
      ? 'Leanstral 1.5 (MoE)'
      : 'Pantograph (Local)';

  statusBarRegistry.add({
    id: 'llm-provider',
    text: defaultProviderText,
    tooltip: 'Active AI / Prover Provider (Leanstral 1.5 default when endpoint configured)',
    alignment: 'right',
    priority: 80,
    commandId: 'tools.llmProviders',
  });

  statusBarRegistry.add({
    id: 'mcp-status',
    text: 'MCP: Lean LSP (Stdio)',
    tooltip: 'Native Lean LSP Model Context Protocol client (26 tools matrix)',
    alignment: 'right',
    priority: 75,
    commandId: 'tools.mcpTools',
    color: '#06b6d4',
  });

  statusBarRegistry.add({
    id: 'feature-flags-count',
    text: `${flagCount} Flags`,
    tooltip: `Active feature flags registered (${flagCount} flags)`,
    alignment: 'right',
    priority: 70,
    commandId: 'tools.featureFlags',
  });

  statusBarRegistry.add({
    id: 'toolchain-policy',
    text: 'v4.35 Aligned',
    tooltip: 'Lean toolchain compliance policy',
    alignment: 'right',
    priority: 60,
  });
}
