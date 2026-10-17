# ADR-0009: Navigation Foundation: Dual-Tier Menu, cmdk Palette, and Status Bar

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
The original TopBar suffered from button overflow at <1400px viewports with scattered keyboard shortcuts.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: Navigation Foundation: Dual-Tier Menu, cmdk Palette, and Status Bar

## Decision Outcome
Implement dual-tier navigation: Tier 1 MenuBar (@szhsin/react-menu), Tier 2 Quick Toolbar, cmdk palette, tinykeys chord resolver, and reactive Context Key Service (28 keys).

### Positive Consequences
- Unlimited submenu nesting, 62 commands cataloged, Ctrl+K / Ctrl+Shift+P / F1 triggers, full-width status telemetry.

### Negative Consequences
- Added ~12.8 KB gzipped bundle weight (well within 30 KB budget).

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0009.
