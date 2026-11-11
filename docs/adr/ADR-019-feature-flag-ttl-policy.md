# ADR-019: Feature Flag TTL Policy and Grandfathering Governance

- **Status**: Accepted
- **Date**: 2026-11-11
- **Context**: Phase 14.9.9.2 (Window 1 Part A, G-D5)
- **Deciders**: Verification Architect, Quality Lead, Integration Owner

## Context

Polyglot Code Studio maintains 62 registered feature flags across experimental runtime, frontend UI drawers, mathematical solvers, and protocol bridges (`src/config/feature-flag-registry.ts`). Prior to Phase 14.9.9.1, flag lifecycle management lacked an explicit, enforceable Time-To-Live (TTL) specification, risking permanent flag accumulation and governance debt.

In Phase 14.9.9.1, all 62 flags were annotated with complete metadata (`owner`, `phase`, `category`, `behaviorWhenOff`, `createdAt`, `expiresAt`, `description`). To ratify this governance durably without breaking backward compatibility or introducing false expiry failures, this ADR formalizes the operational TTL policy.

## Decision

1. **Grandfathering Current Inventory**: All 62 pre-existing feature flags established in Phase 14.9.9.1 are grandfathered with an explicit expiration date of `2027-12-31`. These flags remain valid in both permissive and strict CI runs until that deadline or until their respective modules undergo retirement or stabilization.
2. **Maximum TTL for New Flags**: Any feature flag introduced after Phase 14.9.9.2 must specify an `expiresAt` timestamp not exceeding **180 days** from its `createdAt` date.
3. **Mandatory Metadata Fields**: Every flag registration must strictly provide:
   - `owner`: Responsible team or engineer.
   - `phase`: Associated development phase (e.g. `phase-14`).
   - `category`: Functional domain (`core`, `verification`, `bridge`, `experimental`, `ui`).
   - `behaviorWhenOff`: Explicit architectural fallback description.
   - `createdAt`: ISO 8601 creation timestamp.
   - `expiresAt`: ISO 8601 expiry timestamp.
   - `description`: Plain-text explanation of the gated feature.
4. **CI Enforcement**: The script `scripts/check-flag-expiry.ts --strict` runs as a blocking CI gate. Any expired flag, missing metadata, or TTL exceeding 180 days for new flags fails the build.

## Alternatives Considered

- **90-Day Maximum TTL**: Rejected because deep mathematical toolchain integrations (such as Lean 4 compiler bridges and Pantograph drivers) require longer evaluation cycles across upstream release candidates.
- **Unconstrained Expiry**: Rejected because unmaintained flags create latent dead-code paths, complicate static analysis, and obscure verification authority boundaries.

## Consequences

- All 62 existing flags remain 100% compliant under `npm run check-flag-expiry:strict`.
- Suite 192 dynamically asserts parity between the registered flag catalog, the audit report, and this TTL governance policy.
- Flags cannot linger indefinitely in the codebase without formal lifecycle review.
