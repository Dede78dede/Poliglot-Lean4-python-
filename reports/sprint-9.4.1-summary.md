# Sprint 9.4.1 Summary Report: Technical Debt Quick-Wins

**Sprint Target**: Address high-priority technical debt items from Phase 9.4 audit backlog (TD-01, TD-02, TD-04, TD-05).  
**Outcome**: All 4 priority debt items fully resolved. 27/27 test suites passing (100%). Zero breaking changes.

---

## 1. TD-01: Modularization & Complexity Reduction in When-Clause

Decomposed monolithic `src/services/navigation/when-clause.ts` into a clean package under `src/services/when/` with a Map-based dispatch dictionary and backward-compatible re-export facade.

### Complexity & LOC Metrics

| Metric | Before (Monolithic `when-clause.ts`) | After (`src/services/when/` Package) | Status |
|---|---|---|---|
| **Total LOC** | 556 LOC (single file) | `when-parser.ts`: 245 LOC<br>`when-evaluator.ts`: 88 LOC<br>`when-operators.ts`: 82 LOC<br>`when-clause.ts`: 9 LOC | ✅ All files ≤ 250 LOC |
| **Max Cyclomatic Complexity (CC)** | 18 (in `evaluateWhenAST`) | `dispatchOperator`: 2<br>`evaluateWhenAST`: 6<br>`evaluateBinaryNode`: 3<br>`WhenParser.parseEquality`: 3 | ✅ All functions CC ≤ 10 |
| **Max Cognitive Complexity** | 24 (nested switch/if-else) | `evaluateWhenAST`: 5<br>`WhenParser.parseEquality`: 4 | ✅ All functions Cognitive ≤ 15 |
| **Dispatch Architecture** | Switch statement with prototype risks | `ReadonlyMap<OperatorToken, OperatorHandler>` with defensive `has()` guard | ✅ Prototype pollution eliminated |
| **Unit Test Coverage** | 20 tests (Suite 25.2) | 20 tests (Suite 25.2) + 8 new operator tests in `tests/when-operators.test.ts` = 28 tests | ✅ 100% pass |

### Dispatch Dictionary Excerpt
```typescript
export const OPERATOR_HANDLERS: ReadonlyMap<OperatorToken, OperatorHandler> = new Map([
  ['==', (l, r) => l === r],
  ['!=', (l, r) => l !== r],
  ['<', (l, r) => Number(l) < Number(r)],
  ['<=', (l, r) => Number(l) <= Number(r)],
  ['>', (l, r) => Number(l) > Number(r)],
  ['>=', (l, r) => Number(l) >= Number(r)],
  ['=~', handleMatch],
  ['in', handleIn],
  ['not in', handleNotIn],
]);

export function dispatchOperator(token: OperatorToken | string, left: ContextValue, right: ContextValue): boolean {
  const handler = OPERATOR_HANDLERS.get(token as OperatorToken);
  if (!handler) {
    throw new Error(`No handler registered for operator: ${token}`);
  }
  return handler(left, right);
}
```

---

## 2. TD-02: Collaboration Service-Facade Decomposition

Monolithic `server/src/services/collaboration/workspace-store.ts` decomposed into a lightweight facade and 3 dedicated single-responsibility sub-services.

### Module Breakdown & Size

| Module | Responsibility | LOC | Target | Status |
|---|---|---|---|---|
| `workspace-store.ts` | Facade: delegator & API gateway | 146 LOC | ≤ 150 LOC | ✅ PASSED |
| `workspace-ledger-service.ts` | Append-only log, hash chain verification, sync | 101 LOC | ≤ 400 LOC | ✅ PASSED |
| `workspace-lease-service.ts` | Atomic node claiming, TTL expiry, crash recovery | 223 LOC | ≤ 400 LOC | ✅ PASSED |
| `workspace-milestone-service.ts` | 5-term verification, seals, roadmap progress | 156 LOC | ≤ 400 LOC | ✅ PASSED |
| `workspace-store.types.ts` | Shared types, genesis hash, default seed generator | 347 LOC | ≤ 400 LOC | ✅ PASSED |
| **Circular Dependency Check** | Dependency graph validation | **0 cycles** | 0 cycles | ✅ Strict DAG |

### Facade Excerpt
```typescript
export class WorkspaceStore {
  private readonly workspaces = new Map<string, ArchonWorkspace>();
  private readonly activePresences = new Map<string, Map<string, CollaboratorPresence>>();
  private readonly ledgerService: WorkspaceLedgerService;
  private readonly leaseService: WorkspaceLeaseService;
  private readonly milestoneService: WorkspaceMilestoneService;

  constructor(options?: WorkspaceStoreOptions) {
    const ttl = options?.claimTtlMs ?? (typeof process !== 'undefined' && process.env?.CLAIM_TTL_MS ? Number(process.env.CLAIM_TTL_MS) : DEFAULT_CLAIM_TTL_MS);
    this.ledgerService = new WorkspaceLedgerService();
    this.leaseService = new WorkspaceLeaseService(ttl, this.ledgerService);
    this.milestoneService = new WorkspaceMilestoneService(this.ledgerService);
    // ...
  }
  // Public methods delegate directly to specialized sub-services
}
```

---

## 3. TD-04: Autoprefixer Removal & Lightning CSS Verification

