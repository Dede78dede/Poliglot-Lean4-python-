# Proof Automation & Metaprogramming User Guide

**Polyglot Code Studio — Phase 8**  
A comprehensive guide for mathematicians and developers to automate formal proof synthesis, explore counterexamples, simplify proofs, and synchronize blueprints.

---

## 1. Introduction

Polyglot Code Studio bridges interactive theorem proving (Lean 4) with scientific computing (Python 3.14 / WASM). Phase 8 introduces **Advanced Proof Automation**: a layered, tool-maturity-aware automation engine that combines automated superposition theorem provers, cloud metaprogramming, skeptical computer algebra, and architectural blueprint synchronization.

All automation pipelines adhere to two fundamental safety guarantees:
1. **Zero-Sorry Invariant**: No unproven tactic, `sorry`, or `admit` is ever certified or silently accepted.
2. **Lean 4 Kernel Verification**: Every proof candidate synthesized by AI, superposition provers, or computer algebra systems must be independently verified by the Lean 4 kernel before being injected into your codebase.

---

## 2. Auto-Prove: Multi-Tier Fallback Chain

When formalizing complex theorems, mathematicians can open the **Auto-Prove** tab in the right-hand Proof Automation drawer.

### 2.1 The Fallback Architecture
The proof synthesizer executes in a strict priority sequence:

```
┌────────────────────────────────────────────────────────┐
│                      Target Goal                       │
│                           │                            │
│                           ▼                            │
│     Tier 1: Duper Superposition Prover (Opt-In)        │
│          ├── Success ──► Lean 4 Kernel Verification    │
│          └── Fail / Disabled                           │
│                           ▼                            │
│     Tier 2: aesop (Best-First Rule Search)             │
│          ├── Success ──► Lean 4 Kernel Verification    │
│          └── Fail                                      │
│                           ▼                            │
│     Tier 3: Pantograph Goal Tree Search                │
│          ├── Success ──► Lean 4 Kernel Verification    │
│          └── Fail ──► proved: false (Zero Hallucination)│
└────────────────────────────────────────────────────────┘
```

- **Duper**: An automated superposition prover for first-order equality reasoning. Feature-flagged under `ENABLE_DUPER` (default: `false`).
- **aesop**: High-efficiency rule-based search engine in Lean 4.
- **Pantograph**: Goal-directed heuristic search using certified tactics (`rfl`, `decide`, `omega`, `ring`, `constructor`).

### 2.2 Kernel Verification Certificates
When a proof is synthesized, a **Tier 5 Kernel Verification Certificate** is generated, displaying:
- SHA-256 Content-Addressed Hash
- Number of Kernel Terms Checked (5 terms)
- Verification Duration in milliseconds
- Active Toolchain (e.g. `v4.35.0-rc4`)
- Cryptographic Signature Seal

Click **Inject Proof** to directly apply the verified proof into the Monaco Editor at your current cursor position.

---

## 3. AXLE Cloud Metaprogramming

The **AXLE Cloud** tab provides advanced mathematical metaprogramming tools powered by Axiom AXLE:

### 3.1 Disprove & Counterexample Discovery
- **Purpose**: Before spending hours attempting to prove a theorem, verify that the statement is not actually false.
- **Example**: Testing `1 = 2` or `∀ n, Nat.Prime n`.
- **Output**: Generates a verified counterexample or a formal negation proof (`¬ statement := by decide`).

### 3.2 Extract Proof States
- **Purpose**: Computes declaration-granularity intermediate proof states for every line of your active Lean buffer.
- **Benefit**: Provides an immediate overview of open goals without waiting for slow language server tooltips.

### 3.3 Proof Simplification
- **Purpose**: Analyzes verbose or AI-generated proofs and eliminates redundant tactics (`intro`, unnecessary `have` statements, redundant rewrites).
- **Safety**: Automatically verifies that the simplified proof still compiles and satisfies the original goal.

### 3.4 Mandatory User Consent Gate
To protect private mathematical research, AXLE cloud requests are gated behind an **Explicit User Consent Modal**:
- No code payload is transmitted to the cloud unless `consentGiven: true` is granted.
- If consent is revoked or denied, requests return HTTP 403 `CONSENT_REQUIRED`.

---

## 4. Blueprint Synchronization

The **Blueprint Sync** tab synchronizes your code with the Archon Horizon mathematical dependency graph:

1. **Reconcile Drift**:
   - Compares declarations in your editor buffer against the workspace DAG.
   - Identifies:
     - *Added in code*: Declarations written in the buffer that lack blueprint nodes.
     - *Missing in code*: Blueprint nodes planned in the DAG that have not yet been implemented.
     - *Signature drift*: Declarations whose mathematical signatures have diverged from the blueprint.
2. **Generate Lean Stubs**:
   - Generates formal Lean 4 stubs with `sorry` for all unformalized nodes in the DAG.
   - **Frozen Node Protection**: Nodes marked as `kernel_verified` or `frozen: true` are strictly preserved and never overwritten.
3. **Extract DAG**:
   - Re-extracts the full topological dependency graph from source files.

---

## 5. Veriphy Skeptical Computer Algebra

The **Veriphy CAS** tab provides computer algebra assistance with mathematical skepticism:
- **Polynomial Factorization**: Automatically factors expressions (e.g., $x^2 - y^2 = (x - y)(x + y)$).
- **Coefficient Analysis**: Decomposes polynomials into canonical coefficient mappings.
- **Skeptical Verification**: SageMath / CAS suggestions are treated as untrusted advice. Veriphy synthesizes Lean 4 certificates and verifies them via `ring` before displaying them.
