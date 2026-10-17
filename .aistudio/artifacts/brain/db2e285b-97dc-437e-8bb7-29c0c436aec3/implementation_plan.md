# Sprint 9.4.1 — Technical Debt Quick-Wins

Resolving high-priority technical debt identified in the Phase 9.4 Comprehensive Quality Audit: modularizing high-complexity dispatch hotspots, splitting collaboration services into a clean service-facade architecture, removing redundant PostCSS dependencies in favor of Tailwind v4 Lightning CSS, adding Playwright E2E coverage for navigation, executing ts-prune audit, and adding Suite 27 verification.

> [!IMPORTANT]
> **Confirmed Decisions from Clarification:**
> - **ts-prune Integration**: Executing ts-prune audit in Sprint 9.4.1 and recording dead export findings in `reports/sprint-9.4.1-summary.md` and `reports/dead-code-decisions.md`.
> - **PostCSS Configuration**: Removing redundant `postcss.config` since Tailwind CSS v4 handles vendor prefixing directly via Lightning CSS.
> - **E2E Browser Matrix**: Running Chromium during local iterative development, and validating all three browser engines (Chromium, Firefox, WebKit) in the comprehensive verification suite.
> - **Scope Guard**: TD-03 (`ProofAutomationPanel.tsx` decomposition) remains deferred to Phase 9.5 as established in the Phase 9.4 audit report.

---

### 1. Overview & Core Concept

- **What It Delivers**: A focused technical debt reduction sprint targeting the "4% of code causing 72% of complexity defects". It eliminates cyclomatic and cognitive complexity hotspots without any functional regressions or breaking API changes.
- **Target Audience**: Core engineering team, mathematicians, and developers relying on robust navigation, state evaluation, and multi-user workspace synchronization.
- **Key Value**:
  - Drops cyclomatic complexity (CC) in `when-clause` from 18 to ≤ 10, cognitive complexity from 24 to ≤ 15.
  - Drops `workspace-store` from a monolithic 1,011 LOC to a compact facade (≤ 150 LOC) with 3 specialized sub-services (each ≤ 400 LOC).
  - Eliminates `autoprefixer` devDependency and confirms clean native Lightning CSS prefixing.
  - Establishes robust, role-based Playwright E2E coverage for MenuBar and CommandPalette.
  - Adds Suite 27 to `scripts/verify-all.ts` with 10 sub-tests ensuring 100% pass rate.

---

### 2. User Experience & Visual Design

This sprint focuses on internal code quality, architecture, and testing. It strictly preserves existing visual styling, behavior, and design tokens:
- **Design Tokens Maintained**: Base `#0B0F17`, panels `#111827`, borders `#1E293B`, telemetry cyan `#06b6d4`.
- **Zero-Pill Discipline & JetBrains Mono Typography**: Unchanged.
- **WAI-ARIA Accessibility**: Maintained and strengthened through dedicated E2E verification (`getByRole('menubar')`, `getByRole('dialog')`, `getByRole('combobox')`, `getByRole('status')`).
- **Visual Regression Baseline**: Diff = 0 verified via Playwright screenshot comparisons after removing `autoprefixer`.

---

### 3. Key Product Decisions & Trade-Offs

- **TD-01 Dispatch Dictionary vs. Switch / Object Literal**:
  - *Chosen Approach*: `ReadonlyMap<OperatorToken, OperatorHandler>` with explicit `has()` check and defensive error handling.
  - *Why*: Object literals inherit from `Object.prototype`, creating prototype-pollution risks (`constructor`, `__proto__`, `toString`). A `Map` guarantees clean key isolation, deterministic O(1) dispatch, and testable boundary conditions.
  - *Alternatives Considered*: Retaining the switch statement (rejected due to cyclomatic complexity 18 and high cognitive nesting).

- **TD-02 Service-Facade Decomposition vs. Deep Layering**:
  - *Chosen Approach*: Service-Facade pattern with 3 sub-services (`workspace-ledger-service`, `workspace-lease-service`, `workspace-milestone-service`) orchestrated by a lightweight facade (`workspace-store.ts` ≤ 150 LOC).
  - *Why*: Keeps the exact public API unchanged for WebSocket routes, REST controllers, and test suites while ensuring each sub-service has a single well-defined responsibility under 400 LOC.
  - *Alternatives Considered*: Full microservice split (rejected: premature distribution overhead for self-hosted single-container deployment).

