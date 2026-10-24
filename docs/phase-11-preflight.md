# Phase 11 Pre-Flight Readiness Checklist

**Polyglot Code Studio — Pre-Flight Verification for Phase 11**  
*Date: October 20, 2026*  
*Status: READY FOR PHASE 11*

---

## Pre-Flight Verification Matrix

| Check | Item | Verification Detail | Status |
|:---:|---|---|:---:|
| 1 | **Pyodide Version Confirmed** | Pyodide 314.0.7 adopted with `dedent` option for `runPython`/`runPythonAsync`, CPython 3.14.x, OPFS cache version `pyodide_assets_v314.0.7`. | **[X] PASS** |
| 2 | **WebMCP Strategy Decided** | Hybrid architecture ratified in **ADR-0011**: Streamable-HTTP (`POST /mcp`, spec 2026-07-28) primary; `@mcp-b/webmcp-polyfill` (~28 KB) optional fallback for Chrome origin trial expiry (2026-11-17). | **[X] PASS** |
| 3 | **Agent Sandbox Chosen** | **`clawcontainer` / ClawLess v1.0.0** (WebContainers WASM, MIT) selected over immature `wasmclaw` and commercial-restricted `peerd` in **ADR-0012**. | **[X] PASS** |
| 4 | **Bundle Budget Verified** | Core application bundle verified at **≤ 350 KB** gzipped budget; PyPI snapshot registry strictly within ≤ 80 KB gzip (6.05 KB actual). | **[X] PASS** |
| 5 | **Resource Profiles Documented** | Three hardware tiers formalized in `src/types/ai-profile.ts`: Lite (2 GB RAM, 0 VRAM), Standard (8 GB RAM + 6 GB VRAM, 7B-class Q4_K_M), and Full (32 GB RAM + 78 GB VRAM, Leanstral 119B). | **[X] PASS** |
| 6 | **Token Budget Manager Functional** | Real-time tracking, 80%/95%/100% alert thresholds, UTC midnight reset, CSV export implemented in `token-budget-manager.ts`. | **[X] PASS** |
| 7 | **Extended Free API Router Functional** | 6 free providers registered (NVIDIA NIM 40 RPM/model model-aware, Groq 30 RPM, Cerebras 30 RPM, Gemini 1.5k RPD, OpenRouter 20 RPM, Mistral 1 RPS) with circuit breaker and fallback. | **[X] PASS** |
| 8 | **Archon Horizon Cost Documented** | Documented in `docs/ai-integration.md` ($600/week for 3x Claude Code Max accounts); default disabled with mandatory user confirmation guard in `ArchonPanel.tsx`. | **[X] PASS** |
| 9 | **No-AI Mode Verified** | Deterministic heuristics via `NoAiProvider` verified with 2 GB Lite profile; all editor, Python Pyodide, Lean Lake runner, and document features function 100% offline. | **[X] PASS** |

---

## 9-Point Pre-Flight Verification Sign-Off

- [X] Pyodide version confirmed (314.0.7)
- [X] WebMCP strategy decided (hybrid: streamable-http primary)
- [X] Sandbox chosen (clawcontainer)
- [X] Bundle budget verified (≤ 350 KB)
- [X] Resource profiles documented (Lite 2 GB, Standard 8 GB + 6 GB VRAM, Full 78 GB)
- [X] Token budget manager functional
- [X] Extended free API router functional (6 providers)
- [X] Archon cost documented ($600/week)
- [X] No-AI mode verified: all non-AI features functional with NoAiProvider forced (2 GB Lite profile)

All pre-flight conditions for Phase 11 (Research & Literature Foundation, GROBID, Semantic Scholar, PDF extraction, and Agentic Workflows) are certified satisfied.
