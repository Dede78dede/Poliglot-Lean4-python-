---
name: polyglot-generate-blueprint
description: "Generate dependency blueprints with topological sorting and sorry_using stubs."
tools: ["polyglot_get_femev_status"]
version: 1.0.0
---

# polyglot-generate-blueprint

Generates and synchronizes interactive dependency blueprints with Lean 4 formal codebases.

## Workflow
1. Analyze theorem definitions and dependency graph using Kahn topological sorting.
2. Emit blueprint nodes with `@[blueprint]` decorators and `sorry_using [...]` clauses.
3. Validate epistemic transitions against the FEMEV orchestrator using `polyglot_get_femev_status`.
4. Export Web-compatible blueprint graphs for visual exploration in Lean Atlas.
