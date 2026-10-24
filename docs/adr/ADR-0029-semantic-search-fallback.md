# ADR-0029: Semantic Search Provider Architecture and Fallback Chain

## Status
Accepted

## Context
Finding lemmas and definitions in Mathlib is one of the main bottlenecks in interactive theorem proving. Multiple semantic search services exist: Lean Finder V2 (`leanfinder.github.io`), LeanSearch v2 (`leansearch.net`), and LeanExplore (`leanexplore.com`). Relying on a single third-party provider introduces availability risks and potential downtime.

## Decision
1. **Strategy Pattern & Registry**: Implement `SemanticSearchRegistry` managing providers implementing `SemanticSearchProvider`.
2. **Default Provider**: `Lean Finder V2` is the primary default provider (Apache-2.0, multi-version support, 100% free).
3. **Fallback Chain**: Queries execute through `Lean Finder V2` → `LeanSearch v2` (standard/reasoning mode) → `LeanExplore` (multi-package read-only).
4. **No Silent Fallback**: If all providers fail or are unreachable, the system raises `503 SEARCH_UNAVAILABLE` with diagnostic details.
5. **State Reactivity**: The registry is bridged to client components via `useSyncExternalStore`.

## Consequences
- High resilience and zero user-visible disruption during single-provider outages.
- Clear data source provenance on every returned declaration.
