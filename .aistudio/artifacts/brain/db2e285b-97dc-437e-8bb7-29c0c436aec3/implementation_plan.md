# Phase 13.9 — Pre-Phase 14 Consolidation, Security Hardening & Observability Gate

Phase 13.9 serves as the mandatory consolidation, verification, and hardening gate before Phase 14 begins. It establishes rigorous repository-to-state parity, security middleware, complete feature-flag gating, strict Python PEP 8/toolchain standards, zero-drift contract parity, secret management auditing, and structured security observability, bringing cumulative verification from 155 suites to 161 suites (encompassing 235 cumulative sub-tests, 100% passing) while maintaining the bundle strictly within gzip limits.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions have been refined with operational safeguards and feedback:

- **Confirmed Decision 1 (Authentication & Token Vault)**:
  - Bearer token verification backed by `src/services/auth/token-vault.ts` storing hashed tokens in `data/tokens.json` (opaque 32-byte base64).
  - CLI rotation (`npm run tokens:rotate`) and revocation (`npm run tokens:revoke <id>`).
  - **CI Bypass Security Guard**: The `X-Polyglot-Test-Secret: polyglot-ci-test-2026` header is permitted **strictly** when `process.env.NODE_ENV === "test"` **AND** `process.env.ALLOW_CI_BYPASS === "true"`. Any bypass attempt in `production` immediately yields HTTP 401 and emits a structured `bypass_attempt` security log.
- **Confirmed Decision 2 (Rate Limiting & Multi-Process Architecture)**:
  - In-memory sliding-window rate limiter enforcing 100 requests/minute per token (or IP fallback).
  - Emits standard RFC headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and returns HTTP 429 with `Retry-After`.
  - Documented as **single-process only** in `docs/architecture/rate-limiting.md` with an ADR for distributed Redis backing in multi-instance deployments.
- **Confirmed Decision 3 (MCP Interoperability & Route Isolation)**:
  - Standard MCP clients (`lean-lsp-mcp`, `paperproof-mcp`, `lean-beam`) use `Mcp-Method` and `Mcp-Name` headers.
  - To prevent breaking third-party MCP 2026-07-28 clients while hardening REST APIs: `/mcp` is mounted outside Bearer auth but with a dedicated stricter rate limit (30 req/min) and protocol inspection.
- **Confirmed Decision 4 (SSE & WebSocket Token Passing)**:
  - SSE streams accept `Authorization: Bearer <token>` header primarily, with query param `?token=<token>` as authenticated fallback (emitting an audit warning). Missing token returns HTTP 401 before stream open.
  - WebSocket (Yjs) endpoints remain completely closed when `ENABLE_YJS_COLLABORATION === false`.
- **Confirmed Decision 5 (Numerical Baseline Reconciliation)**:
  - Harmonized baseline: **161 cumulative suites / 235 sub-tests / 100% pass rate** (155 existing suites + 6 new suites: 156, 157, 158, 159, 160, 161). Deprecated ambiguous milestone unit terminology.

---

## 1. Overview & Core Concept

- **What It Does**: Phase 13.9 consolidates and hardens the Polyglot Code Studio platform following the delivery of Phase 13. It introduces zero unstable experimental features; instead, it enforces security middleware, validates existing MCP server compliance without rewriting working logic, ensures all 8 major optional engines are cleanly feature-gated (default false except `ENABLE_TRANSLATION_FIDELITY`), standardizes Python toolchains and generated contracts, audits secret management, emits structured security observability events, and synchronizes documentation (SemVer `2.1.0`, `CHANGELOG.md`, `README.md`).
- **Target Audience & Context**: Formal verification researchers, Lean 4 mathematicians, and Python numerical engineers who depend on bulletproof epistemic guarantees, non-forgeable certificates, and stable runtime boundaries.
- **Key Value**: Guarantees zero regression on foundational modules (`verification-formula.ts`, `session-manager.ts`, `zip-validator.ts`), certifies contract parity between TypeScript and Python, hardens all HTTP routes, and establishes clean baselines for Phase 14.

