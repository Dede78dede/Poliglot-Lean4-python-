# Architecture: Progressive Tool Discovery & Token Reduction

Progressive Tool Discovery addresses the **Tool Explosion** problem in modern LLM agent integrations, where exposing large numbers of tools with complete JSON schemas exhausts the context window or rate limits (e.g. Groq 12K TPM).

---

## 1. Problem Statement
- Exposing 10 complete Polyglot MCP tools requires ~4,150 tokens per prompt.
- On low-TPM tiers (e.g. Groq free 12,000 TPM), a single request consumes over 34% of the per-minute budget before user conversation begins.

---

## 2. Solution: 3 Virtual Tools
When `ENABLE_TOOL_SEARCH=true`, Polyglot replaces the 10 full schemas with 3 lightweight virtual tools:
1. **`polyglot_search_tools(query, category?)`**:
   Uses BM25 keyword matching to return up to 5 compact `ToolCard`s with category and summary.
2. **`polyglot_describe_tool(name)`**:
   Returns the full schema on demand only when the agent decides to invoke it (`defer_loading` pattern).
3. **`polyglot_invoke_tool(name, arguments, proposalToken?)`**:
   Proxies invocation to the target tool, enforcing `PROPOSAL_TOKEN_REQUIRED` for `confirm`-tier tools.

---

## 3. Metrics
- **Full Schema Size**: ~4,150 tokens.
- **Virtual Discovery Schema Size**: ~820 tokens.
- **Token Reduction**: ~80.2%.
- **Groq 12K TPM Headroom**: Preserves over 11,000 TPM for reasoning and conversation.
