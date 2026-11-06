# Master Implementation Plan: Polyglot Code Studio Consolidation & Release Engineering (Revised)

**Target Repository**: `Dede78dede/Poliglot-Lean4-python-`  
**Repository Baseline**: branch `main`, commit `296a69d16095adcd2dab26d3225332547af725c2`  
**Audience**: Polyglot Development Team, QA, Architecture, Lean Engineering, and Release Engineering  
**Document Purpose**: Definitive, executable engineering plan resolving findings F-01 through F-13 from the project Master Plan while strictly implementing the requirements from `Implementation_Plan_Review_and_Required_Revisions_f0f32c0a.md`.  
**Document Language**: English

---

## 1. Status Taxonomy & Project Baseline

Every statement, task, and architectural component in this plan is explicitly classified under the following status taxonomy:
- `[Confirmed Decision]`: Direction explicitly confirmed by project leadership and review guidelines.
- `[Repository Evidence]`: Factually verified directly from repository files at the baseline commit.
- `[Trusted Project Baseline]`: Verified baseline metrics carried forward from the Google AI Studio implementation agent.
- `[Proposed Architecture]`: Engineering designs and protocols submitted for execution under this plan.
- `[Open Decision]`: Architecture choice requiring sign-off at kickoff gates.

### Baseline Provenance
- `[Trusted Project Baseline]`: Phase 14 verification baseline supplied by the Google AI Studio agent:
  - 165 test suites / 260 cumulative sub-tests passing at 100.0% (execution time: 288ms).
  - Production client bundle (`dist/assets`): Main entry chunk `150.01 KB` (budget $\le 180.00\text{ KB}$ gzip), Total client JS `243.12 KB` (budget $\le 260.00\text{ KB}$ gzip).
  - Status: Accepted as trusted planning input. Candidate release gates (Sprint 5) will execute fresh, independent test runs and bundle measurements tied directly to the exact release commit SHA.

---

## 2. Confirmed Product Scope & Foundational Directives

1. **Full Modular IDE Scope `[Confirmed Decision]`**:
   The target product is the full modular IDE workspace, not merely a root demo. The scope encompasses:
   - Dual Monaco Editor (Lean 4 and Python) with split-screen (side-by-side or stacked).
   - Draggable tab reordering with LIFO closed tab restoration stack (max 10 entries).
   - Symbol-aware breadcrumbs (tracking definitions, theorems, lemmas, structures, inductive types).
   - 3-Zone status bar (telemetry, document attributes, memory/diagnostics).
   - Persistent Python Web Worker notebook (`.polyglot-notebook` and Jupyter `.ipynb` nbformat v4).
   - Full accessibility compliance (WCAG 2.2 AA keyboard navigation, visible focus, ARIA live alerts).

2. **Dual Lean Verification Pathways `[Confirmed Decision]`**:
   - **Interactive Snippet Pathway**: Low-latency snippet elaboration via `/api/v1/lean/execute` backed by a real Kimina Lean Server.
   - **Project Build Pathway**: Multi-file Lake project compilation via `/api/v1/projects/lean/build` backed by an isolated Lake runner container.

3. **Hybrid Cross-Path Consistency Policy `[Confirmed Decision]`**:
   - Kimina and Lake results are evaluated side-by-side only when inputs, toolchain, dependencies, and environments are demonstrably comparable.
   - Consensus verdict is `confirmed_valid` only when both engines complete in real mode, agree on the identical scope and source digest, and the transitive axiom audit passes.
   - If engines disagree, comparability fails, or an engine times out/fails, the verdict is strictly `unconfirmed`.
   - Both sub-results remain independently inspectable in the UI; neither engine's output overwrites the other.

4. **Audited Router & Worker Interfaces `[Repository Evidence]`**:
   - `server/src/routes/lean.ts`: Exports `createLeanRouter(proxy: KiminaClientProxy)`.
   - `server/src/routes/projects.ts`: Exports `createProjectsRouter(runner: LeanProjectRunner)`.
   - `server/src/routes/kimina.ts`: No `createKiminaRouter()` factory exists in the repository. Kimina proxy operations are encapsulated within `KiminaClientProxy` and consumed by `createLeanRouter`. No unverified router will be referenced or mounted.
   - Worker Paths: Python execution and notebook messaging are located at `src/workers/notebook.worker.ts` and `src/workers/pyodide.worker.ts` (not under `src/services/`).

