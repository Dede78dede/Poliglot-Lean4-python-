# ADR-0001: Pyodide WASM Engine for Browser-Native Python Execution

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Scientific computing and empirical proof validation require local execution of Python 3.14 without requiring users to configure local Python interpreters or cloud servers.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Pyodide WASM Engine for Browser-Native Python Execution

## Decision Outcome
Run Python in the browser via Pyodide compiled to WebAssembly, paired with OPFS caching for packages.

### Positive Consequences
- Zero-installation execution, instant startup, sandboxed isolation, NumPy/SymPy compatibility.

### Negative Consequences
- Initial ~20MB WASM download, cannot run C-extensions requiring CUDA on the fly.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0001.
