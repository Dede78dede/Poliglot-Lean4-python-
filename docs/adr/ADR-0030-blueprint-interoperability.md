# ADR-0030: Blueprint Interoperability Architecture

## Status
Accepted

## Context
Multiple blueprint tools serve complementary needs across the mathematical formalization pipeline:
- `leanblueprint-mcp`: Renders LaTeX dependency graphs via `\uses` and color-coded status.
- `LeanArchitect`: Extracts blueprint metadata directly from Lean source code via `@[blueprint]` annotations.
- `Lean Atlas`: Renders interactive web dependency graphs with 8-kind edge classification along 3 orthogonal axes.
- `Verso Blueprint`: Authoritative document engine for Verso-based mathematical publishing.

## Decision
Treat these four tools as **complementary stages of a single unified pipeline**, rather than competing alternatives:
1. **Extraction**: `LeanArchitect` inspects Lean sources and syncs discoveries into the workspace Blueprint DAG.
2. **Interactive Exploration**: `Lean Atlas` renders the DAG in an embedded canvas with 8-edge filtering.
3. **MCP Integration & LaTeX**: `leanblueprint-mcp` exports `\uses` macros and renders color-coded HTML.
4. **Publishing**: `Verso Blueprint` compiles the DAG into web and PDF documents via `lake exe vbp`.

## Consequences
- Single Source of Truth (SSOT): The Phase 7 Blueprint DAG remains the canonical internal model.
- Bi-directional sync: Annotations in code reflect immediately in visual graphs and exported literature.
