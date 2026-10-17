# ADR-0005: cmdk for Scientific Workbench Command Palette

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
As features reached 45+, keyboard accessibility and command discoverability required a centralized, accessible command palette.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: cmdk for Scientific Workbench Command Palette

## Decision Outcome
Use cmdk unstyled primitives with custom dark laboratory styling and Ctrl+K primary shortcut.

### Positive Consequences
- Full WAI-ARIA combobox compliance, built-in fuzzy filtering, recents tracking, zero-pill aesthetics.

### Negative Consequences
- Requires custom backdrop and theme coordination to align with IDE theme.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0005.