---

## 2. User Experience & Visual Design

- **Security & Status Visualization**:
  - Studio Settings drawer surfaces Token Vault status, active rate-limiting policy (100 req/min), and CORS origins.
  - Rate-limit exhaustion displays an accessible, non-intrusive notification banner displaying the exact countdown (`Retry-After: N seconds`) without modal interruption.
- **Visual Theme & Typography Conformance**:
  - All status badges follow zero-pill discipline (sharp, rounded 2px borders, uppercase monospace labels `text-[10px] tracking-wider font-mono`).
  - Colors adhere to standard Tailwind dark tokens: emerald (`text-emerald-400 bg-emerald-950/60 border-emerald-800/80`) for verified integrity, amber for rate-limiting cooldown, and slate for neutral metadata.
  - Interactive controls strictly use React Aria accessible primitives and WCAG 2.2 AA compliant contrast.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: SemVer 2.1.0 Justification**
  - *Chosen Approach*: Bump `package.json` to version `2.1.0` (MINOR bump from `2.0.0`).
  - *Why*: Phases 10–13 introduced significant backward-compatible features behind feature flags (ResultEnvelope, Native Notebook, Config Discovery, Structural Diff, MiniSearch) with zero breaking changes to public verification contracts.
- **Decision 2: Gated Feature Responses (HTTP 503 vs 404)**
  - *Chosen Approach*: When a feature flag is disabled, its service or endpoint strictly returns HTTP 503 with RFC 9457 error code `FEATURE_DISABLED` from `error-registry.ts`.
  - *Why*: HTTP 404 implies non-existence, whereas HTTP 503 correctly communicates temporary unavailability due to disabled configuration.
- **Decision 3: Standalone Security Observability Emitter**
  - *Chosen Approach*: `src/services/auth/security-events.ts` logs structured security events (`auth_denied`, `rate_limited`, `bypass_attempt`) to standard logging output independent of OpenTelemetry flags (`ENABLE_OTEL_BROWSER` / `ENABLE_OTEL_NODE`).
  - *Why*: Security events must never be silenced by disabled telemetry flags, while strictly omitting raw secret keys or tokens from logs.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Express 4.21 Gateway (server.ts)                       │
