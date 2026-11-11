# Polyglot Code Studio — Honest Codebase Map

**Phase**: 14.9.9.2  
**Target Milestone**: 14.9.9.2  
**Repository**: `Dede78dede/Poliglot-Lean4-python-`

---

## 1. Structural Reality & System Classification

To maintain epistemic honesty and prevent developer drift, every major subsystem in this repository is explicitly classified into one of three structural categories:

### A. Live Production Path (Active Execution)
Components and modules actively executed in the running client web application:
- **Root Shell (`src/App.tsx`)**: The primary active UI. Implements high-density control panels, the unified Monaco/textarea workspace, and live state coordination.
- **Python Execution (`src/services/python/`)**: Client-side execution via Pyodide (`pyodide.ts`), handling sandboxed Python code runtimes, standard library inspection, and stdout capture.
- **Rate Limiting & Telemetry (`src/middleware/rate-limit.ts`, `server/src/services/telemetry/`)**: In-flight API throttling with sliding windows and recursive PII/token redaction.
- **Contract Verification (`src/contracts/`, `schemas/contracts.json`)**: Bidirectional Zod schema definitions with strict type parity across Python and Lean endpoints.

### B. Dormant / Advanced Feature Modules (Unmounted in Default Layout)
Rich subsystems fully built and tested across verification suites (Suites 134–194), but currently unmounted or gated behind feature flags in default view:
- **Specialized Drawers (`src/components/femev/`, `src/components/chat/`, `src/components/diff/`)**:
  - `FemevDrawer.tsx`: Formal-Empirical Equivalence Verification drawer. Fully implemented with numeric evidence, awaiting Phase 15 activation waves.
  - `ProofChatPanel.tsx`: Autoformalization and proof-assistant interaction panel.
  - `CodeDiffView.tsx`: Side-by-side AST and text difference viewer.
- **Virtual File System & Memory Tier 5 (`src/services/vfs/`, `src/services/storage/`)**:
  - Encrypted token vault, IndexedDB workspace snapshots, and multi-tier memory caching.
- **Complex UI Toolbars (`src/components/toolbars/`)**:
  - Secondary layout configurations preserved for future multi-window workspace releases.

### C. Developer Tooling & Verification Infrastructure (Strictly Isolated)
Tools and test harnesses that must **never** leak into runtime bundles (`dist/`):
- **Tooling Foundation (`tools/`)**:
  - `tools/search/allowlist.json`: Permitted developer search engines (`ogrep`, `semcode`, `codeindex`, `repomix`).
  - `tools/codeindex/`: Project-owned deterministic static code indexer (`generate.ts`, `check.sh`).
  - `tools/context/`: Local context pack wrapper (`pack.sh`).
- **Epistemic Authority Sweepers (`scripts/`)**:
  - `scripts/seal-integrity-sweep.sh`: Audits against forbidden seal forging.
  - `scripts/check-flag-expiry.ts`: Strict TTL governance.
  - `scripts/verify-all.ts` & `scripts/verify-extended.ts`: Comprehensive test suite orchestrators.

---

## 2. Epistemic Verification Authority

The repository strictly enforces a **single source of epistemic authority**:
- **Sole Permitted Authority**: `server/src/services/verification/hybrid-adjudicator.ts:264`.
- **Contract**: Only the server-side `HybridAdjudicator` executing against verified Lake/Kimina toolchains may issue:
  - `verified: true`
  - `certificationTier: 'KERNEL_VERIFIED_TIER5'`
  - Cryptographic verification seal objects.
- All client-side components (`src/`) and mock endpoints return `verified: false` and `unconfirmed` / `NUMERIC_CERTIFICATE_UNVERIFIED` tiers.

---

## 3. Directory Layout & Boundaries

```
├── .codeindex/               # Deterministic static code index (gitignored)
├── docs/
│   ├── adr/                  # Architecture Decision Records (ADR-0001 to ADR-019, ADR-027, ADR-031)
│   ├── architecture/         # System specifications (codebase-map, feature-flags, etc.)
│   └── design-system/        # UI token contracts and visual system specs
├── schemas/                  # Exported JSON schemas for API contracts
├── scripts/                  # CI verification and governance scripts
├── server/
│   └── src/
│       ├── routes/           # Server API routes (/api/v1/lean, /api/v1/python)
│       └── services/         # Adjudicator, Lean runner, telemetry
├── src/                      # Client React & TypeScript application
│   ├── components/           # UI components (live App shell & dormant drawers)
│   ├── contracts/            # Zod contract schemas
│   ├── services/             # Client services (Pyodide, VFS, Flags)
│   └── types/                # Core domain types
├── tests/
│   ├── phase-10.*/           # Phase 10 integration suites (Suites 1–133)
│   └── phase-14/             # Formal verification suites (Suites 134–194)
└── tools/                    # Developer tooling (strictly isolated by arch rule)
    ├── codeindex/            # Static code index generator and freshness checker
    ├── context/              # Context packaging scripts
    └── search/               # Verified search tool catalog and security model
```
