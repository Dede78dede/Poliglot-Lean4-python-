# Phase 8 Deferred Components: Veil (verse-lab)

**Date**: October 15, 2026  
**Status**: Formally Deferred from Core Platform Path  

---

## 1. Candidate Overview

**Veil** (`verse-lab/veil`) provides push-button verification for transition systems and distributed protocols in Lean 4. It specializes in automated invariant induction, inductive transition relation checks, and model-checking-style safety verification for systems like Raft, Paxos, and two-phase commit protocols.

---

## 2. Rationale for Deferral

During the Phase 8 architecture evaluation, Veil was assessed against the core goals of Polyglot Code Studio:

1. **Domain Mismatch**:
   - Polyglot Code Studio's primary target persona is **mathematicians** (algebra, condensed mathematics, topology, number theory) and **scientific Python developers** (NumPy, Pyodide, symbolic computation).
   - Veil is specifically tailored for **distributed systems protocol engineering**, which constitutes an orthogonal domain.
2. **Toolchain & Dependency Conflicts**:
   - Veil requires a custom Lean 4 fork and specialized Lake dependencies that conflict with the pinned Mathlib toolchains (`v4.33.1` and `v4.35.0-rc4`).
3. **High Resource Footprint**:
   - Running Veil transition system solvers requires significant memory and prolonged SAT/SMT calls that degrade performance on single-node self-hosted deployments.

---

## 3. Future Roadmap

Veil remains on the radar for specialized industry formal verification modules. If user demand arises for formal verification of consensus protocols or state machines, Veil can be integrated via a modular, isolated container runner in a future release (Phase 10+). For general-purpose proof engineering in Phase 8, general superposition (Duper) and rule search (aesop) provide vastly higher utility.