- **TD-04 Removal of Autoprefixer**:
  - *Chosen Approach*: Remove `autoprefixer` from `package.json` devDependencies and rely on `@tailwindcss/vite` native Lightning CSS prefixing.
  - *Why*: Tailwind CSS v4 integrates Lightning CSS, which automatically injects vendor prefixes based on the modern browserlist target without PostCSS overhead.
  - *Verification*: Confirm `-webkit-` prefixes in production bundle output.

- **TD-05 Playwright Fixtures over Loose Page Objects**:
  - *Chosen Approach*: Lazy fixture extension (`test.extend<{ commandPalette, menuBar }>()`) with lifecycle callbacks.
  - *Why*: Avoids module-level mutable state, isolates browser contexts, ensures automatic teardown, and strictly utilizes accessibility locators (`getByRole`, `getByLabel`).

---

### 4. Technical Architecture & Component Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Polyglot Code Studio                            │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Frontend Navigation Subsystem        │ Backend Collaboration Subsystem       │
│                                      │                                       │
│  src/services/when/                  │  server/src/services/collaboration/   │
│  ├── when-parser.ts                  │  ├── workspace-store.ts (Facade ≤150) │
│  │   └─ Tokenizer + Descent Parser   │  │   ├── WorkspaceStore               │
│  ├── when-evaluator.ts               │  ├── workspace-ledger-service.ts      │
│  │   └─ AST Context Evaluator        │  │   └─ Event log, hash chain, replay │
│  ├── when-operators.ts               │  ├── workspace-lease-service.ts       │
│  │   └─ Map<Op, Handler> Dispatch    │  │   └─ Claims, TTL, crash recovery   │
│  └── when-clause.ts (Facade API)     │  ├── workspace-milestone-service.ts   │
│      └─ Re-exports parse/evaluate    │  │   └─ Roadmaps, DAG progress        │
│                                      │  └── workspace-store.types.ts         │
│                                      │      └─ Internal shared interfaces    │
├──────────────────────────────────────┴───────────────────────────────────────┤
│ Verification & Test Infrastructure                                           │
│                                                                              │
│  tests/fixtures/                     tests/e2e/                              │
│  ├── command-palette.fixture.ts      └── navigation.spec.ts (10 tests)       │
│  ├── menu-bar.fixture.ts                                                     │
│  └── index.ts (Extended Test Runner) scripts/verify-all.ts                   │
│                                      └── Suite 27 (10 sub-tests)             │
│                                                                              │
│  reports/                                                                    │
│  └── sprint-9.4.1-summary.md (LOC, CC, Cognitive, E2E & ts-prune metrics)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Detailed Task Execution Plan

#### Task 1: TD-01 Refactor `when-clause.ts` into `src/services/when/`
1. Create `src/services/when/when-operators.ts`:
   - Define `OperatorToken` closed literal union and `OperatorHandler` function type.
   - Implement `OPERATOR_HANDLERS` as `ReadonlyMap<OperatorToken, OperatorHandler>`.
   - Export `dispatchOperator(token, value, operand, flags)`.
2. Create `src/services/when/when-parser.ts`:
   - Extract `WhenTokenizer` and `WhenParser` classes with precedence-climbing methods.
   - Keep cyclomatic complexity ≤ 8 per method.
3. Create `src/services/when/when-evaluator.ts`:
   - Extract pure evaluation logic, logical `!`, `&&`, `||` guard clauses, and context value resolution.
4. Update `src/services/when/when-clause.ts`:
   - Facade re-exporting `parseWhenClause` and `evaluateWhenClause`.
   - Ensure backward compatibility path `src/services/navigation/when-clause.ts` forwards to `src/services/when/when-clause.ts`.
5. Add 8 new unit tests covering operator boundaries and dispatch errors.
6. Verify Suite 25.2 (20 tests) passes unchanged.

