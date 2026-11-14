# Phase 15 Launch Readiness Checklist (`2.3.0-rc`)

**Target Milestone**: Phase 15 (Activation Waves W1–W4)  
**Release Candidate**: `2.3.0-rc`  
**Verified Dynamic Baseline**: 67 Active Suites (`Suites 134–200`, 100% PASS) / 365 Observed Sub-Test Checks

---

## 1. Readiness Gates

- [x] **Single Epistemic Certifier Isolated**: `hybrid-adjudicator.ts:264` is the sole site emitting `SEAL_KERNEL_VERIFIED_TIER5` and `verified: true`.
- [x] **Client Seal Path Excised**: `certifyWithKernel` eliminated from `src/services/verification/preflight-syntax-guard.ts` (ADR-018).
- [x] **Contract Parity Synchronized**: Zod ↔ Pydantic v2 schemas aligned with `NUMERIC_CERTIFICATE_UNVERIFIED` and `Discriminator('kind')`.
- [x] **Feature Flags Governed**: 62/62 flags assigned squad owners, fail-closed behaviors, default-off experimental flags, and live-clock `--strict` verification (`ADR-019`).
- [x] **Bundle Budgets Enforced**: ADR-017 ceilings enforced with exit code 1 (`38.42 KB` main, `234.37 KB` total JS, O1 `55.67 KB`, O2 `169.61 KB`, O3 `0.01 KB`).
- [x] **Supply Chain Hardened**: All 26 production dependencies in `package.json` pinned to exact versions; `npm ci --ignore-scripts` and `scan:secrets` wired in CI.
- [x] **Property-Based Testing Operational**: Suite 190 verifying `fast-check` boundary properties.
- [x] **Activation Waves Verified (W1–W4)**: Suites 195–200 verified end-to-end with real protocols (OTel, JSON-RPC LeanBeam, HTTP Reasoners, `/collab` Yjs WebSocket) and zero epistemic breaches.
- [ ] **External Hardware Container E2E (GA Gate)**: Live execution against external Docker `kimina-backend` + `lean-runner` containers (pending external Lean 4 container environment before promoting `2.3.0-rc` -> `2.3.0`).

---

## 2. Activation Wave Matrix

| Wave | Scope | Feature Flags | Bundle Impact Target | Readiness |
| :---: | :--- | :--- | :---: | :---: |
| **W1** | Observability & Telemetry | `ENABLE_OTEL_BROWSER`, `ENABLE_OTEL_NODE` | +8 KB O2 | VERIFIED (Suite 195) |
| **W2** | Speculative Tactic Execution | `ENABLE_LEAN_BEAM` | +12 KB O1 | VERIFIED (Suite 196) |
| **W3** | Automated Reasoners | `ENABLE_MATHESIS`, `ENABLE_LP2`, `ENABLE_TREETHINK` | +15 KB O1 | VERIFIED (Suite 197) |
| **W4** | Collaborative Editing (`/collab` WS + Editor Drawer) | `ENABLE_YJS_COLLABORATION` | Lazy-split (`yjs-runtime` 24.98 KB, O2 +0 KB) | VERIFIED (Suite 198) |

---

## 3. Toolchain Prerequisites

- Node.js: `>= 20.18.0`
- Lean 4: `v4.16.0` (runner) with toolchain alignment through `v4.35` (external container required for GA live proofs)
- Python: `>= 3.11`
- Vite: `8.3.x` with Rolldown code-splitting
