# CI/CD Pipeline & Supply-Chain Hardening (Phase 14.9.3 / Phase 15 `2.3.0-rc`)

**Status**: ACTIVE  
**Engine**: GitHub Actions (`ubuntu-latest`, Node.js 22, Python 3.11)  

---

## 1. Architectural Gates & Workflow Stages

The CI workflow (`.github/workflows/ci.yml`) executes deterministic verification gates sequentially:

```
[npm ci --ignore-scripts]
          │
          ├──> [Typecheck] (npx tsc --noEmit)
          ├──> [Secret Scan] (npm run scan:secrets)
          ├──> [Vulnerability Audit] (npm audit --audit-level=high)
          ├──> [Architecture Check] (npm run arch:check -> tsx scripts/arch-check.ts)
          ├──> [Epistemic Authority Check] (npm run arch:check-epistemic-authority)
          ├──> [Contract Parity Check] (npm run contracts:check)
          ├──> [Feature Flag Governance (Strict)] (scripts/check-flag-expiry.ts --strict)
          ├──> [Build Application] (npm run build)
          ├──> [Bundle Budget Guard] (npm run bundle:measure -> exit 1 on FAIL)
          ├──> [Primary Verification Suite] (npm test — Suites 134–172)
          ├──> [Extended Verification Suite] (npm run test:extended — Suites 173–200)
          └──> [Epistemic Seal Integrity Sweep] (./scripts/seal-integrity-sweep.sh)
```

---

## 2. Supply-Chain Security Controls

1. **Deterministic Dependency Installation**:
   - `npm ci --ignore-scripts` prevents untrusted pre/post-install lifecycle scripts from executing during installation.
2. **Exact Version Pinning**:
   - All runtime production dependencies in `package.json` are pinned to exact SemVer versions without wildcard ranges (`^` or `~`), eliminating supply-chain drift.
3. **Architecture Boundary Enforcement**:
   - `npm run arch:check` transpiles `src/` and `server/src/` via `esbuild` for `depcruise` (`401` ESM modules) and validates TypeScript imports directly against `.dependency-cruiser.cjs` rules, preventing circular imports and layer leaks.
4. **Secretless Auditing & Logging**:
   - `npm run scan:secrets` scans tracked source/config files for unmasked keys or tokens; in-memory secrets are never exposed in runner logs or telemetry payloads.