5. **Confirmed Axiom Policy `[Confirmed Decision]`**:
   - Default Allowlist: `propext`, `Classical.choice`, `Quot.sound`.
   - Strictly Rejected: `sorryAx`, `_native` axioms, and unapproved custom axioms.

---

## 3. Findings & Core Remediation Matrix

| ID | Priority | Finding Evidenced at Baseline | Required Remediation in Revised Plan |
|---|---|---|---|
| **F-01** | **P0** | `src/App.tsx` produced static `verified: true` after 400ms via `setTimeout` and rendered `SEAL_KERNEL_VERIFIED_TIER5`. | Eradicate mock success timer and client-side seal. Connect buffer dispatch to real backend endpoints. Display authentic states (`idle`, `submitting`, `evaluating`, `verified`, `failed`, `simulated`, `unconfirmed`). |
| **F-02** | **P0** | `ProofCoordinator` used string heuristics (`goal.includes`) and emitted `kernelVerified: true` with constant certificates. | Disable heuristic certification. Gate automated tactic synthesis behind explicit flags (`ENABLE_PROVEPY=false`) returning typed RFC 9457 errors unless verified by an authentic Lean kernel. |
| **F-03** | **P0** | Lean runner Dockerfile returned stub HTTP 200 without `/build`. `LeanProjectRunner` assigned `exitCode = 0` if omitted. | Rebuild isolated Lake runner with real `/build` endpoint. Parse explicit process exit codes, stdout, stderr, build duration, and target name; forbid defaulting exitCode to 0. |
| **F-04** | **P1** | `lean-executor` called `/api/v1/lean/execute`, but `createLeanRouter` was not mounted in standard `server.ts`. | Instantiate `KiminaClientProxy`, pass to `createLeanRouter(proxy)`, and mount at `/api/v1/lean` in `server.ts`. |
| **F-05** | **P1** | Backend wrote session directories locally without mounting them into runner Docker container. | Implement secure workspace transfer: structured upload with `ZipValidator` (CVE-2018-1002200 traversal safe) or explicitly shared named volumes with restricted permissions. |
| **F-06** | **P1** | `verification-formula.ts` relied on regex matching for `sorry` and declarations without structural dependency checking. | Replace source-regex matching with structured compiler message analysis and a dedicated transitive axiom dependency audit (`#print axioms`). |
| **F-07** | **P1** | Documented routers were not mounted in `server.ts`. | Mount audited routers (`createLeanRouter`, `createProjectsRouter`) with required injected dependencies in `server.ts`. Fail closed if dependencies are unconfigured. |
| **F-08** | **P1** | Contract parity between Zod, JSON Schema, and Pydantic relied on simulated mocks. | Author canonical OpenAPI 3.1 / JSON Schema Draft 2020-12 specifications. Test runtime Zod and Pydantic validators on a shared, versioned fixture corpus. |
| **F-09** | **P1** | `verify-all.ts` executed a subset of test suites; reports were historical snapshots. | Map all suites to explicit CI jobs with execution logs tied to candidate commit SHA. Eliminate tautological assertions. |
| **F-10** | **P1** | Docker Compose referenced missing root Dockerfile; runner ports were exposed to host. | Fix root `Dockerfile` and `docker/lean-runner/Dockerfile`. Keep runner on private container network without publishing ports to the host. |
| **F-11** | **P2** | `/api/health` returned hardcoded static JSON. | Separate `/healthz` (liveness) from `/readyz` (readiness). Evaluate actual Kimina and Lake runner socket connectivity. |
| **F-12** | **P2** | Inconsistent security defaults: rate limit preceded auth; CORS allowlist was permissive. | Enforce fail-closed CORS in production. Sequence middleware: IP sliding-window $\to$ Bearer auth $\to$ user quota. Enforce separate rate limit on `/mcp` (30 rpm). |
| **F-13** | **P2** | Divergence across documentation, README, and feature status matrix. | Maintain a single, CI-verified feature matrix distinguishing code present, mounted, active, and tested. |

---

