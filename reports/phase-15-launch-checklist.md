# Phase 15 Launch Readiness Checklist

**Target Milestone**: Phase 15 (Activation Waves W1–W4)  
**Target Test Goal**: 195 Suites / 420 Sub-tests  
**Current Baseline**: 172 Suites / 303 Sub-tests Baseline (191 Suites / 377 Sub-tests Extended)

---

## 1. Readiness Gates

- [x] **Single Epistemic Certifier Isolated**: `hybrid-adjudicator.ts:264` is the only site emitting `SEAL_KERNEL_VERIFIED_TIER5` and `verified: true`.
- [x] **Client Seal Path Excised**: `certifyWithKernel` eliminated from `src/services/verification/preflight-syntax-guard.ts` (ADR-018).
- [x] **Contract Parity Synchronized**: Zod ↔ Pydantic v2 schemas aligned with `NUMERIC_CERTIFICATE_UNVERIFIED` and `Discriminator('kind')`.
- [x] **Feature Flags Governed**: 62/62 flags assigned squad owners, fail-closed behaviors, and retirement dates (ADR-016).
- [x] **Bundle Budgets Codified**: ADR-017 ceilings enforced (O1 $\le$ 100 KB, O2 $\le$ 220 KB, total $\le$ 290 KB).
- [x] **Supply Chain Hardened**: `package.json` production dependencies pinned to exact versions; `npm ci --ignore-scripts` verified in CI.
- [x] **Property-Based Testing Operational**: Suite 190 verifying fast-check boundary properties across 1000 iterations per property.

---

## 2. Activation Wave Roadmap

| Wave | Scope | Feature Flags | Budget Impact Target | Readiness |
| :---: | :--- | :--- | :---: | :---: |
| **W1** | Observability & Telemetry | `ENABLE_OTEL_BROWSER`, `ENABLE_OTEL_NODE` | +8 KB O2 | READY |
| **W2** | Speculative Tactic Execution | `ENABLE_LEAN_BEAM` | +12 KB O1 | READY |
| **W3** | Automated Reasoners | `ENABLE_MATHESIS`, `ENABLE_LP2`, `ENABLE_TREETHINK` | +15 KB O1 | READY |
| **W4** | Collaborative Editing | `ENABLE_YJS_COLLABORATION` | +18 KB O1 | READY |

---

## 3. Toolchain Prerequisites

- Node.js: `>= 20.18.0`
- Lean 4: `v4.16.0` (runner) with toolchain alignment through `v4.35`
- Python: `>= 3.11`
- Vite: `8.3.x` with Rolldown code-splitting
