/**
 * Phase 9.1: Navigation Foundation & Command Architecture Types
 * Governs Context Key Service, When-Clause Parser, Command Registry,
 * Keybinding Resolver, Menu Bar, Command Palette, and Status Bar.
 */

export const COMMAND_CATEGORIES = [
  'File',
  'Edit',
  'View',
  'Runtime',
  'Proof',
  'Tools',
  'Collaboration',
  'Help',
] as const;
export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

export const CONTEXT_KEYS = [
  // Editor focus & cursor (4)
  'editorFocus',
  'editorReadonly',
  'editorHasSelection',
  'editorLangId',
  // Language & toolchain (3)
  'leanFile',
  'pythonFile',
  'leanToolchainMismatch',
  // Proof context (3)
  'hasOpenGoal',
  'hasActiveProof',
  'proofSearchRunning',
  // Drawer / pane visibility & focus (5)
  'drawerOpen',
  'drawerTab',
  'fileExplorerFocus',
  'infoviewFocus',
  'outputFocus',
  // Workspace & session (3)
  'workspaceExists',
  'hasUnsavedChanges',
  'sessionPinned',
  // Collaboration (3)
  'collaborationActive',
  'collaborationRole',
  'presenceCount',
  // AI & Providers (2)
  'llmProviderConfigured',
  'aiConsentGiven',
  // Runtime engines (3)
  'pyodideReady',
  'kiminaReady',
  'pantographReady',
  // UI Meta (2)
  'commandPaletteOpen',
  'menuBarActive',
] as const;
export type ContextKey = (typeof CONTEXT_KEYS)[number];

export type ContextValue = string | number | boolean | readonly string[] | undefined;

export type ContextSnapshot = Readonly<Record<ContextKey, ContextValue>>;

export interface Disposable {
  dispose(): void;
}

// When-Clause AST Types
export type WhenUnaryOperator = '!';
export type WhenBinaryOperator =
  | '&&'
  | '||'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '=~'
  | 'in'
  | 'not in';

export interface WhenIdentifierNode {
  readonly type: 'identifier';
  readonly name: string;
}

export interface WhenLiteralNode {
  readonly type: 'literal';
  readonly value: ContextValue;
}

export interface WhenUnaryNode {
  readonly type: 'unary';
  readonly operator: WhenUnaryOperator;
  readonly operand: WhenASTNode;
}

export interface WhenBinaryNode {
  readonly type: 'binary';
  readonly operator: WhenBinaryOperator;
  readonly left: WhenASTNode;
  readonly right: WhenASTNode;
}

export interface WhenGroupNode {
  readonly type: 'group';
  readonly expression: WhenASTNode;
}

export type WhenASTNode =
  | WhenIdentifierNode
  | WhenLiteralNode
  | WhenUnaryNode
  | WhenBinaryNode
  | WhenGroupNode;

// Command & Keybinding Types
export interface CommandRegistration {
  readonly id: string;
  readonly title: string;
  readonly category: CommandCategory;
  readonly handler: (...args: readonly any[]) => any;
  readonly description?: string;
  readonly when?: string;
  readonly icon?: string;
  readonly keybinding?: string;
  readonly precondition?: string;
}

export interface KeybindingRegistration {
  readonly commandId: string;
  readonly key: string; // tinykeys format e.g. "$mod+k", "ctrl+k ctrl+s"
  readonly when?: string;
  readonly mac?: string;
  readonly weight?: number;
}

// Menu Bar Types
export interface MenuItemDescriptor {
  readonly id: string;
  readonly label: string;
  readonly commandId?: string;
  readonly keybinding?: string;
  readonly when?: string;
  readonly checked?: boolean | string;
  readonly disabled?: boolean | string;
  readonly submenu?: readonly MenuItemDescriptor[];
  readonly separator?: boolean;
}

export interface MenuDescriptor {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuItemDescriptor[];
}

// Status Bar Types
export type StatusBarItemAlignment = 'left' | 'center' | 'right';

export interface StatusBarItemDescriptor {
  readonly id: string;
  readonly text: string;
  readonly tooltip?: string;
  readonly alignment: StatusBarItemAlignment;
  readonly priority: number;
  readonly commandId?: string;
  readonly icon?: string;
  readonly visible?: boolean;
  readonly color?: string;
}
