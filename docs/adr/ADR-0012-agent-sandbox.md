# ADR-0012: Selection of Agent Execution Sandbox (ClawLess / clawcontainer)

- **Status**: Accepted
- **Date**: 2026-10-20
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Phase 11 introduces agentic workflows requiring isolated, sandboxed execution of agent tools, scripts, and package installations. We evaluated existing WebAssembly and browser virtualization sandboxes to protect host processes while allowing high-throughput code synthesis.

## Decision Drivers
- Permissive open-source licensing (MIT / Apache-2.0, zero commercial lock-in)
- Full Node.js and POSIX command-line runtime inside browser WebAssembly
- Granular capability-based policy engine (network gating, filesystem permissions)
- Comprehensive local audit logging for tool executions
- Ecosystem maturity and active maintenance

## Considered Options
1. **`wasmclaw` (v0.5.0)**: Rejected due to severe immaturity (~44 downloads/week, unproven in production workloads, sparse documentation).
2. **`peerd` (2026-10-11)**: Rejected due to its hard runtime dependency on CheerpX, which enforces restrictive non-open-source commercial licensing.
3. **Chosen Approach: `clawcontainer` / ClawLess (v1.0.0, 2026-03-19)**: Adopted. Built on WebContainers WebAssembly engine, fully MIT licensed, supporting 3.4M+ npm packages, zero external server infrastructure, with built-in declarative policy enforcement and audit trails.

## Decision Outcome
Standardize on **`clawcontainer` / ClawLess** for all browser-native agent sandboxing:
- Sandboxed execution is governed by a declarative policy file specifying allowable paths and syscalls.
- Every command executed by external agents is recorded in the local, non-transmitting audit ledger.
- Development-only dependency in Phase 10.4, laying the exact foundation for Phase 11.5 Agentic UI.

### Positive Consequences
- True zero-server agent sandboxing inside browser WebAssembly.
- Complies with Polyglot Code Studio's open-source self-hosted licensing mandate.
- High stability and broad package compatibility.

### Negative Consequences
- Initial WebContainer WASM bootstrap latency (~1.5s on first session init).

## Compliance & Governance
- Verified by automated test suite in `scripts/verify-all.ts` (Suite 42).
- Append-only architectural record.
