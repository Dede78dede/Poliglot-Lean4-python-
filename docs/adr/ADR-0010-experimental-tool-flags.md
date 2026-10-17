# ADR-0010: Feature Flags for Experimental Prover Toolchains (Duper, LeanSage)

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Automated theorem provers like Duper and LeanSage evolve rapidly and may break stability on pinned Lean toolchains.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Feature Flags for Experimental Prover Toolchains (Duper, LeanSage)

## Decision Outcome
Gate experimental tools behind ENABLE_* flags (default false) with documented limitations and graceful fallback to verified Pantograph search.

### Positive Consequences
- Protects production proof workflows from toolchain breakage while allowing cutting-edge research.

### Negative Consequences
- Requires manual configuration to opt into experimental tools.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0010.
