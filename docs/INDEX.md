# Polyglot Code Studio — Architectural Documentation Index

**Milestone**: Phase 14.9.9.1 (Window 3)  
**System Architecture**: Dual-Runtime IDE & Formal Verification Studio (Python 3.14 + Lean 4)

---

## 1. Core Architecture Decisions (ADRs)

| ADR | Title | Status | Scope |
| :--- | :--- | :---: | :--- |
| **[ADR-0001](adr/ADR-0001-pyodide-python-runtime.md)** | Pyodide In-Browser Python Runtime | Accepted | Client-side Python execution |
| **[ADR-0002](adr/ADR-0002-kimina-lean-server.md)** | Kimina Lean 4 Server Subsystem | Accepted | Lean 4 language server daemon |
| **[ADR-0003](adr/ADR-0003-five-tier-memory-architecture.md)** | Five-Tier Memory Hierarchy | Accepted | Context caching and session state |
| **[ADR-0014](architecture/verification-formula.md)** | Verification Formula Canonicalization | Accepted | 5-term verification formula |
| **[ADR-0015](architecture/epistemic-authority.md)** | Epistemic Authority Isolation | Accepted | Single certifying authority |
| **[ADR-0016](adr/ADR-016-phase-15-scope.md)** | Phase 15 Scope & Activation Waves | Accepted | Roadmap from 172 to 195 suites |
| **[ADR-0017](adr/ADR-017-bundle-budget-revision.md)** | Bundle Budget Revision for Phase 15 | Accepted | O1–O3 bundle budget limits |
| **[ADR-0018](adr/ADR-018-removal-of-client-seal-path.md)** | Removal of Client Seal Path | Accepted | Total excision of certifyWithKernel |
| **[ADR-0027](adr/ADR-0027-leancert-authority-model.md)** | LeanCert Certified Numerical Authority | Accepted | Numerical interval verification |
| **[ADR-0031](adr/ADR-0031-cross-layer-automation.md)** | Cross-Layer Pre-Check Automation | Accepted | FEMEV pre-check before proof |

---

## 2. Architecture Specifications (`docs/architecture/`)

- **[Feature Flags](architecture/feature-flags.md)**: Governance, fail-closed behavior, and 62-flag inventory.
- **[CI/CD & Supply Chain](architecture/ci-cd.md)**: Pipeline security, exact dependency pinning, and `--ignore-scripts`.
- **[Fallback Contracts](architecture/fallback-contracts.md)**: 4-tier degradation strategy and RFC 9457 error mappings.
- **[MCP Architecture](mcp-architecture.md)**: Model Context Protocol client-server integration.
- **[Memory Architecture](memory-architecture.md)**: Virtual file system, session caches, and persistence.

---

## 3. Operations and Reference

- **[Limitations](limitations.md)**: Known constraints and operational boundaries.
- **[Deployment](deployment-self-hosted.md)**: Containerized and standalone deployment guides.
- **[Tech Debt Dashboard](tech-debt-dashboard.md)**: Active debt metrics and remediation plans.
