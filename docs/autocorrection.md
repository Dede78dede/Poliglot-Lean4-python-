# 5-Level Auto-Correction System (Architecture & Guide)

Polyglot Code Studio implements a defense-in-depth, 5-level auto-correction hierarchy tailored for mathematicians and Python developers. Every level is governed by formal verification guarantees, strict contract gates, and explicit privacy boundaries.

---

## 1. Overview of the 5 Levels

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        5-Level Auto-Correction Hierarchy                               │
│                                                                                        │
│   [L1] Deterministic Fixes (Always On, Zero Network, Self-Hosted)                      │
│   ├── Python: Ruff CLI + Deterministic AST Engine (F401, I001, UP006, etc.)            │
│   └── Lean 4: Monaco LSP Code Actions ("Try this: rfl", exact?, simp?, fixAll)         │
│                                                                                        │
│   [L2] Feedback-Loop Repair (Compiler REPL Driven, Self-Hosted)                         │
│   ├── Python: mypy/pyright diagnostic classification & type inference fixes            │
│   └── Lean 4: LeanProbe warm REPL loop (3 attempts, declaration granularity)           │
│                                                                                        │
│   [L3] Specialized Models (Self-Hosted MoE & Behavioral Contract Gates)                │
│   ├── Python: PyFixer-style 5-Worker Pipeline + Mandatory Behavioral Contract Gate     │
│   └── Lean 4: Leanstral 1.5 (Local vLLM/Ollama MoE) + Mandatory Kernel Verification    │
│                                                                                        │
│   [L4] Cloud Metaprogramming (Opt-In with Explicit User Consent)                       │
│   └── Lean 4: AXLE repair_proofs (insert_sorries, relax_defeq, remove_unknown_options)│
│                                                                                        │
│   [L5] Certified Computer Algebra (Skeptical Oracle + Kernel Verification)             │
│   └── Lean 4: Veriphy (SageMath untrusted oracle + Lean kernel check, zero sorry)      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Level Specifications

### Level 1 (L1) — Deterministic Auto-Fixes
- **Privacy**: Zero Network. Runs 100% locally on host or in-browser.
- **Python**:
  - Primary: Invokes native `ruff check --fix` when the Ruff binary is on host `PATH`.
  - Fallback: Pure TypeScript AST/regex rule engine implementing canonical safe fixes:
    - `F401`: Detects and removes unused `import` and `from ... import` statements.
    - `I001`: Sorts and groups imports alphabetically.
    - `E701`: Expands single-line statements (`if cond: return val`) into PEP 8 layout.
    - `UP006` / `UP007`: Modernizes legacy type annotations (e.g. `typing.List[T]` -> `list[T]`, `Union[A, B]` -> `A | B`).
    - `W292` / `W293`: Cleans trailing whitespace and ensures single final newline.
  - **Unsafe Fixes Toggle**: `B006` (mutable default arguments `def f(x=[])` -> `def f(x=None)`) is skipped by default and requires explicit `allowUnsafe: true`.
- **Lean 4**:
  - Monaco LSP integration translating compiler `"Try this: <tactic>"` notices (e.g. `exact?` -> `rfl`, `simp?` -> `simp only [...]`).
  - Supports 1-click single action application and atomic "Fix All in File".

### Level 2 (L2) — Feedback-Loop Auto-Correction
- **Privacy**: Local Compiler REPL. No external telemetry or cloud communication.
- **Lean 4 (LeanProbe)**:
  - Connects to `lean-probe` compiler REPL on port 8082.
  - Re-elaborates code at **declaration granularity** (avoiding slow project rebuilds).
  - Categorizes compiler errors into semantic classes:
    - `unknown_identifier` (suggests `open Namespace` or alias)
    - `type_mismatch` (attempts `exact?` or computation)
    - `unsolved_goal` (applies automated tactics)
    - `deprecated_lemma` (swaps for Mathlib 4 replacement)
  - Iterative repair loop (configurable 1 to 5 attempts, default 3).
- **Python (Type Checker Feedback)**:
  - Classifies mypy and pyright compiler diagnostics.
  - Automatically injects missing return type annotations (`-> None`) and declares unassigned identifiers.

