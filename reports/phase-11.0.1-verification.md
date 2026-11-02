# Sprint 11.0.1 Verification Report — Resolution of Architectural Inquiries

**Date**: 2026-10-27  
**Author**: Polyglot Code Studio Engineering Core  
**Status**: APPROVED & VERIFIED  

---

## 1. Activity Bar Drift Verification

### Inquiry 1: Where does the Memory view live, and is "extensions" an active view or placeholder?
- **Memory View Location**: In `src/services/shell/activity-bar-store.ts`, the Memory view is canonical activity #6 (`id: 'memory'`, label: `'5-Tier Memory'`, icon: `'Database'`). It is an active first-class activity in the Activity Bar. Clicking it renders a quick status and launches the dedicated `FiveTierMemoryDrawer` (`src/components/memory/FiveTierMemoryDrawer.tsx`) with full inspectability of L1 AST Cache, L2 Interactive Buffer, L3 Epistemic Store, L4 Verification Cache, and L5 Cold Storage. It is also bound in the Menu Bar under `View > 5-Tier Memory` and keybinding `Ctrl+Alt+M`.
- **Extensions Slot**: In the canonical activities registry, the 8 active entries are:
  1. `explorer` (Files, Tree/List/Changes/Trash)
  2. `search` (Unified Search RRF)
  3. `git` (Virtual Source Control & Diff)
  4. `proof` (Proof Automation & FEMEV)
  5. `blueprint` (Lean Blueprint Graph)
  6. `memory` (5-Tier Memory System)
  7. `chat` (LLM Native Chat & Prover)
  8. `settings` (Workbench & Engine Settings)
  The `extensions` capability is integrated into the Project Discovery and Scaffolding engine rather than a static placeholder view.

---

## 2. Side Panel View Modes Verification

### Inquiry 2: Are view modes implemented or delegated to Right Drawer?
- **File Explorer View Modes**: The Side Panel implements 4 distinct view modes for the `explorer` activity:
  - `tree`: Hierarchical directory tree navigation.
  - `list`: Flat alphabetical file listing with search.
  - `changes`: Filtered list of modified or dirty files in the VFS.
  - `trash`: Two-stage soft delete trash bin with restore and purge actions.
- **Other Activities**: For `proof`, `blueprint`, and `memory`, the Side Panel provides compact contextual status and action buttons that delegate to or open full-fidelity drawer/modal components (`ProofAutomationPanel`, `BlueprintWorkspaceModal`, `FiveTierMemoryDrawer`) preserving workspace layout ergonomics on screens under 1440px wide.

---

## 3. Test Suites & Runner Consolidation

### Inquiry 3: Explicit test file paths, write-suites diff, and test-11.ts consolidation
- **Explicit Test File Paths**:
  - `/tests/phase-11.0.1/suite-102-shell.test.ts`
  - `/tests/phase-11.0.1/suite-103-tabs-diff-outline.test.ts`
  - `/tests/phase-11.0.1/suite-104-status-bar.test.ts`
  - `/tests/phase-11.0.1/suite-105-editing.test.ts`
  - `/tests/phase-11.0.1/suite-106-file-manager.test.ts`
  - `/tests/phase-11.0.1/suite-107-registries.test.ts`
  - `/tests/phase-11.0.1/suite-108-docs.test.ts`
- **Runner Consolidation Rationale**:
  During Sprint 11.0.1, `scripts/test-11.ts` was initially created as a temporary development runner for the new workbench suites. In accordance with the Single Source of Truth (SSOT) manifesto principle, all 7 new test suites (`runSuite102` through `runSuite108`) were consolidated directly into the canonical CI runner `/scripts/verify-all.ts`. This ensures that `npm test` executes the complete cumulative verification suite (Suites 34 through 108, 100% passing across 75 test suites) in a single deterministic pass.
