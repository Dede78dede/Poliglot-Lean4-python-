# Explanation: The 5-Term Kernel Verification Formula & Zero-Sorry Guarantee

This architectural document explains the mathematical foundations, threat model, and formal verification gates that make Polyglot Code Studio an uncompromising environment for certified mathematics.

---

## 1. The Core Invariant: Zero Sorry Ban

In interactive theorem proving, `sorry` serves as an axiomatic placeholder indicating an incomplete proof. In high-stakes mathematics and critical software verification, an unvetted `sorry` introduces unsoundness.

Polyglot Code Studio enforces a hard runtime and compilation gate:
> **No node, export, or milestone can receive a verified status if its AST or dependency tree contains an unproven `sorry`.**

---

## 2. The 5-Term Verification Formula

A proof certificate `C` is valid if and only if all five independent conditions evaluate to `true`:

$$\text{Verified}(C) \iff T_1 \land T_2 \land T_3 \land T_4 \land T_5$$

### Term 1 ($T_1$): Kernel Exit Status
The Lean 4 elaboration and kernel checker must exit with code `0`. Any unhandled elaboration warning or fatal syntax failure immediately invalidates verification.

### Term 2 ($T_2$): Absence of Open Goals
The proof state must reach `No goals`. Partial tactic progressions that leave sub-goals unresolved are strictly rejected.

### Term 3 ($T_3$): Zero Sorry AST Invariant
The abstract syntax tree is parsed to ensure no declaration body relies on `sorryAx` or axiomatic fallbacks not explicitly whitelisted in the workspace manifest.

### Term 4 ($T_4$): Content Hash & Cryptographic Signature Seal
The certificate must include a SHA-256 content hash of the theorem statement and proof term, sealed with a HMAC signature anchored to the server's cryptographic ledger.

### Term 5 ($T_5$): Toolchain Compatibility Check
The toolchain version executing the verification must match the certified workspace manifest (e.g., `leanprover/lean4:v4.35.0-rc4`). This eliminates toolchain regression and divergence bugs.

---

## 3. Opt-In Term 6: Strict Goal Pipeline ($T_6$)

When `PIPELINE_STRICT_GOALS=true` is enabled in production or audit environments, a 6th term is activated:
- **No Unused Hypotheses**: All introduced hypotheses must be consumed in the proof term, ensuring minimal, canonical proofs suitable for dataset extraction and formal audit.

---

## 4. The Skeptical Oracle Architecture

When external or automated systems (such as AI tactic generators, Duper superposition provers, or Computer Algebra Systems like SymPy/Veriphy) produce an answer:
1. The external answer is treated as **untrusted hint data**.
2. A formal Lean 4 certificate is synthesized (e.g. constructing an equality via `ring` or `linear_combination`).
3. The certificate is passed directly to the local Lean 4 kernel.
4. If and only if the kernel certifies the synthesized term is the node marked as verified.

This architecture ensures that no matter how complex the AI or CAS heuristics are, the mathematical soundness rests entirely on the foundational axioms of the Lean 4 type theory kernel.