## 4. Technical Architecture: Dual Pathways & Hybrid Adjudication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Polyglot Code Studio Architecture                     │
├────────────────────────────────────────┬────────────────────────────────────┤
│             Frontend Client            │          Express API Server        │
│                                        │                                    │
│  ┌──────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│  │   Full Modular IDE Shell         │  │  │   server.ts Root Bootstrap   │  │
│  │   - Dual Monaco Split-Editor     │  │  │   - Fail-Closed CORS Policy  │  │
│  │   - TabsStore (drag/LIFO stack)  │  │  │   - IP Sliding-Window Limiter│  │
│  │   - Breadcrumbs & Outline        │  │  │   - Bearer Token Vault Auth  │  │
│  │   - 3-Zone Status Bar Telemetry  │  │  └──────────────┬───────────────┘  │
│  └──────────────────┬───────────────┘  │                 │                  │
│                     │ HTTP / SSE       │                 │ Route Registry   │
│                     ▼                  │                 ▼                  │
│  ┌──────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│  │   Hybrid Result State Machine    │  │  │   Mounted Router Factories   │  │
│  │   - confirmed_valid              │◄─┼──┤   - /api/v1/lean (snippet)   │  │
│  │   - confirmed_invalid            │  │  │   - /api/v1/projects (build) │  │
│  │   - unconfirmed (disagree/diff)  │  │  │   - /healthz & /readyz       │  │
│  └──────────────────┬───────────────┘  │  └──────────────┬───────────────┘  │
│                     │                  │                 │                  │
│                     ▼                  │                 │                  │
│  ┌──────────────────────────────────┐  │                 ▼                  │
│  │   src/workers/notebook.worker.ts │  │  ┌──────────────────────────────┐  │
│  │   src/workers/pyodide.worker.ts  │  │  │   Hybrid Adjudicator Service │  │
│  │   - Persistent session globals   │  │  │   - Comparability Predicate  │  │
│  │   - nbformat v4 serialization    │  │  │   - Transitive Axiom Audit   │  │
│  └──────────────────────────────────┘  │  └──────┬────────────────┬──────┘  │
│                                        │         │                │         │
└────────────────────────────────────────┴─────────┼────────────────┼─────────┘
                                                   │                │
                        ┌──────────────────────────┘                └──────────────────────────┐
                        ▼                                                                      ▼
    ┌──────────────────────────────────────┐                               ┌──────────────────────────────────────┐
    │     Kimina Lean Server (Snippet)     │                               │       Isolated Lake Runner (Build)   │
    │  - Pinned Upstream Image Digest      │                               │  - Pinned lean-toolchain & Manifest  │
    │  - Target /api/check Contract        │                               │  - Real /build endpoint execution    │
    │  - Preserves Structured sorries      │                               │  - Private Docker Network (No Host)  │
    │  - Strict ID Correlation Matching    │                               │  - Structured exitCode, time, stdout │
    └──────────────────────────────────────┘                               └──────────────────────────────────────┘
