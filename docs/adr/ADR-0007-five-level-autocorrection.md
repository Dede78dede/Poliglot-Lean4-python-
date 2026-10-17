# ADR-0007: 5-Level Auto-Correction with Kernel Gates

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Syntactic errors, missing imports, and sorry placeholders require layered automated repair without compromising theorem soundness.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: 5-Level Auto-Correction with Kernel Gates

## Decision Outcome
Construct an escalating L1-L5 auto-correction hierarchy: L1 (Deterministic Ruff/LSP), L2 (Compiler feedback), L3 (Local PyFixer/Leanstral), L4 (Cloud AXLE), L5 (Veriphy CAS), sealed by 5-term kernel gates.

### Positive Consequences
- Zero-sorry enforcement, untrusted repairs never enter blueprint without kernel verification.

### Negative Consequences
- L4 and L5 require user consent or computer algebra backend.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0007.
