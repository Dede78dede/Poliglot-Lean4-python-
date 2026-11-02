# How-To: Use LLM Chat & Autonomous Prover

Polyglot Code Studio features a native conversational AI layer integrated directly into the workspace shell.

---

## 1. Opening the Chat Panel

1. Click the **Chat** icon (`MessageSquare`) in the **Activity Bar** (or press `Ctrl+Alt+C`).
2. The Chat panel opens in the **Side Panel** with a 3-tier view:
   - **Conversation Drawer** (collapsible): browse past sessions or create new ones.
   - **Message Thread** (`role="log"`, `aria-live="polite"`): real-time streaming responses, collapsible tool call cards, and diff previews.
   - **Composer** (`role="textbox"`, `aria-multiline="true"`): multi-line prompt editor with slash command hints and file attachment support.

---

## 2. Choosing AI Providers & Models

Use the header dropdowns to select from **14 supported AI providers**:
- **Google Gemini 2.5 Flash / Pro**: Multimodal reasoning with native MCP tool calling.
- **Anthropic Claude 3.7 / 3.5 Sonnet**: Extended thinking mode and two-phase commit tool approvals.
- **OpenAI GPT-4.5 / o-series**: Mathematical reasoning with `mcp_approval_request` support.
- **DeepSeek V3 / R1**: Reasoning models via function calling (`ai.ErrNoHosted` compliant).
- **Moonshot Kimi & MiniMax**: Interleaved thinking and OpenAI-compatible Chat Completions.
- **NVIDIA NIM, Groq, Cerebras, Mistral, OpenRouter**: High-throughput and free tier options.
- **Leanstral 1.5 & AXLE**: Specialized mathematical proof models.
- **Deterministic Heuristics (Zero-AI)**: 100% offline rule-based tactic synthesizer without network calls.

---

## 3. Slash Commands

Prefix any prompt with `/` to run specialized workflows:
- `/prove [goal]`: Solves pending Lean 4 `sorry` goals via semantic search and tactic induction.
- `/formalize [text]`: Translates natural language mathematical theorems into Lean 4 declarations.
- `/search [query]`: Searches Mathlib and Aristotle using Reciprocal Rank Fusion ($k=60$).
- `/blueprint [target]`: Inspects the blueprint DAG and generates stubs into `Blueprint/Main.lean`.
- `/explain`: Explains mathematical proof structure or Python code step by step.
- `/refactor`: Refactors code for minimal steps, type safety, and readability.
- `/test`: Runs LSpec CI test suites and typechecking.
- `/archive`: Packages the workspace into an RO-Crate `.polyglot` archive.
- `/skill <name>`: Loads one of the 5 canonical Agent Skills (`polyglot-math-prover`, `lean-blueprint-navigator`, etc.).

---

## 4. Proposed Diffs & Monaco DiffViewer

When the assistant proposes a file change, an interactive card appears:
- Click **Inspect Diff** to view changes side-by-side or inline in the Monaco `DiffEditor`.
- Click **Apply to File** to write the proposed changes directly to the Virtual File System (VFS).
- Click **Reject** to dismiss the proposal.

---


## 5. Autonomous Mode Guardrails

When `ENABLE_AGENTIC_AUTOMATION=true`, the **Auto** checkbox can be enabled:
- The agent executes read-only and safe MCP tools without prompting for confirmation.
- **Hard Guardrails**:
  - Max **50 tool calls** per session.
  - Max **10 file edits** per session.
  - Destructive operations (deleting files, emptying trash, altering security settings) are strictly gated and forbidden.

---

## 6. Skills & Slash Commands Alignment

The 8 workbench slash commands integrate directly with the active LLM provider or with the corresponding Agent Skills located in `assets/skills/`:
- `/prove` → `polyglot-prove-theorem`
- `/formalize` → `polyglot-import-paper`
- `/search` → `polyglot-search-mathlib`
- `/blueprint` → `polyglot-generate-blueprint`
- `/explain` → `polyglot-explain` (Skill-backed verification with prerequisites, steps, and failure modes; falls back to direct LLM call when offline)
- `/refactor` → `polyglot-refactor` (Skill-backed verification with prerequisites, steps, and failure modes; falls back to direct LLM call when offline)
- `/test` → `polyglot-test` (Skill-backed verification with prerequisites, steps, and failure modes; falls back to direct LLM call when offline)
- `/archive` → `polyglot-distribute-code`
- `/probe` → `polyglot-probe-tactic` (lean-beam speculative tactic evaluation)

### Skill-Backed Verification Details
Each of `polyglot-explain`, `polyglot-refactor`, and `polyglot-test` defines:
- **Prerequisites**: Verified syntax parser, kernel daemon or Pyodide test harness.
- **Steps**: Ingestion, intermediate AST/goal analysis, kernel-verified candidate testing, and structured diff generation.
- **Failure Modes**: Explicit RFC 9457 error codes (`SYNTAX_ERROR`, `KERNEL_VERIFICATION_FAILED`, `TEST_SUITE_FAILED`), with guaranteed graceful fallback to **direct LLM call** when dedicated runners are unavailable.

*Last verified: 2026-10-29*
