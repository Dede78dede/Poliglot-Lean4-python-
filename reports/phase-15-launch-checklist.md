# Phase 15 Launch Readiness Checklist (`2.3.0-rc`)

**Target Milestone**: Phase 15 Stabilization Sprint  
**Release Candidate**: `2.3.0-rc`  
**Build Provenance**: `gitSha=UNAVAILABLE_NO_GIT` · `nodeVersion=v22.23.2` · `lockfileSha256=9aac9e7109d730ab21714d523aa99361dd8ac0a5f329a1ef5b8e9eaff1db942f`  
**Verified Dynamic Baseline**: 67 Active Suites (`Suites 134–200`, 100% PASS) / 368 Observed Sub-Test Checks

---

## 1. Readiness Gates (`G0`–`G5`)

- [ ] **G0 — Git & Signed CI Provenance (`BLOCKED`)**: `.git` history unavailable in build container (`gitSha=UNAVAILABLE_NO_GIT`); enforce in CI on `main`.
- [x] **G1 (Unit/Authority) — Single Epistemic Certifier & JCS Provenance Isolated**: `hybrid-adjudicator.ts:416` is the sole site emitting `SEAL_KERNEL_VERIFIED_TIER5` and `verified: true`; RFC 8785 JCS HMAC-SHA256 signing strictly isolated inside `ConsensusExecutionOrchestrator` (`Suites 166, 199`).
- [ ] **G1/G2 (Live Containers) — External Kimina & Isolated Lake Runner E2E (`BLOCKED`)**: Docker, `kimina-backend`, `lean`, and `lake` runtimes are unavailable in this container; `docker/lean-runner/server.js`, `Dockerfile`, and `docker-compose.yml` hardened for isolated `lean-isolated-net` deployment before `2.3.0-rc` -> `2.3.0` promotion.
- [x] **G3 (In-Process W1–W4 Protocol Checks) — Activation Waves Hardened**: Suites 195–198 pass against local/in-process HTTP & `/collab` WebSocket mocks; TreeThink omits `proved` (`certified: false`, `candidateClosed`); WS close codes separate `1008` policy/auth from `1003`/`1009` protocol errors; lazy `EditorPane` + `monacoEditor` wired into `CollaborationPanel`.
- [ ] **G3 (Browser E2E & Live Remote Services) — Two-Browser Monaco+Yjs & W1–W3 Backends (`BLOCKED / DEFERRED`)**: Playwright/Chromium not installed in sandbox (`W4` browser E2E `BLOCKED`); remote `OTel`, `LeanBeam`, `Mathesis`, and `TreeThink` services remain `DEFERRED` (default-off `false`).
- [x] **G4 — Supply Chain & CI Security Hardened**: `bun.lock` retired; canonical `npm` `package-lock.json` synchronized at `2.3.0-rc`; `body-parser@1.20.9`, `express@4.22.3`, `vite@8.3.8` remediated; `npm audit --audit-level=high` exits `0`; all 28 runtime dependencies exact-pinned; CI actions pinned to verified 40-char SHAs with `permissions: { contents: read }`.
- [x] **G5 — Contracts, Feature Flags & Bundle Budgets**: Zod <-> `schemas/generated_contracts.py` (Pydantic v2) <-> `schemas/openapi.json` (OpenAPI 3.1.0) in 100% sync; 62/62 flags pass `--strict` live-clock check; bundle budgets pass (`39.27 KB` main, `244.99 KB` total JS, O1 `55.67 KB`, O2 `170.42 KB`, O3 `0.02 KB`).

---

## 2. Activation Wave Matrix

| Wave | Scope | Feature Flags | Bundle Impact Target | Readiness |
| :---: | :--- | :--- | :---: | :--- |
| **W1** | Observability & Telemetry | `ENABLE_OTEL_BROWSER`, `ENABLE_OTEL_NODE` | +8 KB O2 | In-process PASS (Suite 195); Remote Collector **DEFERRED** (off) |
| **W2** | Speculative Tactic Execution | `ENABLE_LEAN_BEAM` | +12 KB O1 | In-process PASS (Suite 196); Live `lean-beam` **DEFERRED** (off) |
| **W3** | Automated Reasoners | `ENABLE_MATHESIS`, `ENABLE_LP2`, `ENABLE_TREETHINK` | +15 KB O1 | In-process PASS (Suite 197); Remote services **DEFERRED** (off) |
| **W4** | Collaborative Editing (`/collab` WS + Lazy `EditorPane`) | `ENABLE_YJS_COLLABORATION` | Lazy-split (`yjs-runtime` `25.12 KB`, `EditorPane` `5.15 KB`, O2 `+0 KB`) | WS/CRDT Unit PASS (Suite 198); Two-Browser Playwright **BLOCKED** |

---

## 3. Toolchain & Environment Prerequisites

- Node.js: `v22.23.2` (`>= 20.18.0`)
- Vite: `8.3.8` with native Rolldown code-splitting
- Docker + Lean 4 (`v4.16.0`–`v4.35.0`) + Kimina image digest (`KIMINA_SERVER_IMAGE`): required externally for G1/G2 promotion
- Playwright / Chromium: required externally for W4 two-browser Monaco+Yjs E2E
