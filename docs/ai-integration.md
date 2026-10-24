# AI Integration, Resource-Aware Profiles & API Routing

**Polyglot Code Studio — Phase 10.4 Architecture Specification**  
*Date: October 20, 2026*

---

## 1. Hardware-Aware AI Profiles

Polyglot Code Studio dynamically estimates host memory and WebGPU limits to recommend the optimal execution tier.

| Profile | Min RAM | Min VRAM | Local Model | Hardware Target | Cost | Capabilities |
|---|---|---|---|---|---|---|
| **Lite** | 2 GB | 0 GB | None | Any workstation / laptop since 2018 | €0 | All non-AI features 100% functional; optional free cloud API routing. |
| **Standard** | 8 GB | 6 GB | 7B-class Q4_K_M | Consumer laptops with RTX 3060/4060 (8 GB VRAM) | €0 | **Realistic optimum for self-hosted users**. 6.2 GB VRAM with 8K KV cache. (~84% GSM8K, ~71% HumanEval). |
| **Full** | 32 GB | 78 GB | Leanstral 1.5 119B Q4_K_M | 4× A100 80GB or DGX Spark NVFP4 | €0 (self-hosted) | Full 119B/6.5B active MoE (256K context, miniF2F 100%). **Requires institutional cluster**. |

> **Critical Clarification**: No configuration of the full 119B model fits within 8 GB of RAM. The "8 GB optimal" recommendation applies strictly to the **Standard profile** (7B-class local model).

---

## 2. Extended Free API Router

Polyglot Code Studio implements a cost-first fallback router cycling through 6 free cloud API providers:

1. **NVIDIA NIM (`integrate.api.nvidia.com`)**:
   - **Limit**: 40 RPM **per model**, 10,000 requests/day.
   - **Model-Aware Routing**: Rate limits are scoped per model ID rather than per account. Cycling through `meta/llama-3.3-70b-instruct`, `mistralai/mixtral-8x22b-instruct`, and `nvidia/nemotron-4-340b-instruct` multiplies available throughput.
2. **Groq Cloud (`api.groq.com`)**:
   - **Limit**: 30 RPM, 14,400 RPD, 500–700 tokens/sec.
   - **Models**: `llama-3.3-70b-versatile`, `llama-4-scout`.
3. **Cerebras (`api.cerebras.ai`)**:
   - **Limit**: 30 RPM, 1M tokens/day, 14,400 RPD, 60K–100K TPM.
   - **Models**: `llama3.3-70b`, `qwen3-32b`.
4. **Google Gemini (`generativelanguage.googleapis.com`)**:
   - **Limit**: 1,500 requests/day, 250K TPM.
   - **Model**: `gemini-2.5-flash`.
5. **OpenRouter (`openrouter.ai`)**:
   - **Limit**: 20 RPM, 50 RPD on free tiers (expanding to 1,000 RPD after $10 lifetime credit).
   - **Models**: `meta-llama/llama-3.3-70b-instruct:free`.
6. **Mistral AI (`api.mistral.ai`)**:
   - **Limit**: ~1 RPS, 500K TPM.
   - **Models**: `codestral-latest`, `mistral-small-latest`.

---

## 3. Real-Time Token Budget Manager

- **Granular Accounting**: Tracks both prompt input tokens and generated output tokens per provider.
- **Automated Resets**: Daily quota resets at UTC midnight (`00:00:00Z`); monthly quota resets on the 1st of each calendar month.
- **Alert Thresholds**: Emits system telemetry warnings at **80%** and **95%** consumption, and automatically blocks API calls (`BUDGET_EXHAUSTED`) at **100%**.
- **Audit & Export**: Generates local-only CSV logs with zero external telemetry.

---

## 4. Archon Horizon Cost Boundaries & Guard

- **Architecture**: Workspace-first multi-agent Lean 4 formalization orchestrated via Claude Code / Claude Opus 4.8.
- **Cost Warning**: Sustaining 3 concurrent agent accounts over a 1-week formalization sprint requires approximately **$600 USD/week** ($200/month/account).
- **Safety Invariant**: Gated behind `ENABLE_ARCHON_HORIZON=false` by default, requiring an explicit user consent checkbox before activation.
- **Verification Guarantee**: Every synthesized proof is verified by Kimina / Lean 4 kernel; candidate proofs with `sorry` or `admit` are rejected with `KERNEL_VERIFICATION_FAILED`. Verified proofs receive `SEAL_KERNEL_VERIFIED_TIER5`.