#### Task 2: TD-02 Split `workspace-store.ts` into Service-Facade
1. Create `server/src/services/collaboration/workspace-store.types.ts`:
   - Extract internal options, hash computation helpers, and sub-service communication contracts.
2. Create `server/src/services/collaboration/workspace-ledger-service.ts` (≤ 400 LOC):
   - Event append, hash chain calculation (`computeLedgerEntryHash`), reconciliation (`sinceSeq`), event replay.
3. Create `server/src/services/collaboration/workspace-lease-service.ts` (≤ 400 LOC):
   - Claim node, release claim, renew claim, TTL check, crash recovery, conflict code generation (`CONFLICT_ALREADY_CLAIMED`).
4. Create `server/src/services/collaboration/workspace-milestone-service.ts` (≤ 400 LOC):
   - Milestone progress computation, topological ordering, certificate status checks.
5. Refactor `server/src/services/collaboration/workspace-store.ts` (≤ 150 LOC):
   - Retain full public API, instantiate sub-services in constructor, delegate calls, orchestrate multi-service workflows.
6. Verify Suite 23 (8 sub-tests) passes unchanged.
7. Verify zero circular dependencies via internal module import check.

#### Task 3: TD-04 Remove `autoprefixer` & Verify Lightning CSS
1. Remove `autoprefixer` from `package.json` devDependencies.
2. Delete any lingering postcss config if present.
3. Run `npm install` or update lockfile cleanly.
4. Run production build (`npm run build`).
5. Verify vendor prefixes in CSS bundle output (`dist/assets/*.css`).
6. Run visual regression check against baseline screenshots (diff = 0).

#### Task 4: TD-05 Playwright E2E for Navigation
1. Create `tests/fixtures/command-palette.fixture.ts` with `CommandPaletteFixture` class.
2. Create `tests/fixtures/menu-bar.fixture.ts` with `MenuBarFixture` class.
3. Create `tests/fixtures/index.ts` exporting extended `test` and `expect`.
4. Create `tests/e2e/navigation.spec.ts` with the 10 required test cases:
   - 1. Command Palette opens via `Ctrl+K`.
   - 2. Filters commands dynamically on search input.
   - 3. Executes command on `Enter`.
   - 4. Recent commands surface at top of list.
   - 5. Menu Bar renders top-level menus with correct WAI-ARIA roles.
   - 6. Menu Bar keyboard navigation (arrows, Home/End, Escape).
   - 7. Menu Bar items disabled reactively via when-clauses.
   - 8. Status Bar renders runtime engine status items.
   - 9. Status Bar item click executes registered command.
   - 10. Keybinding chord resolves correctly.
5. Verify test pass with zero flakiness.

#### Task 5: ts-prune Audit Execution & Dead Code Verification
1. Run `npx ts-prune` across the codebase.
2. Filter intentional public exports (e.g., API boundaries, tests, library entry points).
3. Document findings in `reports/sprint-9.4.1-summary.md` and append to `reports/dead-code-decisions.md`.

#### Task 6: Test Suite 27 Implementation & Verification
1. Add Suite 27 to `scripts/verify-all.ts` with 10 sub-tests (27.1 to 27.10):
   - 27.1: `when-clause` modularized, public API preserved, Suite 25.2 passes.
   - 27.2: Operator dispatch uses `Map`, unknown token throws.
   - 27.3: Cyclomatic complexity ≤ 10, cognitive ≤ 15 in `src/services/when/**`.
   - 27.4: `workspace-store` split into facade + 3 sub-services, Suite 23 passes.
   - 27.5: Each sub-service ≤ 400 LOC, facade ≤ 150 LOC.
   - 27.6: Zero circular imports in `server/src/services/collaboration/`.
   - 27.7: `autoprefixer` absent from dependencies.
   - 27.8: Visual regression diff = 0.
   - 27.9: `tests/e2e/navigation.spec.ts` exists with 10 tests passing.
   - 27.10: Zero flaky tests on repeat execution.
2. Execute `npm run test:verify` and confirm all 27 suites pass (100%).

#### Task 7: Summary Report Generation
1. Generate `reports/sprint-9.4.1-summary.md` documenting all before/after complexity metrics, LOC deltas, E2E test results, and audit confirmations.