```

---

## 5. Canonical Verification Protocol & Hybrid Semantics `[Proposed Architecture]`

### 5.1 Protocol Request Payload (`polyglot.verification.v1`)
All verification dispatches submit a standardized, immutable JSON envelope:
```json
{
  "protocolVersion": "polyglot.verification.v1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "scope": "snippet",
  "targetIds": ["theorem_main"],
  "sourceDigest": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "contextDigest": "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
  "environment": {
    "leanToolchain": "leanprover/lean4:v4.35.0",
    "kiminaImageDigest": "sha256:d5f2a1b9c8e7...",
    "lakeRunnerImageDigest": "sha256:a1b2c3d4e5f6...",
    "manifestDigest": "sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"
  },
  "axiomPolicyId": "polyglot.axioms.standard.v1",
  "requireConsensus": true
}
```

### 5.2 Sub-Engine Result Schema
Both Kimina and Lake emit structured evidence containing:
- `engine`: `"kimina"` | `"lake"`.
- `contractVersion`: Upstream adapter or runner protocol version.
- `outcome`: `"accepted"` | `"rejected"` | `"inconclusive"` | `"unavailable"` | `"simulated"`.
- `requestId`, `sourceDigest`, `contextDigest`, `targetIds`.
- `startedAt` and `completedAt`: ISO 8601 / RFC 3339 UTC timestamps.
- `durationMs`: Non-negative integer (or `null` if unmeasured).
- `exitCode`: Integer process exit code for Lake runner; `null` for Kimina HTTP REPL.
- `diagnostics`: Array of `{ severity: "error" | "warning" | "info", message: string, code?: string, file?: string, line?: number, column?: number }`.
- `axiomAudit`: `{ status: "passed" | "failed" | "not_run" | "not_applicable", observedAxioms: string[], allowedAxioms: string[] }`.
- `error`: `null` on normal execution; typed RFC 9457 error code on system/transport failure.

### 5.3 Hybrid Consensus Decision Matrix

| Kimina Outcome | Lake Outcome | Comparability Check | Transitive Axiom Audit | Hybrid Verdict | UI Display & Badge |
|---|---|---|---|---|---|
| `accepted` | `accepted` | Exact match on source, context, toolchain, and manifest | Passed allowlist (`propext`, `Classical.choice`, `Quot.sound`) | `confirmed_valid` | "Verified — Kimina and Lake agree" + Tier 5 Badge |
| `rejected` | `rejected` | Exact match | Evaluated under same policy | `confirmed_invalid` | "Rejected — Proof obligation failed" (Red border, diagnostics listed) |
| `accepted` | `rejected` | Exact match | Any | `unconfirmed` | "Verdict not confirmed — Engines disagree" (Amber badge, no Tier 5) |
| `rejected` | `accepted` | Exact match | Any | `unconfirmed` | "Verdict not confirmed — Engines disagree" (Amber badge, no Tier 5) |
| `accepted` | `accepted` | Digest, context, toolchain, or target mismatch | Any | `unconfirmed` | "Verdict not confirmed — Context not comparable" |
| Any | `unavailable` / `timeout` | Any | Any | `unconfirmed` | "Verdict not confirmed — Lake runner unavailable or timed out" |
| `unavailable` / `timeout` | Any | Any | Any | `unconfirmed` | "Verdict not confirmed — Kimina server unavailable or timed out" |
| `simulated` | Any | Any | Any | `unconfirmed` | "⚠ SIMULATED — NON-CERTIFYING" (Amber warning, consensus strictly blocked) |

**Derived Backward-Compatible Field**:
`verified: boolean` is derived exclusively on the server as `verdict === "confirmed_valid"`. No client heuristic, simulation, or individual engine result may set `verified: true`.

---

## 6. Revised Five-Sprint Execution Roadmap

### Sprint 1: Epistemic Truthfulness, Interface Freeze & Core Route Mounting
**Workstream Owners**: WS-B (Lean Trust), WS-D (API), WS-E (Frontend), WS-A (Architecture).  
**Dependencies**: Baseline commit frozen.  
**Deliverables**:
- **T1.1 (F-01 Remediation)**: Refactor `src/App.tsx`.
  - Delete `setTimeout(..., 400)` mock execution producing synthetic `verified: true`.
  - Remove hardcoded `SEAL_KERNEL_VERIFIED_TIER5` rendering from the default demo state.
  - Wire execution dispatch to call `leanExecutorService.executeSnippet()` against `/api/v1/lean/execute`.
- **T1.2 (F-02 Remediation)**: Refactor `server/src/services/proof/proof-coordinator.ts`.
  - Remove regex string-matching (`goal.includes`) that emitted `kernelVerified: true`.
  - Gate proof generation behind `ENABLE_PROVEPY=false`; unverified tactic suggestions return `heuristic` status without kernel certificates.
- **T1.3 (F-04 & F-07 Remediation)**: Mount audited router factories in `server.ts`.
  - Instantiate `KiminaClientProxy` and mount `createLeanRouter(proxy)` at `/api/v1/lean`.
  - Instantiate `LeanProjectRunner` and mount `createProjectsRouter(runner)` at `/api/v1/projects`.
  - Explicitly fail closed with typed 503 errors if runner or proxy dependencies are unreachable.
- **T1.4 (F-11 Remediation)**: Implement dynamic `/healthz` (liveness) and `/readyz` (readiness) checking actual upstream reachability instead of static JSON.
- **T1.5**: Formalize ADR 015 documenting the `polyglot.verification.v1` protocol, comparability rules, and axiom policy.

**Gate S1 (Verification Gate)**:
- Behavioral test asserting empty, invalid, or unverified editor buffers never yield `verified: true` or display Tier 5 badges.
- Behavioral test asserting that calling `/api/v1/lean/execute` without Kimina connectivity returns typed 503 Problem Details, never SPA fallback.
- `tsc --noEmit` and `compile_applet` clean (0 errors).

---

### Sprint 2: Real Kimina Adapter, Lake Runner & Hybrid Adjudicator
**Workstream Owners**: WS-C (Runner/Platform), WS-B (Lean Trust), WS-D (API), WS-H (Security).  
**Dependencies**: Gate S1 passed.  
**Deliverables**:
- **T2.1 (F-03 Remediation)**: Build authentic isolated Lake runner container.
  - Implement `/build` endpoint in `docker/lean-runner/` invoking `lake build <target>`.
  - Capture explicit process exit code (integer), stdout, stderr, and elapsed time. Forbid defaulting missing exit codes to 0.
  - Run container under unprivileged user on private Docker network with no exposed host ports.
- **T2.2 (Kimina Wire Adapter)**: Refactor `server/src/services/kimina-client-proxy.ts`.
  - Pin upstream Kimina `/api/check` contract.
  - Preserve structured `messages` and `sorries` arrays.
  - Implement strict ID correlation: match response snippet `id` against submitted request `id`; reject reordered, duplicate, or missing IDs.
  - Map typed errors (`lean_error`, `repl_error`, `timeout_error`, `server_error`).
- **T2.3 (F-05 Remediation)**: Safe workspace transfer.
  - Enforce `ZipValidator` (CVE-2018-1002200 safe, 50MB limit) for multi-file project archives.
  - Isolate workspaces in ephemeral session directories (`data/sessions/<id>`) governed by `SESSION_POLICY`.
- **T2.4 (F-06 Remediation & Axiom Audit)**: Implement transitive axiom inspection.
  - Execute `#print axioms <target>` within the Lake runner context.
  - Validate observed axioms against allowlist (`propext`, `Classical.choice`, `Quot.sound`). Reject `sorryAx` or custom axioms.
