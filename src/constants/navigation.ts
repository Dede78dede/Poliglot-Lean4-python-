/**
 * Navigation, View, and System Constants
 * Eliminates magic strings across view selection, routing, languages, and shortcuts.
 */

export const VIEWS = {
  EDITOR: 'editor',
  NOTEBOOK: 'notebook',
  FEMEV: 'femev',
  LEDGER: 'ledger',
  SHOWCASE: 'showcase',
  SETTINGS: 'settings',
} as const;

export type ActiveView = (typeof VIEWS)[keyof typeof VIEWS];

export const ROUTES = {
  HOME: '/',
  NOTEBOOK: '/notebook',
  FEMEV: '/femev',
  LEDGER: '/ledger',
  SHOWCASE: '/showcase',
  SETTINGS: '/settings',
} as const;

export const LANGUAGES = {
  LEAN4: 'lean4',
  PYTHON: 'python',
} as const;

export type SupportedLanguage = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const DEFAULT_FILE_NAMES = {
  LEAN_MAIN: 'Main.lean',
  PYTHON_SCRATCH: 'scratchpad.py',
} as const;

export const EXECUTION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const PROOF_STATUS = {
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  FAILED: 'failed',
} as const;

export const KEYBOARD_SHORTCUTS = {
  VERIFY: 'Ctrl+Enter',
  COMMANDS: 'Ctrl+K',
  REOPEN_TAB: 'Ctrl+Shift+T',
  MENU_TOGGLE: 'Ctrl+M',
  ESCAPE: 'Escape',
} as const;

export const TOUCH_TARGETS = {
  MIN_TOUCH_HITBOX_PX: 44,
  PRIMARY_CTA_HITBOX_PX: 48,
  ROW_HEIGHT_TOUCH_PX: 52,
} as const;

export interface NavigationSection {
  readonly id: ActiveView;
  readonly label: string;
  readonly route: string;
  readonly description: string;
  readonly shortcut?: string;
}

export const NAVIGATION_SECTIONS: ReadonlyArray<NavigationSection> = [
  {
    id: VIEWS.EDITOR,
    label: 'Dual Editor',
    route: ROUTES.HOME,
    description: 'Lean 4 kernel verifier and Python 3.14 symbolic editor with live infoview',
    shortcut: 'Alt+1',
  },
  {
    id: VIEWS.NOTEBOOK,
    label: 'Native Notebook',
    route: ROUTES.NOTEBOOK,
    description: 'Reactive compute cells, shared session memory, and theorem evaluator',
    shortcut: 'Alt+2',
  },
  {
    id: VIEWS.FEMEV,
    label: 'Femev Inspector',
    route: ROUTES.FEMEV,
    description: 'AX-PROVER proposal loop and translation fidelity gate',
    shortcut: 'Alt+3',
  },
  {
    id: VIEWS.LEDGER,
    label: 'Proof Ledger',
    route: ROUTES.LEDGER,
    description: 'Virtualized ledger of 150+ formal claims with microsecond verification telemetry',
    shortcut: 'Alt+4',
  },
  {
    id: VIEWS.SHOWCASE,
    label: 'Design System',
    route: ROUTES.SHOWCASE,
    description: 'Accessible tokens, color contrast ratios, and design components',
    shortcut: 'Alt+5',
  },
  {
    id: VIEWS.SETTINGS,
    label: 'Settings',
    route: ROUTES.SETTINGS,
    description: 'Compiler optimizations, WCAG 2.2 AA preferences, and adaptive recommendations',
    shortcut: 'Alt+6',
  },
];