│                                                                             │
│  Public Routes:                                                             │
│   ├── GET /api/health (Unauthenticated)                                      │
│   └── POST /mcp (Stateless MCP 2026-07-28; Strict 30 req/min rate limit)     │
│                                                                             │
│  Protected Routes (AuthMiddleware + RateLimitMiddleware: 100 req/min):      │
│   ├── /api/v1/contracts      ├── /api/v1/proof/reuse                        │
│   ├── /api/v1/notebook       ├── /api/v1/proof/proposal-loop                │
│   ├── /api/v1/config         ├── /api/v1/translation                       │
│   ├── /api/v1/diff           ├── /api/v1/search/cross                       │
│   └── GET /api/v1/proof/metrics                                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     Security Observability    │             │   Python Boundary Schemas     │
│ - emitAuthDenied()            │  Parity     │ - Pydantic v2 (extra='forbid')│
│ - emitRateLimited()           │ ◄─────────► │ - Discriminator('ok')         │
│ - emitBypassAttempt()         │  Check      │ - strict=True, frozen=True    │
│ - zero token leakage in logs  │             │ - schemas/generated_contracts │
└───────────────────────────────┘             └───────────────────────────────┘
```

### Detailed Task Plan (Tasks 01–10)

#### Task 01: Repository–Declared State Reconciliation
- Align `package.json` version to `2.1.0` with documented SemVer justification in `CHANGELOG.md`.
- Create `CHANGELOG.md` adhering to Keep a Changelog 1.1.0 (`[Unreleased]`, `[2.1.0]`, `[2.0.0]`, `[1.1.0]`).
- Reconcile `reports/phase-13-summary.md` and `reports/phase-14-baseline.json` ensuring exact sync with current codebase metrics (annotated on `2026-11-03`).
- Create `scripts/measure-bundle.ts` outputting `reports/bundle-post-13.9.json` (verifying main gzip ≤ 180 KB, total JS ≤ 260 KB).
- Update `README.md` with feature status table (`ready`, `partial`, `fallback`, `future`).

#### Task 02: MCP 2026-07-28 Verification (Suite 156)
- Create `tests/phase-14/suite-156-mcp-compliance.test.ts` with 6 sub-tests:
  - 156.1: `server/discover` snapshot validates exact payload: `{ supportedVersions, capabilities, serverInfo, instructions }`.
  - 156.2: Missing `Mcp-Method` or `Mcp-Name` header returns 400 with RFC 9457 `INVALID_JSON_INPUT`.
  - 156.3: HTTP `GET` requests to MCP endpoint return 405 Method Not Allowed with `Allow: POST`.
  - 156.4: HTTP `DELETE` requests to MCP endpoint return 405 Method Not Allowed with `Allow: POST`.
  - 156.5: Rate limit enforcement returns 429 with `X-RateLimit-*` headers upon request limit (30 req/min on `/mcp`).
  - 156.6: MCP responses are strictly stateless: no `Mcp-Session-Id` header is ever set.

#### Task 03: Authentication, CORS and Rate Limiting Middleware (Suite 157)
- Implement `src/services/auth/token-vault.ts`:
  - Storage in `data/tokens.json`, managing opaque 32-byte base64 tokens with SHA-256 storage hashing.
  - Exposes `validateToken(token: string): boolean`, `rotateToken(id: string)`, `revokeToken(id: string)`.
- Implement `src/middleware/auth.ts`:
  - Validates Bearer token via Token Vault.
  - Evaluates `X-Polyglot-Test-Secret`: permits bypass **only** if `process.env.NODE_ENV === "test"` and `process.env.ALLOW_CI_BYPASS === "true"`.
  - Emits `emitAuthDenied` on failure.
- Implement `src/middleware/rate-limit.ts`:
  - In-memory sliding-window limiter (100 req/min per token/IP).
  - Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, returns 429 with `Retry-After`.
  - Emits `emitRateLimited` on exhaustion.
- Implement CORS middleware with `process.env.CORS_ORIGINS` (default same-origin).
- Create `tests/phase-14/suite-157-auth-rate-limit.test.ts` with 8 sub-tests (including production CI bypass rejection, SSE token check, and CORS rejection).

#### Task 04: Feature Flag Wiring Verification (Suite 158)
- Verify explicit feature-gating across the 8 major engines:
  1. LeanBeam — `ENABLE_LEAN_BEAM` — `src/services/mcp/lean-beam-client.ts`
  2. Mathesis — `ENABLE_MATHESIS` — `src/services/formalization/mathesis-provider.ts`
  3. LP2 — `ENABLE_LP2` — `src/services/translation/lp2-adapter.ts`
  4. TreeThink — `ENABLE_TREETHINK` — `src/services/proof/treethink/treethink-provider.ts`
  5. OTel Browser — `ENABLE_OTEL_BROWSER` — `src/services/telemetry/otel-browser.ts`
  6. OTel Node — `ENABLE_OTEL_NODE` — `src/services/telemetry/otel-node.ts`
  7. Yjs Collaboration — `ENABLE_YJS_COLLABORATION` — `src/services/collaboration/hocuspocus-server.ts`
  8. Paperproof — `ENABLE_PAPERPROOF_PLAYBACK` — `src/services/paperproof/playback-service.ts`
  *(Exception: `ENABLE_TRANSLATION_FIDELITY` defaults to `true`).*
- Disabled features strictly return 503 with RFC 9457 code `FEATURE_DISABLED`.
- Create `tests/phase-14/suite-158-feature-flags.test.ts` with 16 sub-tests (8 tools × off/on states).

#### Task 05: Critical Module Test Coverage (Suite 159)
- Validate zero-regression on:
  - `src/services/verification/verification-formula.ts` (terms: exit code, sorry detection, simulated state, verified seal).
  - `src/services/execution/session-manager.ts` (quota, TTL, namespace isolation).
  - `src/services/zip-validator.ts` (path traversal, zip bomb, symlink rejection).
  - `src/shared/contracts/result-envelope.ts`, `src/services/config/config-manager.ts`, `src/services/diff/structural-diff.ts`.
- Use test fixtures under `tests/phase-14/fixtures/` and Pyodide mock under `tests/phase-14/mocks/pyodide.ts`.
- Create `tests/phase-14/suite-159-critical-modules.test.ts` with 10 sub-tests.

#### Task 06: Documentation and Reports Alignment
- Annotate outdated reports with: `> **Annotated on 2026-11-03**: Reconciled for Phase 13.9. Superseded by reports/phase-14-baseline.json.`
- Add "Python Development Standards", "Phase 13 Contract Discipline", and "Security & Rate Limiting" to `README.md` while preserving existing sections verbatim.
- Validate `.github/workflows/ci.yml` and ensure coverage across Phase 11–14 suites.

#### Task 07: Contract Parity and Pydantic Boundary Validation (Suite 160 & Pytest)
- Validate `schemas/generated_contracts.py` boundary models:
  - `extra='forbid'`, `strict=True`, `frozen=True`, `Discriminator('ok')` with `Tag(True)` / `Tag(False)`.
  - Header: `# AUTO-GENERATED — do not edit manually. Regenerate via npm run contracts:generate.`