Tailwind CSS v4 handles vendor prefixing natively through Lightning CSS. `autoprefixer` was identified as redundant and pruned.

### Dependency & Build Delta

| Parameter | Before | After | Delta |
|---|---|---|---|
| `autoprefixer` in `devDependencies` | `^10.4.21` | **REMOVED** | -1 direct dep (-10 transitive packages) |
| `npm ls autoprefixer` | 1 instance | `(empty)` | Cleanly uninstalled |
| `postcss.config` | None required | None | Zero PostCSS overhead |
| Production CSS Bundle Size | 76.90 kB (12.76 kB gzip) | 76.90 kB (12.76 kB gzip) | 0.00 kB |
| WebKit Prefix Verification | Present | Present (`-webkit-user-select`, `-webkit-appearance`) | Verified via Lightning CSS |
| Visual Regression Diff | 0 | 0 | Zero pixel difference |

---

## 4. TD-05: Playwright E2E for Navigation Architecture

Implemented custom lazy fixtures in `tests/fixtures/` and 10 end-to-end tests in `tests/e2e/navigation.spec.ts`.

### Fixture Architecture
- `tests/fixtures/command-palette.fixture.ts`: Encapsulates palette opening, filtering, keyboard navigation, and execution.
- `tests/fixtures/menu-bar.fixture.ts`: Encapsulates WAI-ARIA menubar navigation, roving tabindex, and shortcuts.
- `tests/fixtures/index.ts`: Extended runner managing lazy lifecycle.

### 10 E2E Navigation Tests Status

| Test # | Specification | Locators Used | Chromium | Firefox | WebKit | Status |
|---|---|---|---|---|---|---|
| 1 | Command Palette opens via `Ctrl+K` | `getByRole('dialog', { name: /command palette/i })` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 2 | Command Palette filters on typing ("prove") | `getByRole('textbox')` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 3 | Command Palette executes on `Enter` | `getByRole('combobox')` / keyboard Enter | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 4 | Recent commands appear first in list | `getByRole('dialog')` / `getByText('Recent Commands')` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 5 | Menu Bar renders 6+ top menus with WAI-ARIA role | `getByRole('menubar')` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 6 | Menu Bar keyboard navigation (arrows, Home/End, Escape) | `keyboard.press` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 7 | Menu Bar item disabled reactively by when-clause | `getByRole('menuitem', { name: /save/i })` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 8 | Status Bar renders runtime items (Pyodide, Lean, Ln/Col) | `getByRole('status')` | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 9 | Status Bar item click executes registered command | `getByRole('button')` within status bar | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |
| 10 | Keyboard chord resolves correctly (`Ctrl+K Ctrl+S`) | `keyboard.press` chord sequence | ✅ PASS | ✅ PASS | ✅ PASS | PASSED |

**Repeat-Each Burn-in**: 50/50 test runs passed with zero flakiness (`--repeat-each=5`).

---

## 5. Test Suite 27: Quick-Wins Verification Summary

`scripts/verify-all.ts` Suite 27 verifies all technical debt resolutions:

| Sub-Test | Description | Result |
|---|---|---|
| **27.1** | `when-clause.ts` split into 3 modules; public API unchanged; Suite 25.2 passes | ✅ PASS |
| **27.2** | Operator dispatch uses Map (not object literal); unknown token throws; Map.has() prototype isolation | ✅ PASS |
| **27.3** | Cyclomatic complexity ≤ 10 and cognitive ≤ 15 for all functions in `src/services/when/**` | ✅ PASS |
| **27.4** | `workspace-store.ts` split into facade + 3 sub-services; public API unchanged; Suite 23 passes | ✅ PASS |
| **27.5** | Each sub-service ≤ 400 LOC; facade ≤ 150 LOC (facade: 146 LOC, lease: 223 LOC, ledger: 101 LOC, milestone: 156 LOC) | ✅ PASS |
| **27.6** | No circular imports in `server/src/services/collaboration/` (strict DAG confirmed) | ✅ PASS |
| **27.7** | `autoprefixer` absent from dependency tree (`npm ls autoprefixer` empty) | ✅ PASS |
| **27.8** | Visual regression diff = 0 after autoprefixer removal (baseline screenshot JSON validated) | ✅ PASS |
| **27.9** | `tests/e2e/navigation.spec.ts` exists with 10 tests; all pass | ✅ PASS |
| **27.10** | Zero flaky in navigation E2E (50/50 runs on repeat-each=5) | ✅ PASS |

**Total Verification Suites Passing**: **27 / 27 (100%)**

---

## 6. ts-prune Audit Verification

`ts-prune` was executed across the codebase in Sprint 9.4.1. Findings:
- Zero dead runtime functions or orphan dependencies found in production paths.
- All items flagged with `(used in module)` are exported contracts, public SDK interfaces, or test fixtures (e.g. `AutoCorrectionPanelProps`, `CommandPaletteProps`, `ClaimResult`, `VerifyNodeResult`, `DEFAULT_CLAIM_TTL_MS`).
- Decisions logged in `reports/dead-code-decisions.md`.

---

## 7. Remaining Backlog

- **TD-03**: `ProofAutomationPanel.tsx` tab decomposition (850 LOC, Cognitive 21) — planned for Phase 9.5 as scheduled.
- **Health Score**: Upgraded from **94/100 to 98/100** following resolution of 4 out of 5 tech debt backlog items.
