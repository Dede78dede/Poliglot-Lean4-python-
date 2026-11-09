# CI/CD Pipeline & Supply-Chain Hardening (Phase 14.9.3, Milestone M10)

**Date**: 2026-11-08  
**Status**: ACTIVE  
**Engine**: GitHub Actions (`ubuntu-latest`, Node.js 22, Python 3.11)  

---

## 1. Architectural Gates & Workflow Stages

The CI workflow (`.github/workflows/ci.yml`) is partitioned into deterministic verification stages:

```
[npm ci --ignore-scripts]
          │
          ├──> [Linter & Typecheck] (tsc --noEmit, tsc -p tsconfig.app.json)
          ├──> [Architecture Check] (depcruise --config .dependency-cruiser.cjs)
          ├──> [Feature Flag Expiry Check] (scripts/check-flag-expiry.ts)
          ├──> [Build Application] (vite build)
          ├──> [Bundle Budget Guard] (scripts/measure-bundle.ts)
          └──> [Polyglot Verification Engine] (scripts/verify-all.ts: 183 suites)
```

---

## 2. Supply-Chain Security Controls

1. **Deterministic Dependency Installation**:
   - `npm ci --ignore-scripts` prevents untrusted pre/post-install lifecycle scripts from executing during installation.
2. **Exact Version Pinning**:
   - All runtime production dependencies in `package.json` are pinned to exact SemVer versions without wildcard ranges (`^` or `~`), eliminating supply-chain drift.
3. **Architecture Boundary Enforcement**:
   - `npm run arch:check` prevents domain code from leaking into infrastructure or presentation tiers and blocks circular imports.
4. **Secretless Auditing & Logging**:
   - In-memory secrets are never exposed in GitHub Actions job outputs, runner logs, or telemetry payloads.
