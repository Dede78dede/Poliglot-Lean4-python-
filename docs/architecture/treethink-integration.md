# TreeThink Integration Architecture (Phase 12, Sprint 12.4)

## 1. Overview
TreeThink (`GGLAB-KU/treethink`) provides tree search exploration (MCTS, BFTS, BeamSearch) over formal proof branches using Kimina Lean server and vLLM.

## 2. Dependencies & Hardware Requirements
- Python ≥ 3.12
- `vllm >= 0.8.5.post1` (requires local NVIDIA GPU or remote vLLM endpoint)
- `kimina-client` (already integrated into Polyglot Code Studio)

## 3. Epistemic Safeguards
- Feature flag `ENABLE_TREETHINK` defaults to `false`.
- REPL-level evaluation does not issue a kernel certificate.
- Any proof found by TreeThink carries `requiresKernelVerification: true` and must be validated by `SEAL_KERNEL_VERIFIED_TIER5`.
