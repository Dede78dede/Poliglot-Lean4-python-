---
name: polyglot-prove-theorem
description: "Autoformalize and verify formal Lean 4 theorems with independent kernel cross-checks."
tools: ["polyglot_search_proof_library", "polyglot_get_proof_automation_status", "polyglot_verify_proof_kernel", "polyglot_propose_proof_patch"]
---

# polyglot-prove-theorem

Guides an AI agent through formulating, autoformalizing, and verifying a formal theorem in Lean 4 within Polyglot Code Studio.

## Workflow
1. Use `polyglot_search_proof_library` to check if a similar lemma already exists in Mathlib.
2. Ingest the theorem statement using informal mathematical notation or Python formal specifications.
3. Call `polyglot_get_proof_automation_status` to determine which solver backends are active (Duper, Pantograph, Leanstral, AXLE).
4. For candidate proofs, run `polyglot_verify_proof_kernel` to verify through independent kernels.
5. If changes to workspace files are required, propose a proof patch with `polyglot_propose_proof_patch` and await confirmation token.
