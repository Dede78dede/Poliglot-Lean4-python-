# polyglot-probe-tactic

Speculatively evaluate Lean 4 tactics without file mutation using the lean-beam MCP broker.

## Overview
This skill guides an AI agent through exploring and validating candidate tactics against Lean 4 goals prior to issuing file diff proposals. Probes are executed via the `lean-beam-mcp` stdio broker in under 200ms.

## Workflow
1. Identify the target file path, document version, and 1-indexed line / 0-indexed character position in the open Lean 4 module.
2. Formulate candidate tactics (e.g. `rfl`, `omega`, `simp`, `exact Nat.zero_le n`, `intro a b h`).
3. Invoke `polyglot_probe_tactic` (or MCP tool `lean_run_at`) with `{ path, version, line, character, text }`.
4. Inspect the returned `goalsBefore` and `goalsAfter`:
   - If `goalsAfter` is empty and `valid: true`, the tactic successfully closes the goal.
   - If `valid: false`, inspect `errors` for compiler diagnostics and try an alternative tactic.
5. For tree-based exploration, use `lean_run_at_handle` to mint continuation handles, followed by `lean_run_with` or `lean_run_with_linear`.
6. Once a candidate is verified speculatively, propose the change to the user using standard file-edit tools.

## Epistemic Discipline & Boundaries
- Speculative execution via lean-beam NEVER certifies formal proofs or promotes claims to `formally-proven`.
- Only the multi-kernel verifier (`femevEngine`) issuing `SEAL_KERNEL_VERIFIED_TIER5` provides authoritative verification.
- Toolchain requirement: project must target a qualified toolchain (`v4.34.0-rc1`, `v4.33.0`, `v4.32.0`, `v4.31.0`, etc.).
- Probing never mutates the project `lakefile` or any file on disk.
