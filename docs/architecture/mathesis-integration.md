# Architecture: Mathesis Autoformalization & LeanScorer Integration

*Last verified: 2026-10-29*

## 1. Pipeline Overview

Mathesis (ICLR 2026) bridges natural language mathematical reasoning and formal Lean 4 declarations.

```
Natural Language Statement
         │
         ▼
Mathesis Remote Inference (MATHESIS_ENDPOINT)
         │
         ▼
Candidate Synthesis (Lean 4 AST)
         │
         ▼
LeanScorer Validation (Score in [0, 1])
   ├── Score >= 0.5 ──> Accepted candidate
   └── Score < 0.5 ───> Rejected candidate
         │
         ▼
Monaco Editor / Active Workspace
```

---

## 2. Fail-Fast Unconfigured Endpoint Contract

- If `MATHESIS_ENDPOINT` is unconfigured or empty, requests immediately throw `BridgeError('MATHESIS_UNAVAILABLE')` with HTTP 503 Problem Details and setup instructions.
- This ensures users are never confused by silent local timeouts or stalled GPU inference queues.

---

## 3. Epistemic Guardrail

Mathesis autoformalization outputs are strictly heuristic:
- Candidates are syntactic hypotheses.
- `LeanScorer` ratings represent heuristic probability, not formal soundness.
- Proofs remain unverified until compiled and checked by the Lean 4 kernel with `SEAL_KERNEL_VERIFIED_TIER5`.
