---
name: polyglot-distribute-code
description: "Package verified formal specifications and research artifacts for distribution."
tools: ["polyglot_verify_proof_kernel", "polyglot_get_context_keys", "polyglot_get_project_manifest"]
---

# polyglot-distribute-code

Prepares, verifies, and packages multi-target polyglot research codebases for distribution and archival.

## Workflow
1. Verify proof kernel status across all files via `polyglot_verify_proof_kernel`.
2. Inspect editor context keys using `polyglot_get_context_keys` to confirm clean buffer state.
3. Generate complete RO-Crate 1.3 scientific package manifest via `polyglot_get_project_manifest`.
4. Bundle formal specifications, Python bindings, and CI templates (LSpec) into deterministic ZIP archive.
