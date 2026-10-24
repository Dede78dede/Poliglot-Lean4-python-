# Technical Debt Prioritized Backlog

Prioritized according to the "4% causing 72% of defects" principle:

| ID | Location | Complexity / Churn | Priority | Status | Sprint Delivered |
|---|---|---|---|---|---|
| **TD-01** | `src/services/when/` | CC ≤ 10, Cognitive ≤ 15 | HIGH | ✅ RESOLVED | Sprint 9.4.1 (Modularized AST, Map dispatch table, 8 unit tests) |
| **TD-02** | `server/src/services/collaboration/` | Facade ≤ 150 LOC, sub-services ≤ 400 LOC | HIGH | ✅ RESOLVED | Sprint 9.4.1 (Service-Facade split: ledger, lease, milestone, types) |
| **TD-03** | `src/components/proof/` | Cognitive ≤ 10, Container ≤ 150 LOC, Panels ≤ 300 LOC | MEDIUM | ✅ RESOLVED | Phase 9.5 (Sprint 9.5.1 Task E4: Tab decomposition & shared badges) |
| **TD-04** | `package.json` devDependencies | Dependency removal | LOW | ✅ RESOLVED | Sprint 9.4.1 (Removed autoprefixer; confirmed Tailwind v4 Lightning CSS) |
| **TD-05** | `tests/e2e/navigation.spec.ts` & `tests/fixtures/` | E2E coverage gap | HIGH | ✅ RESOLVED | Sprint 9.4.1 (10 Playwright tests with lazy fixtures, 0 flakiness) |
