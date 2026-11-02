# Architecture: IDE Shell & Workbench Subsystem

This document describes the architectural foundation of the Polyglot Code Studio workbench shell, including state management, store reactivity, accessibility invariants, and security policies.

---

## 1. Architectural Philosophy & Invariants

The workbench adheres to core Polyglot Manifesto tenets:
- **No `any`, No `enum`**: Discriminated unions, standard TypeScript types, and frozen object literals.
- **CQS & SSOT**: Clear separation between commands and queries; single source of truth for all shell state.
- **ExternalStoreBase Reactivity**: All shell stores (`ActivityBarStore`, `SidePanelStore`, `EditorTabsStore`, `TrashService`) extend `ExternalStoreBase<TSnapshot>` to ensure referential stability under `useSyncExternalStore`.
- **Multi-Tab Sync**: Stores opt-in to cross-tab communication via `BroadcastChannel` with `multiTabSync: true`.
- **WCAG 2.2 AA Compliance**:
  - Focus rings $\ge 2$px with $\ge 3:1$ contrast ratio.
  - Roving tabindex for keyboard navigation in `ActivityBar` and `MonacoTabs`.
  - Non-obscured focus indicators (`WCAG 2.4.11`).
  - Aria roles (`role="tablist"`, `role="tab"`, `role="region"`, `role="status"`).

---

## 2. Store Architecture

```
                       ┌─────────────────────────┐
                       │    ExternalStoreBase    │
                       └────────────┬────────────┘
                                    │ extends
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
 ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
 │   ActivityBarStore   ││    SidePanelStore    ││   EditorTabsStore    │
 ├──────────────────────┤├──────────────────────┤├──────────────────────┤
 │ - activeActivity     ││ - width [200, 480]   ││ - closedStack (10)   │
 │ - size (48px/40px)   ││ - collapsed          ││ - splitMode          │
 │ - position (L/R)     ││ - viewModes          ││ - tabOrder           │
 │ - isZenMode          ││                      ││                      │
 └──────────────────────┘└──────────────────────┘└──────────────────────┘
```

### Persistence
- Layout preferences persist to `localStorage`:
  - `polyglot.activitybar.layout`
  - `polyglot.sidepanel.layout`
  - `polyglot.trash.items`

---

## 3. Advanced Editing Pipeline

- **Monaco Editor Configuration**:
  - `bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true }`
  - `stickyScroll: { enabled: true, maxLineCount: 5 }`
  - `rulers: [100]`
  - `multiCursorModifier: 'alt'`
- **Snippet Registry**: Pre-registered standard libraries, syntax structures, and mathematical templates for Python and Lean 4.
- **CodeLens & Inlay Hints**: Dynamic generation of proof tactics (`exact?`, `simp?`, `omega?`) and parameter type annotations.
- **Context Engine Fallback**: Graceful fallback to built-in Monaco VFS symbols when `@enjoys/context-engine` is absent or disabled.

---

## 4. File Management & Security

- **Safe Archiving**: Compression and extraction via `fflate` guarded by `ZipValidator`.
  - Limit checks: max 50 MiB uncompressed, 5 MiB file size, max 500 files, 100:1 ratio.
  - CVE-2018-1002200 mitigation against directory traversal (`../`).
  - CVE-2026-0866 mitigation against Zombie ZIP header mismatches.
- **Soft Deletion**: All deletions invoke `trashService.moveToTrash()`, writing a tombstone entry before removing VFS references, preventing accidental data loss.
