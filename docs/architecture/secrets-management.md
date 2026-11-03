# Secrets Management, Authentication & Security Observability Architecture

**Phase**: 13.9 (Consolidation Gate)  
**Status**: ACTIVE  
**Updated**: 2026-11-03  

---

## 1. Overview & Threat Model

Polyglot Code Studio exposes REST, Server-Sent Events (SSE), and Model Context Protocol (MCP 2026-07-28) endpoints. To protect formal verification pipelines, execution environments, and user workspaces against unauthorized execution, Denial of Service (DoS), and secret leakage, Phase 13.9 establishes a zero-trust local authentication and rate limiting boundary.

### Core Principles
1. **Zero Secret Leakage**: Raw tokens, API keys, and internal secrets are NEVER printed in logs, error payloads, or LLM contexts.
2. **Constant-Time Verification**: All token comparisons use `crypto.timingSafeEqual` over SHA-256 digests to prevent timing side-channel attacks.
3. **Stateless MCP Isolation**: Third-party MCP clients communicate via standard JSON-RPC without session affinity headers (`Mcp-Session-Id`), protected by an IP-based sliding window rate limiter (30 rpm).
4. **Strict CI Guard**: Test secret bypasses are structurally restricted to `NODE_ENV === "test"` AND `ALLOW_CI_BYPASS === "true"`. Attempts in any other environment are immediately rejected with 401 and logged as security anomalies.

---

## 2. Token Vault Architecture

Tokens are managed via `TokenVault` (`src/services/auth/token-vault.ts`) backed by `data/tokens.json`.

### On-Disk Representation
Raw tokens are generated as 32-byte cryptographically secure random values (`base64url`). The Token Vault stores only the cryptographic SHA-256 hash alongside metadata:

```json
{
  "tokens": [
    {
      "id": "tok-1793706000000-a1b2c3",
      "name": "developer-cli",
      "hashedSecret": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "createdAt": "2026-11-03T11:40:00.000Z",
      "revoked": false
    }
  ],
  "version": 1
}
```

### CLI Token Management
- **Rotate Token**: `npm run tokens:rotate -- --name "my-service"`
  Generates a new 32-byte opaque token, outputs the raw token ONCE to stdout, and securely persists the hashed secret.
- **Revoke Token**: `npm run tokens:revoke -- --id "tok-..."`
  Marks the token as revoked; all subsequent requests with this token are rejected with 401 `UNAUTHORIZED_ACCESS`.

---

## 3. Authentication Middleware

Implemented in `src/middleware/auth.ts`:

- **Bearer Token**: `Authorization: Bearer <token>`
- **SSE Fallback**: `GET /api/v1/.../build-stream?token=<token>` (for browser EventSource connections where custom request headers cannot be set).
- **Public Whitelist**: `/api/health` and `/mcp` endpoints require no Bearer authentication (MCP uses transport-level protocol checks).
- **CI Test Secret**: `X-Polyglot-Test-Secret: polyglot-ci-test-2026` is accepted **strictly** when `process.env.NODE_ENV === 'test' && process.env.ALLOW_CI_BYPASS === 'true'`.

---

## 4. Sliding-Window Rate Limiting

Implemented in `src/middleware/rate-limit.ts`:

| Endpoint Group | Window | Capacity | Strategy | Action on Exceeded |
|---|---|---|---|---|
| General API (`/api/v1/*`) | 60 sec | 100 req | Token-based / IP fallback | 429 `Retry-After: <sec>` |
| MCP Server (`/mcp`) | 60 sec | 30 req | Client IP | 429 `Retry-After: <sec>` |

RFC Headers emitted on every request:
- `X-RateLimit-Limit`: Maximum requests permitted per window.
- `X-RateLimit-Remaining`: Remaining quota in current window.
- `X-RateLimit-Reset`: Unix timestamp when the oldest request exits the sliding window.

---

## 5. Security Observability & Audit Trail

Implemented in `src/services/auth/security-events.ts`:

Structured security events are captured in-memory and logged via `StructuredLogger`:
- `auth_denied`: Invalid, revoked, or missing token.
- `rate_limited`: Rate limit threshold crossed.
- `bypass_attempt`: `X-Polyglot-Test-Secret` received in non-test mode (e.g. `NODE_ENV === "production"`).
- `token_rotated` / `token_revoked`: Administrative token lifecycle actions.

Security events are emitted unconditionally, regardless of whether `ENABLE_OTEL_BROWSER` or `ENABLE_OTEL_NODE` is active.
