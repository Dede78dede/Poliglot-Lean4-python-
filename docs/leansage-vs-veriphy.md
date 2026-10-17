# Architectural Decision: Veriphy Extension vs. LeanSage Integration

**Status**: Confirmed & Approved (Phase 8 Architecture Decision)  
**Authors**: Polyglot Code Studio Engineering Team  
**Date**: October 15, 2026  

---

## 1. Executive Summary

In Phase 8, Polyglot Code Studio required advanced Computer Algebra System (CAS) capabilities to automate algebraic theorem proving, polynomial factorization, and coefficient analysis for mathematicians and scientific Python developers.

Two candidates were evaluated from the verified ecosystem:
1. **LeanSage** (Reservoir, v0.2.0, 2025-11-21): Lean term → MathAST → SageMath code → execute process → translate back.
2. **Veriphy** (PyPI, 2026-10-12): Skeptical oracle model treating external CAS as untrusted, synthesizing Lean proof terms verified independently by the Lean 4 kernel.

**Decision**: We elected to **extend the existing Veriphy skeptical oracle** with polynomial factorization and coefficient analysis tools rather than introducing LeanSage as a redundant third-party dependency.

---

## 2. Multi-Criteria Comparison Matrix

| Evaluation Dimension | LeanSage (v0.2.0) | Veriphy (Extended Skeptical Oracle) |
| :--- | :--- | :--- |
| **Trust Model** | Direct AST translation; treats Sage execution results as trusted or semi-trusted. | **Zero-Trust Skeptical Oracle**: SageMath output is treated as unverified advice. Lean 4 kernel independently checks every proof. |
| **Sorry & Non-Standard Axiom Policy** | Allows unproven terms to flow back into Lean environment without strict verification gates. | **Zero-Sorry Ban**: Strictly rejects `sorry`, `admit`, or any non-standard axiom outside `propext`, `Classical.choice`, `Quot.sound`. |
| **Toolchain Pinning & Maintenance** | Unpinned Reservoir package; tested on Lean 4.10 / 4.12. Incompatible with `v4.35.0-rc4` without upstream patch. | Fully decoupled client-side and server-side TypeScript/Python architecture; 100% compatible with pinned toolchains (`v4.28.0` - `v4.35.0-rc4`). |
| **Deployment Footprint** | Requires running local SageMath subprocess with native Python/C dependencies on host or container. | Operates in dual-mode: local SageMath binary when available (`SAGE_PATH`), with deterministic offline skeptical oracle fallback. |
| **Deduplication & DRY** | Redundant with Phase 5.5 Level 5 Certified CAS. | Direct extension of existing L5 architecture; zero architectural drift or code bloat. |

---

## 3. Extended Capabilities Implemented in Veriphy

Instead of importing unpinned code, we enriched `VeriphyClient` with two core algebraic operations:

### 3.1 Polynomial Factorization (`factorPolynomial`)
- **Input**: Algebraic string (e.g., `x^2 - y^2`, `x^2 + 2*x + 1`, `a^3 - b^3`).
- **Skeptical Oracle**: Computes factorization candidates (e.g. `(x - y) * (x + y)`).
- **Kernel Certificate**: Synthesizes a formal Lean 4 theorem:
  ```lean
  -- Certified by Veriphy Skeptical CAS Factorization
  theorem poly_factor_cert (x y a b : Int) : x^2 - y^2 = (x - y) * (x + y) := by
    ring
  ```
- **Verification Gate**: Evaluated against `evaluateFormalVerification()`. If the kernel fails to verify or if `sorry` is detected, the result is rejected.

### 3.2 Coefficient Analysis (`computeCoefficients`)
- **Input**: Polynomial expression (e.g., `3 * x^2 + 5 * x + 2`).
- **Skeptical Oracle**: Derives degree and degree-to-coefficient mapping (`{ 2: 3, 1: 5, 0: 2 }`).
- **Kernel Certificate**: Synthesizes canonical sum equivalence and proves correctness in Lean 4 via `ring`.

---

## 4. Conclusion & Feature Flag Policy

LeanSage remains documented as an ecosystem reference. For experimental exploration, an opt-in toggle `ENABLE_LEANSAGE` (default: `false`) is defined in `.env.example`. However, the default production path utilizes the extended Veriphy skeptical oracle to preserve mathematical rigor and kernel integrity.
