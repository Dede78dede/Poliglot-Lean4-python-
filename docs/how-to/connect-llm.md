# How-To: Connect Heterogeneous LLMs to Polyglot Code Studio

This guide provides connection recipes for 9 leading LLM providers and agent environments to connect to Polyglot Code Studio via native MCP or the MCP Gateway.

---

## 1. OpenAI (GPT-4.5 / o-series / Codex CLI)
- **Transport**: Native MCP (Stateless HTTP)
- **Endpoint**: `http://localhost:3000/api/v1/mcp`
- **Approval Flow**: `mcp_approval_request` / `mcp_approval_response` with `approve: boolean`
- **Configuration**:
  ```json
  {
    "mcpServers": {
      "polyglot": {
        "url": "http://localhost:3000/api/v1/mcp",
        "headers": {
          "Mcp-Method": "server/discover"
        }
      }
    }
  }
  ```

---

## 2. Anthropic (Claude 3.7 / Claude Code)
- **Transport**: Native MCP (Streamable HTTP / stdio)
- **Endpoint**: `http://localhost:3000/api/v1/mcp`
- **Approval Flow**: Two-phase commit (`proposalToken`)
- **Agent Skill**: Load `.claude/skills/polyglot-*/SKILL.md` directly in Claude Code.
- **Claude Desktop Config**:
  ```json
  {
    "mcpServers": {
      "polyglot": {
        "url": "http://localhost:3000/api/v1/mcp"
      }
    }
  }
  ```

---

## 3. Google Gemini (Gemini 2.5 Flash / Pro)
- **Transport**: Native MCP & Function Calling
- **Endpoint**: `http://localhost:3000/api/v1/mcp`
- **Auth Scheme**: Bearer token via `Authorization: Bearer <token>`
- **Approval Flow**: Two-phase commit (`proposalToken`)

---

## 4. NVIDIA NIM
- **Transport**: Function-only via MCP Gateway
- **Rate Limit**: 40 RPM per model bucket
- **Endpoint**: `http://localhost:4000/v1/mcp` (LiteLLM) or direct function calling
- **Supported Models**: `meta/llama-3.3-70b-instruct`, `mistralai/mixtral-8x22b-instruct-v0.1`

---

## 5. DeepSeek (V3 / R1)
- **Transport**: Function-only (`ai.ErrNoHosted` compliant)
- **Max Tools**: 128 tools
- **Pricing**: $0.14/M input, $0.28/M output
- **Approval Flow**: Client-side function call confirmation
- **Tool Search**: Enable `ENABLE_TOOL_SEARCH=true` to reduce tool prompt overhead.

---

## 6. Moonshot Kimi (k2.6 / k3)
- **Transport**: Function-only (OpenAI-compatible Chat Completions)
- **Pricing**: $0.60/M input, $2.50/M output
- **Approval Flow**: Client-side function call confirmation
- **Tool Choice**: `all` supported for `kimi-k3`.

---

## 7. MiniMax (MiniMax-Text-01)
- **Transport**: Hybrid (server-side proprietary tools + client function call)
- **Auth Scheme**: Bearer + GroupId header (`Authorization: Bearer <key>`, `GroupId: <group-id>`)
- **Thinking Mode**: Interleaved thinking mode is mandatory (`MINIMAX_THINKING_DISABLED_REJECTED` thrown if disabled).
- **Pricing**: $0.20/M input, $0.60/M output

---

## 8. Groq Cloud LPU
- **Transport**: Function-only via Gateway
- **Rate Limit**: 12K TPM free tier
- **Recommendation**: Set `ENABLE_TOOL_SEARCH=true`. Reduces tool catalog token consumption from ~4,150 tokens down to ~820 tokens (~80% reduction), leaving space for conversation context.

---

## 9. OpenRouter
- **Transport**: Function-only (19 free models with tool calling)
- **Rate Limit**: 20 RPM, 50 requests/day on free tier
- **Endpoint**: `http://localhost:3000/api/v1/ai/suggest` or via LiteLLM gateway.
