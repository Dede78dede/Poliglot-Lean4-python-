# ADR-0003: Five-Tier Hierarchical Memory & Content-Addressed Storage

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Handling multi-file Lean projects with hundreds of definitions causes browser tab memory bloat if kept in memory indefinitely.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Five-Tier Hierarchical Memory & Content-Addressed Storage

## Decision Outcome
Implement a 5-tier memory manager: Tier 1 (LRU AST cache), Tier 2 (Dirty buffer), Tier 3 (IndexedDB), Tier 4 (Server session), Tier 5 (Cold storage with SHA-256 deduplication and OPFS).

### Positive Consequences
- O(1) in-memory lookups, zero byte duplication for unmodified projects, automatic 72h lifecycle promotion.

### Negative Consequences
- Coordination complexity across tier promotion and demotion boundaries.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0003.
