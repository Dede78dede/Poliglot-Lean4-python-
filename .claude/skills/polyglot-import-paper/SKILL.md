---
name: polyglot-import-paper
description: "Ingest arXiv/LaTeX papers into formal Lean workspaces with span ledger alignment."
tools: ["polyglot_get_bibliography", "polyglot_get_project_manifest"]
version: 1.0.0
---

# polyglot-import-paper

Imports academic LaTeX papers into Lean 4 formalization workspaces, constructing the theorem graph and span ledger.

## Workflow
1. Ingest LaTeX source via arXiv identifier or file upload.
2. Extract theorem statements, definitions, and proof sketches.
3. Construct the span ledger connecting LaTeX textual coordinates to Lean AST nodes.
4. Export citation metadata using `polyglot_get_bibliography`.
5. Generate an initial research software manifest with `polyglot_get_project_manifest`.
