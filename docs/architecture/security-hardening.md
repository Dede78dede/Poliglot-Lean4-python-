# Security Hardening & Threat Model (Phase 14.9.3, Milestone M5)

**Status**: PRODUCTION-GRADE  
**Date**: 2026-11-08  
**Scope**: Server API, Token Vault, Authentication & Authorization Boundaries  

---

## 1. Threat Matrix & Mitigations

| Threat ID | OWASP API Top 10 | Threat Description | Architectural Mitigation | Status |
|:---|:---|:---|:---|:---|
| **THREAT-01** | **API1:2023 Broken Object Level Authorization (BOLA)** | User accesses or mutates another user's workspace, session, or Lake project. | `requireOwnership(options)` middleware enforces actor match against entity owner before handler execution. Emits `auth_denied` audit event on violation and responds with HTTP 403 Forbidden (or 404 for non-existent entities). | **ACTIVE** |
| **THREAT-02** | **API4:2023 Unrestricted Resource Consumption** | Brute force of tokens or DDoS on verification endpoints. | In-memory sliding-window rate limiting (`createRateLimitMiddleware`). Dual tracking: authenticated requests scoped by `token:<tokenId>`, anonymous by `ip:<ip>`. Auth endpoints restricted to 10 req/min with standard `Retry-After` header. | **ACTIVE** |
| **THREAT-03** | **API2:2023 Broken Authentication** | Token sniffing or forgery. | Tokens generated as opaque 32-byte cryptographically secure random values (`node:crypto.randomBytes(32)`). Stored exclusively as SHA-256 hashes. Verified via `crypto.timingSafeEqual` to prevent timing attacks. | **ACTIVE** |
| **THREAT-04** | **API7:2023 Security Misconfiguration** | CI test bypass headers leaking into production. | `X-Polyglot-Test-Secret` strictly evaluated: accepted *only* when `NODE_ENV === 'test'` AND `ALLOW_CI_BYPASS === 'true'`. In production or staging, immediately returns 401 and logs `bypass_attempt` security violation. | **ACTIVE** |
| **THREAT-05** | **API8:2023 Lack of Protection from Automated Threats** | Cross-origin request forgery from untrusted domains. | Strict CORS origin verification with explicit `Vary: Origin` header and origin whitelist matching. | **ACTIVE** |
| **THREAT-06** | **Epistemic Authority Hijacking** | Forging formal mathematical proofs or claiming verified status without kernel execution. | Sole certifying authority: `hybrid-adjudicator.ts:264` (`SEAL_KERNEL_VERIFIED_TIER5`). All secondary bridges and autocorrect services emit non-certifying `ProofOutcome` (`preflight`, `unavailable`, `transport`, `metadata`). | **ACTIVE** |

---

## 2. Rate Limiting Profiles

| Profile | Window | Max Requests | Target Endpoints | Key Prefix |
|:---|:---:|:---:|:---|:---:|
| **Standard API** | 60,000 ms (1 min) | 100 | `/api/v1/*` (Default) | `global` |
| **MCP Protocol** | 60,000 ms (1 min) | 30 | `/mcp`, `/api/v1/mcp` | `mcp` |
| **Authentication** | 60,000 ms (1 min) | 10 | `/api/v1/auth/*`, token rotation | `auth` |

---

## 3. Storage & Secret Handling
- **Raw Tokens**: Generated and returned to the caller exactly once at creation/rotation time. Never stored in plaintext, never written to disk, never logged to stdout/stderr.
- **Stored Token Vault**: `data/tokens.json` persists only `{ id, name, tokenHash, createdAt, revokedAt, lastUsedAt }` where `tokenHash` is `SHA-256(rawToken)`.
