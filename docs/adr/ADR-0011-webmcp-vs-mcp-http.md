# ADR-0011: Hybrid WebMCP vs Streamable-HTTP Transport Architecture

- **Status**: Accepted
- **Date**: 2026-10-20
- **Deciders**: Architecture Board (Polyglot Code Studio)

## Context
Google Chrome introduced an origin trial for WebMCP (`document.modelContext`, previously `navigator.modelContext` in Chrome 150) spanning Chrome 149–156, scheduled to conclude on 2026-11-17 00:00 UTC. If Polyglot Code Studio's agentic tools exclusively relied on native browser WebMCP, Phase 11.5 (Agentic UI) would break immediately upon trial expiration.

## Decision Drivers
- Universal browser compatibility (Firefox, Safari, Chromium, self-hosted headless environments)
- Longevity and stability beyond the 2026-11-17 origin trial expiry
- Adherence to MCP Streamable HTTP Spec (revision 2026-07-28)
- Zero blocking dependencies for upcoming Phase 11 research workflows

## Considered Options
1. **WebMCP-Only**: Depend on `document.modelContext` origin trial API.
2. **Streamable-HTTP Only**: Ignore in-browser WebMCP and rely purely on HTTP `/mcp`.
3. **Chosen Approach (Hybrid)**: Streamable-HTTP as the authoritative primary transport, with WebMCP as an optional progressive enhancement polyfilled via `@mcp-b/webmcp-polyfill` (~28 KB).

## Decision Outcome
Adopt a **Hybrid Architecture**:
- The primary MCP communication layer uses **Streamable HTTP (spec 2026-07-28)** running over `POST /mcp` with SEP-2243 headers (`Mcp-Method`, `Mcp-Name`). This guarantees operation across all modern browsers and local Node/Electron runtimes.
- In environments where WebMCP is present or enabled, Polyglot Code Studio lazily loads `@mcp-b/webmcp-polyfill` to bridge DOM tool invocation without breaking when native support is withdrawn after 2026-11-17.

### Positive Consequences
- Zero vulnerability to the 2026-11-17 origin trial sunset.
- Works deterministically across Firefox, Chrome, Safari, and headless CI.
- Full compatibility with Claude Code, Codex, and Leanstral external agents.

### Negative Consequences
- Slight bundle overhead (~28 KB) for the optional WebMCP polyfill when lazily loaded.

## Compliance & Governance
- Verified by automated test suite in `scripts/verify-all.ts` (Suite 42).
- Append-only architectural record.
