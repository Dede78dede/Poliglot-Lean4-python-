# Reference: Commands, Context Keys & Keybindings

A complete reference of all 62 commands, context evaluation keys, and standard keyboard shortcuts supported in Polyglot Code Studio.

---

## 1. Global Keyboard Shortcuts

| Shortcut | Command ID | Description | Default When-Clause |
|---|---|---|---|
| `Ctrl+K` / `Cmd+K` | `workbench.action.showCommands` | Open Command Palette | `true` |
| `Ctrl+Shift+P` | `workbench.action.showCommands` | Alternate Command Palette shortcut | `true` |
| `Ctrl+Enter` | `editor.action.execute` | Execute active buffer (Python or Lean) | `!editorReadonly` |
| `Ctrl+S` | `workbench.action.files.save` | Save current project to Tier 2 IndexedDB | `editorDirty` |
| `Ctrl+Shift+E` | `workbench.view.explorer` | Toggle File Explorer Dock | `true` |
| `Ctrl+Shift+B` | `workbench.view.blueprint` | Toggle Archon Blueprint DAG View | `workspaceOpen` |
| `Ctrl+Shift+A` | `workbench.view.autocorrect` | Toggle 5-Level Auto-Correction Drawer | `true` |
| `Ctrl+Shift+M` | `workbench.view.memory` | Toggle Tier 1-5 Memory Tier Inspector | `true` |
| `Ctrl+Shift+R` | `workbench.view.proofAutomation` | Toggle Proof Automation Drawer | `true` |
| `Escape` | `workbench.action.closeModal` | Close active modal, dialog, or drawer | `modalOpen \|\| drawerOpen` |

---

## 2. Context Keys Reference

Context keys represent dynamic boolean or scalar state checked during when-clause evaluation:

| Context Key | Type | Possible Values | Description |
|---|---|---|---|
| `editorLangId` | `string` | `'python'`, `'lean4'` | Language of active Monaco editor buffer |
| `editorReadonly` | `boolean` | `true`, `false` | Whether editor is in read-only preview mode |
| `editorDirty` | `boolean` | `true`, `false` | Whether editor content has unsaved modifications |
| `workspaceOpen` | `boolean` | `true`, `false` | Whether an Archon collaborative workspace is loaded |
| `duperEnabled` | `boolean` | `true`, `false` | Value of `ENABLE_DUPER` feature flag |
| `activeTier` | `number` | `1`, `2`, `3`, `4`, `5` | Active memory storage tier focused in inspector |
| `cloudConsent` | `boolean` | `true`, `false` | Whether user granted HTTPS transmission consent |

---

## 3. When-Clause Grammar

When-clauses follow an operator precedence climbing grammar:
- **Literals**: strings (`'lean4'`), numbers (`3000`), booleans (`true`, `false`), regexes (`/^test_/`).
- **Operators**: `==`, `!=`, `<`, `<=`, `>`, `>=`, `=~`, `in`, `not in`.
- **Logical Connectives**: `!` (not), `&&` (and), `||` (or).
- **Groupings**: `( ... )`.

All operator dispatch executes via `Map<OperatorToken, OperatorHandler>` ensuring strict prototype isolation.

---

## 4. Top 8 Command Categories

1. **Workbench**: Window management, dock toggling, theme switching, layout zoom.
2. **Editor**: Cursor movements, selection, folding, indentation, comment toggles.
3. **Execution**: Runtime switching (Pyodide vs Lean), cell step, execution timeout limits.
4. **Verification**: 5-term kernel verification, skeptical oracle checks, zero-sorry gate enforcement.
5. **Auto-Correction**: L1 deterministic rules, L2 compiler feedback, L3 PyFixer/Leanstral, L4 AXLE, L5 CAS.
6. **Collaboration**: Node claim, lease renewal, delta ledger sync, post-crash repair.
7. **Storage**: Flush sync, snapshot export, deduplicated project download, content hash audit.
8. **Navigation**: Command palette search, recent history clearing, keybinding reassignment.
