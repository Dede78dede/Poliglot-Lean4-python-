# polyglot-refactor

Refactors Lean 4 proofs and Python code for idiomatic conciseness, maintainability, execution performance, and proof stability.

## Prerequisites
- Valid Lean 4 theorem declaration or Python function in the active editor.
- Kernel verification daemon available (`femev-runner` on port 8080) for Lean refactorings.
- Unsaved changes committed or tracked in Virtual File System (VFS).

## Steps
1. Analyze existing theorem proof blocks or Python numerical algorithms for redundancy, slow tactic paths, or deprecated syntax.
2. Formulate simplified proofs (e.g. replacing lengthy term manipulations with `omega`, `simp`, or `ring`).
3. Verify that the proposed refactoring preserves complete proof closure via `polyglot_verify_proof_kernel`.
4. Emit structured diff proposals to Monaco DiffEditor with zero regressions to formal verification status.

## Failure Modes
- `KERNEL_VERIFICATION_FAILED`: Proposed proof fails kernel soundness; refactoring proposal is immediately aborted.
- `REGRESSION_DETECTED`: Type signatures or exported symbols modified; roll back to original code.
- `DIRECT_LLM_FALLBACK`: When backend verification service is unreachable, falls back to direct LLM call.