- **T2.5 (Hybrid Comparator)**: Implement `server/src/services/verification/hybrid-adjudicator.ts`.
  - Execute comparability predicate over sourceDigest, contextDigest, toolchain, and manifestDigest.
  - Evaluate consensus decision matrix; output full evidence for both engines.

**Gate S2 (Verification Gate)**:
- Integration test suite executing:
  1. Valid theorem $\to$ `confirmed_valid`.
  2. False theorem $\to$ `confirmed_invalid`.
  3. Theorem with `sorry` or `admit` $\to$ rejected by axiom audit, verdict `confirmed_invalid`.
  4. Mismatched context/toolchain $\to$ `unconfirmed` (`not_comparable`).
  5. Lake timeout or Kimina outage $\to$ `unconfirmed` (`incomplete`).
  6. Disagreement between engines $\to$ `unconfirmed` (`disagree`).

---

### Sprint 3: Cross-Language Contracts, Worker Protocol & Security Hardening
**Workstream Owners**: WS-F (Python/Contracts), WS-H (Security), WS-D (API).  
**Dependencies**: Gate S2 passed.  
**Deliverables**:
- **T3.1 (F-08 Remediation)**: Author canonical OpenAPI 3.1 / JSON Schema Draft 2020-12 specifications for all boundary contracts.
  - Generate TypeScript Zod schemas and Python Pydantic v2 models (`extra='forbid'`, `strict=True`, `frozen=True`).
  - Author shared test fixtures exercising optional fields, discriminated unions (`ResultEnvelope`), coordinates, and serialization.
  - Replace mock parity tests with real runtime dual-validator execution.
- **T3.2 (Worker Protocol Audit)**: Audit and harden `src/workers/notebook.worker.ts` and `src/workers/pyodide.worker.ts`.
  - Implement request-ID correlation for notebook cell execution.
  - Implement cell execution cancellation, timeout teardown, and session persistence.
- **T3.3 (F-12 Remediation)**: Security hardening.
  - Enforce fail-closed CORS allowlist in production.
  - Sequence middleware: IP sliding-window rate limit $\to$ Bearer auth $\to$ user quota limit.
  - Mount `/mcp` with dedicated rate limit (30 rpm) and audit event emission without secret leakage.

**Gate S3 (Verification Gate)**:
- Contract parity test verifying 100% agreement between TypeScript Zod and Python Pydantic validators on shared fixtures.
- Security test verifying unauthorized origins receive CORS rejection and unauthenticated calls to protected routes return 401 Problem Details.
- Notebook worker test confirming persistent variables survive timeouts without cross-cell pollution.

