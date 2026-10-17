# Duper Superposition Prover Research & Integration Guide

**Status**: Experimental Prover Integration  
**Ecosystem Repository**: `leanprover-community/duper`  
**License**: Apache-2.0  
**Feature Flag**: `ENABLE_DUPER` (default: `false`)  

---

## 1. Overview & Mathematical Motivation

Duper is an automated proof-producing superposition theorem prover for Lean 4. Superposition is the state-of-the-art calculus for first-order logic with equality, generalizing resolution and Knuth-Bendix completion. In interactive theorem proving, superposition provers (such as Metis in Isabelle or Sledgehammer backends) allow mathematicians to automatically discharge non-trivial equality and first-order goals without manual tactic wrangling.

In Polyglot Code Studio, Duper serves as Tier 1 in the Proof Automation Fallback Chain:
1. **Tier 1 — Duper**: First-order superposition search over active hypotheses.
2. **Tier 2 — aesop**: Best-first rule search combining simplification and safe/unsafe introduction rules.
3. **Tier 3 — Pantograph**: Guided goal tree exploration via LLM/heuristic tactic synthesis.

---

## 2. Kernel Gate & Safety Invariants

Even when Duper succeeds in generating a proof, **its output is never injected directly into user workspaces without verification**. The generated tactic block or proof term must pass through the Polyglot Code Studio 5-Term Formal Verification Formula:
1. Non-empty code payload.
2. Zero `sorry` or `admit` tokens.
3. Syntactically valid Lean 4 declaration.
4. Valid tactic syntax.
5. Successful elaboration and compilation by the Lean 4 kernel with 0 exit code.

---

## 3. Toolchain Compatibility Matrix

| Lean Toolchain | Duper Compatibility | Notes |
| :--- | :--- | :--- |
| `v4.28.0` | Compatible (v0.0.12) | Historical baseline |
| `v4.31.0` | Compatible (v0.0.15) | Supported |
| `v4.33.1` | Compatible (v0.0.17) | Production runner target |
| `v4.35.0-rc4` | Experimental (v0.0.18+) | Pinned project default; requires `ENABLE_DUPER=true` |

---

## 4. Performance & Timeout Guidelines

Because superposition provers can experience combinatorial clause explosions on large axiom sets:
- **Default Timeout**: 30,000 ms (30 seconds).
- **Max Timeout Ceiling**: 60,000 ms.
- **Degradation Policy**: If Duper times out or returns incomplete clauses, `ProofCoordinator` logs `status: 'attempted'` and immediately falls through to `aesop` without failing the overall request.