- Authoritative schemas: exported by `exportJsonSchema()` from `src/services/contracts/`.
- Add script `scripts/generate-contracts.ts` and npm script `"contracts:generate": "tsx scripts/generate-contracts.ts"`.
- Create `tests/phase-14/suite-160-contract-parity.test.ts` (4 sub-tests).
- Create `tests/phase-14/python/test_generated_contracts.py` (pytest with `--cov-fail-under=80`).

#### Task 08: Python PEP 8 and Toolchain Compliance
- Reformat `schemas/generated_contracts.py` to satisfy PEP 8 (two blank lines around top-level classes, max line length 88).
- Create `pyproject.toml` with `[project]`, `[tool.ruff]`, `[tool.mypy]`, and `[tool.pytest.ini_options]`.
- Create `.pre-commit-config.yaml` for pre-commit linting (Ruff and Mypy).

#### Task 09: Phase 13.9 Roadmap and Consolidation Gate
- Produce `docs/architecture/phase-13.9-roadmap.md` with milestones M1–M10, entry/exit criteria, owners, and rollback plans.
- Produce `reports/phase-13.9-gap-analysis.md` summarizing declared vs actual status.
- Update `scripts/verify-all.ts` to execute all 161 suites (235 cumulative sub-tests) with 100% pass rate.
- Run `scripts/measure-bundle.ts` verifying gzip ≤ 180 KB main and ≤ 260 KB total.

#### Task 10: Secret Management and Security Observability (Suite 161)
- Create `docs/architecture/secrets-management.md` documenting storage (env vars in production, `.env.local` in dev), key rotation procedures for 14 AI provider keys, Token Vault, and no-log policy.
- Annotate `.env.example` marking secret variables, rotation cadence, and format.
- Implement `src/services/auth/security-events.ts`:
  - `emitAuthDenied(tokenId?: string, ip?: string, path?: string)`
  - `emitRateLimited(tokenId?: string, ip?: string, path?: string)`
  - `emitBypassAttempt(ip?: string, path?: string)`
  - Zero token leakage: tokens are never printed in plaintext in log payloads.
  - Active regardless of OpenTelemetry feature flags.
- Create `tests/phase-14/suite-161-security-observability.test.ts` with 5 sub-tests:
  - 161.1: Auth denial emits `auth_denied` without exposing raw token values.
  - 161.2: Rate limiting emits `rate_limited` with ip and path.
  - 161.3: CI bypass attempt in `NODE_ENV=production` emits `bypass_attempt` and returns 401.
  - 161.4: No log output contains test secret or 32-byte base64 token substrings.
  - 161.5: Security events are emitted when `ENABLE_OTEL_BROWSER` and `ENABLE_OTEL_NODE` are false.
