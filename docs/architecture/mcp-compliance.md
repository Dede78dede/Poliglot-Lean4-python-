# Architecture: MCP 2026-07-28 Stateless Compliance

This document specifies Polyglot Code Studio's compliance with the **Model Context Protocol (MCP) 2026-07-28 Stateless Revision**.

---

## 1. Specification Deltas

### Removed Features (Non-Compliant)
- **Session Handshakes**: `initialize` and `initialized` methods are completely eliminated.
- **Session IDs**: `Mcp-Session-Id` header is neither generated nor expected.
- **GET Streaming**: `GET /api/v1/mcp` is rejected with `405 Method Not Allowed` and `Allow: POST`.
- **Session Deletion**: `DELETE /api/v1/mcp` is rejected with `405 Method Not Allowed` and `Allow: POST`.

### Mandatory Additions
1. **`server/discover` Endpoint**:
   Returns the server's protocol versions, static capabilities, and server metadata.
   Available via RPC `server/discover` or HTTP alias `POST /api/v1/mcp/discover`.
   ```json
   {
     "protocolVersions": ["2026-07-28"],
     "capabilities": {
       "tools": { "listChanged": false },
       "prompts": { "listChanged": false },
       "resources": { "listChanged": false }
     },
     "serverInfo": {
       "name": "polyglot-code-studio",
       "version": "1.0.0",
       "vendor": "polyglot"
     }
   }
   ```

2. **Mandatory Headers**:
   - `Mcp-Method`: Must accompany every `POST` (`tools/list`, `tools/call`, `server/discover`, etc.). Requests without it return `400 Bad Request`.
   - `Mcp-Name`: Must accompany `tools/call` requests specifying the target tool.
   - `MCP-Protocol-Version: 2026-07-28`: Echoed on all HTTP responses.

---

## 2. Invariants
- Zero server-side session memory.
- Rate limiting at 100 requests per minute with standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
- Epistemic verification via `SEAL_KERNEL_VERIFIED_TIER5` before formal promotion.