---

### Sprint 4: Full Modular IDE Integration & Accessibility
**Workstream Owners**: WS-E (Frontend), WS-A (Architecture), WS-B (Lean Trust).  
**Dependencies**: Gate S3 passed.  
**Deliverables**:
- **T4.1 (Shell Assembly)**: Integrate the complete modular workspace into `src/App.tsx`.
  - Mount Activity Bar, Side Panel (Explorer, Outline, Proof Memory, Settings).
  - Connect `EditorTabsStore`: drag-to-reorder, split editor view, and LIFO closed-tab restoration.
  - Mount symbol breadcrumbs tracking definitions, theorems, and lemmas.
- **T4.2 (Status Bar Integration)**: Wire `statusBarRegistry` to live telemetry.
  - *Left Zone*: Real system readiness, toolchain version, Pyodide status, Git branch.
  - *Center Zone*: Document language, encoding (UTF-8), EOL (LF), proof progress.
  - *Right Zone*: Diagnostics count, cursor coordinates (`Ln X, Col Y`), memory tiers.
- **T4.3 (Evidence Display & A11y)**:
  - Render dual evidence panel displaying Kimina and Lake outcomes, duration, and axiom audit details.
  - Implement WCAG 2.2 AA compliant focus management, keyboard navigation shortcuts (`Ctrl+B`, `Ctrl+\`), and `aria-live="assertive"` alerts for errors and rate limits (`src/shared/ui/security-alert.tsx`).

**Gate S4 (Verification Gate)**:
- End-to-end user journey: buffer editing $\to$ snippet dispatch $\to$ project build $\to$ hybrid consensus display $\to$ status bar update.
- Automated accessibility test verifying zero WCAG 2.2 AA violations on interactive controls.
- Keyboard-only navigation test traversing editor, tabs, and action panels.

---

### Sprint 5: CI Reconciliation, Release Hardening & Documentation
**Workstream Owners**: WS-G (QA/CI), WS-I (Documentation), WS-J (Deployment), All Leads.  
**Dependencies**: Gate S4 passed.  
**Deliverables**:
- **T5.1 (F-09 Remediation)**: Reconcile test runner pipeline.
  - Map all 165+ suites to explicit, non-tautological test jobs in `scripts/verify-all.ts`.
  - Execute candidate-required test run tied directly to the candidate commit SHA.
- **T5.2 (F-10 Remediation)**: Clean Docker & Compose verification.
  - Validate root `Dockerfile` and `docker-compose.yml` build from clean checkout.
  - Confirm Lake runner container operates with no exposed host ports on private network.
- **T5.3 (F-13 Remediation)**: Synchronize documentation.
  - Update `README.md`, `CHANGELOG.md`, and `reports/` with verified feature status matrix.
  - Document toolchain requirements, deployment runbooks, and rollback procedures.
- **T5.4 (Bundle Discipline)**: Measure candidate bundle; enforce main chunk $\le 180.00\text{ KB}$ gzip and total client JS $\le 260.00\text{ KB}$ gzip.
- **T5.5**: Generate Release Dossier with commit SHA, test execution logs, and SBOM.

**Gate S5 / G8 (Final Release Gate)**:
- 100% pass across all required candidate suites (0 skipped without documented justification).
- Zero open P0 findings; all P1 risks signed off by named owner.
- Production bundle strictly within budgets ($\le 180\text{ KB}$ main entry gzip).
- Clean Docker Compose deployment operating from clean checkout.

---

## 7. Organization of Parallel Workstreams & Governance

| Workstream | Lead Role | Primary Responsibilities | Dependencies | Deliverables |
|---|---|---|---|---|
| **WS-A** | Lead Architect | Architecture governance, ADRs, interface freeze, taxonomy enforcement | Kickoff | ADR 015, interface specifications, decision log |
| **WS-B** | Lean Trust Lead | Verification semantics, axiom policy, Kimina proxy, ProofCoordinator audit | WS-A | `hybrid-adjudicator.ts`, axiom audit tooling, negative proof suites |
| **WS-C** | Platform/Runner Lead | Lake runner container, Dockerfile/Compose, `/build` endpoint, session transfer | WS-B, WS-D | `docker/lean-runner/Dockerfile`, Lake execution daemon |
| **WS-D** | Backend Lead | `server.ts` bootstrap, route mounting, middleware order, health probes | WS-A, WS-B | Mounted `/api/v1/lean`, `/api/v1/projects`, `/healthz`, `/readyz` |
| **WS-E** | Frontend Lead | Full IDE shell, Monaco editor, tabs, status bar, accessibility (WCAG 2.2 AA) | WS-D, WS-B | `src/App.tsx`, `EditorTabsStore`, `statusBarRegistry` |
| **WS-F** | Python/Contracts Lead | OpenAPI/JSON Schema single source of truth, Zod/Pydantic parity, worker lifecycle | WS-A, WS-D | Canonical schemas, runtime parity tests, `notebook.worker.ts` |
| **WS-G** | QA & CI Lead | Test matrix, CI pipeline, behavioral suites, tautology elimination | All streams | `verify-all.ts`, test evidence logs, coverage reports |
| **WS-H** | Security Lead | Threat modeling, fail-closed CORS, rate limiting, token vault, container isolation | WS-C, WS-D | Security audit reports, rate limit middleware, MCP boundaries |
| **WS-I** | Documentation Lead | README sync, feature matrix, release notes, runbooks, Diátaxis guides | All streams | Updated `README.md`, `CHANGELOG.md`, Release Dossier |

### Governance Rules
1. **No Interface Drift**: No workstream may implement divergent route paths, result schemas, or worker protocols without updating ADR 015.
2. **Behavioral Gates over Static Text**: Static checks (e.g., absence of `setTimeout`) are secondary linting tools; gates require behavioral tests proving runtime fail-closed semantics.
3. **Traceability**: Every PR must document the exact test command executed, candidate commit SHA, and output logs.
4. **Epistemic Invariant**: Any PR that allows a client heuristic or simulation to emit `verified: true` is rejected immediately.

---

## 8. Comprehensive Module Audit Inventory (Packages A–K)

The following 11 audit packages cover all 728 files in the repository:
- **Package A (Root & Toolchain)**: `package.json`, lockfile, Vite config, TypeScript configs, `.env.example`, pre-commit.
- **Package B (Frontend Entry & State)**: `src/main.tsx`, `src/App.tsx`, `src/context/`, `src/hooks/`, `src/types/`, `src/middleware/`.
- **Package C (UI Primitives & Design System)**: `src/components/`, `src/shared/ui/`, `src/registries/`, `tokens.css`.
- **Package D (Frontend Services)**: All 155 services in `src/services/` (execution, verification, storage, proof, notebook, diff, search).
- **Package E (Express Backend & Routing)**: `server.ts`, `server/src/routes/`, `server/src/services/`, storage, middleware.
- **Package F (Contracts & Python)**: `schemas/`, `pyproject.toml`, `scripts/generate-contracts.ts`, `scripts/verify-python-contracts.py`, `server/src/services/leancert/`.
- **Package G (Lean Formalization & Runner)**: `.lean` templates, `lakefile*`, manifests, toolchains, `docker/lean-runner/`.
- **Package H (Test Suites)**: 121 files in `tests/`, fixtures, `scripts/verify-all.ts`.
- **Package I (CI & Supply Chain)**: `.github/workflows/`, SBOM reports, package audits.
- **Package J (Deployment & Infrastructure)**: `docker-compose*.yml`, `docker/`, gateway configuration, network definitions.
- **Package K (Documentation & Reports)**: 89 documents in `docs/`, 86 reports in `reports/`, `README.md`, `CHANGELOG.md`.

---

## 9. Open Decisions to Close at Kickoff `[Open Decision]`

1. **Kimina Deployment Image Digest**: Pinned tag/digest of the upstream Kimina Lean Server container to be provisioned in the test/staging environment.
2. **Session Storage Backend**: Decision between local ephemeral disk directories (`data/sessions`) vs. named Docker volumes for multi-container deployments.
3. **Lean Toolchain Baseline**: Confirmation of `leanprover/lean4:v4.35.0` as the authoritative project toolchain across both snippet REPL and Lake runner.
4. **Lake Runner Concurrency**: Maximum parallel project builds allowed per node (default proposal: 4 concurrent builds with worker queue).
5. **Signed Release Authority**: Designation of technical leads authorized to sign off on Gate S5 Release Dossier.
