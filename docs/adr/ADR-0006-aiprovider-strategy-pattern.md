# ADR-0006: AiProvider Strategy Pattern with Local Pantograph Fallback

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Supporting AI proof repair across diverse users requires supporting cloud providers (Gemini, Mistral, Groq) alongside local offline proving.

## Decision Drivers
- Self-hosted reliability and reproducibility
- Zero-sorry mathematical soundness
- WAI-ARIA accessibility and keyboard ergonomics
- Zero-pill laboratory aesthetic discipline

## Considered Options
1. Alternative Approach
2. **Chosen Approach**: AiProvider Strategy Pattern with Local Pantograph Fallback

## Decision Outcome
Implement the Strategy Pattern via AiProviderRegistry with NoAiProvider/Pantograph as default and user-consented cloud adapters.

### Positive Consequences
- Guaranteed offline functionality, strict 10k character sanitization, zero unsolicited data egress.

### Negative Consequences
- Different models provide varying proof candidate success rates.

## Compliance & Governance
- Verified by automated test suites in scripts/verify-all.ts.
- Append-only record. Any future change must be introduced via a new ADR that explicitly supersedes ADR-0006.
