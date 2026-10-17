# ADR-0004: Biome v2 as Primary Linter and Formatter

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Linting and formatting dozens of files in CI and pre-commit must be sub-second to prevent developer friction.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Biome v2 as Primary Linter and Formatter

## Decision Outcome
Adopt Biome v2 as primary linter and formatter, supplemented by tsc --noEmit for complete type-checking.

### Positive Consequences
- 20x speedup, unified configuration, zero Prettier formatting conflicts, type inference without tsc.

### Negative Consequences
- Covers ~75% of typescript-eslint type-aware rules; requires secondary CI tsc check.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0004.