### Level 3 (L3) — Specialized Models & Contract Gates
- **Privacy**: Self-Hosted Local MoE. Zero cloud data transmission.
- **Python (PyFixer 5-Worker Pipeline)**:
  - 5 sequential workers:
    1. *Syntax Surgeon*: Repairs unclosed quotes and unmatched parentheses.
    2. *Security Guard*: Neutralizes dangerous `eval()` / `exec()` calls with `ast.literal_eval`.
    3. *Type Tamer*: Modernizes typing annotations and import trees.
    4. *Style Formatter*: Enforces PEP 8 whitespace and layout.
    5. *Code Cleaner*: Cleans unreachable dead code and redundant stubs.
  - **Behavioral Contract Gate**:
    - Probes all declared functions before and after the repair.
    - If any untouched function definition is dropped, corrupted, or exhibits behavioral divergence, the repair candidate is **strictly rejected** with `CONTRACT_GATE_FAILED`.
- **Lean 4 (Leanstral 1.5 Local MoE)**:
  - Targets local vLLM or Ollama instance running the Apache-2.0 Leanstral 1.5 MoE model (port 11434).
  - Synthesizes tactic scripts for open proof obligations.
  - **Mandatory Kernel Verification Gate**: Every generated proof candidate must be elaborated and checked by the Lean 4 kernel with exit code 0 and zero `sorry`. Candidates that fail kernel check are discarded.

### Level 4 (L4) — Cloud Metaprogramming (AXLE)
- **Privacy**: Opt-In with **Explicit User Consent Guard**.
- Integrates with the reworked AXLE ICML 2026 `repair_proofs` API.
- Implements 3 structural proof passes:
  1. `insert_sorries`: Isolates failing proof subterms into explicit `sorry` obligations without destroying global theorem structure.
  2. `relax_defeq_transparency`: Relaxes definitional equality transparency to enable unification across Mathlib version shifts.
  3. `remove_unknown_options`: Strips obsolete `set_option` compiler pragmas.
- **Security Guard**: Calls without `consentGiven: true` are rejected immediately with HTTP 403 `CONSENT_REQUIRED`.
- **Rate Limit Contract**: Returns HTTP 429 with standard `Retry-After` headers and remaining quota windows.

### Level 5 (L5) — Certified Computer Algebra (Veriphy)
- **Privacy**: Skeptical Oracle + Lean 4 Kernel.
- **Skeptical Oracle Architecture**:
  - SageMath 10.x acts as an **untrusted witness generator** (producing polynomial factorization, Gröbner bases, or linear combination multipliers).
  - Lean 4 synthesizes a certified tactic block (`ring`, `linarith`, `nlinarith`) populated with Sage's witness terms.
- **Zero-Sorry & Standard Axioms Guarantee**:
  - The Lean 4 kernel independently elaborates and type-checks the witness proof.
  - Veriphy strictly bans `sorry` and any axiom outside standard Lean 4 foundations (`propext`, `Classical.choice`, `Quot.sound`). Proofs with non-standard axioms are rejected immediately.

---

## 3. Local-Only Telemetry (Zero Phone-Home)

In compliance with Polyglot Code Studio design principles:
- Telemetry records time-to-fix (`durationMs`) and accepted fix counts per level (`L1` to `L5`).
- Telemetry is stored **exclusively in the browser (`localStorage`)**.
- Zero phone-home beacons, external tracking requests, or third-party analytics are executed.

---

## 4. Setup & Deployment Guide

| Tool | Recommended Deployment | Port / Path | Fallback Mechanism |
|---|---|---|---|
| **Ruff** | Host PATH (`pip install ruff` or system package) | `which ruff` | Pure TypeScript deterministic rule engine |
| **LeanProbe** | Local daemon (`lean-probe --repl`) | `:8082` | Informative 503 status + local syntax heuristics |
| **Leanstral 1.5** | Local vLLM / Ollama (`ollama run leanstral:1.5-q4`) | `:11434` | Offline status + heuristic tactic generator |
| **AXLE Cloud** | Environment variable (`AXLE_API_KEY`) | `https://api.axiom-axle.org/v1` | Local simulated repair |
| **SageMath** | Host PATH (`sage`) | `which sage` | Certified Lean algebraic tactics (`ring`/`linarith`) |
