# Dead Code Decisions Matrix (Knip, Depcheck & ts-prune Audit)

| Identifier | Finding Tool | Decision | Rationale |
|---|---|---|---|
| `decryptTokenDirect` | Knip | Keep with Comment | Public debug and disaster recovery hook. |
| `parseLakefileRaw` | Knip | Keep with Justification | Fallback parser for non-JSON lake manifests. |
| `computeHypothesisEntropy` | Knip | Keep with Justification | Reserved for Phase 9.3 search heuristics. |
| `WhenGroupNode` | Knip | Keep with Comment | AST union member in when-clause.ts. |
| `autoprefixer` | Depcheck | REMOVED | Executed in Sprint 9.4.1 (TD-04). Redundant with Tailwind v4 Lightning CSS. |
| `DEFAULT_CLAIM_TTL_MS` | ts-prune | Keep (Public API) | Re-exported constant for collaboration TTL configuration. |
| `GENESIS_PREV_HASH` | ts-prune | Keep (Public API) | Cryptographic genesis hash anchor for audit ledgers. |
| `computeLedgerEntryHash` | ts-prune | Keep (Public API) | Verification utility for external clients and ledger audits. |
| `ClaimResult` / `VerifyNodeResult` | ts-prune | Keep (Public API) | TypeScript result interfaces consumed by REST and WebSocket clients. |
| `AutoCorrectionPanelProps` | ts-prune | Keep (Component Contract) | Component prop contract exported for test fixtures and layout wrapping. |
| `CommandPaletteProps` | ts-prune | Keep (Component Contract) | Navigation component interface for workbench shells. |
| `createLookup` | ts-prune | Keep (Service API) | Extracted evaluation helper in `src/services/when/when-evaluator.ts`. |
| `KIMINA_MODES` / `KiminaMode` | ts-prune | Keep (Domain Type) | Discriminated union and values for server runner configuration. |
| `DeclarationKind` / `NodeLanguage` | ts-prune | Keep (Domain Type) | Blueprint AST enum unions consumed by UI and verification engines. |
