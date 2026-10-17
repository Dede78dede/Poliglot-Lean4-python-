# ADR-0008: Blueprint Theorem DAG with Atomic Node Claiming

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Collaborative proof engineering requires coordinating multiple mathematicians working on theorem dependency graphs without edit collisions.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Blueprint Theorem DAG with Atomic Node Claiming

## Decision Outcome
Implement Archon Horizon Blueprint DAG with exclusive 30-minute leases, cryptographic SHA-256 ledger chaining, and 5-term kernel seals.

### Positive Consequences
- Eliminates race conditions, provides visual dependency tracking, records immutable milestone ledger.

### Negative Consequences
- Requires WebSocket relay and TTL renewal for active proof work.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0008.
