# polyglot-explain

Deconstructs and explains complex Lean 4 formal proofs, tactics, and scientific Python algorithms step by step for mathematicians and developers.

## Prerequisites
- Active Lean 4 or Python file open in the Polyglot editor workspace.
- For Lean 4 proofs: syntax must be parseable by the language server or context engine.
- For Python code: Python 3.12+ syntax compatibility.

## Steps
1. Ingest the target Lean 4 theorem declaration, tactic proof sequence, or Python scientific routine.
2. Trace intermediate goal states (hypotheses, targets) at each step of the proof or AST evaluation.
3. Elucidate mathematical intuition alongside rigorous logical mechanics (e.g. why `induction`, `omega`, or `calc` is used).
4. Provide cross-references to corresponding literature citations in `meta/bibliography.json` where relevant.

## Failure Modes
- `SYNTAX_ERROR`: Code cannot be parsed into an AST; returns line-level diagnostic hint.
- `DISCONNECTED_GOALS`: Proof goals cannot be mapped to known tactic steps; falls back to high-level informal summary.
- `DIRECT_LLM_FALLBACK`: When offline without specialized skill broker, falls back to direct LLM call.
