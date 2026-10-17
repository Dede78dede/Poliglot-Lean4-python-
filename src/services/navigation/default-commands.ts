import type {
  CommandRegistration,
  KeybindingRegistration,
  MenuDescriptor,
  Disposable,
} from '../../types/navigation';
import { commandRegistry } from './command-registry';
import { keybindingResolver } from './keybinding-resolver';

export interface CommandActionHandlers {
  readonly onRun?: () => void;
  readonly onCheck?: () => void;
  readonly onSave?: () => void;
  readonly onNewProject?: () => void;
  readonly onOpenProject?: () => void;
  readonly onExportZip?: () => void;
  readonly onImportZip?: () => void;
  readonly onToggleExplorer?: () => void;
  readonly onToggleDrawer?: (tab?: string) => void;
  readonly onToggleInfoview?: () => void;
  readonly onOpenMemory?: () => void;
  readonly onOpenAutoFix?: () => void;
  readonly onOpenProofAutomation?: (tab?: string) => void;
  readonly onOpenBlueprint?: () => void;
  readonly onOpenDiscovery?: () => void;
  readonly onOpenProviders?: () => void;
  readonly onOpenCommandPalette?: () => void;
  readonly onOpenShortcuts?: () => void;
  readonly onOpenDoc?: () => void;
  readonly onFormat?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onFind?: () => void;
  readonly onReplace?: () => void;
  readonly onGotoLine?: () => void;
}

let activeHandlers: CommandActionHandlers = {};

export function setCommandActionHandlers(handlers: CommandActionHandlers): void {
  activeHandlers = { ...activeHandlers, ...handlers };
}

