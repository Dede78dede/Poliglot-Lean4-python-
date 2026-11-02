# polyglot-test

Executes automated verification passes, LSpec test suites, typechecks, and regression audits across Lean 4 and Python codebases.

## Prerequisites
- Valid `lakefile.lean` or `lakefile.toml` present in workspace for Lean testing.
- Pyodide or Python runtime active for Python test execution.
- Configured test specs or assertions in active module.

## Steps
1. Identify testable targets across Lean modules (theorems, definitions, examples) and Python unit test harnesses.
2. Execute LSpec CI suites and kernel checks (`lake build`, `lake check --paranoid`).
3. Report pass/fail diagnostics, unclosed obligations (`sorry`), and type errors.
4. Output structured test reports compliant with Polyglot Code Studio verification standards.

## Failure Modes
- `TEST_SUITE_FAILED`: One or more declarations failed evaluation; returns structured diagnostics.
- `ORPHANED_SORRY`: Unproven sorry goal detected in declaration marked verified; emits violation warning.
- `DIRECT_LLM_FALLBACK`: When LSpec runner daemon is not configured, falls back to direct LLM call.
