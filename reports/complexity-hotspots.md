# Complexity Hotspots & Refactoring Roadmap

1. `when-clause.ts` (`evaluateWhenAST`, CC: 18, CogC: 24): Monolithic switch. Refactor to operator dispatch table in Phase 9.5.
2. `workspace-store.ts` (`reconcileLedger`, CC: 17, CogC: 22): Split into ledger verification, claim lease, and roadmap services.
3. `ProofAutomationPanel.tsx` (CogC: 21): Decompose 850-line drawer into sub-components.