export const DEFAULT_COMMANDS: readonly CommandRegistration[] = [
  // 1. File (9)
  {
    id: 'file.newProject',
    title: 'New Project',
    category: 'File',
    description: 'Create a new formal verification or scientific project',
    keybinding: '$mod+n',
    handler: () => activeHandlers.onNewProject?.(),
  },
  {
    id: 'file.openProject',
    title: 'Open Project...',
    category: 'File',
    description: 'Open a project from local storage or cloud',
    keybinding: '$mod+o',
    handler: () => activeHandlers.onOpenProject?.(),
  },
  {
    id: 'file.save',
    title: 'Save File',
    category: 'File',
    description: 'Save current buffer to Tier 2 VFS and flush to storage',
    keybinding: '$mod+s',
    handler: () => activeHandlers.onSave?.(),
  },
  {
    id: 'file.saveAs',
    title: 'Save As...',
    category: 'File',
    description: 'Save file with a new name or path',
    keybinding: '$mod+Shift+s',
    handler: () => activeHandlers.onSave?.(),
  },
  {
    id: 'file.exportZip',
    title: 'Export Workspace ZIP',
    category: 'File',
    description: 'Package entire VFS workspace with checksums into ZIP archive',
    keybinding: 'Ctrl+Alt+e',
    handler: () => activeHandlers.onExportZip?.(),
  },
  {
    id: 'file.importZip',
    title: 'Import ZIP Archive',
    category: 'File',
    description: 'Decompress and import project archive with validation',
    keybinding: 'Ctrl+Alt+i',
    handler: () => activeHandlers.onImportZip?.(),
  },
  {
    id: 'file.importGithub',
    title: 'Import GitHub Repository',
    category: 'File',
    description: 'Clone and unpack a public GitHub repository into workspace',
    keybinding: 'Ctrl+Alt+g',
    handler: () => activeHandlers.onOpenDiscovery?.(),
  },
  {
    id: 'file.closeWorkspace',
    title: 'Close Workspace',
    category: 'File',
    description: 'Unmount current workspace and return to gallery',
    handler: () => activeHandlers.onNewProject?.(),
  },
  {
    id: 'file.recentProjects',
    title: 'Recent Projects',
    category: 'File',
    description: 'View and restore recent cached project snapshots',
    handler: () => activeHandlers.onOpenProject?.(),
  },

  // 2. Edit (11)
  {
    id: 'editor.undo',
    title: 'Undo',
    category: 'Edit',
    description: 'Undo last editing step',
    keybinding: '$mod+z',
    handler: () => activeHandlers.onUndo?.(),
  },
  {
    id: 'editor.redo',
    title: 'Redo',
    category: 'Edit',
    description: 'Redo last undone step',
    keybinding: '$mod+y',
    handler: () => activeHandlers.onRedo?.(),
  },
  {
    id: 'editor.find',
    title: 'Find in File',
    category: 'Edit',
    description: 'Search for text in active editor',
    keybinding: '$mod+f',
    handler: () => activeHandlers.onFind?.(),
  },
  {
    id: 'editor.replace',
    title: 'Find and Replace',
    category: 'Edit',
    description: 'Search and replace text in active editor',
    keybinding: '$mod+h',
    handler: () => activeHandlers.onReplace?.(),
  },
  {
    id: 'editor.format',
    title: 'Format Document',
    category: 'Edit',
    description: 'Format active buffer according to language standards',
    keybinding: 'Shift+Alt+f',
    handler: () => activeHandlers.onFormat?.(),
  },
  {
    id: 'editor.formatSelection',
    title: 'Format Selection',
    category: 'Edit',
    description: 'Format highlighted code region',
    keybinding: 'Control+k Control+f',
    when: 'editorHasSelection',
    handler: () => activeHandlers.onFormat?.(),
  },
  {
    id: 'editor.quickFix',
    title: 'Quick Fix / Code Action',
    category: 'Edit',
    description: 'Trigger deterministic auto-fix or Lean code action at cursor',
    keybinding: '$mod+.',
    handler: () => activeHandlers.onOpenAutoFix?.(),
  },
  {
    id: 'editor.fixAllInFile',
    title: 'Fix All Diagnostic Errors in File',
    category: 'Edit',
    description: 'Apply deterministic L1 auto-fixes across whole document',
    keybinding: '$mod+Shift+.',
    handler: () => activeHandlers.onOpenAutoFix?.(),
  },
  {
    id: 'editor.gotoLine',
    title: 'Go to Line / Column',
    category: 'Edit',
    description: 'Navigate to target line number',
    keybinding: 'Control+g',
    handler: () => activeHandlers.onGotoLine?.(),
  },
  {
    id: 'editor.gotoDefinition',
    title: 'Go to Definition',
    category: 'Edit',
    description: 'Jump to identifier declaration',
    keybinding: 'F12',
    handler: () => activeHandlers.onGotoLine?.(),
  },
  {
    id: 'editor.findReferences',
    title: 'Find All References',
    category: 'Edit',
    description: 'Locate all usages of identifier across workspace',
    keybinding: 'Shift+F12',
    handler: () => activeHandlers.onFind?.(),
  },

  // 3. View (7)
  {
    id: 'view.toggleExplorer',
    title: 'Toggle File Explorer',
    category: 'View',
    description: 'Show or hide workspace file tree panel',
    keybinding: '$mod+b',
    handler: () => activeHandlers.onToggleExplorer?.(),
  },
  {
    id: 'view.toggleDrawer',
    title: 'Toggle Auxiliary Drawer',
    category: 'View',
    description: 'Expand or collapse the right-hand inspection drawer',
    keybinding: '$mod+j',
    handler: () => activeHandlers.onToggleDrawer?.(),
  },
  {
    id: 'view.toggleInfoview',
    title: 'Toggle Lean Infoview',
    category: 'View',
    description: 'Display formal proof goals and tactic states',
    keybinding: '$mod+i',
    handler: () => activeHandlers.onToggleInfoview?.(),
  },
  {
    id: 'view.toggleOutput',
    title: 'Toggle Output Terminal',
    category: 'View',
    description: 'Show execution outputs, compiler logs, and diagnostics',
    keybinding: '$mod+u',
    handler: () => activeHandlers.onToggleDrawer?.('output'),
  },
  {
    id: 'view.toggleStatusBar',
    title: 'Toggle Status Bar',
    category: 'View',
    description: 'Show or hide IDE telemetry bar',
    keybinding: 'Ctrl+Alt+b',
    handler: () => activeHandlers.onToggleDrawer?.(),
  },
  {
    id: 'view.zenMode',
    title: 'Toggle Zen Mode',
    category: 'View',
    description: 'Full-screen distraction free editor mode',
    keybinding: 'Control+k z',
    handler: () => activeHandlers.onToggleExplorer?.(),
  },
  {
    id: 'view.resetLayout',
    title: 'Reset Workbench Layout',
    category: 'View',
    description: 'Restore default IDE pane splits and drawer widths',
    keybinding: 'Ctrl+Alt+r',
    handler: () => activeHandlers.onToggleDrawer?.(),
  },

  // 4. Runtime (5)
  {
    id: 'runtime.run',
    title: 'Run / Verify Code',
    category: 'Runtime',
    description: 'Execute Python script or verify Lean 4 proof in active runtime',
    keybinding: '$mod+Enter',
    handler: () => activeHandlers.onRun?.(),
  },
  {
    id: 'runtime.check',
    title: 'Typecheck & Lint Active Buffer',
    category: 'Runtime',
    description: 'Perform dry-run compiler check without full evaluation',
    keybinding: '$mod+Shift+Enter',
    handler: () => activeHandlers.onCheck?.(),
  },
  {
    id: 'runtime.configurePyodide',
    title: 'Configure Pyodide WASM Runtime',
    category: 'Runtime',
    description: 'Manage Pyodide packages, micropip wheels, and memory limits',
    handler: () => activeHandlers.onOpenDiscovery?.(),
  },
  {
    id: 'runtime.configureLean',
    title: 'Configure Lean Kernel Server',
    category: 'Runtime',
    description: 'Configure Kimina, Pantograph RPC socket, and timeout ceilings',
    handler: () => activeHandlers.onOpenProofAutomation?.(),
  },
  {
    id: 'runtime.selectToolchain',
    title: 'Select Lean Toolchain',
    category: 'Runtime',
    description: 'Switch active toolchain (v4.28.0, v4.31.0, v4.33.1, v4.35.0-rc4)',
    handler: () => activeHandlers.onOpenProofAutomation?.(),
  },

  // 5. Proof (12)
  {
    id: 'proof.autoprove',
    title: 'Run Automated Prover (Duper / Pantograph)',
    category: 'Proof',
    description: 'Execute tiered proof search fallback chain to close current goal',
    keybinding: '$mod+Shift+a',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('auto-prove'),
  },
  {
    id: 'proof.search',
    title: 'Search Proof Space (Pantograph)',
    category: 'Proof',
    description: 'Interactive tree search with premise selection and premise advice',
    keybinding: '$mod+Shift+s',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('auto-prove'),
  },
  {
    id: 'proof.duper',
    title: 'Prove with Duper (Superposition Engine)',
    category: 'Proof',
    description: 'Invoke first-order superposition prover behind ENABLE_DUPER guard',
    keybinding: 'Ctrl+Alt+d',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('auto-prove'),
  },
  {
    id: 'proof.disprove',
    title: 'AXLE Disprove: Search Counterexamples',
    category: 'Proof',
    description: 'Search for theorem counterexamples or generate refutation proof',
    keybinding: 'Ctrl+Alt+x',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('axle-cloud'),
  },
  {
    id: 'proof.simplify',
    title: 'AXLE Simplify: Compress Proof Script',
    category: 'Proof',
    description: 'Synthesize minimal verified proof script preserving semantics',
    keybinding: 'Ctrl+Alt+s',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('axle-cloud'),
  },
  {
    id: 'proof.extractStates',
    title: 'AXLE Extract Intermediate Proof States',
    category: 'Proof',
    description: 'Extract fine-grained step-by-step proof graph with hypotheses',
    keybinding: 'Ctrl+Alt+p',
    when: "editorLangId == 'lean4'",
    handler: () => activeHandlers.onOpenProofAutomation?.('axle-cloud'),
  },
  {
    id: 'proof.syncBlueprint',
    title: 'Synchronize Blueprint with Code',
    category: 'Proof',
    description: 'Detect drift between Lean definitions and blueprint graph nodes',
    keybinding: 'Ctrl+Shift+b',
    handler: () => activeHandlers.onOpenProofAutomation?.('blueprint-sync'),
  },
  {
    id: 'proof.openBlueprint',
    title: 'Open Blueprint DAG Workspace',
    category: 'Proof',
    description: 'Interactive theorem dependency graph and atomic claim visualizer',
    keybinding: '$mod+Shift+o',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'proof.freezeNode',
    title: 'Blueprint: Freeze Node',
    category: 'Proof',
    description: 'Lock verified theorem node against modifications',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'proof.unfreezeNode',
    title: 'Blueprint: Unfreeze Node',
    category: 'Proof',
    description: 'Unlock node for edits with ledger milestone entry',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'proof.claimNode',
    title: 'Blueprint: Claim Node for Proof',
    category: 'Proof',
    description: 'Acquire exclusive proof lease on blueprint node with TTL',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'proof.configurePantograph',
    title: 'Pantograph Goal Server Settings',
    category: 'Proof',
    description: 'Inspect connection parameters and tactic timeout bounds',
    handler: () => activeHandlers.onOpenProofAutomation?.(),
  },

  // 6. Tools (9)
  {
    id: 'tools.commandPalette',
    title: 'Command Palette',
    category: 'Tools',
    description: 'Search and trigger all workbench commands and shortcuts',
    keybinding: '$mod+k',
    handler: () => activeHandlers.onOpenCommandPalette?.(),
  },
  {
    id: 'tools.discovery',
    title: 'Package & Project Discovery',
    category: 'Tools',
    description: 'Search open source Lean libraries and PyPI WASM wheels',
    keybinding: 'Ctrl+Shift+d',
    handler: () => activeHandlers.onOpenDiscovery?.(),
  },
  {
    id: 'tools.memory',
    title: '5-Tier Memory & Storage Manager',
    category: 'Tools',
    description: 'Inspect AST cache, dirty buffers, OPFS, and cold snapshots',
    keybinding: 'Ctrl+Shift+m',
    handler: () => activeHandlers.onOpenMemory?.(),
  },
  {
    id: 'tools.autocorrect',
    title: '5-Level Auto-Correction System',
    category: 'Tools',
    description: 'Deterministic linter, Lean LSP actions, and CAS oracle fixes',
    keybinding: 'Ctrl+Shift+f',
    handler: () => activeHandlers.onOpenAutoFix?.(),
  },
  {
    id: 'tools.cloudSync',
    title: 'Cloud State Synchronization',
    category: 'Tools',
    description: 'Reconcile local VFS snapshot with remote server ledger',
    keybinding: 'Ctrl+Shift+u',
    handler: () => activeHandlers.onSave?.(),
  },
  {
    id: 'tools.llmProviders',
    title: 'AI & Prover Providers',
    category: 'Tools',
    description: 'Manage 7 free-tier providers, local Leanstral, and AXLE',
    keybinding: 'Ctrl+Alt+l',
    handler: () => activeHandlers.onOpenProviders?.(),
  },
  {
    id: 'tools.preferences',
    title: 'Workbench Preferences',
    category: 'Tools',
    description: 'Configure editor font, keybindings, and theme settings',
    keybinding: '$mod+,',
    handler: () => activeHandlers.onOpenShortcuts?.(),
  },
  {
    id: 'tools.vault',
    title: 'Credential & Key Vault',
    category: 'Tools',
    description: 'Inspect stored API provider credentials and tokens',
    keybinding: 'Ctrl+Shift+v',
    handler: () => activeHandlers.onOpenProviders?.(),
  },
  {
    id: 'tools.gallery',
    title: 'Project Templates Gallery',
    category: 'Tools',
    description: 'Browse formal verification blueprints and scientific examples',
    keybinding: 'Ctrl+Shift+g',
    handler: () => activeHandlers.onOpenDiscovery?.(),
  },

  // 7. Collaboration (4)
  {
    id: 'collab.invite',
    title: 'Invite Collaborator',
    category: 'Collaboration',
    description: 'Generate real-time workspace link with role permissions',
    keybinding: 'Ctrl+Alt+c',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'collab.ledger',
    title: 'Inspect Collaboration Ledger',
    category: 'Collaboration',
    description: 'View cryptographic SHA-256 event chain and milestone logs',
    keybinding: 'Control+Alt+l',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'collab.presence',
    title: 'Collaborator Presence & Cursors',
    category: 'Collaboration',
    description: 'List connected mathematicians and active claimed nodes',
    keybinding: 'Control+Alt+p',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },
  {
    id: 'collab.shareWorkspace',
    title: 'Share Active Workspace State',
    category: 'Collaboration',
    description: 'Broadcast active workspace state to WebSocket relay',
    keybinding: 'Control+Alt+s',
    handler: () => activeHandlers.onOpenBlueprint?.(),
  },

  // 8. Help (5)
  {
    id: 'help.documentation',
    title: 'Documentation & Guides',
    category: 'Help',
    description: 'Open formal verification tutorial and API documentation',
    keybinding: 'F1',
    handler: () => activeHandlers.onOpenDoc?.(),
  },
  {
    id: 'help.shortcuts',
    title: 'Keyboard Shortcuts Reference',
    category: 'Help',
    description: 'View complete keybindings and chord sequences',
    keybinding: 'Control+k Control+s',
    handler: () => activeHandlers.onOpenShortcuts?.(),
  },
  {
    id: 'help.reportIssue',
    title: 'Report Bug / Verification Drift',
    category: 'Help',
    description: 'Export diagnostic report and open GitHub issue',
    handler: () => activeHandlers.onOpenDoc?.(),
  },
  {
    id: 'help.about',
    title: 'About Polyglot Code Studio',
    category: 'Help',
    description: 'Version, toolchain licenses, and formal verification engine credits',
    handler: () => activeHandlers.onOpenDoc?.(),
  },
  {
    id: 'help.checkUpdates',
    title: 'Check for Updates',
    category: 'Help',
    description: 'Verify latest toolchain versions and package releases',
    handler: () => activeHandlers.onOpenDoc?.(),
  },
];

