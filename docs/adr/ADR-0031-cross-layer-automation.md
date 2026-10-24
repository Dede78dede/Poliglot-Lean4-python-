# ADR-0031: Cross-Layer Automation Pipeline

## Status
Accepted

## Context
A major strength of Polyglot Code Studio is integrating multiple formal tools into a cohesive workflow rather than leaving them in isolated silos. Phase 10.8 defines seven cross-layer automation connections across numerical verification, autoformalization, search, and blueprint engineering.

## Decision
We implement and enforce the following automated connections:
1. **LeanCert → FEMEV**: `verifyNumeric()` automatically runs before `formalizeDocument()` or `attemptPastaLeanProof()` whenever a claim contains numerical assertions. If numerical verification fails, promotion is blocked.
2. **CRAMF → LeanFlow**: LeanFlow invokes CRAMF during autoformalization to inject relevant Mathlib definitions into the prompt context (+29.9% gain). If CRAMF is disabled or unavailable, LeanFlow logs a warning and proceeds gracefully.
3. **SemanticSearch → MCP Client**: The `lean-lsp-mcp` client queries `SemanticSearchRegistry` for search operations (`lean_leansearch`, `lean_loogle`, `lean_leanfinder`).
4. **LeanArchitect → Blueprint DAG**: Newly discovered declarations with `@[blueprint]` annotations automatically insert nodes and edges into the canvas DAG.
5. **doc-gen4 → Blueprint**: Blueprint nodes link to their generated HTML documentation page under `./build/doc`.
6. **Verso → Blueprint DAG**: Exporting the DAG to Verso allows re-importing updated graph data via `api/graph.mjs`.
7. **LSpec → CI / Tests**: LSpec test suites provide per-declaration pass/fail status to the workspace.

## Consequences
- Fluid end-to-end user workflows without manual glue scripts.
- Asymmetric trust is enforced at every boundary.
