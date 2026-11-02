# Phase 11 Deferred Tasks Architecture Document

**Polyglot Code Studio — Deferral Registry**  
*Explicitly deferred from Phase 10.9, Phase 10.9.5, Phase 10.9.7, and Phase 10.10 to Phase 11*

---

## 1. Overview

To preserve the strict **"no new runtime feature, no new container, no new dependency"** contract of Phase 10.9, Phase 10.9.5, Phase 10.9.7, and Phase 10.10, the following non-blocking maintenance, scaling, and integration capabilities are formally scheduled for Phase 11:

### Deferred Items:

1. **Command Registry Comprehensive Audit**:
   - Expansion from original 62 navigation commands to reflect all new actions added across Phases 10.2–10.9.7 (Unified Search, Blueprint Stub Generation, Evidence Timeline, LSpec CI Template).
   - Planned for Phase 11 Task C1.

2. **Frontend ↔ Backend Contract Parity Testing**:
   - Automated schema parity runner (`tests/contract/schema-parity.test.ts`) validating Express routes against Zod frontend client schemas.
   - Planned for Phase 11 Task C2.

3. **Dead Code & Dependency Pruning Audit**:
   - Comprehensive static audit using `ts-prune`, `knip`, and `depcheck` to eliminate orphaned types and utility functions.
   - Planned for Phase 11 Task C3.

4. **Test Sharding & CI Parallelization**:
   - Sharding test suites 1–93 across parallel GitHub Actions matrix runners to reduce execution time.
   - Planned for Phase 11 Task C4.

5. **Full Mathesis Autoformalization Bridge (DELIVERED Phase 11.2)**:
   - Implemented in Phase 11.2 (Sprint 11.2.4) via remote `MATHESIS_ENDPOINT`, `LeanScorer` validation, and `MathesisPanel`.

6. **Educational Mode Curriculum Expansion**:
   - Dynamic game-state evaluation for Robo and Lean4Game interactive theorem proving levels.
   - Planned for Phase 11.3 Task E1.

7. **Multi-User Isolation & Yjs CRDT Co-Editing (DELIVERED Phase 11.2)**:
   - Implemented in Phase 11.2 (Sprint 11.2.5) via Hocuspocus server, `y-monaco@0.1.6`, `.collab/` snapshots, and `CollaborationPanel`.

8. **OpenTelemetry Distributed Tracing (DELIVERED Phase 11.2)**:
   - Implemented in Phase 11.2 (Sprint 11.2.3) via `@opentelemetry/sdk-trace-web@2.12.0`, `StructuredLogger` correlation, and local OTLP export.
   - Migration to OpenTelemetry 3.0.x scheduled for Phase 11.3.

*Last verified: 2026-10-29*
