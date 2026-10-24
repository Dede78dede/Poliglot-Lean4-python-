# ADR-0027: LeanCert Authority Model (Python SDK Claims vs. Lean Certificate Checkers)

## Status
Accepted

## Context
Polyglot Code Studio integrates numerical verification to bridge numerical intuition in Python with machine-checked proofs in Lean 4. `alerad/leancert` provides certified numerical reasoning using interval arithmetic, Taylor models, and programmatic solvers. The Python SDK (`leancert==0.3.2`) produces numerical bounds and interval claims, but floating-point arithmetic is inherently prone to truncation and rounding issues.

## Decision
We enforce a strict **asymmetric authority model**:
1. **Python SDK Role**: The Python SDK produces candidate bounds, approximations, and candidate certificate structures.
2. **Lean 4 Kernel Role**: The Lean certificate checkers (`alerad/leancert` on Lean v4.32.0) are the sole authoritative verifiers. A claim is marked with `verified: true` **only** if the Lean certificate checker successfully validates the certificate.
3. **No Silent Fallback**: If the `leancert-runner` container is down or unreachable, the system returns `503 LEANCERT_UNAVAILABLE` rather than faking verification.

## Consequences
- Guaranteed mathematical soundness: approximations never masquerade as proofs.
- Isolation of Lean v4.32.0 in `leancert-runner` prevents dependency collisions with v4.35.0 paranoid check.
