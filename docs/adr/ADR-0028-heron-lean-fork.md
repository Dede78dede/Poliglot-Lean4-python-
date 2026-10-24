# ADR-0028: Heron Lean Fork Isolation in heron-runner Container

## Status
Accepted

## Context
Heron (`wvhulle/heron`) is a diagnostic linter and refactoring engine for Lean 4 providing automated LSP code actions. Upstream Lean 4 does not expose the deep AST replacement and diagnostic context needed by Heron's refactor engine. Consequently, Heron requires a custom fork of Lean 4 (branch `lean-fork/v4.31.0`).

## Decision
1. **Dedicated Container**: We isolate the Lean 4 fork in `docker/heron-runner/Dockerfile` on port 8086.
2. **Feature Flag**: Heron integration is gated behind `ENABLE_HERON=false` by default.
3. **No Contamination**: The fork is completely excluded from the primary kernel verification pipeline (`lake check --paranoid` on v4.35.0).

## Consequences
- Prevents destabilizing the standard Lean 4 toolchains (v4.31.0-rc2, v4.32.0, v4.34.1, v4.35.0).
- Users opting in to refactoring actions can start `heron-runner` without affecting proof soundness.
