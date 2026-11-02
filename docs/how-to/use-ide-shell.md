# How-To: Use the IDE Shell & Workbench Navigation

This guide covers the workbench shell of Polyglot Code Studio, introducing the Activity Bar, Side Panel, enhanced editor tabs, breadcrumb navigation, side-by-side Diff Viewer, and document outline.

---

## 1. Activity Bar

The **Activity Bar** provides primary navigation between Polyglot Studio's tools and workspaces:

| Activity | Icon | Description |
|---|---|---|
| **Explorer** | Files | Virtual File System (VFS), tree & list views, project files |
| **Search** | Search | Unified search across Lean mathlib, definitions, and Python AST |
| **Source Control** | GitBranch | Working copy changes, status, and diff inspection |
| **Proof** | FlaskConical | Auto-prove, Lean 4 tactics, and FEMEV formal verification |
| **Blueprint** | Network | Interactive Lean Blueprint dependency graph |
| **Memory** | Database | 5-Tier Memory Architecture (L1 RAM through L5 Cold Storage) |
| **Chat** | MessageSquare | LLM-native prover & assistant integration |
| **Settings** | Settings | Toolchain configuration, API secrets, and preferences |

### Customizing the Activity Bar
- **Toggle Side Bar**: Click the active activity icon or press `Ctrl+B` / `Cmd+B`.
- **Move Activity Bar**: Right-click the Activity Bar and select **Move Primary Side Bar Right** or **Move Primary Side Bar Left**.
- **Compact Mode**: Right-click and choose **Compact Activity Bar (40px)** to maximize screen real estate.
- **Zen Mode**: Press `Ctrl+K Ctrl+X` to hide all auxiliary bars and enter distraction-free editing.

---

## 2. Side Panel

The **Side Panel** docks tool views alongside the editor canvas:
- **Resizing**: Hover over the panel border and drag horizontally (clamped between 200px and 480px).
- **View Modes**: When viewing the Explorer, switch between **Tree View**, **List View**, **Modified Files**, and **Trash** using the header mode selector.

---

## 3. Editor Tabs & Split Views

- **Drag-to-Reorder**: Click and drag tabs horizontally to re-arrange their layout.
- **Middle-Click Close**: Middle-click any tab header to close it.
- **Reopen Closed Tabs**: Press `Ctrl+Shift+T` to reopen previously closed files (supports a 10-item LIFO stack).
- **Split Editor**: Press `Ctrl+\` or click the split icon in the tab bar to toggle side-by-side editor panes.
- **Context Menu**: Right-click any tab to access **Close Others**, **Close to the Right**, **Close Saved**, and **Copy Path**.

---

## 4. Breadcrumbs & Outline

- **Breadcrumbs**: Located directly above the Monaco editor, displaying the path hierarchy (`folder > subfolder > file.lean > theorem`). Press `Ctrl+Shift+.` to focus breadcrumbs.
- **Enclosing Symbol**: Displays the current function or theorem enclosing the active cursor line.
- **Document Outline**: View all classes, functions, theorems, and definitions with real-time text filtering. Click any symbol to jump to that line.

---

## 5. Diff Viewer

- Open the Diff Viewer via the Source Control activity or command palette.
- Compare working copy modifications against baseline disk state.
- Switch between **Side-by-Side** and **Inline** views.
- Click **Apply Changes** to merge edits into the working buffer, or **Revert** to discard changes.
