# Phase 11 Deferred Tasks Architecture Document

**Polyglot Code Studio — Deferral Registry**  
*Explicitly deferred from Phase 10.9 to Phase 11*

---

## 1. Overview

To preserve the strict **"no new runtime feature, no new container, no new dependency"** contract of Phase 10.9 and Phase 10.9.5, the following non-blocking maintenance and testing capabilities are formally scheduled for Phase 11:

### Deferred Items:

1. **Command Registry Comprehensive Audit**:
   - Expansion from original 62 navigation commands to reflect all new actions added across Phases 10.2–10.8 (LeanFlow, leanscreen, LeanCert, Heron, LSpec, doc-gen4, Verso, Lean Atlas).
   - Planned for Phase 11 Task C1.

2. **Frontend ↔ Backend Contract Parity Testing**:
   - Automated schema parity runner (`tests/contract/schema-parity.test.ts`) validating Fastify/Express routes against Zod frontend client schemas.
   - Planned for Phase 11 Task C2.

3. **Dead Code & Dependency Pruning Audit**:
   - Comprehensive static audit using `ts-prune`, `knip`, and `depcheck` to eliminate orphaned types and utility functions.
   - Planned for Phase 11 Task C3.

4. **Test Sharding & CI Parallelization**:
   - Sharding test suites 1–83 across 4 parallel GitHub Actions matrix runners to reduce execution time from ~45 minutes to <12 minutes.
   - Planned for Phase 11 Task C4.
