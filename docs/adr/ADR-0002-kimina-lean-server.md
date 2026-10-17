# ADR-0002: Kimina Lean Server for Formal Theorem Verification

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Formal verification requires communicating with the Lean 4 kernel for typechecking, tactic state inspection, and proof diagnostics.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Kimina Lean Server for Formal Theorem Verification

## Decision Outcome
Deploy Kimina as a WebSocket/JSON-RPC server running Lean 4 with toolchain alignment (v4.28.0 to v4.35.0-rc4), with a simulated client fallback.

### Positive Consequences
- Real-time tactic feedback, goal inspection, kernel-certified verification seals.

### Negative Consequences
- Requires backend server process for active Lean compilation when not in simulation mode.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0002.
