import { statusBarRegistry } from './status-bar-registry';

export function initializeDefaultStatusBarItems(): void {
  // Clear any existing
  statusBarRegistry.reset();

  // 1. Toolchain & Runtime (Left)
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
    id: 'session-pinned',
    text: 'Pinned',
    tooltip: 'Session exempt from 72h TTL automatic cold storage eviction',
    alignment: 'left',
    priority: 70,
    visible: false,
  });

  // 2. Proof Status (Center)
  statusBarRegistry.add({
    id: 'proof-progress',
    text: '0 Open Goals',
    tooltip: 'Formal verification goal tracker',
    alignment: 'center',
    priority: 50,
    commandId: 'proof.autoprove',
    color: '#10b981',
  });

  // 3. Telemetry & User Coordinates (Right)
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
    id: 'llm-provider',
    text: 'Pantograph (Local)',
    tooltip: 'Active AI/Prover Provider',
    alignment: 'right',
    priority: 80,
    commandId: 'tools.llmProviders',
  });
}
