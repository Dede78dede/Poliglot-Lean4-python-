# Proof Reuse & Retrieval Memory Architecture (Phase 12, Sprint 12.1)

## 1. Overview
Proof Reuse provides a two-level caching and retrieval system for Lean 4 formal proofs verified by the kernel (`SEAL_KERNEL_VERIFIED_TIER5`):
1. **Exact Canonical Goal Hash**: SHA-256 of normalized goal statement + toolchain.
2. **Semantic Retrieval**: Lexical token matching and vector embeddings with BM25 fallback.

## 2. Epistemic Invariants
- **No Direct Certification**: A reused proof is returned with `verified: false`. The caller must run the kernel verification before accepting it.
- **No Incomplete Proofs**: Declarations bearing `sorry` or `admit` are rejected at the indexing boundary.
- **Toolchain Invariance**: A cached proof from toolchain A is not considered valid for toolchain B without re-verification; when a mismatch is detected, `similarity: 0` is returned with an explicit warning.
