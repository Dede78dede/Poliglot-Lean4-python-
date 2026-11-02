# AX-PROVER Proposal Loop Architecture (Phase 12, Sprint 12.2)

## 1. Overview
The Proposal Loop implements the four-node iterative architecture:
- **Proposer**: Generates candidate Lean proofs with tight tool budget (`max_tool_calling_iterations: 1`).
- **Builder**: Validates candidates with bounded concurrency (`max_concurrent_builds: 12`).
- **Reviewer**: Evaluates candidates against kernel soundness rules. Strictly forbids `sorry`, `admit`, and `native_decide`.
- **Memory**: An `ExperienceProcessor` summarizing failures into structured lessons stored in `RetrievalMemory`.

## 2. APOLLO Compiler-Guided Repair
Instead of high-$K$ blind resampling, on failure the compiler diagnostic is passed back to the Proposer with $K=1$ sampling to repair the specific broken tactic.

## 3. Epistemic Safeguards
The loop returns `proved: true` only as a proposal candidate. Final formal certification requires `SEAL_KERNEL_VERIFIED_TIER5`.