export const DEFAULT_KEYBINDINGS: readonly KeybindingRegistration[] = [
  // Primary Command Palette triggers (Correction C1)
  { commandId: 'tools.commandPalette', key: '$mod+k' },
  { commandId: 'tools.commandPalette', key: 'Control+Shift+P' },
  { commandId: 'tools.commandPalette', key: '$mod+Shift+p' },
  { commandId: 'tools.commandPalette', key: 'F1' },

  // File
  { commandId: 'file.newProject', key: '$mod+n' },
  { commandId: 'file.openProject', key: '$mod+o' },
  { commandId: 'file.save', key: '$mod+s' },
  { commandId: 'file.saveAs', key: '$mod+Shift+s' },
  { commandId: 'file.exportZip', key: 'Control+Alt+e' },
  { commandId: 'file.importZip', key: 'Control+Alt+i' },
  { commandId: 'file.importGithub', key: 'Control+Alt+g' },

  // Edit
  { commandId: 'editor.undo', key: '$mod+z' },
  { commandId: 'editor.redo', key: '$mod+y' },
  { commandId: 'editor.find', key: '$mod+f' },
  { commandId: 'editor.replace', key: '$mod+h' },
  { commandId: 'editor.format', key: 'Shift+Alt+f' },
  { commandId: 'editor.formatSelection', key: 'Control+k Control+f', when: 'editorHasSelection' },
  { commandId: 'editor.quickFix', key: '$mod+.' },
  { commandId: 'editor.fixAllInFile', key: '$mod+Shift+.' },
  { commandId: 'editor.gotoLine', key: 'Control+g' },
  { commandId: 'editor.gotoDefinition', key: 'F12' },
  { commandId: 'editor.findReferences', key: 'Shift+F12' },

  // View
  { commandId: 'view.toggleExplorer', key: '$mod+b' },
  { commandId: 'view.toggleDrawer', key: '$mod+j' },
  { commandId: 'view.toggleInfoview', key: '$mod+i' },
  { commandId: 'view.toggleOutput', key: '$mod+u' },
  { commandId: 'view.toggleStatusBar', key: 'Control+Alt+b' },
  { commandId: 'view.zenMode', key: 'Control+k z' },
  { commandId: 'view.resetLayout', key: 'Control+Alt+r' },

  // Runtime
  { commandId: 'runtime.run', key: '$mod+Enter' },
  { commandId: 'runtime.run', key: 'Control+Enter' },
  { commandId: 'runtime.check', key: '$mod+Shift+Enter' },

  // Proof
  { commandId: 'proof.autoprove', key: '$mod+Shift+a', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.search', key: '$mod+Shift+s', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.duper', key: 'Control+Alt+d', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.disprove', key: 'Control+Alt+x', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.simplify', key: 'Control+Alt+s', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.extractStates', key: 'Control+Alt+p', when: "editorLangId == 'lean4'" },
  { commandId: 'proof.syncBlueprint', key: 'Control+Shift+b' },
  { commandId: 'proof.openBlueprint', key: '$mod+Shift+o' },

  // Tools
  { commandId: 'tools.discovery', key: 'Control+Shift+d' },
  { commandId: 'tools.memory', key: 'Control+Shift+m' },
  { commandId: 'tools.autocorrect', key: 'Control+Shift+f' },
  { commandId: 'tools.cloudSync', key: 'Control+Shift+u' },
  { commandId: 'tools.llmProviders', key: 'Control+Alt+l' },
  { commandId: 'tools.preferences', key: '$mod+,' },
  { commandId: 'tools.vault', key: 'Control+Shift+v' },
  { commandId: 'tools.gallery', key: 'Control+Shift+g' },

  // Collab
  { commandId: 'collab.invite', key: 'Control+Alt+c' },

  // Help
  { commandId: 'help.shortcuts', key: 'Control+k Control+s' },
];

export const DEFAULT_MENUS: readonly MenuDescriptor[] = [
  {
    id: 'menu.file',
    label: 'File',
    items: [
      { id: 'f-new', label: 'New Project', commandId: 'file.newProject', keybinding: 'Ctrl+N' },
      { id: 'f-open', label: 'Open Project...', commandId: 'file.openProject', keybinding: 'Ctrl+O' },
      { id: 'f-sep1', label: '', separator: true },
      { id: 'f-save', label: 'Save', commandId: 'file.save', keybinding: 'Ctrl+S' },
      { id: 'f-saveas', label: 'Save As...', commandId: 'file.saveAs', keybinding: 'Ctrl+Shift+S' },
      { id: 'f-sep2', label: '', separator: true },
      { id: 'f-export', label: 'Export ZIP Archive', commandId: 'file.exportZip', keybinding: 'Ctrl+Alt+E' },
      { id: 'f-import-zip', label: 'Import ZIP...', commandId: 'file.importZip', keybinding: 'Ctrl+Alt+I' },
      { id: 'f-import-gh', label: 'Import from GitHub...', commandId: 'file.importGithub', keybinding: 'Ctrl+Alt+G' },
      { id: 'f-sep3', label: '', separator: true },
      { id: 'f-recent', label: 'Recent Projects', commandId: 'file.recentProjects' },
      { id: 'f-close', label: 'Close Workspace', commandId: 'file.closeWorkspace' },
    ],
  },
  {
    id: 'menu.edit',
    label: 'Edit',
    items: [
      { id: 'e-undo', label: 'Undo', commandId: 'editor.undo', keybinding: 'Ctrl+Z' },
      { id: 'e-redo', label: 'Redo', commandId: 'editor.redo', keybinding: 'Ctrl+Y' },
      { id: 'e-sep1', label: '', separator: true },
      { id: 'e-find', label: 'Find', commandId: 'editor.find', keybinding: 'Ctrl+F' },
      { id: 'e-replace', label: 'Replace', commandId: 'editor.replace', keybinding: 'Ctrl+H' },
      { id: 'e-sep2', label: '', separator: true },
      { id: 'e-format', label: 'Format Document', commandId: 'editor.format', keybinding: 'Shift+Alt+F' },
      { id: 'e-format-sel', label: 'Format Selection', commandId: 'editor.formatSelection', keybinding: 'Ctrl+K Ctrl+F', when: 'editorHasSelection' },
      { id: 'e-sep3', label: '', separator: true },
      { id: 'e-quickfix', label: 'Quick Fix...', commandId: 'editor.quickFix', keybinding: 'Ctrl+.' },
      { id: 'e-fixall', label: 'Fix All Diagnostic Errors in File', commandId: 'editor.fixAllInFile', keybinding: 'Ctrl+Shift+.' },
      { id: 'e-goto', label: 'Go to Line...', commandId: 'editor.gotoLine', keybinding: 'Ctrl+G' },
    ],
  },
  {
    id: 'menu.view',
    label: 'View',
    items: [
      { id: 'v-explorer', label: 'Explorer', commandId: 'view.toggleExplorer', keybinding: 'Ctrl+B' },
      { id: 'v-drawer', label: 'Auxiliary Drawer', commandId: 'view.toggleDrawer', keybinding: 'Ctrl+J' },
      { id: 'v-infoview', label: 'Lean Infoview', commandId: 'view.toggleInfoview', keybinding: 'Ctrl+I' },
      { id: 'v-output', label: 'Output Terminal', commandId: 'view.toggleOutput', keybinding: 'Ctrl+U' },
      { id: 'v-sep1', label: '', separator: true },
      { id: 'v-palette', label: 'Command Palette...', commandId: 'tools.commandPalette', keybinding: 'Ctrl+K' },
      { id: 'v-zen', label: 'Zen Mode', commandId: 'view.zenMode', keybinding: 'Ctrl+K Z' },
      { id: 'v-reset', label: 'Reset Layout', commandId: 'view.resetLayout', keybinding: 'Ctrl+Alt+R' },
    ],
  },
  {
    id: 'menu.runtime',
    label: 'Runtime',
    items: [
      { id: 'r-run', label: 'Run / Verify', commandId: 'runtime.run', keybinding: 'Ctrl+Enter' },
      { id: 'r-check', label: 'Typecheck & Lint', commandId: 'runtime.check', keybinding: 'Ctrl+Shift+Enter' },
      { id: 'r-sep1', label: '', separator: true },
      { id: 'r-pyodide', label: 'Pyodide WASM Engine...', commandId: 'runtime.configurePyodide' },
      { id: 'r-lean', label: 'Lean 4 Kernel Server...', commandId: 'runtime.configureLean' },
      { id: 'r-toolchain', label: 'Select Lean Toolchain...', commandId: 'runtime.selectToolchain' },
    ],
  },
  {
    id: 'menu.proof',
    label: 'Proof',
    items: [
      { id: 'p-autoprove', label: 'Auto-Prove Goal (Duper / Pantograph)', commandId: 'proof.autoprove', keybinding: 'Ctrl+Shift+A', when: "editorLangId == 'lean4'" },
      { id: 'p-search', label: 'Pantograph Goal Search', commandId: 'proof.search', keybinding: 'Ctrl+Shift+S', when: "editorLangId == 'lean4'" },
      { id: 'p-duper', label: 'Duper Superposition Prover', commandId: 'proof.duper', keybinding: 'Ctrl+Alt+D', when: "editorLangId == 'lean4'" },
      { id: 'p-sep1', label: '', separator: true },
      { id: 'p-disprove', label: 'AXLE Disprove (Counterexample)', commandId: 'proof.disprove', keybinding: 'Ctrl+Alt+X', when: "editorLangId == 'lean4'" },
      { id: 'p-simplify', label: 'AXLE Proof Simplification', commandId: 'proof.simplify', keybinding: 'Ctrl+Alt+S', when: "editorLangId == 'lean4'" },
      { id: 'p-states', label: 'AXLE Extract Proof States', commandId: 'proof.extractStates', keybinding: 'Ctrl+Alt+P', when: "editorLangId == 'lean4'" },
      { id: 'p-sep2', label: '', separator: true },
      { id: 'p-blueprint', label: 'Blueprint Workspace DAG', commandId: 'proof.openBlueprint', keybinding: 'Ctrl+Shift+O' },
      { id: 'p-sync', label: 'Sync Blueprint with Code', commandId: 'proof.syncBlueprint', keybinding: 'Ctrl+Shift+B' },
      { id: 'p-claim', label: 'Claim Theorem Node', commandId: 'proof.claimNode' },
      { id: 'p-freeze', label: 'Freeze Verified Node', commandId: 'proof.freezeNode' },
    ],
  },
  {
    id: 'menu.tools',
    label: 'Tools',
    items: [
      { id: 't-palette', label: 'Command Palette...', commandId: 'tools.commandPalette', keybinding: 'Ctrl+K' },
      { id: 't-discovery', label: 'Open Source Discovery...', commandId: 'tools.discovery', keybinding: 'Ctrl+Shift+D' },
      { id: 't-memory', label: '5-Tier Memory Drawer', commandId: 'tools.memory', keybinding: 'Ctrl+Shift+M' },
      { id: 't-autocorrect', label: '5-Level Auto-Correction', commandId: 'tools.autocorrect', keybinding: 'Ctrl+Shift+F' },
      { id: 't-sep1', label: '', separator: true },
      { id: 't-llm', label: 'AI & Prover Routing...', commandId: 'tools.llmProviders', keybinding: 'Ctrl+Alt+L' },
      { id: 't-vault', label: 'Credential & Key Vault', commandId: 'tools.vault', keybinding: 'Ctrl+Shift+V' },
      { id: 't-cloud', label: 'Cloud State Sync', commandId: 'tools.cloudSync', keybinding: 'Ctrl+Shift+U' },
      { id: 't-gallery', label: 'Templates Gallery', commandId: 'tools.gallery', keybinding: 'Ctrl+Shift+G' },
    ],
  },
  {
    id: 'menu.collab',
    label: 'Collab',
    items: [
      { id: 'c-invite', label: 'Invite Collaborator...', commandId: 'collab.invite', keybinding: 'Ctrl+Alt+C' },
      { id: 'c-presence', label: 'Collaborator Presence', commandId: 'collab.presence', keybinding: 'Ctrl+Alt+P' },
      { id: 'c-sep1', label: '', separator: true },
      { id: 'c-ledger', label: 'Inspect Shared Ledger', commandId: 'collab.ledger', keybinding: 'Ctrl+Alt+L' },
      { id: 'c-share', label: 'Broadcast Workspace State', commandId: 'collab.shareWorkspace', keybinding: 'Ctrl+Alt+S' },
    ],
  },
  {
    id: 'menu.help',
    label: 'Help',
    items: [
      { id: 'h-doc', label: 'Documentation & Guides', commandId: 'help.documentation', keybinding: 'F1' },
      { id: 'h-shortcuts', label: 'Keyboard Shortcuts', commandId: 'help.shortcuts', keybinding: 'Ctrl+K Ctrl+S' },
      { id: 'h-sep1', label: '', separator: true },
      { id: 'h-report', label: 'Report Issue...', commandId: 'help.reportIssue' },
      { id: 'h-updates', label: 'Check for Updates', commandId: 'help.checkUpdates' },
      { id: 'h-about', label: 'About Polyglot Code Studio', commandId: 'help.about' },
    ],
  },
];

export function registerDefaultCommands(): Disposable {
  const cmdDisposables = commandRegistry.registerCommands(DEFAULT_COMMANDS);
  const kbDisposables = keybindingResolver.registerKeybindings(DEFAULT_KEYBINDINGS);

  return {
    dispose: () => {
      cmdDisposables.dispose();
      kbDisposables.dispose();
    },
  };
}
